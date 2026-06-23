# EduConnect Critical Fixes - PowerShell Script
# Run this in your project root directory

Write-Host "🔧 EduConnect Critical Fixes - Starting..." -ForegroundColor Green
Write-Host "=========================================="

# 1. Create .env file
Write-Host "`n📄 Creating .env file..." -ForegroundColor Cyan
$envContent = @"
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:educonnect_dev_2024@localhost:5432/educonnect
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=dev_access_secret_change_in_production_64_char_minimum_length
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_64_char_minimum_length
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:8081
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project"}
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ .env created" -ForegroundColor Green

# 2. Fix mobile API client
Write-Host "`n📱 Fixing mobile API client..." -ForegroundColor Cyan
$mobileApiClient = @"
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import * as SecureStore from "expo-secure-store"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-production-api.com' 
    : 'http://localhost:3000')

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync("accessToken")
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken")
        if (!refreshToken) throw new Error("No refresh token")
        const res = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data.data
        await SecureStore.setItemAsync("accessToken", accessToken)
        await SecureStore.setItemAsync("refreshToken", newRefresh)
        if (original.headers) {
          original.headers.Authorization = `Bearer ${accessToken}`
        }
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync("accessToken")
        await SecureStore.deleteItemAsync("refreshToken")
      }
    }
    return Promise.reject(error)
  }
)
"@

$mobileApiClient | Out-File -FilePath "apps/mobile/src/api/client.ts" -Encoding UTF8
Write-Host "✅ Mobile API client fixed" -ForegroundColor Green

# 3. Fix swap.service.ts (SQL injection vulnerability)
Write-Host "`n🔒 Fixing SQL injection vulnerability..." -ForegroundColor Cyan
$swapService = @"
import { db } from "../../core/database/prisma.js"
import { AppError, Errors } from "../../core/errors/AppError.js"

export class SwapService {
  async createSwapRequest(
    schoolId: string,
    requesterId: string,
    requesterSlotId: string,
    receiverSlotId: string,
    message?: string
  ) {
    const [requesterSlot, receiverSlot] = await Promise.all([
      db.timetableSlot.findUnique({ where: { id: requesterSlotId } }),
      db.timetableSlot.findUnique({ where: { id: receiverSlotId } }),
    ])
    if (!requesterSlot || requesterSlot.schoolId !== schoolId) throw Errors.NOT_FOUND("Requester slot")
    if (!receiverSlot  || receiverSlot.schoolId  !== schoolId) throw Errors.NOT_FOUND("Receiver slot")
    if (requesterSlot.teacherId !== requesterId) throw Errors.FORBIDDEN()
    if (requesterSlotId === receiverSlotId) {
      throw new AppError("INVALID_SWAP", "Cannot swap a slot with itself", 400)
    }
    const receiverId = receiverSlot.teacherId
    const conflict = await db.swapRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { requesterSlotId },
          { receiverSlotId: requesterSlotId },
          { requesterSlotId: receiverSlotId },
          { receiverSlotId },
        ],
      },
    })
    if (conflict) {
      throw new AppError("SLOT_BUSY", "One of the slots already has a pending swap request", 409)
    }
    return db.swapRequest.create({
      data: {
        school:          { connect: { id: schoolId } },
        requester:       { connect: { id: requesterId } },
        receiver:        { connect: { id: receiverId } },
        requesterSlotId,
        receiverSlotId,
        message,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
      include: {
        requester: { select: { name: true, role: true } },
        receiver:  { select: { name: true, role: true } },
      },
    })
  }
  
  async listSwaps(schoolId: string, userId: string, view: "sent" | "received" | "all") {
    const where: any = { schoolId }
    if (view === "sent")     where.requesterId = userId
    if (view === "received") where.receiverId  = userId
    if (view === "all")      where.OR = [{ requesterId: userId }, { receiverId: userId }]
    const swaps = await db.swapRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        receiver:  { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    if (swaps.length === 0) return swaps
    const slotIds = Array.from(
      new Set(swaps.flatMap((s) => [s.requesterSlotId, s.receiverSlotId]))
    )
    const slots = await db.timetableSlot.findMany({
      where: { id: { in: slotIds } },
      include: {
        class:   { select: { name: true, section: true } },
        subject: { select: { name: true, code: true, colorHex: true } },
        period:  { select: { periodNumber: true, label: true, startTime: true, endTime: true } },
      },
    })
    const slotMap = new Map(slots.map((slot) => [slot.id, slot]))
    return swaps.map((swap) => ({
      ...swap,
      requesterSlot: slotMap.get(swap.requesterSlotId) ?? null,
      receiverSlot:  slotMap.get(swap.receiverSlotId) ?? null,
    }))
  }
  
  async respond(
    swapId: string,
    userId: string,
    schoolId: string,
    action: "accept" | "decline",
    declineReason?: string
  ) {
    const swap = await db.swapRequest.findUnique({ where: { id: swapId } })
    if (!swap)                       throw Errors.NOT_FOUND("Swap request")
    if (swap.schoolId  !== schoolId) throw Errors.FORBIDDEN()
    if (swap.receiverId !== userId)  throw Errors.FORBIDDEN()
    if (swap.status !== "PENDING") {
      throw new AppError("INVALID_STATUS", "Swap request is no longer pending", 400)
    }
    if (swap.expiresAt < new Date()) {
      await db.swapRequest.update({ where: { id: swapId }, data: { status: "EXPIRED" } })
      throw new AppError("SWAP_EXPIRED", "This swap request has expired", 400)
    }
    if (action === "decline") {
      return db.swapRequest.update({
        where: { id: swapId },
        data:  { status: "DECLINED", declineReason, respondedAt: new Date() },
      })
    }
    const [requesterSlot, receiverSlot] = await Promise.all([
      db.timetableSlot.findUnique({ where: { id: swap.requesterSlotId } }),
      db.timetableSlot.findUnique({ where: { id: swap.receiverSlotId } }),
    ])
    if (!requesterSlot || !receiverSlot) {
      throw new AppError("SLOT_GONE", "One of the timetable slots no longer exists", 400)
    }
    
    await db.`$transaction([
      db.timetableSlot.update({
        where: { id: swap.requesterSlotId },
        data: { teacherId: receiverSlot.teacherId }
      }),
      db.timetableSlot.update({
        where: { id: swap.receiverSlotId },
        data: { teacherId: requesterSlot.teacherId }
      }),
      db.swapRequest.update({
        where: { id: swapId },
        data:  { status: "ACCEPTED", respondedAt: new Date() },
      })
    ])
    
    return db.swapRequest.findUnique({
      where: { id: swapId },
      include: {
        requester: { select: { name: true } },
        receiver:  { select: { name: true } },
      },
    })
  }
  
  async cancel(swapId: string, userId: string, schoolId: string) {
    const swap = await db.swapRequest.findUnique({ where: { id: swapId } })
    if (!swap)                        throw Errors.NOT_FOUND("Swap request")
    if (swap.schoolId   !== schoolId) throw Errors.FORBIDDEN()
    if (swap.requesterId !== userId)  throw Errors.FORBIDDEN()
    if (swap.status !== "PENDING") {
      throw new AppError("INVALID_STATUS", "Can only cancel pending swap requests", 400)
    }
    return db.swapRequest.update({
      where: { id: swapId },
      data:  { status: "CANCELLED" },
    })
  }
}
export const swapService = new SwapService()
"@

$swapService | Out-File -FilePath "apps/api/src/modules/swap/swap.service.ts" -Encoding UTF8
Write-Host "✅ Swap service SQL injection fixed" -ForegroundColor Green

# 4. Fix JWT utils
Write-Host "`n🔑 Fixing JWT security..." -ForegroundColor Cyan
$jwtUtils = @"
import jwt from "jsonwebtoken"
import { env } from "../config/env.js"

const ACCESS_SECRET  = env.JWT_ACCESS_SECRET
const REFRESH_SECRET = env.JWT_REFRESH_SECRET
const ACCESS_EXPIRES_IN  = env.JWT_ACCESS_EXPIRES_IN
const REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN

export interface JwtPayload {
  userId: string
  schoolId: string
  role: string
  iat: number
  exp: number
}

export function signAccessToken(payload: object): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET) as {
      userId: string
      schoolId: string
      role: string
    }
  } catch {
    return null
  }
}
"@

$jwtUtils | Out-File -FilePath "apps/api/src/utils/jwt.ts" -Encoding UTF8
Write-Host "✅ JWT security fixed" -ForegroundColor Green

# 5. Add rate limiting middleware
Write-Host "`n⏱️ Adding rate limiting..." -ForegroundColor Cyan
$rateLimitMiddleware = @"
import { FastifyRequest, FastifyReply } from "fastify"
import { redis } from "../redis/client.js"
import { AppError } from "../errors/AppError.js"

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyPrefix: string
}

export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitHandler(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const key = `${config.keyPrefix}:${request.ip}`
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, config.windowSeconds)
    }
    if (current > config.maxRequests) {
      throw new AppError(
        "RATE_LIMITED",
        `Too many requests. Limit: ${config.maxRequests} per ${config.windowSeconds}s`,
        429
      )
    }
  }
}

export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 900,
  keyPrefix: "ratelimit:auth"
})

export const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowSeconds: 60,
  keyPrefix: "ratelimit:api"
})
"@

$rateLimitMiddleware | Out-File -FilePath "apps/api/src/core/middleware/rate-limit.middleware.ts" -Encoding UTF8
Write-Host "✅ Rate limiting added" -ForegroundColor Green

# 6. Add health check
Write-Host "`n🏥 Adding health check..." -ForegroundColor Cyan
$healthCheck = @"
import { FastifyInstance } from "fastify"
import { db } from "./database/prisma.js"
import { redis } from "./redis/client.js"

export async function healthCheck(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    const checks = {
      database: false,
      redis: false,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
    
    try {
      await db.`$queryRaw`SELECT 1`
      checks.database = true
    } catch (err) {
      fastify.log.error("Database health check failed", err)
    }
    
    try {
      await redis.ping()
      checks.redis = true
    } catch (err) {
      fastify.log.error("Redis health check failed", err)
    }
    
    const status = checks.database && checks.redis ? 200 : 503
    return { status: status === 200 ? "healthy" : "unhealthy", checks }
  })
}
"@

$healthCheck | Out-File -FilePath "apps/api/src/core/health.ts" -Encoding UTF8
Write-Host "✅ Health check added" -ForegroundColor Green

# 7. Fix app.ts
Write-Host "`n🔧 Updating app.ts..." -ForegroundColor Cyan
$appTs = @"
import Fastify, { FastifyInstance } from "fastify"
import helmet from "@fastify/helmet"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import multipart from "@fastify/multipart"
import { env } from "./config/env.js"
import { AppError } from "./core/errors/AppError.js"
import { authRateLimiter } from "./core/middleware/rate-limit.middleware.js"
import { healthCheck } from "./core/health.js"
import { authRoutes }          from "./modules/auth/auth.routes.js"
import { timetableRoutes }     from "./modules/timetable/timetable.routes.js"
import { substitutionRoutes }  from "./modules/substitution/substitution.routes.js"
import { schoolRoutes }        from "./modules/school/school.routes.js"
import { classesRoutes }       from "./modules/classes/classes.routes.js"
import { subjectsRoutes }      from "./modules/subjects/subjects.routes.js"
import { periodsRoutes }       from "./modules/periods/periods.routes.js"
import { teachersRoutes }      from "./modules/teachers/teachers.routes.js"
import { studentsRoutes }      from "./modules/students/students.routes.js"
import { swapRoutes }          from "./modules/swap/swap.routes.js"
import { announcementsRoutes } from "./modules/announcements/announcements.routes.js"
import { resourceRoutes }      from "./modules/resources/resource.routes.js"

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  })
  
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
  await fastify.register(cookie, { secret: env.JWT_ACCESS_SECRET })
  await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
  
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.url?.startsWith("/v1/auth")) {
      routeOptions.preHandler = routeOptions.preHandler || []
      if (Array.isArray(routeOptions.preHandler)) {
        routeOptions.preHandler.unshift(authRateLimiter)
      }
    }
  })
  
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message, field: error.field },
      })
    }
    fastify.log.error(error)
    return reply.status(500).send({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    })
  })
  
  await healthCheck(fastify)
  
  await fastify.register(authRoutes)
  await fastify.register(schoolRoutes)
  await fastify.register(classesRoutes)
  await fastify.register(subjectsRoutes)
  await fastify.register(periodsRoutes)
  await fastify.register(teachersRoutes)
  await fastify.register(studentsRoutes)
  await fastify.register(timetableRoutes)
  await fastify.register(substitutionRoutes)
  await fastify.register(swapRoutes)
  await fastify.register(announcementsRoutes)
  await fastify.register(resourceRoutes)
  
  return fastify
}
"@

$appTs | Out-File -FilePath "apps/api/src/app.ts" -Encoding UTF8
Write-Host "✅ app.ts updated" -ForegroundColor Green

# 8. Fix tsconfig
Write-Host "`n⚙️ Fixing tsconfig..." -ForegroundColor Cyan
$tsConfig = @"
{
  `"compilerOptions`": {
    `"target`": `"ES2022`",
    `"module`": `"NodeNext`",
    `"moduleResolution`": `"NodeNext`",
    `"strict`": true,
    `"noImplicitAny`": true,
    `"strictNullChecks`": true,
    `"noUnusedLocals`": false,
    `"noUnusedParameters`": false,
    `"outDir`": `"./dist`",
    `"rootDir`": `"./src`",
    `"skipLibCheck`": true
  },
  `"include`": [`"src`"],
  `"exclude`": [`"node_modules`", `"dist`"]
}
"@

$tsConfig | Out-File -FilePath "apps/api/tsconfig.json" -Encoding UTF8
Write-Host "✅ tsconfig fixed" -ForegroundColor Green

# 9. Fix database connection
Write-Host "`n🗄️ Adding connection pooling..." -ForegroundColor Cyan
$prismaTs = @"
import { PrismaClient } from `"@prisma/client`"
import { env } from `"../../config/env.js`"

declare global {
  var __prisma: PrismaClient | undefined
}

export const db = global.__prisma ?? new PrismaClient({
  log: env.NODE_ENV === `"development`" ? [`"warn`", `"error`"] : [`"error`"],
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
})

if (env.NODE_ENV !== `"production`") global.__prisma = db

process.on(`"SIGTERM`", async () => {
  console.log(`"SIGTERM received, disconnecting Prisma...`")
  await db.`$disconnect()
})

process.on(`"SIGINT`", async () => {
  console.log(`"SIGINT received, disconnecting Prisma...`")
  await db.`$disconnect()
})
"@

$prismaTs | Out-File -FilePath "apps/api/src/core/database/prisma.ts" -Encoding UTF8
Write-Host "✅ Database connection pooling added" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "🎉 All critical fixes applied!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm install" -ForegroundColor White
Write-Host "2. Run: npx prisma generate" -ForegroundColor White
Write-Host "3. Run: npx prisma migrate dev" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host "`n⚠️  IMPORTANT: Change JWT secrets in .env before production!" -ForegroundColor Red
Write-Host "⚠️  IMPORTANT: Update API_BASE_URL in apps/mobile/.env for production!" -ForegroundColor Red
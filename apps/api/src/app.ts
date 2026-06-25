import Fastify, { FastifyInstance } from "fastify"
import helmet from "@fastify/helmet"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import multipart from "@fastify/multipart"
import rateLimit from "@fastify/rate-limit"
import { env } from "./config/env.js"
import { AppError } from "./core/errors/AppError.js"
import { swaggerPlugin } from "./core/swagger.js"
import { authRoutes } from "./modules/auth/auth.routes.js"
import { timetableRoutes } from "./modules/timetable/timetable.routes.js"
import { substitutionRoutes } from "./modules/substitution/substitution.routes.js"
import { schoolRoutes } from "./modules/school/school.routes.js"
import { classesRoutes } from "./modules/classes/classes.routes.js"
import { subjectsRoutes } from "./modules/subjects/subjects.routes.js"
import { periodsRoutes } from "./modules/periods/periods.routes.js"
import { teachersRoutes } from "./modules/teachers/teachers.routes.js"
import { studentsRoutes } from "./modules/students/students.routes.js"
import { swapRoutes } from "./modules/swap/swap.routes.js"
import { announcementsRoutes } from "./modules/announcements/announcements.routes.js"
import { resourceRoutes } from "./modules/resources/resource.routes.js"
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js"

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  })
  await fastify.register(swaggerPlugin)
  await fastify.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } })
  await fastify.register(cors, { origin: env.FRONTEND_URL, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] })
  await fastify.register(cookie, { secret: env.JWT_ACCESS_SECRET })
  await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
  await fastify.register(rateLimit, {
    max: 100, timeWindow: "1 minute",
    keyGenerator: (req) => req.ip || "unknown",
    errorResponseBuilder: (req, context) => ({ success: false, error: { code: "RATE_LIMIT", message: `Too many requests. Retry after ${context.after}` } })
  })
  await fastify.register(rateLimit, { max: 5, timeWindow: "1 minute", prefix: "/api/v1/auth" })

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ success: false, error: { code: error.code, message: error.message, field: error.field } })
    }
    fastify.log.error(error)
    return reply.status(500).send({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } })
  })

  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() }))

  await fastify.register(async (api) => {
    await api.register(authRoutes, { prefix: "/auth" })
    await api.register(schoolRoutes, { prefix: "/school" })
    await api.register(classesRoutes, { prefix: "/classes" })
    await api.register(subjectsRoutes, { prefix: "/subjects" })
    await api.register(periodsRoutes, { prefix: "/periods" })
    await api.register(teachersRoutes, { prefix: "/teachers" })
    await api.register(studentsRoutes, { prefix: "/students" })
    await api.register(timetableRoutes, { prefix: "/timetable" })
    await api.register(substitutionRoutes, { prefix: "/substitutions" })
    await api.register(swapRoutes, { prefix: "/swaps" })
    await api.register(announcementsRoutes, { prefix: "/announcements" })
    await api.register(resourceRoutes, { prefix: "/resources" })
    await api.register(attendanceRoutes, { prefix: "/attendance" })
  }, { prefix: "/api/v1" })

  return fastify
}

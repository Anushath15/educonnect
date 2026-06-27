import { type FastifyInstance } from "fastify"
import { z }                    from "zod"
import { authService }          from "./auth.service.js"
import { authenticate }         from "../../core/middleware/auth.middleware.js"
import { db }                   from "../../core/database/prisma.js"
 
// ── Schemas ───────────────────────────────────────────────────────────────────
 
const registerSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters").max(200),
  name:       z.string().min(2, "Name must be at least 2 characters").max(100),
  email:      z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8,    "Password must be at least 8 characters")
    .regex(/[A-Z]/,        "Password must contain at least one uppercase letter")
    .regex(/[a-z]/,        "Password must contain at least one lowercase letter")
    .regex(/[0-9]/,        "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  // Only school owners can self-register. All other staff created via POST /v1/staff.
  role:          z.enum(["PRINCIPAL", "ADMINISTRATOR"]).default("PRINCIPAL"),
  schoolAddress: z.string().max(500).optional(),
  schoolPhone:   z.string().max(20).optional(),
  schoolEmail:   z.string().email().optional(),
})
 
// ── Routes ────────────────────────────────────────────────────────────────────
 
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
 
  /**
   * POST /v1/auth/register
   * Creates a new school and its first administrator in one atomic operation.
   * Returns tokens immediately so the admin lands in an authenticated session.
   */
  fastify.post(
    "/v1/auth/register",
    {
      config: {
        // Stricter rate limit for registration: 3 per 10 min per IP.
        // Prevents mass school creation. Applied on top of global 100/min.
        rateLimit: { max: 3, timeWindow: "10 minutes" },
      },
    },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code:    "VALIDATION_ERROR",
            message: parsed.error.errors[0].message,
            field:   parsed.error.errors[0].path[0] as string | undefined,
          },
        })
      }
 
      const result = await authService.register(parsed.data)
      return reply.status(201).send({ success: true, data: result })
    }
  )
 
  // ── Login ──────────────────────────────────────────────────────────────────
 
  fastify.post("/v1/auth/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Email and password are required" },
      })
    }
    const tokens = await authService.login(email, password, request.ip)
    return reply.status(200).send({ success: true, data: tokens })
  })
 
  // ── Refresh ────────────────────────────────────────────────────────────────
 
  fastify.post("/v1/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "refreshToken is required" },
      })
    }
    const tokens = await authService.refresh(refreshToken)
    return reply.status(200).send({ success: true, data: tokens })
  })
 
  // ── Logout ─────────────────────────────────────────────────────────────────
 
  fastify.post(
    "/v1/auth/logout",
    { preHandler: authenticate },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string }
      const accessToken = request.headers.authorization!.slice(7)
      await authService.logout(accessToken, refreshToken ?? "")
      return reply.status(200).send({ success: true, data: { message: "Logged out successfully" } })
    }
  )
 
  // ── Me ─────────────────────────────────────────────────────────────────────
 
  fastify.get(
    "/v1/auth/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.user.findUnique({
        where:  { id: request.user.userId },
        select: {
          id:                true,
          name:              true,
          email:             true,
          role:              true,
          schoolId:          true,
          preferredLanguage: true,
          lastLoginAt:       true,
          school: {
            select: { id: true, name: true, subscriptionStatus: true },
          },
        },
      })
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        })
      }
      return reply.status(200).send({ success: true, data: user })
    }
  )
}
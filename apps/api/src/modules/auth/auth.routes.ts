import { FastifyInstance } from "fastify"
import { authService } from "./auth.service.js"
import { authenticate } from "../../core/middleware/auth.middleware.js"
import { db } from "../../core/database/prisma.js"

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string
      password: string
    }
    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Email and password are required" },
      })
    }
    const ip = request.ip
    const tokens = await authService.login(email, password, ip)
    return reply.status(200).send({ success: true, data: tokens })
  })

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

  fastify.post(
    "/v1/auth/logout",
    { preHandler: authenticate },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string }
      const accessToken = request.headers.authorization!.slice(7)
      await authService.logout(accessToken, refreshToken ?? "")
      return reply.status(200).send({
        success: true,
        data: { message: "Logged out successfully" },
      })
    }
  )

  fastify.get(
    "/v1/auth/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const user = await db.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          schoolId: true,
          preferredLanguage: true,
          lastLoginAt: true,
          school: {
            select: {
              id: true,
              name: true,
              subscriptionStatus: true,
            },
          },
        },
      })
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        })
      }
      return reply.status(200).send({
        success: true,
        data: user,
      })
    }
  )
}

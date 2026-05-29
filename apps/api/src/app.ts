import Fastify, { FastifyInstance } from "fastify"
import helmet from "@fastify/helmet"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import multipart from "@fastify/multipart"
import { env } from "./config/env.js"
import { AppError } from "./core/errors/AppError.js"
import { authRoutes }         from "./modules/auth/auth.routes.js"
import { timetableRoutes }    from "./modules/timetable/timetable.routes.js"
import { substitutionRoutes } from "./modules/substitution/substitution.routes.js"
import { schoolRoutes }       from "./modules/school/school.routes.js"
import { classesRoutes }      from "./modules/classes/classes.routes.js"
import { subjectsRoutes }     from "./modules/subjects/subjects.routes.js"
import { periodsRoutes }      from "./modules/periods/periods.routes.js"
import { teachersRoutes }     from "./modules/teachers/teachers.routes.js"
import { studentsRoutes }     from "./modules/students/students.routes.js"
import { swapRoutes }         from "./modules/swap/swap.routes.js"

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

  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

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

  return fastify
}

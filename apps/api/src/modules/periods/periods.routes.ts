import { FastifyInstance } from "fastify"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
import { db } from "../../core/database/prisma.js"
import { z } from "zod"

const periodSchema = z.object({
  periodNumber: z.number().min(1).max(12),
  label: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:MM"),
  isBreak: z.boolean().default(false),
}).refine(d => d.startTime < d.endTime, {
  message: "startTime must be before endTime",
  path: ["endTime"],
})

export async function periodsRoutes(fastify: FastifyInstance) {

  fastify.get("/v1/periods", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const periods = await db.periodDefinition.findMany({
      where: { schoolId: request.user.schoolId },
      orderBy: { periodNumber: "asc" },
    })
    return reply.send({ success: true, data: periods })
  })

  fastify.post("/v1/periods", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const parsed = periodSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const existing = await db.periodDefinition.findMany({
      where: { schoolId: request.user.schoolId },
    })
    const overlaps = existing.some(p =>
      parsed.data.startTime < p.endTime && parsed.data.endTime > p.startTime
    )
    if (overlaps) {
      return reply.status(409).send({
        success: false,
        error: { code: "PERIOD_OVERLAP", message: "This period overlaps with an existing period" },
      })
    }
    try {
      const period = await db.periodDefinition.create({
        data: { schoolId: request.user.schoolId, ...parsed.data },
      })
      return reply.status(201).send({ success: true, data: period })
    } catch (err: any) {
      if (err.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: { code: "DUPLICATE", message: "Period number already exists" },
        })
      }
      throw err
    }
  })

  fastify.delete("/v1/periods/:id", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.periodDefinition.delete({ where: { id } })
    return reply.send({ success: true, data: { message: "Period deleted" } })
  })
}

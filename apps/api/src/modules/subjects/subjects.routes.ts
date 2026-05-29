import { FastifyInstance } from "fastify"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
import { db } from "../../core/database/prisma.js"
import { z } from "zod"

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#7C6FFF"),
  periodsPerWeek: z.number().min(1).max(20).default(5),
})

export async function subjectsRoutes(fastify: FastifyInstance) {

  // GET /v1/subjects
  fastify.get("/v1/subjects", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const subjects = await db.subject.findMany({
      where: { schoolId: request.user.schoolId, isActive: true },
      orderBy: { name: "asc" },
    })
    return reply.send({ success: true, data: subjects })
  })

  // POST /v1/subjects
  fastify.post("/v1/subjects", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const parsed = subjectSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    try {
      const subject = await db.subject.create({
        data: {
          schoolId: request.user.schoolId,
          ...parsed.data,
          code: parsed.data.code.toUpperCase(),
        },
      })
      return reply.status(201).send({ success: true, data: subject })
    } catch (err: any) {
      if (err.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: { code: "DUPLICATE", message: "Subject code already exists" },
        })
      }
      throw err
    }
  })

  // DELETE /v1/subjects/:id
  fastify.delete("/v1/subjects/:id", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.subject.update({ where: { id }, data: { isActive: false } })
    return reply.send({ success: true, data: { message: "Subject deactivated" } })
  })
}

import { FastifyInstance } from "fastify"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
import { db } from "../../core/database/prisma.js"
import { z } from "zod"

const classSchema = z.object({
  name: z.string().min(1).max(10),
  section: z.string().min(1).max(5),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
})

export async function classesRoutes(fastify: FastifyInstance) {

  // GET /v1/classes
  fastify.get("/v1/classes", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const classes = await db.class.findMany({
      where: { schoolId: request.user.schoolId, isActive: true },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    })
    return reply.send({ success: true, data: classes })
  })

  // POST /v1/classes
  fastify.post("/v1/classes", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const parsed = classSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    try {
      const cls = await db.class.create({
        data: { schoolId: request.user.schoolId, ...parsed.data },
      })
      return reply.status(201).send({ success: true, data: cls })
    } catch (err: any) {
      if (err.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: { code: "DUPLICATE", message: "Class with this name and section already exists" },
        })
      }
      throw err
    }
  })

  // DELETE /v1/classes/:id
  fastify.delete("/v1/classes/:id", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.class.update({
      where: { id },
      data: { isActive: false },
    })
    return reply.send({ success: true, data: { message: "Class deactivated" } })
  })
}

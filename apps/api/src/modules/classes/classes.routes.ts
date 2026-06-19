import { FastifyInstance } from "fastify"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
import { db } from "../../core/database/prisma.js"
import { z } from "zod"

const classSchema = z.object({
  name: z.string().min(1).max(10),
  section: z.string().min(1).max(5),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
  classTeacherId: z.string().uuid().optional(),
})

const updateClassSchema = z.object({
  name: z.string().min(1).max(10).optional(),
  section: z.string().min(1).max(5).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
})

const assignTeacherSchema = z.object({
  classTeacherId: z.string().uuid().nullable(),
})

async function assertValidStaff(schoolId: string, userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, schoolId, isActive: true } })
  return !!user
}

export async function classesRoutes(fastify: FastifyInstance) {

  // GET /v1/classes
  fastify.get("/v1/classes", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const classes = await db.class.findMany({
      where: { schoolId: request.user.schoolId, isActive: true },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      include: {
        classTeacher: { select: { id: true, name: true } },
        _count: { select: { students: { where: { isActive: true } } } },
      },
    })
    const data = classes.map((c) => {
      const { _count, ...rest } = c
      return { ...rest, studentCount: _count.students }
    })
    return reply.send({ success: true, data })
  })

  // GET /v1/classes/:id - detail + roster
  fastify.get("/v1/classes/:id", {
    preHandler: [authenticateWithTenant, requirePermission("student:view")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cls = await db.class.findFirst({
      where: { id, schoolId: request.user.schoolId },
      include: {
        classTeacher: { select: { id: true, name: true, email: true } },
        students: { where: { isActive: true }, orderBy: { rollNumber: "asc" } },
      },
    })
    if (!cls) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Class not found" } })
    return reply.send({ success: true, data: cls })
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
    if (parsed.data.classTeacherId) {
      const valid = await assertValidStaff(request.user.schoolId, parsed.data.classTeacherId)
      if (!valid) return reply.status(400).send({ success: false, error: { code: "INVALID_STAFF", message: "classTeacherId is not an active staff member of this school" } })
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

  // PATCH /v1/classes/:id
  fastify.patch("/v1/classes/:id", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateClassSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const existing = await db.class.findFirst({ where: { id, schoolId: request.user.schoolId } })
    if (!existing) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Class not found" } })
    try {
      const cls = await db.class.update({ where: { id }, data: parsed.data })
      return reply.send({ success: true, data: cls })
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

  // PATCH /v1/classes/:id/teacher - assign or unassign (classTeacherId: null)
  fastify.patch("/v1/classes/:id/teacher", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("school:config"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = assignTeacherSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const existing = await db.class.findFirst({ where: { id, schoolId: request.user.schoolId } })
    if (!existing) return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Class not found" } })
    if (parsed.data.classTeacherId) {
      const valid = await assertValidStaff(request.user.schoolId, parsed.data.classTeacherId)
      if (!valid) return reply.status(400).send({ success: false, error: { code: "INVALID_STAFF", message: "classTeacherId is not an active staff member of this school" } })
    }
    const cls = await db.class.update({ where: { id }, data: { classTeacherId: parsed.data.classTeacherId } })
    return reply.send({ success: true, data: cls })
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
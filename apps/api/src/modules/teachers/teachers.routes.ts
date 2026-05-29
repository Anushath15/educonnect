import { FastifyInstance } from "fastify"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
import { db } from "../../core/database/prisma.js"
import { z } from "zod"

const teacherConfigSchema = z.object({
  maxPeriodsPerDay: z.number().min(1).max(12).optional(),
  maxPeriodsPerWeek: z.number().min(1).max(60).optional(),
  maxConsecutivePeriods: z.number().min(1).max(8).default(3),
  preferredDaysOff: z.array(
    z.enum(["MON","TUE","WED","THU","FRI","SAT"])
  ).default([]),
  isOverrideActive: z.boolean().default(true),
})

export async function teachersRoutes(fastify: FastifyInstance) {

  fastify.get("/v1/teachers", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const teachers = await db.user.findMany({
      where: {
        schoolId: request.user.schoolId,
        isActive: true,
        role: {
          in: ["PRINCIPAL","VICE_PRINCIPAL","COORDINATOR",
               "CLASS_TEACHER","SUBJECT_TEACHER","TEMP_TEACHER","INTERN"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherConfig: true,
        taughtSubjects: {
          select: {
            isPrimary: true,
            canSubstitute: true,
            subject: {
              select: { id: true, name: true, code: true, colorHex: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })
    return reply.send({ success: true, data: teachers })
  })

  fastify.get("/v1/teachers/:id", {
    preHandler: [authenticateWithTenant],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const teacher = await db.user.findFirst({
      where: { id, schoolId: request.user.schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherConfig: true,
        taughtSubjects: {
          select: {
            isPrimary: true,
            canSubstitute: true,
            subject: {
              select: { id: true, name: true, code: true, colorHex: true },
            },
          },
        },
      },
    })
    if (!teacher) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Teacher not found" },
      })
    }
    return reply.send({ success: true, data: teacher })
  })

  fastify.put("/v1/teachers/:id/config", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("staff:edit"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = teacherConfigSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const teacher = await db.user.findFirst({
      where: { id, schoolId: request.user.schoolId, isActive: true },
    })
    if (!teacher) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Teacher not found" },
      })
    }
    const updated = await db.user.update({
      where: { id },
      data: { teacherConfig: parsed.data },
      select: { id: true, name: true, role: true, teacherConfig: true },
    })
    return reply.send({ success: true, data: updated })
  })

  fastify.post("/v1/teachers/:id/subjects", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("staff:edit"),
    ],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { subjectId, isPrimary, canSubstitute } = request.body as {
      subjectId: string
      isPrimary?: boolean
      canSubstitute?: boolean
    }
    if (!subjectId) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "subjectId is required" },
      })
    }
    try {
      const assignment = await db.teacherSubject.create({
        data: {
          teacherId: id,
          subjectId,
          isPrimary: isPrimary ?? false,
          canSubstitute: canSubstitute ?? true,
        },
        include: {
          subject: { select: { name: true, code: true } },
        },
      })
      return reply.status(201).send({ success: true, data: assignment })
    } catch (err: any) {
      if (err.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: { code: "DUPLICATE", message: "Subject already assigned to this teacher" },
        })
      }
      throw err
    }
  })

  fastify.delete("/v1/teachers/:id/subjects/:subjectId", {
    preHandler: [
      authenticateWithTenant,
      requirePermission("staff:edit"),
    ],
  }, async (request, reply) => {
    const { id, subjectId } = request.params as { id: string; subjectId: string }
    await db.teacherSubject.deleteMany({
      where: { teacherId: id, subjectId },
    })
    return reply.send({ success: true, data: { message: "Subject removed from teacher" } })
  })
}

import type { FastifyInstance } from "fastify"
import { z }      from "zod"
import argon2     from "argon2"
import { db }     from "../../core/database/prisma.js"
import { Errors } from "../../core/errors/AppError.js"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission }      from "../../core/middleware/rbac.middleware.js"
 
const passwordSchema = z
  .string()
  .min(8,    "Password must be at least 8 characters")
  .regex(/[A-Z]/,        "Must contain an uppercase letter")
  .regex(/[a-z]/,        "Must contain a lowercase letter")
  .regex(/[0-9]/,        "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character")
 
const createSchema = z.object({
  name:              z.string().min(2).max(100),
  email:             z.string().email("Invalid email address"),
  password:          passwordSchema,
  role:              z.enum(["PRINCIPAL","VICE_PRINCIPAL","COORDINATOR","ADMINISTRATOR",
                             "CLASS_TEACHER","SUBJECT_TEACHER","TEMP_TEACHER","INTERN","OFFICE_STAFF"]),
  phone:             z.string().max(20).optional(),
  preferredLanguage: z.enum(["en","ta"]).default("en"),
})
 
const updateSchema = z.object({
  name:              z.string().min(2).max(100).optional(),
  phone:             z.string().max(20).nullable().optional(),
  preferredLanguage: z.enum(["en","ta"]).optional(),
  role:              z.enum(["PRINCIPAL","VICE_PRINCIPAL","COORDINATOR","ADMINISTRATOR",
                             "CLASS_TEACHER","SUBJECT_TEACHER","TEMP_TEACHER","INTERN","OFFICE_STAFF"]).optional(),
})
 
const safeSelect = {
  id: true, name: true, email: true, role: true, phone: true,
  preferredLanguage: true, avatarUrl: true, isActive: true,
  createdAt: true, schoolId: true, lastLoginAt: true,
} as const
 
export async function staffRoutes(fastify: FastifyInstance): Promise<void> {
 
  fastify.get("/v1/staff", {
    preHandler: [authenticateWithTenant, requirePermission("staff:view")],
  }, async (request, reply) => {
    const staff = await db.user.findMany({
      where:   { schoolId: request.user.schoolId, isActive: true },
      select:  safeSelect,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    })
    return reply.send({ success: true, data: staff })
  })
 
  fastify.post("/v1/staff", {
    preHandler: [authenticateWithTenant, requirePermission("staff:create")],
    config: { rateLimit: { max: 20, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } })
    }
    const exists = await db.user.findUnique({ where: { email: parsed.data.email } })
    if (exists) throw Errors.DUPLICATE("Email")
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id })
    const user = await db.user.create({
      data: {
        schoolId: request.user.schoolId,
        name:     parsed.data.name,
        email:    parsed.data.email,
        passwordHash,
        role:              parsed.data.role,
        phone:             parsed.data.phone,
        preferredLanguage: parsed.data.preferredLanguage,
      },
      select: safeSelect,
    })
    return reply.status(201).send({ success: true, data: user })
  })
 
  fastify.patch("/v1/staff/:id", {
    preHandler: [authenticateWithTenant, requirePermission("staff:edit")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } })
    }
    const existing = await db.user.findFirst({ where: { id, schoolId: request.user.schoolId, isActive: true } })
    if (!existing) throw Errors.NOT_FOUND("Staff member")
    const updated = await db.user.update({ where: { id }, data: parsed.data, select: safeSelect })
    return reply.send({ success: true, data: updated })
  })
 
  fastify.delete("/v1/staff/:id", {
    preHandler: [authenticateWithTenant, requirePermission("staff:edit")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (id === request.user.userId) {
      return reply.status(400).send({ success: false,
        error: { code: "SELF_DEACTIVATION", message: "You cannot deactivate your own account" } })
    }
    const existing = await db.user.findFirst({ where: { id, schoolId: request.user.schoolId, isActive: true } })
    if (!existing) throw Errors.NOT_FOUND("Staff member")
    await db.user.update({ where: { id }, data: { isActive: false } })
    return reply.send({ success: true, data: { message: "Staff member deactivated" } })
  })
 
  fastify.post("/v1/staff/:id/reset-password", {
    preHandler: [authenticateWithTenant, requirePermission("staff:edit")],
  }, async (request, reply) => {
    const { id }  = request.params as { id: string }
    const { newPassword } = request.body as { newPassword?: string }
    const valid = passwordSchema.safeParse(newPassword)
    if (!valid.success) {
      return reply.status(400).send({ success: false,
        error: { code: "VALIDATION_ERROR", message: valid.error.errors[0].message } })
    }
    const existing = await db.user.findFirst({ where: { id, schoolId: request.user.schoolId } })
    if (!existing) throw Errors.NOT_FOUND("Staff member")
    const passwordHash = await argon2.hash(valid.data, { type: argon2.argon2id })
    await db.user.update({ where: { id }, data: { passwordHash } })
    return reply.send({ success: true, data: { message: "Password updated successfully" } })
  })
}
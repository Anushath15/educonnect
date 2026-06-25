import { FastifyInstance } from "fastify"
import { z } from "zod"
import { db } from "../../core/database/prisma.js"
import { Errors } from "../../core/errors/AppError.js"
import { authenticateWithTenant } from "../../core/middleware/tenant.middleware.js"
import { requirePermission } from "../../core/middleware/rbac.middleware.js"
 
// ── Zod schemas ───────────────────────────────────────────────────────────────
 
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
 
const markSchema = z.object({
  studentId: z.string().uuid(),
  date:      z.string().regex(dateRegex, "date must be YYYY-MM-DD"),
  status:    z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]),
  periodId:  z.string().uuid().optional(),
  notes:     z.string().max(500).optional(),
})
 
const bulkSchema = z.object({
  classId:  z.string().uuid(),
  date:     z.string().regex(dateRegex, "date must be YYYY-MM-DD"),
  periodId: z.string().uuid().optional(),
  records:  z.array(z.object({
    studentId: z.string().uuid(),
    status:    z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]),
    notes:     z.string().max(500).optional(),
  })).min(1).max(200),
})
 
const summaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year:  z.coerce.number().int().min(2020).max(2100).optional(),
})
 
// ── Routes ────────────────────────────────────────────────────────────────────
 
export async function attendanceRoutes(fastify: FastifyInstance) {
 
  /**
   * Mark attendance for a single student.
   * Upsert ensures calling this twice for the same student/date/period
   * updates rather than duplicates.
   */
  fastify.post("/v1/attendance", {
    preHandler: [authenticateWithTenant, requirePermission("attendance:mark")],
  }, async (request, reply) => {
    const parsed = markSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const { studentId, date, status, periodId, notes } = parsed.data
    const { schoolId, userId } = request.user
 
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId, isActive: true },
    })
    if (!student) throw Errors.NOT_FOUND("Student")
 
    const record = await db.attendance.upsert({
      where:  { studentId_date_periodId: { studentId, date: new Date(date), periodId: periodId ?? null } },
      update: { status, notes: notes ?? null, markedById: userId },
      create: {
        schoolId,
        studentId,
        classId:   student.classId,
        date:      new Date(date),
        periodId:  periodId ?? null,
        status,
        notes:     notes ?? null,
        markedById: userId,
      },
    })
    return reply.status(201).send({ success: true, data: record })
  })
 
  /**
   * Mark attendance for an entire class in one request.
   * Uses an interactive transaction so that if any upsert fails,
   * the whole batch is rolled back (no partial writes).
   */
  fastify.post("/v1/attendance/bulk", {
    preHandler: [authenticateWithTenant, requirePermission("attendance:mark")],
  }, async (request, reply) => {
    const parsed = bulkSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message },
      })
    }
    const { classId, date, periodId, records } = parsed.data
    const { schoolId, userId } = request.user
 
    // Verify the class belongs to this school before touching any records.
    const cls = await db.class.findFirst({ where: { id: classId, schoolId } })
    if (!cls) throw Errors.NOT_FOUND("Class")
 
    const parsedDate = new Date(date)
 
    // Interactive transaction: all upserts succeed or none commit.
    const results = await db.$transaction(async (tx) => {
      return Promise.all(
        records.map((r) =>
          tx.attendance.upsert({
            where:  { studentId_date_periodId: { studentId: r.studentId, date: parsedDate, periodId: periodId ?? null } },
            update: { status: r.status, notes: r.notes ?? null, markedById: userId },
            create: {
              schoolId,
              studentId: r.studentId,
              classId,
              date:      parsedDate,
              periodId:  periodId ?? null,
              status:    r.status,
              notes:     r.notes ?? null,
              markedById: userId,
            },
          })
        )
      )
    })
 
    return reply.status(201).send({
      success: true,
      data:    { marked: results.length, date, classId },
    })
  })
 
  /** Get attendance records for a class on a specific date (optionally filtered by period). */
  fastify.get("/v1/attendance/class/:classId", {
    preHandler: [authenticateWithTenant, requirePermission("attendance:view")],
  }, async (request, reply) => {
    const { classId } = request.params as { classId: string }
    const query        = request.query   as { date?: string; periodId?: string }
    const { schoolId } = request.user
 
    // Verify class ownership.
    const cls = await db.class.findFirst({ where: { id: classId, schoolId } })
    if (!cls) throw Errors.NOT_FOUND("Class")
 
    const where: {
      classId:  string
      schoolId: string
      date?:    Date
      periodId?: string
    } = { classId, schoolId }
 
    if (query.date) where.date     = new Date(query.date)
    if (query.periodId) where.periodId = query.periodId
 
    const attendance = await db.attendance.findMany({
      where,
      include: {
        student:  { select: { id: true, name: true, rollNumber: true } },
        markedBy: { select: { id: true, name: true } },
        period:   { select: { periodNumber: true, label: true } },
      },
      orderBy: { student: { name: "asc" } },
    })
    return reply.send({ success: true, data: attendance })
  })
 
  /** Monthly attendance summary for a student. */
  fastify.get("/v1/attendance/student/:studentId/summary", {
    preHandler: [authenticateWithTenant, requirePermission("attendance:view")],
  }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string }
    const qParsed = summaryQuerySchema.safeParse(request.query)
    if (!qParsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: qParsed.error.errors[0].message },
      })
    }
    const { schoolId } = request.user
 
    // Verify student belongs to this school.
    const student = await db.student.findFirst({ where: { id: studentId, schoolId, isActive: true } })
    if (!student) throw Errors.NOT_FOUND("Student")
 
    const now   = new Date()
    const month = qParsed.data.month ?? now.getMonth() + 1
    const year  = qParsed.data.year  ?? now.getFullYear()
 
    const startDate = new Date(year, month - 1, 1)
    const endDate   = new Date(year, month, 0)
 
    const records = await db.attendance.findMany({
      where: { studentId, schoolId, date: { gte: startDate, lte: endDate } },
    })
 
    const summary = {
      month,
      year,
      total:          records.length,
      present:        records.filter((r) => r.status === "PRESENT").length,
      absent:         records.filter((r) => r.status === "ABSENT").length,
      late:           records.filter((r) => r.status === "LATE").length,
      excused:        records.filter((r) => r.status === "EXCUSED").length,
      halfDay:        records.filter((r) => r.status === "HALF_DAY").length,
      attendanceRate: records.length > 0
        ? Math.round((records.filter((r) => r.status === "PRESENT").length / records.length) * 1000) / 10
        : 0,
    }
    return reply.send({ success: true, data: summary })
  })
}
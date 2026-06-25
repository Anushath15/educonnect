import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../../core/database/prisma"
import { requireAuth } from "../../core/middleware/auth"
import { requireRole } from "../../core/middleware/role"
import { AppError } from "../../core/errors/AppError"
const markSchema = z.object({ studentId: z.string().uuid(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]), notes: z.string().optional(), periodId: z.string().uuid().optional() })
const bulkSchema = z.object({ classId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodId: z.string().uuid().optional(), records: z.array(z.object({ studentId: z.string().uuid(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]), notes: z.string().optional() })) })

export async function attendanceRoutes(fastify: FastifyInstance) {
  fastify.post("/", { preHandler: [requireAuth, requireRole(["CLASS_TEACHER", "SUBJECT_TEACHER", "COORDINATOR", "PRINCIPAL"])] }, async (request, reply) => {
    const data = markSchema.parse(request.body)
    const user = request.user!
    const student = await prisma.student.findFirst({ where: { id: data.studentId, schoolId: user.schoolId } })
    if (!student) throw new AppError("STUDENT_NOT_FOUND", "Student not found", 404)
    const attendance = await prisma.attendance.upsert({
      where: { studentId_date_periodId: { studentId: data.studentId, date: new Date(data.date || new Date()), periodId: data.periodId || null } },
      update: { status: data.status, notes: data.notes, markedById: user.id },
      create: { schoolId: user.schoolId, studentId: data.studentId, classId: student.classId, date: new Date(data.date || new Date()), periodId: data.periodId, status: data.status, markedById: user.id, notes: data.notes }
    })
    return reply.status(201).send({ success: true, data: attendance })
  })

  fastify.post("/bulk", { preHandler: [requireAuth, requireRole(["CLASS_TEACHER", "COORDINATOR", "PRINCIPAL"])] }, async (request, reply) => {
    const data = bulkSchema.parse(request.body)
    const user = request.user!
    const classData = await prisma.class.findFirst({ where: { id: data.classId, schoolId: user.schoolId } })
    if (!classData) throw new AppError("CLASS_NOT_FOUND", "Class not found", 404)
    const date = new Date(data.date)
    const results = await prisma.$transaction(data.records.map((r) => prisma.attendance.upsert({
      where: { studentId_date_periodId: { studentId: r.studentId, date, periodId: data.periodId || null } },
      update: { status: r.status, notes: r.notes, markedById: user.id },
      create: { schoolId: user.schoolId, studentId: r.studentId, classId: data.classId, date, periodId: data.periodId, status: r.status, markedById: user.id, notes: r.notes }
    })))
    return reply.status(201).send({ success: true, data: { marked: results.length, records: results } })
  })

  fastify.get("/class/:classId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { classId } = request.params as { classId: string }
    const { date, periodId } = request.query as { date?: string; periodId?: string }
    const user = request.user!
    const where: any = { classId, schoolId: user.schoolId }
    if (date) where.date = new Date(date)
    if (periodId) where.periodId = periodId
    const attendance = await prisma.attendance.findMany({ where, include: { student: { select: { id: true, name: true, rollNumber: true } }, markedBy: { select: { id: true, name: true } }, period: { select: { periodNumber: true, label: true } } }, orderBy: { student: { name: "asc" } } })
    return reply.send({ success: true, data: attendance })
  })

  fastify.get("/student/:studentId/summary", { preHandler: [requireAuth] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string }
    const { month, year } = request.query as { month?: string; year?: string }
    const user = request.user!
    const now = new Date()
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1
    const targetYear = year ? parseInt(year) : now.getFullYear()
    const startDate = new Date(targetYear, targetMonth - 1, 1)
    const endDate = new Date(targetYear, targetMonth, 0)
    const records = await prisma.attendance.findMany({ where: { studentId, schoolId: user.schoolId, date: { gte: startDate, lte: endDate } } })
    const counts = { total: records.length, present: records.filter((r) => r.status === "PRESENT").length, absent: records.filter((r) => r.status === "ABSENT").length, late: records.filter((r) => r.status === "LATE").length, excused: records.filter((r) => r.status === "EXCUSED").length, halfDay: records.filter((r) => r.status === "HALF_DAY").length }
    return reply.send({ success: true, data: { month: targetMonth, year: targetYear, ...counts, attendanceRate: counts.total > 0 ? (counts.present / counts.total) * 100 : 0 } })
  })
}

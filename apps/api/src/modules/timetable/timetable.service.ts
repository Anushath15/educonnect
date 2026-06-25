import type { DayOfWeek } from "@prisma/client"
import { db } from "../../core/database/prisma.js"
import { AppError } from "../../core/errors/AppError.js"
import { TimetableGenerator } from "./engine/generator.js"
import type { TimetableConstraints } from "./engine/types.js"

export class TimetableService {

  async generate(schoolId: string, weekStartDate: Date) {
    // Reject if a lock is active for this school.
    const activeLock = await db.timetableLock.findFirst({
      where: { schoolId, unlockedAt: null },
    })
    if (activeLock) {
      throw new AppError("TIMETABLE_LOCKED", "Timetable is currently locked", 400)
    }

    // Load all constraint data in parallel — avoids N sequential round trips.
    const [teachers, classes, subjects, periods, teacherSubjects] = await Promise.all([
      db.user.findMany({
        where: {
          schoolId,
          isActive: true,
          role: { in: ["CLASS_TEACHER","SUBJECT_TEACHER","TEMP_TEACHER","COORDINATOR","VICE_PRINCIPAL"] },
        },
        select: { id: true, name: true },
      }),
      db.class.findMany({
        where:  { schoolId, isActive: true },
        select: { id: true, name: true, section: true },
      }),
      db.subject.findMany({
        where:  { schoolId, isActive: true },
        select: { id: true, name: true, code: true, periodsPerWeek: true },
      }),
      db.periodDefinition.findMany({
        where:   { schoolId },
        select:  { id: true, periodNumber: true, isBreak: true },
        orderBy: { periodNumber: "asc" },
      }),
      db.teacherSubject.findMany({
        where:  { teacher: { schoolId } },
        select: { teacherId: true, subjectId: true },
      }),
    ])

    // Build teacherId → subjectId[] map for the generator.
    const teacherSubjectMap = new Map<string, string[]>()
    for (const { teacherId, subjectId } of teacherSubjects) {
      if (!teacherSubjectMap.has(teacherId)) teacherSubjectMap.set(teacherId, [])
      teacherSubjectMap.get(teacherId)!.push(subjectId)
    }

    if (teacherSubjectMap.size === 0) {
      throw new AppError(
        "NO_ASSIGNMENTS",
        "No teacher-subject assignments found. Assign subjects to teachers first.",
        400
      )
    }

    const constraints: TimetableConstraints = {
      teachers: teachers.map((t) => ({
        id:              t.id,
        name:            t.name,
        subjectIds:      teacherSubjectMap.get(t.id) ?? [],
        maxPeriodsPerWeek: 40,
      })),
      classes,
      subjects,
      periods,
      workingDays:     ["MON","TUE","WED","THU","FRI","SAT"],
      teacherSubjectMap,
    }

    const result = new TimetableGenerator(constraints).generate()

    if (result.slots.length === 0) {
      throw new AppError(
        "GENERATION_FAILED",
        "Could not generate a valid timetable. Check teacher-subject assignments.",
        400
      )
    }

    /**
     * Fixed C-003: deleteMany and createMany are now wrapped in a single
     * database transaction.
     *
     * Previously these were two separate Prisma calls. If createMany failed
     * for ANY reason after deleteMany succeeded (unique constraint violation,
     * DB timeout, network error, process crash), the school's entire timetable
     * for the week was permanently lost with no recovery path.
     *
     * With $transaction, PostgreSQL treats both as one atomic operation:
     * if createMany throws, PostgreSQL automatically rolls back deleteMany
     * and the original timetable is preserved.
     */
    await db.$transaction(async (tx) => {
      await tx.timetableSlot.deleteMany({ where: { schoolId, weekStartDate } })

      await tx.timetableSlot.createMany({
        data: result.slots.map((slot) => ({
          schoolId,
          classId:      slot.classId,
          subjectId:    slot.subjectId,
          teacherId:    slot.teacherId,
          periodId:     slot.periodId,
          dayOfWeek:    slot.day as DayOfWeek,   // was 'as any' — now properly typed
          weekStartDate,
        })),
      })
    })

    return {
      generated:     result.slots.length,
      conflicts:     result.conflicts,
      conflictCount: result.conflicts.length,
      durationMs:    result.stats.durationMs,
      success:       result.success,
    }
  }

  async getWeekTimetable(schoolId: string, weekStartDate: Date) {
    return db.timetableSlot.findMany({
      where:   { schoolId, weekStartDate },
      include: {
        class:   { select: { name: true, section: true } },
        subject: { select: { name: true, code: true, colorHex: true } },
        teacher: { select: { id: true, name: true } },
        period:  { select: { periodNumber: true, startTime: true, endTime: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { period: { periodNumber: "asc" } }],
    })
  }

  async assignSubjectToTeacher(schoolId: string, teacherId: string, subjectId: string) {
    const [teacher, subject] = await Promise.all([
      db.user.findFirst({ where: { id: teacherId, schoolId, isActive: true } }),
      db.subject.findFirst({ where: { id: subjectId, schoolId, isActive: true } }),
    ])
    if (!teacher) throw new AppError("INVALID_TEACHER", "Teacher not found in this school", 400)
    if (!subject) throw new AppError("INVALID_SUBJECT", "Subject not found in this school", 400)

    return db.teacherSubject.upsert({
      where:  { teacherId_subjectId: { teacherId, subjectId } },
      create: { teacherId, subjectId },
      update: {},
    })
  }

  async getTeacherAssignments(schoolId: string) {
    return db.teacherSubject.findMany({
      where:   { teacher: { schoolId } },
      include: {
        teacher: { select: { name: true, role: true } },
        subject: { select: { name: true, code: true } },
      },
    })
  }
}

export const timetableService = new TimetableService()
import {
  TimetableConstraints,
  SlotAssignment,
  Conflict,
  GenerationResult,
} from "./types.js"

interface Requirement {
  classId: string
  subjectId: string
  count: number
  eligibleTeachers: string[]
}

export class TimetableGenerator {
  private assignments: SlotAssignment[] = []
  private teacherBusy = new Map<string, Set<string>>()
  private classBusy   = new Map<string, Set<string>>()
  private teacherPeriodCount = new Map<string, number>()

  constructor(private readonly constraints: TimetableConstraints) {}

  generate(): GenerationResult {
    const start = Date.now()

    const requirements = this.buildRequirements()
    requirements.sort((a, b) => a.eligibleTeachers.length - b.eligibleTeachers.length)

    for (const req of requirements) {
      let placed   = 0
      let attempts = 0
      const maxAttempts = req.count * 20

      while (placed < req.count && attempts < maxAttempts) {
        const slot = this.findBestSlot(req)
        if (slot) {
          this.applyAssignment(slot)
          placed++
        }
        attempts++
      }
    }

    const conflicts = this.detectConflicts()

    return {
      success: conflicts.length === 0,
      slots: this.assignments,
      conflicts,
      stats: {
        generated:     this.assignments.length,
        conflictCount: conflicts.length,
        durationMs:    Date.now() - start,
      },
    }
  }

  private buildRequirements(): Requirement[] {
    const reqs: Requirement[] = []

    for (const cls of this.constraints.classes) {
      for (const subject of this.constraints.subjects) {
        if (subject.periodsPerWeek === 0) continue

        const eligible = this.constraints.teachers.filter(t =>
          this.constraints.teacherSubjectMap.get(t.id)?.includes(subject.id)
        ).map(t => t.id)

        if (eligible.length === 0) continue

        reqs.push({
          classId:          cls.id,
          subjectId:        subject.id,
          count:            subject.periodsPerWeek,
          eligibleTeachers: eligible,
        })
      }
    }

    return reqs
  }

  private findBestSlot(req: Requirement): SlotAssignment | null {
    const days    = this.constraints.workingDays
    const periods = this.constraints.periods.filter(p => !p.isBreak)

    const shuffledDays = [...days].sort(() => Math.random() - 0.5)

    for (const day of shuffledDays) {
      for (const period of periods) {
        const slotKey = day + "-" + period.id

        if (this.classBusy.get(req.classId)?.has(slotKey)) continue

        const sortedTeachers = [...req.eligibleTeachers].sort((a, b) => {
          return (this.teacherPeriodCount.get(a) ?? 0) -
                 (this.teacherPeriodCount.get(b) ?? 0)
        })

        for (const teacherId of sortedTeachers) {
          if (!this.teacherBusy.get(teacherId)?.has(slotKey)) {
            return {
              teacherId,
              classId:   req.classId,
              subjectId: req.subjectId,
              periodId:  period.id,
              day,
            }
          }
        }
      }
    }

    return null
  }

  private applyAssignment(slot: SlotAssignment): void {
    const key = slot.day + "-" + slot.periodId

    if (!this.teacherBusy.has(slot.teacherId)) {
      this.teacherBusy.set(slot.teacherId, new Set())
    }
    if (!this.classBusy.has(slot.classId)) {
      this.classBusy.set(slot.classId, new Set())
    }

    this.teacherBusy.get(slot.teacherId)!.add(key)
    this.classBusy.get(slot.classId)!.add(key)
    this.teacherPeriodCount.set(
      slot.teacherId,
      (this.teacherPeriodCount.get(slot.teacherId) ?? 0) + 1
    )

    this.assignments.push(slot)
  }

  private detectConflicts(): Conflict[] {
    const conflicts: Conflict[] = []
    const seen = new Map<string, string>()

    for (const slot of this.assignments) {
      const teacherKey = "t-" + slot.teacherId + "-" + slot.day + "-" + slot.periodId
      if (seen.has(teacherKey)) {
        conflicts.push({
          type:        "TEACHER_DOUBLE_BOOKING",
          message:     "Teacher " + slot.teacherId + " double-booked on " + slot.day,
          affectedIds: [slot.teacherId],
        })
      } else {
        seen.set(teacherKey, slot.teacherId)
      }

      const classKey = "c-" + slot.classId + "-" + slot.day + "-" + slot.periodId
      if (seen.has(classKey)) {
        conflicts.push({
          type:        "CLASS_DOUBLE_BOOKING",
          message:     "Class " + slot.classId + " double-booked on " + slot.day,
          affectedIds: [slot.classId],
        })
      } else {
        seen.set(classKey, slot.classId)
      }
    }

    for (const [teacherId, count] of this.teacherPeriodCount) {
      if (count > 40) {
        conflicts.push({
          type:        "WORKLOAD_EXCEEDED",
          message:     "Teacher " + teacherId + " exceeds 40 periods/week",
          affectedIds: [teacherId],
        })
      }
    }

    return conflicts
  }
}

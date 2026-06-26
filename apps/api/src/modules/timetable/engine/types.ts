export interface TeacherData {
  id: string
  name: string
  subjectIds: string[]
  maxPeriodsPerWeek: number
  maxPeriodsPerDay: number
  maxConsecutivePeriods: number
  preferredDaysOff: string[]
}

export interface ClassData {
  id: string
  name: string
  section: string
}

export interface SubjectData {
  id: string
  name: string
  code: string
  periodsPerWeek: number
}

export interface PeriodData {
  id: string
  periodNumber: number
  isBreak: boolean
}

export interface SlotAssignment {
  teacherId: string
  classId: string
  subjectId: string
  periodId: string
  day: string
}

export interface Conflict {
  type: string
  message: string
  affectedIds: string[]
}

export interface GenerationResult {
  success: boolean
  slots: SlotAssignment[]
  conflicts: Conflict[]
  stats: {
    generated: number
    conflictCount: number
    durationMs: number
  }
}

export interface TimetableConstraints {
  teachers: TeacherData[]
  classes: ClassData[]
  subjects: SubjectData[]
  periods: PeriodData[]
  workingDays: string[]
  teacherSubjectMap: Map<string, string[]>
}

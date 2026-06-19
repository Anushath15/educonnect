// ============================================================
// packages/shared/src/types.ts
// Mirrors prisma/schema.prisma exactly. Dates are ISO strings
// (JSON over HTTP), not Date objects. Keep in sync manually
// whenever the schema changes - nothing enforces this automatically.
// ============================================================

export type UserRole =
  | "PRINCIPAL"
  | "VICE_PRINCIPAL"
  | "COORDINATOR"
  | "ADMINISTRATOR"
  | "CLASS_TEACHER"
  | "SUBJECT_TEACHER"
  | "TEMP_TEACHER"
  | "INTERN"
  | "OFFICE_STAFF"

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"

export type SubstitutionStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED"

export type SwapStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED"

export type Gender = "MALE" | "FEMALE" | "OTHER"

export type BloodGroup =
  | "A_POS" | "A_NEG" | "B_POS" | "B_NEG"
  | "O_POS" | "O_NEG" | "AB_POS" | "AB_NEG"

// --- School ---

export interface School {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  subscriptionStatus: string
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// --- User / Teacher ---

// Shape of the User.teacherConfig Json field, set via
// PUT /v1/teachers/:id/config (apps/api/src/modules/teachers/teachers.routes.ts)
export interface TeacherConfig {
  maxPeriodsPerDay?: number
  maxPeriodsPerWeek?: number
  maxConsecutivePeriods: number
  preferredDaysOff: DayOfWeek[]
  isOverrideActive: boolean
}

export interface User {
  id: string
  schoolId: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  fcmToken: string | null
  preferredLanguage: string
  teacherConfig: TeacherConfig | Record<string, never>
  createdAt: string
  updatedAt: string
}

// What GET /v1/auth/me actually returns
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  schoolId: string
  school?: {
    id: string
    name: string
    subscriptionStatus: string
  }
}

export interface AuthTokenPayload {
  userId: string
  role: UserRole
  schoolId: string
  iat: number
  exp: number
}

// --- Class / Subject / TeacherSubject ---

export interface Class {
  id: string
  schoolId: string
  name: string
  section: string
  academicYear: string
  classTeacherId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  schoolId: string
  name: string
  code: string
  colorHex: string
  periodsPerWeek: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TeacherSubject {
  id: string
  teacherId: string
  subjectId: string
  isPrimary: boolean
  canSubstitute: boolean
  createdAt: string
}

// Shape returned by GET /v1/teachers and GET /v1/teachers/:id
export interface TeacherWithSubjects {
  id: string
  name: string
  email: string
  role: UserRole
  teacherConfig: TeacherConfig | Record<string, never>
  taughtSubjects: Array<{
    isPrimary: boolean
    canSubstitute: boolean
    subject: Pick<Subject, "id" | "name" | "code" | "colorHex">
  }>
}

// --- Timetable ---

export interface PeriodDefinition {
  id: string
  schoolId: string
  periodNumber: number
  label: string | null
  startTime: string
  endTime: string
  isBreak: boolean
  createdAt: string
}

export interface TimetableSlot {
  id: string
  schoolId: string
  teacherId: string
  classId: string
  subjectId: string
  periodId: string
  dayOfWeek: DayOfWeek
  weekStartDate: string
  room: string | null
  isActive: boolean
  slotType: string
  createdAt: string
  updatedAt: string
}

// Shape returned by GET /v1/timetable
// (apps/api/src/modules/timetable/timetable.service.ts getWeekTimetable)
export interface TimetableSlotExpanded {
  id: string
  dayOfWeek: DayOfWeek
  weekStartDate: string
  room: string | null
  class: { name: string; section: string }
  subject: { name: string; code: string; colorHex: string }
  teacher: { name: string }
  period: { periodNumber: number; startTime: string; endTime: string }
}

export interface TimetableLock {
  id: string
  schoolId: string
  lockedById: string
  reason: string | null
  lockedAt: string
  unlockedAt: string | null
}

// --- Substitutions ---

export interface Substitution {
  id: string
  schoolId: string
  timetableSlotId: string
  absentTeacherId: string
  substituteTeacherId: string | null
  date: string
  status: SubstitutionStatus
  assignedById: string | null
  requestSentAt: string | null
  respondedAt: string | null
  declineReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// --- Swap Requests ---

export interface SwapRequest {
  id: string
  schoolId: string
  requesterId: string
  receiverId: string
  requesterSlotId: string
  receiverSlotId: string
  status: SwapStatus
  message: string | null
  declineReason: string | null
  expiresAt: string
  respondedAt: string | null
  createdAt: string
  updatedAt: string
}

// Shape returned by GET /v1/swaps
// (apps/api/src/modules/swap/swap.service.ts listSwaps)
export interface SwapRequestExpanded extends SwapRequest {
  requester: { name: string; role: UserRole }
  receiver: { name: string; role: UserRole }
  requesterSlot: TimetableSlotExpanded | null
  receiverSlot: TimetableSlotExpanded | null
}

// --- Students ---

export interface Student {
  id: string
  schoolId: string
  classId: string
  name: string
  rollNumber: string | null
  admissionNumber: string | null
  dateOfBirth: string | null
  gender: Gender | null
  bloodGroup: BloodGroup | null
  photoUrl: string | null
  address: string | null
  parentName: string | null
  parentPhone: string | null
  emergencyContact: Record<string, unknown> | null
  joinedDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// --- Audit ---

export interface AuditLog {
  id: string
  schoolId: string
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// --- API response envelopes ---
// Every route in apps/api follows this pattern - see core/errors/AppError.ts
// and the setErrorHandler in app.ts.

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: { total: number; page: number; limit: number; totalPages: number }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    field?: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// NOTE: Resource / ResourceBooking / Notification are intentionally NOT
// defined here. There is no Resource, ResourceBooking, or Notification
// model in prisma/schema.prisma as of this commit, and no routes for
// them exist. "resource:book" is a real permission string in
// apps/api/src/core/permissions/defaults.ts, but nothing backs it yet.
// Add these types when the schema and routes actually exist - do not
// guess at the shape in advance, that is exactly what went wrong here

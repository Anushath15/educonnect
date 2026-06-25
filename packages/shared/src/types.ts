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

// Shape returned by GET /v1/timetable (timetable.service.ts getWeekTimetable)
export interface TimetableSlotExpanded {
  id: string
  dayOfWeek: DayOfWeek
  weekStartDate: string
  room: string | null
  class: { name: string; section: string }
  subject: { name: string; code: string; colorHex: string }
  teacher: { id: string; name: string }
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

export interface SwapRequestExpanded extends SwapRequest {
  requester: { name: string; role: UserRole }
  receiver: { name: string; role: UserRole }
  requesterSlot: TimetableSlotExpanded | null
  receiverSlot: TimetableSlotExpanded | null
}

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

export interface Announcement {
  id: string
  schoolId: string
  authorId: string
  title: string
  body: string
  targetRole: UserRole | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementExpanded extends Announcement {
  author: { id: string; name: string; role: UserRole }
}

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

// Resource / ResourceBooking / Notification intentionally not defined -
// no model for them exists in prisma/schema.prisma. Add when real.
// Shape returned by GET /v1/classes (classes.routes.ts)
export interface ClassListItem {
  id: string
  schoolId: string
  name: string
  section: string
  academicYear: string
  classTeacherId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  classTeacher: { id: string; name: string } | null
  studentCount: number
}

// Shape returned by GET /v1/classes/:id (classes.routes.ts) - includes full roster
export interface ClassDetail {
  id: string
  schoolId: string
  name: string
  section: string
  academicYear: string
  classTeacherId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  classTeacher: { id: string; name: string; email: string } | null
  students: Student[]
}

// Shape returned by GET /v1/substitutions (substitution.service.ts getHistory).
// timetableSlot/absentTeacher/substituteTeacher use Prisma `include` without a
// nested `select`, so every scalar column comes back even though the service
// only explicitly selects a few - periodId, date, absentTeacherId,
// substituteTeacherId are all present on the raw response.
export interface SubstitutionExpanded {
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
  absentTeacher: { name: string }
  substituteTeacher: { name: string } | null
  timetableSlot: TimetableSlot & {
    subject: { name: string; code: string }
    period: { periodNumber: number; startTime: string; endTime: string }
  }
}

// Shape returned by GET /v1/substitutions/available-teachers
export interface AvailableTeacher {
  id: string
  name: string
  role: UserRole
  periodCount: number
}

export interface Resource {
  id: string
  schoolId: string
  name: string
  type: string
  capacity: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Shape returned by GET /v1/resource-bookings (resource.service.ts getWeekBookings)
export interface ResourceBookingExpanded {
  id: string
  schoolId: string
  resourceId: string
  periodId: string
  dayOfWeek: DayOfWeek
  weekStartDate: string
  bookedById: string
  purpose: string | null
  createdAt: string
  resource: { id: string; name: string; type: string }
  period: { periodNumber: number; startTime: string; endTime: string }
  bookedBy: { id: string; name: string }
}

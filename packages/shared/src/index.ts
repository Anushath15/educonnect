export const enum UserRole {
  PRINCIPAL = "PRINCIPAL",
  VICE_PRINCIPAL = "VICE_PRINCIPAL",
  COORDINATOR = "COORDINATOR",
  ADMINISTRATOR = "ADMINISTRATOR",
  CLASS_TEACHER = "CLASS_TEACHER",
  SUBJECT_TEACHER = "SUBJECT_TEACHER",
  TEMP_TEACHER = "TEMP_TEACHER",
  INTERN = "INTERN",
  OFFICE_STAFF = "OFFICE_STAFF",
}

export const PERMISSIONS = {
  TIMETABLE_VIEW_ALL: "timetable:view:all",
  TIMETABLE_EDIT: "timetable:edit",
  TIMETABLE_GENERATE: "timetable:generate",
  TIMETABLE_LOCK: "timetable:lock",
  SUBSTITUTION_ASSIGN: "substitution:assign",
  SUBSTITUTION_ACCEPT: "substitution:accept",
  SWAP_REQUEST: "swap:request",
  SWAP_RESPOND: "swap:respond",
  STUDENT_VIEW: "student:view",
  STAFF_CREATE: "staff:create",
  STAFF_EDIT: "staff:edit",
  PERMISSION_MANAGE_ROLES: "permission:manage:roles",
  PERMISSION_MANAGE_INDIVIDUAL: "permission:manage:individual",
  RESOURCE_BOOK: "resource:book",
  SCHOOL_CONFIG: "school:config",
  SCHOOL_REPORTS: "school:reports",
  ANNOUNCEMENT_CREATE: "announcement:create",
  AUDIT_VIEW: "audit:view",
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
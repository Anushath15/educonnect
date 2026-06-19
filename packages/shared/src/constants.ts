// ============================================================
// packages/shared/src/constants.ts
// Mirrors apps/api/src/core/permissions/defaults.ts.
// This copy is for CLIENT-SIDE UI gating only (hide a button the
// user cannot use). It is never authoritative - the API enforces
// the real check independently via requirePermission() on every
// route. If this drifts from defaults.ts, the UI will be wrong but
// the API stays correct either way.
// ============================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  PRINCIPAL: [
    "timetable:view:all", "timetable:edit", "timetable:generate", "timetable:lock",
    "substitution:assign", "substitution:accept", "swap:request", "swap:respond",
    "student:view", "staff:create", "staff:edit", "permission:manage:roles",
    "permission:manage:individual", "resource:book", "school:config",
    "school:reports", "announcement:create", "audit:view",
  ],
  VICE_PRINCIPAL: [
    "timetable:view:all", "timetable:edit", "timetable:generate", "timetable:lock",
    "substitution:assign", "substitution:accept", "swap:request", "swap:respond",
    "student:view", "staff:create", "staff:edit", "resource:book",
    "school:reports", "announcement:create", "audit:view",
  ],
  COORDINATOR: [
    "substitution:assign", "substitution:accept", "timetable:view:all",
    "student:view", "swap:request", "swap:respond", "announcement:create",
    "school:reports", "audit:view",
  ],
  ADMINISTRATOR: [
    "school:config", "timetable:generate", "timetable:edit", "timetable:view:all",
    "staff:create", "staff:edit", "student:view", "resource:book", "school:reports",
  ],
  CLASS_TEACHER: [
    "timetable:view:all", "substitution:accept", "swap:request", "swap:respond",
    "student:view", "resource:book", "announcement:create",
  ],
  SUBJECT_TEACHER: [
    "timetable:view:all", "substitution:accept", "swap:request", "swap:respond", "resource:book",
  ],
  TEMP_TEACHER: ["timetable:view:all", "substitution:accept", "resource:book"],
  INTERN: [],
  OFFICE_STAFF: ["resource:book", "announcement:create"],
}

export function hasPermission(role: string, permission: string): boolean {
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Roles permitted to edit staff records (staff:edit holders above).
// Used to gate the teacher detail screen edit controls client-side.
export const STAFF_EDIT_ROLES = ["PRINCIPAL", "VICE_PRINCIPAL", "ADMINISTRATOR"] as const

export const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
  COORDINATOR: "Coordinator",
  ADMINISTRATOR: "Administrator",
  CLASS_TEACHER: "Class Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  TEMP_TEACHER: "Temp Teacher",
  INTERN: "Intern",
  OFFICE_STAFF: "Office Staff",
}

export const ROLE_COLORS: Record<string, string> = {
  PRINCIPAL: "#7C3AED",
  VICE_PRINCIPAL: "#6366F1",
  COORDINATOR: "#0EA5E9",
  ADMINISTRATOR: "#0EA5E9",
  CLASS_TEACHER: "#10B981",
  SUBJECT_TEACHER: "#F59E0B",
  TEMP_TEACHER: "#EF4444",
  INTERN: "#8B5CF6",
  OFFICE_STAFF: "#64748B",
}

// Matches the DayOfWeek enum in prisma/schema.prisma exactly (MON-SAT, no Sunday)
export const WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

export const DAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat",
}

// Real API prefix used by every route in apps/api - confirmed against
// auth.routes.ts, teachers.routes.ts, timetable.routes.ts, swap routes.
export const API_PREFIX = "/v1"

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100
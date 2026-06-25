/**
 * Default permission sets per role.
 * These are cached in Redis per user (5-min TTL) by the permission checker.
 *
 * Permission naming convention: resource:action[:scope]
 * e.g. timetable:view:all, timetable:view:own, student:create
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
 
  PRINCIPAL: [
    // Timetable
    "timetable:view:all", "timetable:edit", "timetable:generate", "timetable:lock",
    // Substitution & swap
    "substitution:assign", "substitution:accept",
    "swap:request", "swap:respond",
    // Students
    "student:view", "student:create", "student:edit", "student:delete",
    // Staff
    "staff:view", "staff:create", "staff:edit",
    // Attendance
    "attendance:mark", "attendance:view",
    // Admin
    "permission:manage:roles", "permission:manage:individual",
    "resource:book", "school:config", "school:reports",
    "announcement:create", "audit:view",
  ],
 
  VICE_PRINCIPAL: [
    "timetable:view:all", "timetable:edit", "timetable:generate", "timetable:lock",
    "substitution:assign", "substitution:accept",
    "swap:request", "swap:respond",
    "student:view", "student:create", "student:edit",
    "staff:view", "staff:create", "staff:edit",
    "attendance:mark", "attendance:view",
    "resource:book", "school:reports", "announcement:create", "audit:view",
  ],
 
  COORDINATOR: [
    "timetable:view:all",
    "substitution:assign", "substitution:accept",
    "swap:request", "swap:respond",
    "student:view",
    "staff:view",
    "attendance:view",
    "announcement:create", "school:reports", "audit:view",
  ],
 
  ADMINISTRATOR: [
    "timetable:view:all", "timetable:generate", "timetable:edit",
    "student:view", "student:create", "student:edit",
    "staff:view", "staff:create", "staff:edit",
    "attendance:view",
    "resource:book", "school:config", "school:reports",
  ],
 
  CLASS_TEACHER: [
    "timetable:view:all",
    "substitution:accept",
    "swap:request", "swap:respond",
    "student:view",
    // Class teachers are responsible for daily attendance marking
    "attendance:mark", "attendance:view",
    "resource:book", "announcement:create",
  ],
 
  SUBJECT_TEACHER: [
    "timetable:view:all",
    "substitution:accept",
    "swap:request", "swap:respond",
    // Subject teachers mark period-level attendance
    "attendance:mark", "attendance:view",
    "resource:book",
  ],
 
  TEMP_TEACHER: [
    "timetable:view:all",
    "substitution:accept",
    "attendance:view",
    "resource:book",
  ],
 
  INTERN: [
    "timetable:view:all",
    "attendance:view",
  ],
 
  OFFICE_STAFF: [
    "student:create", "student:edit",
    "attendance:view",
    "resource:book", "announcement:create",
  ],
}
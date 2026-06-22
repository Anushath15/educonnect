export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  PRINCIPAL: [
    "timetable:view:all","timetable:edit","timetable:generate","timetable:lock",
    "substitution:assign","substitution:accept","swap:request","swap:respond",
    "student:view","student:create","student:edit","staff:create","staff:edit","permission:manage:roles",
    "permission:manage:individual","resource:book","school:config",
    "school:reports","announcement:create","audit:view",
  ],
  VICE_PRINCIPAL: [
    "timetable:view:all","timetable:edit","timetable:generate","timetable:lock",
    "substitution:assign","substitution:accept","swap:request","swap:respond",
    "student:view","student:create","student:edit","staff:create","staff:edit","resource:book",
    "school:reports","announcement:create","audit:view",
  ],
  COORDINATOR: [
    "substitution:assign","substitution:accept","timetable:view:all",
    "student:view","swap:request","swap:respond","announcement:create",
    "school:reports","audit:view",
  ],
  ADMINISTRATOR: [
    "school:config","timetable:generate","timetable:edit","timetable:view:all",
    "staff:create","staff:edit","student:view","student:create","student:edit","resource:book","school:reports",
  ],
  CLASS_TEACHER: [
    "timetable:view:all","substitution:accept","swap:request","swap:respond",
    "student:view","resource:book","announcement:create",
  ],
  SUBJECT_TEACHER: [
    "timetable:view:all","substitution:accept","swap:request","swap:respond","resource:book",
  ],
  TEMP_TEACHER: ["timetable:view:all","substitution:accept","resource:book"],
  INTERN: [],
  OFFICE_STAFF: ["resource:book","announcement:create","student:create","student:edit"],
}
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number = 400,
    public readonly field?: string
  ) {
    super(message)
    this.name = "AppError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export const Errors = {
  UNAUTHORIZED:     () => new AppError("UNAUTHORIZED",      "Authentication required",          401),
  FORBIDDEN:        () => new AppError("PERMISSION_DENIED", "Insufficient permissions",         403),
  TIMETABLE_LOCKED: () => new AppError("TIMETABLE_LOCKED",  "Timetable is currently locked",   400),
  INVALID_PIN:      () => new AppError("INVALID_PIN",       "Incorrect timetable PIN",          400),
  TEACHER_BUSY:     () => new AppError("TEACHER_BUSY",      "Teacher unavailable at this time", 409),
  RATE_LIMITED:     () => new AppError("RATE_LIMITED",      "Too many requests",                429),
  NOT_FOUND:   (resource: string) => new AppError("NOT_FOUND",  resource + " not found",        404),
  DUPLICATE:   (field: string)    => new AppError("DUPLICATE",  field + " already exists",      409),
}

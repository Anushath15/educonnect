import { FastifyRequest, FastifyReply } from "fastify"
import { hasPermission } from "../permissions/checker.js"
import { Errors } from "../errors/AppError.js"

export function requirePermission(permission: string) {
  return async function (
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const allowed = await hasPermission(
      request.user.userId,
      request.user.schoolId,
      permission
    )
    if (!allowed) throw Errors.FORBIDDEN
  }
}

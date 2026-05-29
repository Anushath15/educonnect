import argon2 from "argon2"
import { db } from "../../core/database/prisma.js"
import { redis } from "../../core/redis/client.js"
import { signAccessToken } from "../../utils/jwt.js"
import { generateRefreshToken, hashToken } from "../../utils/crypto.js"
import { Errors, AppError } from "../../core/errors/AppError.js"

export class AuthService {
  async login(email: string, password: string, ip: string) {
    const attemptsKey = "login_attempts:" + ip
    const attempts = await redis.get(attemptsKey)
    if (attempts && parseInt(attempts) >= 5) throw Errors.RATE_LIMITED()

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        school: { select: { id: true } },
      },
    })

    if (!user || !user.isActive || !user.school) {
      await redis.incr(attemptsKey)
      await redis.expire(attemptsKey, 900)
      throw Errors.UNAUTHORIZED()
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError("ACCOUNT_LOCKED", "Account locked. Try again later.", 401)
    }

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) {
      const count = user.failedLoginCount + 1
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: count,
          lockedUntil: count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      })
      await redis.incr(attemptsKey)
      await redis.expire(attemptsKey, 900)
      throw Errors.UNAUTHORIZED()
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    })
    await redis.del(attemptsKey)

    const payload = {
      userId: user.id,
      schoolId: user.school.id,
      role: user.role,
    }

    const accessToken  = signAccessToken(payload)
    const refreshToken = generateRefreshToken()
    const tokenHash    = hashToken(refreshToken)

    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    await redis.set("rt:" + tokenHash, user.id, "EX", 604800)

    setImmediate(() => {
      db.auditLog.create({
        data: {
          schoolId: user.school!.id,
          userId: user.id,
          action: "POST /v1/auth/login",
          ipAddress: ip,
          userAgent: "auth-service",
        },
      }).catch(() => {})
    })

    return { accessToken, refreshToken }
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken)

    const stored = await db.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, schoolId: true, role: true, isActive: true } } },
    })

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw Errors.UNAUTHORIZED()
    }

    await db.refreshToken.delete({ where: { tokenHash } })
    await redis.del("rt:" + tokenHash)

    const payload = {
      userId: stored.user.id,
      schoolId: stored.user.schoolId,
      role: stored.user.role,
    }

    const newAccessToken  = signAccessToken(payload)
    const newRefreshToken = generateRefreshToken()
    const newHash         = hashToken(newRefreshToken)

    await db.refreshToken.create({
      data: {
        userId: stored.user.id,
        tokenHash: newHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    await redis.set("rt:" + newHash, stored.user.id, "EX", 604800)

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const parts   = accessToken.split(".")
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString())
      const ttl     = payload.exp - Math.floor(Date.now() / 1000)
      if (ttl > 0) {
        await redis.set("blacklist:" + accessToken, "1", "EX", ttl)
      }
    } catch {}

    const tokenHash = hashToken(refreshToken)
    await db.refreshToken.deleteMany({ where: { tokenHash } })
    await redis.del("rt:" + tokenHash)
  }
}

export const authService = new AuthService()

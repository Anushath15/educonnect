import { FastifyRequest, FastifyReply } from "fastify"
import { redis } from "../redis/client.js"
import { AppError } from "../errors/AppError.js"

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyPrefix: string
}

export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitHandler(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const key = config.keyPrefix + ":" + request.ip
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, config.windowSeconds)
    }
    if (current > config.maxRequests) {
      throw new AppError(
        "RATE_LIMITED",
        "Too many requests. Limit: " + config.maxRequests + " per " + config.windowSeconds + "s",
        429
      )
    }
  }
}

export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 900,
  keyPrefix: "ratelimit:auth"
})

export const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowSeconds: 60,
  keyPrefix: "ratelimit:api"
})

import Redis from "ioredis"
import { env } from "../../config/env.js"

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy(times: number) {
    if (times > 10) return null
    return Math.min(times * 100, 3000)
  },
  maxRetriesPerRequest: 3,
  lazyConnect: false,
})

redis.on("connect",      () => console.log("Redis connected"))
redis.on("error",        (err: Error) => console.error("Redis error: " + err.message))
redis.on("reconnecting", () => console.log("Redis reconnecting..."))

import { FastifyInstance } from "fastify"
import { db } from "./database/prisma.js"
import { redis } from "./redis/client.js"

export async function healthCheck(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    const checks = {
      database: false,
      redis: false,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
    
    try {
      await db.$queryRaw`SELECT 1`
      checks.database = true
    } catch (err: any) {
      fastify.log.error("Database health check failed: " + err.message)
    }
    
    try {
      await redis.ping()
      checks.redis = true
    } catch (err: any) {
      fastify.log.error("Redis health check failed: " + err.message)
    }
    
    const status = checks.database && checks.redis ? 200 : 503
    return { status: status === 200 ? "healthy" : "unhealthy", checks }
  })
}

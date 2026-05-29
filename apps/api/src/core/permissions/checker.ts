import { db } from "../database/prisma.js"
import { redis } from "../redis/client.js"
import { DEFAULT_ROLE_PERMISSIONS } from "./defaults.js"

async function cachePermResult(
  userId: string,
  permission: string,
  value: boolean
): Promise<void> {
  const key = "perm:" + userId + ":" + permission
  const setKey = "perm_keys:" + userId
  await redis
    .multi()
    .setex(key, 300, value ? "1" : "0")
    .sadd(setKey, key)
    .expire(setKey, 300)
    .exec()
}

export async function hasPermission(
  userId: string,
  _schoolId: string,
  permission: string
): Promise<boolean> {
  const cacheKey = "perm:" + userId + ":" + permission
  const cached = await redis.get(cacheKey)
  if (cached === "1") return true
  if (cached === "0") return false

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return false

  const result = DEFAULT_ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
  await cachePermResult(userId, permission, result)
  return result
}

export async function invalidatePermissionCache(userId: string): Promise<void> {
  const setKey = "perm_keys:" + userId
  const keys = await redis.smembers(setKey)
  if (keys.length > 0) {
    await redis.del(...keys, setKey)
  }
}

import { PrismaClient } from "@prisma/client"
import { env } from "../../config/env.js"

declare global {
  var __prisma: PrismaClient | undefined
}

export const db = global.__prisma ?? new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
})

if (env.NODE_ENV !== "production") global.__prisma = db

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, disconnecting Prisma...")
  await db.$disconnect()
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, disconnecting Prisma...")
  await db.$disconnect()
})

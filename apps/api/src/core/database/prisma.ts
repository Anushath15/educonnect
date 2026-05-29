import { PrismaClient } from "@prisma/client"
import { env } from "../../config/env.js"

declare global {
  var __prisma: PrismaClient | undefined
}

export const db = global.__prisma ?? new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
})

if (env.NODE_ENV !== "production") global.__prisma = db

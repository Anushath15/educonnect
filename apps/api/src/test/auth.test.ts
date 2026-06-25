import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { buildApp } from "../app.js"
import { prisma } from "../core/database/prisma.js"
import { FastifyInstance } from "fastify"

let app: FastifyInstance
beforeAll(async () => { app = await buildApp(); await app.ready() })
afterAll(async () => { await app.close() })
beforeEach(async () => { await prisma.refreshToken.deleteMany(); await prisma.user.deleteMany(); await prisma.school.deleteMany() })

describe("Auth", () => {
  it("registers a new school admin", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { schoolName: "Test", name: "Admin", email: "a@test.com", password: "SecurePass123!", role: "PRINCIPAL" } })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty("accessToken")
  })

  it("rejects duplicate email", async () => {
    await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { schoolName: "Test", name: "Admin", email: "dup@test.com", password: "SecurePass123!", role: "PRINCIPAL" } })
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { schoolName: "Test2", name: "Admin2", email: "dup@test.com", password: "SecurePass123!", role: "PRINCIPAL" } })
    expect(res.statusCode).toBe(409)
  })

  it("logs in with valid credentials", async () => {
    await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { schoolName: "Test", name: "Admin", email: "login@test.com", password: "SecurePass123!", role: "PRINCIPAL" } })
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: "login@test.com", password: "SecurePass123!" } })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.data).toHaveProperty("accessToken")
  })
})

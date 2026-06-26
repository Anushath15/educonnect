import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { buildApp } from "../app.js"
import { db } from "../core/database/prisma.js"
import type { FastifyInstance } from "fastify"
 
let app: FastifyInstance
 
beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})
 
afterAll(async () => {
  await app.close()
})
 
// Clean slate before each test — order matters: tokens before users before schools
beforeEach(async () => {
  await db.refreshToken.deleteMany()
  await db.user.deleteMany()
  await db.school.deleteMany()
})
 
describe("Auth — /v1/auth/register", () => {
  it("registers a new school and admin user", async () => {
    const res = await app.inject({
      method:  "POST",
      url:     "/v1/auth/register",
      payload: {
        schoolName: "Test School",
        name:       "Admin",
        email:      "admin@test.com",
        password:   "SecurePass123!",
        role:       "PRINCIPAL",
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty("accessToken")
  })
 
  it("rejects duplicate email", async () => {
    const payload = { schoolName: "School", name: "Admin", email: "dup@test.com", password: "SecurePass123!", role: "PRINCIPAL" }
    await app.inject({ method: "POST", url: "/v1/auth/register", payload })
    const res = await app.inject({ method: "POST", url: "/v1/auth/register",
      payload: { ...payload, schoolName: "School 2" } })
    expect(res.statusCode).toBe(409)
  })
 
  it("logs in with valid credentials", async () => {
    await app.inject({ method: "POST", url: "/v1/auth/register",
      payload: { schoolName: "Test", name: "Admin", email: "login@test.com", password: "SecurePass123!", role: "PRINCIPAL" } })
    const res = await app.inject({ method: "POST", url: "/v1/auth/login",
      payload: { email: "login@test.com", password: "SecurePass123!" } })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.data).toHaveProperty("accessToken")
  })
})
import jwt from "jsonwebtoken"

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "dev-access-secret"
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret"

const ACCESS_EXPIRES_IN  = (process.env.JWT_ACCESS_EXPIRES_IN  || "15m") as any
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || "7d")  as any

export interface JwtPayload {
  userId: string
  schoolId: string
  role: string
  iat: number
  exp: number
}

export function signAccessToken(payload: object): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET) as {
      userId: string
      schoolId: string
      role: string
    }
  } catch {
    return null
  }
}
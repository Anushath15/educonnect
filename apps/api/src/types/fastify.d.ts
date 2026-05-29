import { JwtPayload } from "../utils/jwt.js"

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload
  }
}

import fp from "fastify-plugin"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import { FastifyInstance } from "fastify"

export const swaggerPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "EduConnect API",
        description: "School management platform API",
        version: "1.0.0",
        contact: { name: "EduConnect Support", email: "support@educonnect.io" }
      },
      servers: [{ url: "/api/v1" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        }
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "Auth", description: "Authentication" },
        { name: "School", description: "School management" },
        { name: "Classes", description: "Class management" },
        { name: "Subjects", description: "Subject management" },
        { name: "Teachers", description: "Teacher management" },
        { name: "Students", description: "Student management" },
        { name: "Periods", description: "Period definitions" },
        { name: "Timetable", description: "Timetable scheduling" },
        { name: "Substitution", description: "Teacher substitution" },
        { name: "Swap", description: "Period swap requests" },
        { name: "Announcements", description: "School announcements" },
        { name: "Resources", description: "Resource booking" },
        { name: "Attendance", description: "Attendance tracking" }
      ]
    }
  })
  await fastify.register(swaggerUi, { routePrefix: "/docs", uiConfig: { docExpansion: "list", deepLinking: true }, staticCSP: true })
})

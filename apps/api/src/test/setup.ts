import { prisma } from "../core/database/prisma.js"
afterAll(async () => { await prisma.$disconnect() })

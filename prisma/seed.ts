import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"

const db = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const school = await db.school.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo School",
      email: "admin@demo.school",
    },
  })

  const passwordHash = await argon2.hash("Demo@12345", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  await db.user.upsert({
    where: { email: "principal@demo.school" },
    update: {},
    create: {
      schoolId: school.id,
      name: "Demo Principal",
      email: "principal@demo.school",
      passwordHash,
      role: "PRINCIPAL",
    },
  })

  await db.user.upsert({
    where: { email: "teacher@demo.school" },
    update: {},
    create: {
      schoolId: school.id,
      name: "Demo Teacher",
      email: "teacher@demo.school",
      passwordHash,
      role: "SUBJECT_TEACHER",
    },
  })

  console.log("Seed complete")
  console.log("  School:", school.name)
  console.log("  Login:  principal@demo.school / Demo@12345")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())

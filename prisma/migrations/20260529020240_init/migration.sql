/*
  Warnings:

  - You are about to drop the `announcements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `classes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `individual_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `period_definitions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resource_bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `substitutions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `swap_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `timetable_locks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `timetable_slots` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "individual_permissions" DROP CONSTRAINT "individual_permissions_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "individual_permissions" DROP CONSTRAINT "individual_permissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "period_definitions" DROP CONSTRAINT "period_definitions_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "resource_bookings" DROP CONSTRAINT "resource_bookings_bookedById_fkey";

-- DropForeignKey
ALTER TABLE "resource_bookings" DROP CONSTRAINT "resource_bookings_periodId_fkey";

-- DropForeignKey
ALTER TABLE "resource_bookings" DROP CONSTRAINT "resource_bookings_resourceId_fkey";

-- DropForeignKey
ALTER TABLE "resource_bookings" DROP CONSTRAINT "resource_bookings_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "resources" DROP CONSTRAINT "resources_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_classId_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_originalTeacherId_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_substituteTeacherId_fkey";

-- DropForeignKey
ALTER TABLE "substitutions" DROP CONSTRAINT "substitutions_timetableSlotId_fkey";

-- DropForeignKey
ALTER TABLE "swap_requests" DROP CONSTRAINT "swap_requests_fromSlotId_fkey";

-- DropForeignKey
ALTER TABLE "swap_requests" DROP CONSTRAINT "swap_requests_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "swap_requests" DROP CONSTRAINT "swap_requests_responderId_fkey";

-- DropForeignKey
ALTER TABLE "swap_requests" DROP CONSTRAINT "swap_requests_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "swap_requests" DROP CONSTRAINT "swap_requests_toSlotId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_locks" DROP CONSTRAINT "timetable_locks_lockedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_locks" DROP CONSTRAINT "timetable_locks_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_locks" DROP CONSTRAINT "timetable_locks_unlockedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_classId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_periodId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_teacherId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en';

-- DropTable
DROP TABLE "announcements";

-- DropTable
DROP TABLE "classes";

-- DropTable
DROP TABLE "individual_permissions";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "period_definitions";

-- DropTable
DROP TABLE "resource_bookings";

-- DropTable
DROP TABLE "resources";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "students";

-- DropTable
DROP TABLE "subjects";

-- DropTable
DROP TABLE "substitutions";

-- DropTable
DROP TABLE "swap_requests";

-- DropTable
DROP TABLE "teacher_subjects";

-- DropTable
DROP TABLE "timetable_locks";

-- DropTable
DROP TABLE "timetable_slots";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "DayOfWeek";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "ResourceType";

-- DropEnum
DROP TYPE "SubstitutionStatus";

-- DropEnum
DROP TYPE "SwapStatus";

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

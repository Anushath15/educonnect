import { db } from "../../core/database/prisma.js"
import { AppError, Errors } from "../../core/errors/AppError.js"

export class ResourceService {
  async listResources(schoolId: string) {
    return db.resource.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: "asc" },
    })
  }

  async createResource(schoolId: string, data: { name: string; type: string; capacity?: number }) {
    try {
      return await db.resource.create({
        data: { schoolId, name: data.name, type: data.type, capacity: data.capacity },
      })
    } catch (err: any) {
      if (err.code === "P2002") throw new AppError("DUPLICATE", "A resource with this name already exists", 409)
      throw err
    }
  }

  async deactivateResource(schoolId: string, resourceId: string) {
    const resource = await db.resource.findFirst({ where: { id: resourceId, schoolId } })
    if (!resource) throw Errors.NOT_FOUND("Resource")
    await db.resource.update({ where: { id: resourceId }, data: { isActive: false } })
  }

  async getWeekBookings(schoolId: string, weekStartDate: Date) {
    return db.resourceBooking.findMany({
      where: { schoolId, weekStartDate },
      include: {
        resource: { select: { id: true, name: true, type: true } },
        period: { select: { periodNumber: true, startTime: true, endTime: true } },
        bookedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { period: { periodNumber: "asc" } }],
    })
  }

  async createBooking(
    schoolId: string,
    bookedById: string,
    resourceId: string,
    periodId: string,
    dayOfWeek: string,
    weekStartDate: Date,
    purpose?: string
  ) {
    const resource = await db.resource.findFirst({ where: { id: resourceId, schoolId, isActive: true } })
    if (!resource) throw new AppError("INVALID_RESOURCE", "resourceId is not a valid resource for this school", 400)

    const period = await db.periodDefinition.findFirst({ where: { id: periodId, schoolId } })
    if (!period) throw new AppError("INVALID_PERIOD", "periodId does not belong to this school", 400)

    try {
      return await db.resourceBooking.create({
        data: {
          school:    { connect: { id: schoolId } },
          resource:  { connect: { id: resourceId } },
          period:    { connect: { id: periodId } },
          bookedBy:  { connect: { id: bookedById } },
          dayOfWeek: dayOfWeek as any,
          weekStartDate,
          purpose,
        },
        include: {
          resource: { select: { id: true, name: true, type: true } },
          period: { select: { periodNumber: true, startTime: true, endTime: true } },
        },
      })
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new AppError("BOOKING_CONFLICT", "This resource is already booked for that period.", 409)
      }
      throw err
    }
  }

  async cancelBooking(schoolId: string, bookingId: string, userId: string) {
    const booking = await db.resourceBooking.findFirst({ where: { id: bookingId, schoolId } })
    if (!booking) throw Errors.NOT_FOUND("Booking")
    if (booking.bookedById !== userId) throw Errors.FORBIDDEN()
    await db.resourceBooking.delete({ where: { id: bookingId } })
  }
}

export const resourceService = new ResourceService()
import { db } from "../../core/database/prisma.js"
import { AppError, Errors } from "../../core/errors/AppError.js"

export class SwapService {

  async createSwapRequest(
    schoolId: string,
    requesterId: string,
    requesterSlotId: string,
    receiverSlotId: string,
    message?: string
  ) {
    const [requesterSlot, receiverSlot] = await Promise.all([
      db.timetableSlot.findUnique({ where: { id: requesterSlotId } }),
      db.timetableSlot.findUnique({ where: { id: receiverSlotId } }),
    ])

    if (!requesterSlot || requesterSlot.schoolId !== schoolId) throw Errors.NOT_FOUND("Requester slot")
    if (!receiverSlot  || receiverSlot.schoolId  !== schoolId) throw Errors.NOT_FOUND("Receiver slot")
    if (requesterSlot.teacherId !== requesterId) throw Errors.FORBIDDEN()
    if (requesterSlotId === receiverSlotId) {
      throw new AppError("INVALID_SWAP", "Cannot swap a slot with itself", 400)
    }

    const receiverId = receiverSlot.teacherId

    const conflict = await db.swapRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { requesterSlotId },
          { receiverSlotId: requesterSlotId },
          { requesterSlotId: receiverSlotId },
          { receiverSlotId },
        ],
      },
    })
    if (conflict) {
      throw new AppError("SLOT_BUSY", "One of the slots already has a pending swap request", 409)
    }

    return db.swapRequest.create({
      data: {
        school:          { connect: { id: schoolId } },
        requester:       { connect: { id: requesterId } },
        receiver:        { connect: { id: receiverId } },
        requesterSlotId,
        receiverSlotId,
        message,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
      include: {
        requester: { select: { name: true, role: true } },
        receiver:  { select: { name: true, role: true } },
      },
    })
  }

  async listSwaps(schoolId: string, userId: string, view: "sent" | "received" | "all") {
    const where: any = { schoolId }
    if (view === "sent")     where.requesterId = userId
    if (view === "received") where.receiverId  = userId
    if (view === "all")      where.OR = [{ requesterId: userId }, { receiverId: userId }]

    return db.swapRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        receiver:  { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async respond(
    swapId: string,
    userId: string,
    schoolId: string,
    action: "accept" | "decline",
    declineReason?: string
  ) {
    const swap = await db.swapRequest.findUnique({ where: { id: swapId } })
    if (!swap)                       throw Errors.NOT_FOUND("Swap request")
    if (swap.schoolId  !== schoolId) throw Errors.FORBIDDEN()
    if (swap.receiverId !== userId)  throw Errors.FORBIDDEN()
    if (swap.status !== "PENDING") {
      throw new AppError("INVALID_STATUS", "Swap request is no longer pending", 400)
    }
    if (swap.expiresAt < new Date()) {
      await db.swapRequest.update({ where: { id: swapId }, data: { status: "EXPIRED" } })
      throw new AppError("SWAP_EXPIRED", "This swap request has expired", 400)
    }

    if (action === "decline") {
      return db.swapRequest.update({
        where: { id: swapId },
        data:  { status: "DECLINED", declineReason, respondedAt: new Date() },
      })
    }

    const [requesterSlot, receiverSlot] = await Promise.all([
      db.timetableSlot.findUnique({ where: { id: swap.requesterSlotId } }),
      db.timetableSlot.findUnique({ where: { id: swap.receiverSlotId } }),
    ])
    if (!requesterSlot || !receiverSlot) {
      throw new AppError("SLOT_GONE", "One of the timetable slots no longer exists", 400)
    }

    // Single CASE UPDATE swaps both teachers atomically in one SQL statement.
    // PostgreSQL checks unique constraints AFTER all rows in the statement are updated,
    // not row-by-row — this avoids the (teacherId, periodId, dayOfWeek, weekStartDate)
    // unique constraint violation that would occur with two sequential updates.
    // UUIDs are database-sourced so $executeRawUnsafe is safe here.
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        UPDATE timetable_slots
        SET teacher_id = CASE
          WHEN id = '${swap.requesterSlotId}'::uuid THEN '${receiverSlot.teacherId}'::uuid
          WHEN id = '${swap.receiverSlotId}'::uuid  THEN '${requesterSlot.teacherId}'::uuid
        END
        WHERE id IN ('${swap.requesterSlotId}'::uuid, '${swap.receiverSlotId}'::uuid)
      `)
      await tx.swapRequest.update({
        where: { id: swapId },
        data:  { status: "ACCEPTED", respondedAt: new Date() },
      })
    })

    return db.swapRequest.findUnique({
      where: { id: swapId },
      include: {
        requester: { select: { name: true } },
        receiver:  { select: { name: true } },
      },
    })
  }

  async cancel(swapId: string, userId: string, schoolId: string) {
    const swap = await db.swapRequest.findUnique({ where: { id: swapId } })
    if (!swap)                        throw Errors.NOT_FOUND("Swap request")
    if (swap.schoolId   !== schoolId) throw Errors.FORBIDDEN()
    if (swap.requesterId !== userId)  throw Errors.FORBIDDEN()
    if (swap.status !== "PENDING") {
      throw new AppError("INVALID_STATUS", "Can only cancel pending swap requests", 400)
    }
    return db.swapRequest.update({
      where: { id: swapId },
      data:  { status: "CANCELLED" },
    })
  }
}

export const swapService = new SwapService()

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
    const swaps = await db.swapRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        receiver:  { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    if (swaps.length === 0) return swaps
    const slotIds = Array.from(
      new Set(swaps.flatMap((s) => [s.requesterSlotId, s.receiverSlotId]))
    )
    const slots = await db.timetableSlot.findMany({
      where: { id: { in: slotIds } },
      include: {
        class:   { select: { name: true, section: true } },
        subject: { select: { name: true, code: true, colorHex: true } },
        period:  { select: { periodNumber: true, label: true, startTime: true, endTime: true } },
      },
    })
    const slotMap = new Map(slots.map((slot) => [slot.id, slot]))
    return swaps.map((swap) => ({
      ...swap,
      requesterSlot: slotMap.get(swap.requesterSlotId) ?? null,
      receiverSlot:  slotMap.get(swap.receiverSlotId) ?? null,
    }))
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
    
    await db.transaction([
      db.timetableSlot.update({
        where: { id: swap.requesterSlotId },
        data: { teacherId: receiverSlot.teacherId }
      }),
      db.timetableSlot.update({
        where: { id: swap.receiverSlotId },
        data: { teacherId: requesterSlot.teacherId }
      }),
      db.swapRequest.update({
        where: { id: swapId },
        data:  { status: "ACCEPTED", respondedAt: new Date() },
      })
    ])
    
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

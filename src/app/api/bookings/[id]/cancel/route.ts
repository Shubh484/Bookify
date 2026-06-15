import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { differenceInMinutes, parse } from 'date-fns';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slotLocks: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Determine refund status
    // server current time
    const now = new Date();
    // parse booking start time on the booking date
    const dateStr = booking.date.toISOString().split('T')[0];
    const bookingStart = parse(`${dateStr} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    
    // Difference in minutes
    const diffMins = differenceInMinutes(bookingStart, now);
    const newStatus = diffMins >= 120 ? 'CANCELLED_REFUNDABLE' : 'CANCELLED_NON_REFUNDABLE';

    // Transaction to update status, remove slot locks, and auto-promote waitlisted users
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Update booking
      const b = await tx.booking.update({
        where: { id },
        data: { status: newStatus },
      });

      // 2. Delete SlotLocks so slots are free
      await tx.slotLock.deleteMany({
        where: { bookingId: id },
      });

      // 3. Extended 4.2 Waitlist Auto-promotion
      // For each slot that was freed, check if someone is waiting
      for (const slotLock of booking.slotLocks) {
        // Find the first person in the waitlist for this slot
        const nextInLine = await tx.waitlistEntry.findFirst({
          where: {
            roomId: booking.roomId,
            date: booking.date,
            slotStart: slotLock.slotStart,
            status: 'WAITING',
          },
          orderBy: { position: 'asc' },
        });

        if (nextInLine) {
          try {
            // End time is slotStart + 30 mins
            const slotStartObj = parse(`${dateStr} ${slotLock.slotStart}`, 'yyyy-MM-dd HH:mm', new Date());
            const slotEndObj = new Date(slotStartObj.getTime() + 30 * 60000);
            const endTimeStr = `${slotEndObj.getHours().toString().padStart(2, '0')}:${slotEndObj.getMinutes().toString().padStart(2, '0')}`;

            // Create new booking for promoted user
            const promotedBooking = await tx.booking.create({
              data: {
                roomId: booking.roomId,
                date: booking.date,
                startTime: slotLock.slotStart,
                endTime: endTimeStr,
                bookedBy: nextInLine.userName,
                email: nextInLine.email,
                title: 'Waitlist Auto-Promotion',
                status: 'CONFIRMED',
                slotLocks: {
                  create: [
                    { roomId: booking.roomId, date: booking.date, slotStart: slotLock.slotStart }
                  ]
                }
              }
            });

            // Update waitlist entry
            await tx.waitlistEntry.update({
              where: { id: nextInLine.id },
              data: { status: 'PROMOTED', bookingId: promotedBooking.id },
            });
          } catch (e) {
            // Ignore if creation fails (e.g. race condition), let the slot remain free
            console.error('Auto-promotion failed for slot', slotLock.slotStart, e);
          }
        }
      }

      return b;
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}

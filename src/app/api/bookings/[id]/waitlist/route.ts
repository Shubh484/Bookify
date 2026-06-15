import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { slotStart, userName, email } = body;

    if (!slotStart || !userName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slotLocks: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify the slot is actually part of this booking
    if (!booking.slotLocks.some(lock => lock.slotStart === slotStart)) {
      return NextResponse.json({ error: 'Slot is not part of this booking' }, { status: 400 });
    }

    // Check if user is already on waitlist for this exact slot
    const existingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        roomId: booking.roomId,
        date: booking.date,
        slotStart,
        email,
        status: 'WAITING',
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'You are already on the waitlist for this slot' }, { status: 400 });
    }

    // Get max position to append to end of queue
    const maxPositionEntry = await prisma.waitlistEntry.findFirst({
      where: {
        roomId: booking.roomId,
        date: booking.date,
        slotStart,
      },
      orderBy: { position: 'desc' },
    });

    const newPosition = maxPositionEntry ? maxPositionEntry.position + 1 : 1;

    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        roomId: booking.roomId,
        date: booking.date,
        slotStart,
        userName,
        email,
        position: newPosition,
        status: 'WAITING',
      },
    });

    return NextResponse.json(waitlistEntry, { status: 201 });
  } catch (error) {
    console.error('Error joining waitlist:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

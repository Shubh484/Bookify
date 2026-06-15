import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSlots } from '@/lib/slots';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'Date is required (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Get all 30-min slots for the day
    const allSlots = generateSlots(dateStr);

    // Query SlotLock for occupied slots
    const occupiedLocks = await prisma.slotLock.findMany({
      where: {
        roomId,
        date,
      },
      select: {
        slotStart: true,
        bookingId: true,
      },
    });

    const occupiedMap = new Map(occupiedLocks.map(l => [l.slotStart, l.bookingId]));

    // Construct availability array
    const availability = allSlots.map(slotStart => ({
      slotStart,
      available: !occupiedMap.has(slotStart),
      bookingId: occupiedMap.get(slotStart) || null,
    }));

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSlotList } from '@/lib/slots';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { email },
      include: { room: true },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' },
      ],
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, date, startTime, endTime, bookedBy, email, title } = body;

    if (!roomId || !date || !startTime || !endTime || !bookedBy || !email || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const bookingDateTime = new Date(year, month - 1, day, startHour, startMinute);

    if (bookingDateTime < new Date()) {
      return NextResponse.json({ error: 'Cannot book a slot in the past' }, { status: 400 });
    }

    const slots = getSlotList(startTime, endTime);
    if (slots.length === 0) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }

    // Use transaction to create booking and slot locks atomically.
    // The quota check is INSIDE the transaction so two concurrent requests
    // from the same user are serialised — at most one can succeed if the
    // quota would be exceeded.
    // The UNIQUE constraint on SlotLock will cause the transaction to fail
    // if any slot is already taken (Section 3.1 double-booking prevention).
    const result = await prisma.$transaction(async (tx) => {
      // Extended 4.5: Per-user daily quota check (4 hours = 8 × 30-min slots).
      // Performed inside the transaction so concurrent requests are serialised.
      const userBookingsToday = await tx.booking.findMany({
        where: {
          email,
          date: bookingDate,
          status: 'CONFIRMED',
        },
        select: { startTime: true, endTime: true },
      });

      let existingSlotsCount = 0;
      for (const b of userBookingsToday) {
        existingSlotsCount += getSlotList(b.startTime, b.endTime).length;
      }

      if (existingSlotsCount + slots.length > 8) {
        throw new QuotaExceededError(
          `Daily quota exceeded. You have already booked ${existingSlotsCount * 0.5} hours today. Maximum is 4 hours.`
        );
      }

      const booking = await tx.booking.create({
        data: {
          roomId,
          date: bookingDate,
          startTime,
          endTime,
          bookedBy,
          email,
          title,
          status: 'CONFIRMED',
          slotLocks: {
            create: slots.map(slotStart => ({
              roomId,
              date: bookingDate,
              slotStart,
            })),
          },
        },
        include: { room: true },
      });
      return booking;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error creating booking:', error);

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // P2002 is Prisma's unique constraint violation error code
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'One or more selected slots are already booked.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

// Custom error class so we can distinguish quota errors from other errors
class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

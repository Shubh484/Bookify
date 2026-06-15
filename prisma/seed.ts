import { PrismaClient } from '@prisma/client';
import { addHours, format, startOfToday } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.waitlistEntry.deleteMany();
  await prisma.slotLock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();

  console.log('Seeding rooms...');
  const rooms = await Promise.all([
    prisma.room.create({
      data: { name: 'Orion', location: 'Floor 1, East Wing', capacity: 6 },
    }),
    prisma.room.create({
      data: { name: 'Nebula', location: 'Floor 2, West Wing', capacity: 12 },
    }),
    prisma.room.create({
      data: { name: 'Cosmos', location: 'Floor 3, Main Hall', capacity: 20 },
    }),
    prisma.room.create({
      data: { name: 'Quasar', location: 'Floor 1, Corner Suite', capacity: 4 },
    }),
  ]);

  const today = startOfToday();
  const orionId = rooms[0].id;
  const nebulaId = rooms[1].id;
  const cosmosId = rooms[2].id;
  const quasarId = rooms[3].id;

  console.log('Seeding bookings...');

  // -----------------------------------------------------------
  // Booking 1: Orion, 09:00 - 10:00 today (past / non-refundable demo)
  // -----------------------------------------------------------
  await prisma.booking.create({
    data: {
      roomId: orionId,
      date: today,
      startTime: '09:00',
      endTime: '10:00',
      bookedBy: 'Alice',
      email: 'alice@example.com',
      title: 'Morning Sync',
      status: 'CONFIRMED',
      slotLocks: {
        create: [
          { roomId: orionId, date: today, slotStart: '09:00' },
          { roomId: orionId, date: today, slotStart: '09:30' },
        ],
      },
    },
  });

  // -----------------------------------------------------------
  // Booking 2: Nebula, starting 1 hour from now — non-refundable cancel test
  // -----------------------------------------------------------
  const oneHourFromNow = addHours(new Date(), 1);
  // Round down to nearest 30 min slot
  const nearMins = oneHourFromNow.getMinutes() < 30 ? '00' : '30';
  const nearStart = `${oneHourFromNow.getHours().toString().padStart(2, '0')}:${nearMins}`;
  const nearEndDate = new Date(oneHourFromNow);
  nearEndDate.setMinutes(nearMins === '00' ? 30 : 60 === 60 ? 0 : 60);
  if (nearMins === '30') nearEndDate.setHours(nearEndDate.getHours() + 1, 0);
  else nearEndDate.setMinutes(30);
  const nearEnd = `${nearEndDate.getHours().toString().padStart(2, '0')}:${nearEndDate.getMinutes().toString().padStart(2, '0')}`;

  // Only seed if the slot falls within working hours (08:00 - 20:00)
  if (parseInt(nearStart) >= 8 && parseInt(nearStart) < 20) {
    await prisma.booking.create({
      data: {
        roomId: nebulaId,
        date: today,
        startTime: nearStart,
        endTime: nearEnd,
        bookedBy: 'Charlie',
        email: 'charlie@example.com',
        title: 'Urgent Standup',
        status: 'CONFIRMED',
        slotLocks: {
          create: [{ roomId: nebulaId, date: today, slotStart: nearStart }],
        },
      },
    });
    console.log(`  → Non-refundable test booking: Nebula ${nearStart}-${nearEnd}`);
  }

  // -----------------------------------------------------------
  // Booking 3: Cosmos, starting 3 hours from now — refundable cancel test
  // -----------------------------------------------------------
  const threeHoursFromNow = addHours(new Date(), 3);
  const farMins = threeHoursFromNow.getMinutes() < 30 ? '00' : '30';
  const farStart = `${threeHoursFromNow.getHours().toString().padStart(2, '0')}:${farMins}`;
  const farEndDate = new Date(threeHoursFromNow);
  if (farMins === '30') farEndDate.setHours(farEndDate.getHours() + 1, 0);
  else farEndDate.setMinutes(30);
  const farEnd = `${farEndDate.getHours().toString().padStart(2, '0')}:${farEndDate.getMinutes().toString().padStart(2, '0')}`;

  if (parseInt(farStart) >= 8 && parseInt(farStart) < 20) {
    await prisma.booking.create({
      data: {
        roomId: cosmosId,
        date: today,
        startTime: farStart,
        endTime: farEnd,
        bookedBy: 'Diana',
        email: 'diana@example.com',
        title: 'Product Review',
        status: 'CONFIRMED',
        slotLocks: {
          create: [{ roomId: cosmosId, date: today, slotStart: farStart }],
        },
      },
    });
    console.log(`  → Refundable test booking: Cosmos ${farStart}-${farEnd}`);
  }

  // -----------------------------------------------------------
  // Booking 4: Quasar, tomorrow 10:00-11:00 — a multi-slot (2 slots) booking
  // -----------------------------------------------------------
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.booking.create({
    data: {
      roomId: quasarId,
      date: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      bookedBy: 'Eve',
      email: 'eve@example.com',
      title: 'Sprint Planning',
      status: 'CONFIRMED',
      slotLocks: {
        create: [
          { roomId: quasarId, date: tomorrow, slotStart: '10:00' },
          { roomId: quasarId, date: tomorrow, slotStart: '10:30' },
        ],
      },
    },
  });

  // -----------------------------------------------------------
  // Booking 5: Orion, tomorrow 14:00-15:30 — 3 slots, waitlist demo
  // -----------------------------------------------------------
  const booking5 = await prisma.booking.create({
    data: {
      roomId: orionId,
      date: tomorrow,
      startTime: '14:00',
      endTime: '15:30',
      bookedBy: 'Frank',
      email: 'frank@example.com',
      title: 'Design Workshop',
      status: 'CONFIRMED',
      slotLocks: {
        create: [
          { roomId: orionId, date: tomorrow, slotStart: '14:00' },
          { roomId: orionId, date: tomorrow, slotStart: '14:30' },
          { roomId: orionId, date: tomorrow, slotStart: '15:00' },
        ],
      },
    },
  });

  // Waitlist entries for this booking
  await prisma.waitlistEntry.create({
    data: {
      roomId: orionId,
      date: tomorrow,
      slotStart: '14:00',
      userName: 'Bob',
      email: 'bob@example.com',
      position: 1,
      status: 'WAITING',
    },
  });

  await prisma.waitlistEntry.create({
    data: {
      roomId: orionId,
      date: tomorrow,
      slotStart: '14:00',
      userName: 'Grace',
      email: 'grace@example.com',
      position: 2,
      status: 'WAITING',
    },
  });

  // -----------------------------------------------------------
  // A cancelled booking for history display
  // -----------------------------------------------------------
  await prisma.booking.create({
    data: {
      roomId: nebulaId,
      date: today,
      startTime: '11:00',
      endTime: '11:30',
      bookedBy: 'Alice',
      email: 'alice@example.com',
      title: 'Cancelled Demo',
      status: 'CANCELLED_REFUNDABLE',
    },
  });

  console.log('Seeding complete. Created 4 rooms and realistic bookings.');
  console.log('Test accounts: alice@example.com, charlie@example.com, diana@example.com, eve@example.com, frank@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

  console.log('Seeding bookings...');
  // A booking for today in Orion, 09:00 - 10:00
  const booking1 = await prisma.booking.create({
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

  // A waitlist entry for the same slot
  await prisma.waitlistEntry.create({
    data: {
      roomId: orionId,
      date: today,
      slotStart: '09:00',
      userName: 'Bob',
      email: 'bob@example.com',
      position: 1,
      status: 'WAITING',
    },
  });

  // Add more seed data to simulate the user quota and other scenarios
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

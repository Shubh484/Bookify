# Meeting Room Booking System

A full-stack Next.js application that provides a modern, interactive meeting room booking experience with robust concurrency safeguards.

## Features

- **Modern Glassmorphism UI**: Built with Tailwind CSS, featuring deep colors, blurs, and interactive micro-animations.
- **Robust Concurrency (Section 3.1)**: Double-booking is mathematically impossible due to a PostgreSQL `UNIQUE` constraint on a `SlotLock` table.
- **Refund Logic (Section 3.2)**: Cancellations >2 hours before the meeting start time are refundable.
- **Extended Requirements Implemented (Section 4)**:
  - **4.2 Waitlist & Auto-Promotion**: Waitlist entries can be created for booked slots. When a booking is cancelled, the first waitlisted user is atomically promoted and booked.
  - **4.5 Daily Quota**: Users are restricted to booking a maximum of 4 hours per day. This is enforced at the transaction level.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Docker container)
- **ORM**: Prisma (v6)
- **Styling**: Tailwind CSS

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Database**
   ```bash
   docker compose up -d
   ```

3. **Initialize Database**
   ```bash
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Concurrency Test**
   While the server is running, you can run the provided demo script to fire two identical requests at the same time:
   ```bash
   ./scripts/test-concurrency.sh
   ```

## Architecture Notes

The double-booking prevention relies on the `SlotLock` model in Prisma:

```prisma
model SlotLock {
  id        String   @id @default(cuid())
  roomId    String
  date      DateTime @db.Date
  slotStart String   // "09:00"
  bookingId String

  @@unique([roomId, date, slotStart], name: "room_slot_unique")
}
```

By using `prisma.$transaction()`, we insert the booking and all related `SlotLock` rows atomically. If any slot is already taken, the unique constraint violation rolls back the entire transaction.
# Bookify
# Bookify

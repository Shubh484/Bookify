# Bookify — Meeting Room Booking System

A full-stack Next.js application for booking meeting rooms with **database-level concurrency safeguards** that make double-booking physically impossible.

## ✅ Features Implemented

### Core Requirements (Section 3)

| Requirement | How it's implemented |
|---|---|
| **3.1 No double-booking** | `SlotLock` model with a `@@unique([roomId, date, slotStart])` constraint. Booking + lock creation happen inside a single `prisma.$transaction()`. If two requests race, the unique index rejects the second with a `P2002` error → HTTP 409. |
| **3.2 Refund-window rule** | On cancellation, the server computes `differenceInMinutes(bookingStart, now)`. ≥ 120 min → `CANCELLED_REFUNDABLE`; otherwise → `CANCELLED_NON_REFUNDABLE`. Decision uses `new Date()` on the server — never a client timestamp. Slots are freed immediately. |
| **3.3 Consistent availability** | The availability grid queries `SlotLock` — the same table that enforces uniqueness — so a slot shown "available" is genuinely bookable. |

### Extended Requirements (Section 4) — 2 of 5 implemented

| Requirement | How it's implemented |
|---|---|
| **4.2 Waitlist with auto-promotion** | Users can join a waitlist for a booked slot. On cancellation, the first `WAITING` entry is atomically promoted inside the same `$transaction` that deletes the old `SlotLock`s and creates new ones. Race-safe: the unique index on `SlotLock` guarantees exactly one promotion. |
| **4.5 Per-user daily quota (4 hrs)** | The quota check (`≤ 8 × 30-min slots per day`) runs **inside** the transaction, so two near-simultaneous requests from the same user are serialised. Cancelling frees quota. |

### Frontend

- **`/rooms`** — Room list with glassmorphism cards
- **`/rooms/[id]`** — Slot grid for a selected date; unavailable slots blocked; grid refreshes without full page reload
- **`/bookings`** — Lookup by email; cancel with confirmation; refundable/non-refundable badge; past/cancelled bookings can't be re-cancelled

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB (via Docker with replica set for transactions)
- **ORM**: Prisma 6 (MongoDB provider)
- **Styling**: Tailwind CSS 4

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start MongoDB (Docker)

```bash
docker compose up -d
```

This starts a single-node MongoDB replica set on port `27018` (required for Prisma transactions).

### 3. Push the schema & seed

```bash
npx prisma db push
npx ts-node prisma/seed.ts
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run the concurrency demo

While the server is running:

```bash
./scripts/test-concurrency.sh
```

This fires two simultaneous booking requests for the same slot. One should succeed (201), the other should fail with a 409 conflict.

## Architecture: Double-Booking Prevention

```
┌──────────────────────────────────────────┐
│          POST /api/bookings              │
│                                          │
│  prisma.$transaction(async (tx) => {     │
│    1. Check daily quota (inside tx)      │
│    2. Create Booking row                 │
│    3. Create SlotLock rows               │
│       @@unique([roomId, date, slotStart])│
│  })                                      │
│                                          │
│  If any SlotLock already exists:         │
│    → P2002 unique constraint violation   │
│    → Entire transaction rolls back       │
│    → Client gets HTTP 409               │
└──────────────────────────────────────────┘
```

The key insight: a simple "read-then-write" check has a TOCTOU (Time of Check to Time of Use) gap. Two requests can both read "slot is free" and then both write. By using a **unique index**, the database itself rejects the second write — no gap is possible.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string | `mongodb://localhost:27018/meeting_rooms?replicaSet=rs0` |

## Seed Data

The seed script creates:
- **4 rooms**: Orion, Nebula, Cosmos, Quasar
- **Bookings starting within 1 hour** (for non-refundable cancel testing)
- **Bookings starting in 3+ hours** (for refundable cancel testing)
- **A booking with 2 waitlist entries** (for auto-promotion demo)
- **A cancelled booking** (for history display)
- Test accounts: `alice@example.com`, `charlie@example.com`, `diana@example.com`, `eve@example.com`, `frank@example.com`

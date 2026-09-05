# 🏏 Real-Time Auction Platform (BPL 2026)

A production-quality, real-time auction web platform with three distinct roles (**Auctioneer**, **Bidder**, **Spectator**), backed by **PostgreSQL/SQLite + Prisma ORM**, a single authoritative real-time state machine & server countdown timer (**Socket.IO**), atomic transactions with concurrency race-condition prevention, and dark luxury UI dashboards.

---

## 🌟 Key Capabilities & Architectural Highlights

1. **Authoritative Server Clock & Anti-Snipe Extension**:
   - The countdown timer runs entirely on the server.
   - If a valid bid arrives within the last **5 seconds** of the countdown (`antiSnipeThreshold`), the timer automatically extends by **10 seconds** (`antiSnipeExtension`) and broadcasts the updated expiry to all connected clients.

2. **Atomic Concurrency & Bidding Invariant Protection**:
   - Concurrent bids execute inside Prisma interactive transactions (`prisma.$transaction`).
   - Prevents near-simultaneous bids from double-incrementing.
   - Strict budget invariant: `remainingBudget = initialBudget - totalSpent`.

3. **Role-Enforced Workflows**:
   - **Auctioneer**: Create auction, set initial team budgets, bring lots to the hammer, pause/resume/start/end/cancel auction, hammer deal (SOLD), mark UNSOLD, and undo last finalization.
   - **Bidder**: Interactive quick-bid increments (`+₹5L`, `+₹10L`, `+₹25L`, `+₹50L`), custom bid input, projected remaining purse calculator, auto-disables on insufficient funds or invalid status.
   - **Spectator**: Presentation broadcast mode with live streaming bid feed, lot portraits, and franchise purse telemetry.

4. **1-Click Demo Persona Switcher**:
   - Embedded floating demo bar allowing instantaneous switching between Auctioneer, Bidder 1 (RCB), Bidder 2 (CSK), and Spectator.

---

## 🔑 Demo Accounts & Credentials

| Role | Name | Email | Password | Initial Purse |
|---|---|---|---|---|
| **Auctioneer** | Richard Madley | `auctioneer@bpl.com` | `Password123!` | Admin Controller |
| **Bidder 1** | Virat (RCB) | `bidder1@rcb.com` | `Password123!` | ₹10,00,00,000 (10 Cr) |
| **Bidder 2** | Dhoni (CSK) | `bidder2@csk.com` | `Password123!` | ₹10,00,00,000 (10 Cr) |
| **Spectator** | Fan Broadcast | `spectator@fan.com` | `Password123!` | Read-Only |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **npm** or **yarn**

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database & Seed Demo Auction
```bash
# Push schema to database
npx prisma db push

# Seed demo auction, teams, and 6 elite cricket players
npx tsx prisma/seed.ts
```

### 4. Run Concurrency & Integrity Tests
```bash
npx tsx tests/concurrency.test.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 Real-Time WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `join_auction` / `leave_auction` | Client → Server | Joins or leaves auction room |
| `auction_started` | Server → Room | Fired when auction transitions to `LIVE` |
| `auction_paused` / `auction_resumed` | Server → Room | Pause/Resume live state |
| `player_started` | Server → Room | Next lot brought under the hammer with timer |
| `bid_placed` | Server → Room | Valid bid committed; triggers anti-snipe extension if within 5s |
| `timer_updated` | Server → Room | Authoritative second tick and timestamp expiry |
| `player_sold` | Server → Room | Deal finalized (hammer); winner purse deducted |
| `player_unsold` | Server → Room | Item passed without buyer |
| `player_undo_finalized` | Server → Room | Deal reversed, budget restored to winner |
| `participant_updated` | Server → Room | Remaining purse and spend update |
| `spectator_count_updated` | Server → Room | Current active connected socket count |

---

## 📊 Results & Data Export

The platform provides live results and certified ledger reports available at `/auction/:id/results` or via API:
- **CSV Download**: `GET /api/auctions/:id/export?format=csv`
- **JSON Export**: `GET /api/auctions/:id/export?format=json`

---

## 🚢 Production Deployment

1. **Environment Variables**: Set `DATABASE_URL` (e.g. Neon, Supabase, Railway Postgres) and `JWT_SECRET`.
2. **Build**: `npm run build`
3. **Start**: `npm start`

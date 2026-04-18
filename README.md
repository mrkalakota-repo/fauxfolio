# StockSim — Paper Trading Simulator

A production-quality stock trading simulator that mimics real retail trading platforms (Robinhood-style).
**No real money involved — purely educational.**

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or use SQLite for zero-config local dev)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` with your database URL and a strong JWT secret.

**Option A — PostgreSQL (recommended)**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/stocksim"
```

**Option B — SQLite (zero setup)**
1. Change `prisma/schema.prisma` line 6: `provider = "sqlite"`
2. Set `DATABASE_URL="file:./dev.db"` in `.env.local`

### 3. Initialize database
```bash
npx prisma generate      # Generate Prisma client
npm run db:push          # Create tables
npm run db:seed          # Seed 20 stocks + demo account
```

### 4. Start the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Demo credentials
```
Email:    demo@stocksim.app
Password: demo1234
```

---

## Features

| Feature | Status |
|---------|--------|
| Register / Login (JWT) | ✅ |
| $10,000 virtual starting balance | ✅ |
| 20 pre-seeded stocks across 8 sectors | ✅ |
| Realistic price simulation (GBM model) | ✅ |
| Market orders (instant execution) | ✅ |
| Limit orders (auto-fill on price hit) | ✅ |
| Real-time price updates (4s polling) | ✅ |
| Portfolio P&L + charts | ✅ |
| Watchlist | ✅ |
| Order history with cancel | ✅ |
| Allocation pie chart | ✅ |
| Markets browser with sorting/filtering | ✅ |
| Dark mode (always-on dark theme) | ✅ |
| Mobile responsive | ✅ |

---

## Architecture

```
src/
├── app/
│   ├── (app)/           ← Protected app pages (auth required)
│   │   ├── dashboard/   ← Portfolio overview + top movers
│   │   ├── stock/[sym]/ ← Stock detail + trading panel
│   │   ├── portfolio/   ← Holdings + allocation chart
│   │   ├── markets/     ← All stocks browser
│   │   ├── watchlist/   ← Tracked stocks
│   │   └── orders/      ← Order history
│   ├── api/             ← API routes (Next.js App Router)
│   ├── login/
│   └── register/
├── components/
│   ├── charts/          ← Recharts wrappers
│   ├── layout/          ← AppShell, Sidebar
│   └── trading/         ← TradingPanel, OrderConfirmModal
└── lib/
    ├── auth.ts          ← JWT helpers
    ├── db.ts            ← Prisma singleton
    ├── simulation.ts    ← GBM price engine
    └── utils.ts         ← Formatters
```

## Price Simulation

Prices update every 4 seconds using a simplified Geometric Brownian Motion model:

```
newPrice = currentPrice × (1 + drift + σ×N(0,1) + meanReversion)
```

- **Drift**: +0.002% per tick (slight positive bias)
- **Volatility (σ)**: 1.5% per tick
- **Sector correlation**: tech stocks move together
- **Mean reversion**: prevents runaway prices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Auth**: JWT (jose) + httpOnly cookies
- **ORM**: Prisma
- **Database**: PostgreSQL / SQLite
- **UI State**: SWR (auto-revalidation)

---

## Disclaimer

> ⚠️ **This is a simulated paper trading environment for educational purposes only.**
> No real money, no real brokerage integrations, no real financial transactions.
> Past simulated performance does not indicate real-world results.

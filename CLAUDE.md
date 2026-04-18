# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev               # Start Next.js dev server on :3000
npm run build             # Production build
npm run lint              # ESLint

# Database
npm run db:push           # Apply schema changes to SQLite (use --accept-data-loss if columns removed)
npm run db:seed           # Seed 25 stocks + demo user (phone: 5555550100, PIN: 123456)
npm run db:studio         # Open Prisma Studio
npm run db:generate       # Regenerate Prisma client after schema changes

# Mobile (run from ~/Developer/StockTrader-Simulator, NOT ~/Documents/)
npx cap sync              # Sync web assets and plugins to ios/ and android/
npx cap open ios          # Open Xcode
npx cap open android      # Open Android Studio
```

**npm install** always requires `--legacy-peer-deps` due to `eslint-config-next@16` requiring eslint >=9 while the project pins eslint@8.

**Node version**: Must use Node 22+ (`nvm use 22`). Capacitor 8 requires >=22; Node 25 breaks `semver` resolution.

## Environment Variables

Two separate env files are required:
- `.env` — read by Prisma CLI only: `DATABASE_URL="file:./dev.db"`
- `.env.local` — read by Next.js: all other vars including `FINNHUB_API_KEY`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`

## Architecture

### Next.js App Router
All routes use the App Router (`src/app/`). Route params are `Promise<{symbol: string}>` and must be `await`ed. `cookies()` from `next/headers` is also async and must be awaited.

### Authentication
JWT stored in an httpOnly cookie named `fauxfolio_token` (7-day expiry). Auth uses phone number + PIN — no email/password. Phone is normalized to 10 digits; PIN is bcrypt-hashed.

- `getSessionUser()` — server components and API routes
- `getSessionUserFromRequest(req)` — middleware-style API route auth

### Price Engine
`SimulationTicker` (client component, rendered in `AppShell`) POSTs to `/api/simulation/tick` every 8 seconds. The tick route:
1. During market hours + Finnhub key: fetches real prices for 5 stocks (rotating batch, stalest first) to stay within the 60 req/min rate limit
2. Otherwise: runs Geometric Brownian Motion simulation with sector correlations

Stocks are created on-demand when first requested via `/api/stocks/[symbol]` — it calls Finnhub profile + quote and upserts to DB.

### Database (SQLite via Prisma)
SQLite constraints that differ from Postgres:
- No enum types — use `String` fields with comments listing valid values
- No BigInt — `volume` and `marketCap` are `Float` (market caps exceed 32-bit INT)
- `db push --force-reset` required when adding non-nullable columns to existing tables

Prisma client is a singleton in `src/lib/db.ts` to avoid hot-reload connection exhaustion.

### Payments
`src/lib/stripe.ts` exports a nullable `stripe` instance — when `STRIPE_SECRET_KEY` is unset, checkout directly credits $10,000 and returns `{ devMode: true }`. The client checks for `devMode` and skips redirect.

### Mobile (Capacitor)
The app runs in **server URL mode** — Capacitor's WebView loads the deployed Next.js URL, not a static export. This means API routes work normally; no static export needed.

- Dev: `capacitor.config.ts` points to `http://localhost:3000`
- Prod: set `CAPACITOR_SERVER_URL=https://your-deployment.vercel.app` before `npx cap sync`

**Critical**: The project must live in `~/Developer/`, NOT `~/Documents/`. iCloud Drive stamps `com.apple.macl` onto directories in Documents, and Xcode's sandboxed build tools (`actool`) cannot read those files.

**Capacitor plugin rule**: Never `return` a Capacitor plugin directly from an `async` function. The plugin proxy has a `.then` property (all property access is intercepted), so the async machinery treats it as a thenable and calls `.then()` on the native bridge. Always wrap: `return { plugin: App }`.

Use `window.Capacitor.getPlatform()` for platform detection — more reliable than importing `@capacitor/core` in a Next.js bundle context.

`useAndroidBack` and `backButton` listener are Android-only — always guard with `getPlatform() !== 'android'` before importing `@capacitor/app`.

### Data Fetching Pattern
Client components use SWR with a simple `fetch` fetcher. Revalidation intervals vary by screen (portfolio: 10s, markets: 15s, dashboard: 10s). `mutate('/api/portfolio')` and `mutate('/api/orders')` are called after order placement to refresh immediately.

### Leaderboard
`/api/leaderboard` is public (no auth). Rankings are computed as `totalReturnPct = (cashBalance + holdingsValue - invested) / invested * 100`. `invested = 10000 + totalTopUps * 10000`. Names are masked for privacy: "Alex Johnson" → "Alex J."

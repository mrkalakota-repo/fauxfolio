# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev               # Start Next.js dev server (port 3000, or next available)
npm run build             # Production build (runs prisma generate first)
npm run lint              # ESLint

# Database
npm run db:push           # Apply schema changes (add --accept-data-loss if columns removed)
npm run db:seed           # Seed 25 stocks + demo user (phone: 5555550100, PIN: 123456)
npm run db:seed-profiles  # Seed 100 fake traders for leaderboard demo (must use prod DATABASE_URL)
npm run db:studio         # Open Prisma Studio
npm run db:generate       # Regenerate Prisma client after schema changes

# Mobile (must be in ~/Developer/StockTrader-Simulator — see Mobile section)
npx cap sync              # Sync web assets and plugins to ios/ and android/
npx cap open ios          # Open Xcode
npx cap open android      # Open Android Studio
```

**npm install** always requires `--legacy-peer-deps` — `eslint-config-next@16` requires eslint >=9 but the project pins eslint@8.

**Node version**: Must use Node 22 (`nvm use 22`). Capacitor 8 requires >=22; Node 25 breaks `semver` resolution.

## Environment Variables

Two env files for local dev:
- `.env` — Prisma CLI only: `DATABASE_URL="file:./dev.db"`
- `.env.local` — Next.js: `JWT_SECRET`, `FINNHUB_API_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, etc.

**Cloudflare Turnstile** (bot protection on login/register): requires both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client-side, embedded at build time) and `TURNSTILE_SECRET_KEY` (server-side verify). If either is unset the widget silently disappears and all requests pass — safe for local dev. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be echoed into `.env.production` in `amplify.yml` so Next.js embeds it at build time.

**On AWS Amplify**: env vars set in the Amplify Console are NOT automatically injected into the SSR Lambda at runtime. The `amplify.yml` build phase writes them to `.env.production` so Next.js picks them up inside the Lambda package.

## Architecture

### Next.js App Router
All routes use App Router (`src/app/`). Route params are `Promise<{symbol: string}>` and must be `await`ed. `cookies()` from `next/headers` is async and must be awaited.

### Authentication
JWT stored in an httpOnly cookie named `fauxfolio_token` (7-day expiry). Auth uses phone number + PIN — no email/password. Phone normalized to 10 digits; PIN bcrypt-hashed.

- `getSessionUser()` — for server components and API routes using `cookies()`
- `getSessionUserFromRequest(req)` — for API routes that receive `NextRequest`

`getJwtSecret()` in `src/lib/auth.ts` is intentionally **lazy** (called at use-time, not module load). Do not move it back to a top-level `const` — this caused Amplify Lambda cold-start failures.

### Routing Convention
Next.js 16 renamed `middleware.ts` → `proxy.ts`. Only `src/proxy.ts` should exist — having both causes a build error. The proxy enforces HTTPS redirect in production.

### Rate Limiting
`src/lib/rateLimit.ts` — in-memory Map-based limiter (no Redis). Works correctly for single-process deployments. `RATE_LIMITS` constants:

| Key | Limit | Window |
|-----|-------|--------|
| `AUTH` | 5 attempts | 15 min |
| `REGISTER` | 3 accounts | 1 hour |
| `SEARCH` | 60 requests | 1 min |
| `PAYMENT` | 5 attempts | 1 hour |
| `LEADERBOARD` | 30 requests | 1 min |
| `TICK` | 20 requests | 1 min (fires ~7/min normally) |

### Price Engine
`SimulationTicker` (client component in `AppShell`) POSTs to `/api/simulation/tick` every 8 seconds. The tick route:
1. During market hours + Finnhub key: fetches real prices for 5 stocks (rotating batch, stalest first) to respect the 60 req/min rate limit
2. Otherwise: runs Geometric Brownian Motion simulation with sector correlations

Stocks are created on-demand when first viewed via `/api/stocks/[symbol]` — calls Finnhub profile + quote and upserts to DB.

### Database
Schema provider is `postgresql` for production. Local dev uses SQLite via the `.env` split.

SQLite-specific constraints (relevant if reverting to SQLite locally):
- No enum types — use `String` fields
- No BigInt — `volume` and `marketCap` are `Float`

Prisma client is a singleton in `src/lib/db.ts` to avoid hot-reload connection exhaustion.

### Payments & Virtual Cash Packs
`src/lib/stripe.ts` exports a nullable `stripe` instance. When `STRIPE_SECRET_KEY` is unset, checkout directly credits virtual cash and returns `{ devMode: true }`. The client checks for `devMode` and skips Stripe redirect.

Available cash packs are defined in `src/components/GetMoreCash.const.ts`:

| Pack ID | Price | Virtual Cash | `topUpUnits` |
|---------|-------|-------------|-------------|
| `starter` | $1.00 | $10,000 | 1 |
| `booster` | $2.99 | $50,000 | 5 |
| `mega` | $4.99 | $100,000 | 10 |

`topUpUnits` keeps the leaderboard formula accurate: `invested = 10000 + totalTopUps * 10000`. Larger packs increment `totalTopUps` by their `topUpUnits` value, not by 1.

The checkout route (`/api/payments/create-checkout`) accepts a `packId` in the request body. Webhook at `/api/payments/webhook` uses idempotency via `stripeSessionId` and always reads `virtualAmount` from the DB record — never from Stripe metadata.

### Mobile (Capacitor)
Server URL mode — Capacitor WebView loads the deployed URL, no static export needed.

- Dev: `capacitor.config.ts` points to `http://localhost:3000`
- Prod: set `CAPACITOR_SERVER_URL=https://your-domain.com` before `npx cap sync`

**Critical location**: Project must be in `~/Developer/`, NOT `~/Documents/`. iCloud Drive stamps `com.apple.macl` onto files in Documents; Xcode's sandboxed `actool` subprocess cannot read them.

**Capacitor plugin proxy rule**: Never `return` a Capacitor plugin directly from an `async` function. The plugin uses a JS `Proxy` that intercepts all property access including `.then` — async machinery detects a thenable and calls `.then()` on the native bridge, crashing with `App.then() is not implemented on iOS`. Always wrap: `return { Haptics: mod.Haptics }`.

Use `window.Capacitor.getPlatform()` for platform detection — more reliable than importing `@capacitor/core` in a Next.js bundle context. `useAndroidBack` is Android-only; always guard with `getPlatform() !== 'android'`.

### Data Fetching
Client components use SWR with a `fetch` fetcher. After order placement, call `mutate('/api/portfolio')` and `mutate('/api/orders')` to refresh immediately.

### Leaderboard
`/api/leaderboard` is public (no auth). Returns two separate rankings from one query:
- `leaderboard` — top 10 sorted by `totalReturnPct` (best strategy)
- `richest` — single entry with highest absolute `totalValue` (used for the "World's Richest Trader" banner)

Formula: `totalReturnPct = (cashBalance + holdingsValue - invested) / invested * 100`. `invested = 10000 + totalTopUps * 10000`. Names masked: "Alex Johnson" → "Alex J."

### Options Trading
Paper options priced via Black-Scholes in `src/lib/simulation.ts`. Key exports: `blackScholes(S,K,T,r,sigma,type)`, `generateOptionChain(symbol, currentPrice, sector)`, `deriveImpliedVolatility(sector)`.

Chain: 9 strikes (×0.80–1.20 from spot) × 7 expiries (4 weekly Fridays + 3 monthly last-Fridays) × CALL+PUT = up to 126 contracts per symbol. Contracts are upserted lazily in `/api/options/[symbol]` when fewer than 10 non-expired remain.

Options expiration runs inside the existing `$transaction` in `/api/simulation/tick` — ITM positions settle at intrinsic value, cash credited, status → `EXPIRED`.

### Leagues
Private 30-day competitions. Models: `League`, `LeagueMember`, `LeagueInvite`.

`startingPortfolio` is snapshotted at join time (not account creation) for fair growth% comparison. Leaderboard formula: `growthPct = (currentValue - startingPortfolio) / startingPortfolio * 100`.

Lazy finalization: on any GET to `/api/leagues/[id]` after `endsAt < now`, the route sets `status = 'ENDED'`, computes final ranks, and writes `LeagueMember.finalPortfolio` + `rank` — no background job needed.

Invites are by phone number (existing users only). Token-based join link: `/leagues/[id]/join?token=X`. The join page is a client component that auto-POSTs on mount (server components can't forward cookies to their own API).

### Premium Feature Gate
Both Options Trading and Leagues require `user.totalTopUps >= 1` (any cash pack purchase). Gate pattern used in all gated API routes:
```ts
if (!user || user.totalTopUps < 1) {
  return NextResponse.json({ error: '...', upgradeRequired: true }, { status: 403 })
}
```
Frontend detects `upgradeRequired: true` on a 403 to open `GetMoreCashModal`.

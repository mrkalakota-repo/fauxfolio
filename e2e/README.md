# Fauxfolio E2E Test Suite

Playwright-based end-to-end tests for the Fauxfolio paper trading platform.

## Setup

```bash
# 1. Install Playwright (from project root)
npm install --save-dev @playwright/test --legacy-peer-deps
npx playwright install chromium

# 2. Ensure the dev server is seeded and running
npm run db:push
npm run db:seed
npm run dev  # keep running in another terminal
```

## Running Tests

```bash
# All tests (authenticated + unauthenticated)
npx playwright test --config e2e/playwright.config.ts

# Unauthenticated tests only (auth, session)
npx playwright test --config e2e/playwright.config.ts --project=unauthenticated

# Authenticated tests only
npx playwright test --config e2e/playwright.config.ts --project=chromium

# Single spec file
npx playwright test --config e2e/playwright.config.ts e2e/tests/trading.spec.ts

# Interactive UI mode
npx playwright test --config e2e/playwright.config.ts --ui

# Debug a single test
npx playwright test --config e2e/playwright.config.ts --debug e2e/tests/auth.unauth.spec.ts
```

## Reports

After each run, two reports are generated:

| Report | Location |
|--------|----------|
| JSON (custom reporter) | `e2e/reports/test-results.json` |
| HTML (built-in) | `e2e/playwright-report/index.html` |

Open the HTML report:
```bash
npx playwright show-report e2e/playwright-report
```

## Structure

```
e2e/
├── playwright.config.ts         # Playwright configuration
├── reporters/
│   └── custom-reporter.ts       # JSON reporter with timestamps + failure reasons
├── fixtures/
│   └── auth.fixture.ts          # Login helpers, DEMO_USER, uniquePhone()
├── pages/                       # Page Object Models
│   ├── login.page.ts
│   ├── register.page.ts
│   ├── dashboard.page.ts
│   ├── markets.page.ts
│   ├── stock.page.ts
│   ├── portfolio.page.ts
│   ├── orders.page.ts
│   ├── watchlist.page.ts
│   ├── options.page.ts
│   ├── payment.page.ts
│   └── leagues.page.ts
├── tests/
│   ├── auth.setup.ts            # Global auth setup (saves cookie state)
│   ├── auth.unauth.spec.ts      # Login/register/session (unauthenticated project)
│   ├── dashboard.spec.ts
│   ├── trading.spec.ts          # Stock buy/sell
│   ├── options.spec.ts          # Options trading (premium gate + flow)
│   ├── payments.spec.ts         # Stripe cash packs (dev mode)
│   ├── watchlist.spec.ts
│   ├── orders.spec.ts
│   ├── leagues.spec.ts          # Leagues (premium gate + flow)
│   ├── leaderboard.spec.ts      # Public leaderboard API
│   └── profile.spec.ts          # PIN change
└── .auth/
    └── user.json                # Saved auth state (git-ignored)
```

## Environment Variables

Override `BASE_URL` to run against staging or production:

```bash
BASE_URL=https://staging.fauxfolio.com npx playwright test --config e2e/playwright.config.ts
```

## CI Integration

```yaml
# Example GitHub Actions step
- name: Run E2E tests
  run: |
    npm run dev &
    sleep 10
    npx playwright test --config e2e/playwright.config.ts
  env:
    BASE_URL: http://localhost:3000
```

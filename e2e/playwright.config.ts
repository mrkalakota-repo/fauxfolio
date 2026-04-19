import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  globalSetup: './global-setup.ts',

  reporter: [
    ['list'],
    ['./reporters/custom-reporter.ts'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.unauth\.spec\.ts/,
    },
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
    // Pass DATABASE_URL from the shell so you can override without editing .env:
    //   DATABASE_URL="postgresql://..." npx playwright test --config e2e/playwright.config.ts
    env: process.env.DATABASE_URL
      ? { DATABASE_URL: process.env.DATABASE_URL }
      : {},
  },
});

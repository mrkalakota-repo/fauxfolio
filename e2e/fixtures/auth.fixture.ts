import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const DEMO_USER = {
  phone: '5555550100',
  pin: '123456',
};

// A fresh phone generated per test run to avoid collisions
export function uniquePhone(): string {
  const ts = Date.now().toString().slice(-9);
  return `1${ts}`.padEnd(10, '0').slice(0, 10);
}

export async function loginAs(page: Page, phone = DEMO_USER.phone, pin = DEMO_USER.pin) {
  await page.goto('/login');
  await page.getByLabel(/phone/i).fill(phone);
  await page.getByLabel(/pin/i).fill(pin);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

export async function registerUser(page: Page, phone: string, pin: string) {
  await page.goto('/register');
  await page.getByLabel(/phone/i).fill(phone);
  // Most register forms have two PIN fields (PIN + confirm)
  const pinInputs = page.getByLabel(/pin/i);
  await pinInputs.nth(0).fill(pin);
  await pinInputs.nth(1).fill(pin);
  await page.getByRole('button', { name: /register|create account|sign up/i }).click();
}

// Fixture type extension
type AuthFixtures = {
  loggedInPage: Page;
};

export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    await loginAs(page);
    await use(page);
  },
});

export { expect };

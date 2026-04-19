import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

export const DEMO_USER = {
  phone: '(555) 555-0100', // formatted as PhoneInput displays it
  phoneRaw: '5555550100',
  pin: '123456',
};

/** Generates a unique 10-digit phone number to avoid collisions between test runs. */
export function uniquePhone(): string {
  // Use timestamp digits; format to match PhoneInput's (XXX) XXX-XXXX output
  const digits = ('9' + Date.now().toString().slice(-9)).slice(0, 10);
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function loginAs(page: Page, useDemo = true) {
  const login = new LoginPage(page);
  await login.goto();
  if (useDemo) {
    await login.loginAsDemo();
  } else {
    await login.login(DEMO_USER.phone, DEMO_USER.pin);
  }
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
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

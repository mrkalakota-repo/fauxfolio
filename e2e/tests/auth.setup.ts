/**
 * Global setup: logs in as the demo user and saves auth cookie state.
 * All authenticated test projects depend on this.
 */
import { test as setup, expect } from '@playwright/test';
import { DEMO_USER } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate as demo user', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(DEMO_USER.phone, DEMO_USER.pin);

  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

  // Persist the fauxfolio_token cookie for all authenticated tests
  await page.context().storageState({ path: AUTH_FILE });
});

/**
 * Global setup: logs in as the demo user and saves auth cookie state.
 * All authenticated test projects depend on this.
 */
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate as demo user', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  // Use the pre-fill button — most robust path through the opacity-0 PIN input
  await login.loginAsDemo();

  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  await page.context().storageState({ path: AUTH_FILE });
});

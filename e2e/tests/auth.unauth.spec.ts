/**
 * Authentication test suite — runs WITHOUT saved auth state.
 * Covers login, registration, and session-boundary scenarios.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DEMO_USER, uniquePhone } from '../fixtures/auth.fixture';

// ─── Happy Path ──────────────────────────────────────────────────────────────

test.describe('Auth – happy path', () => {
  test('demo user can log in via demo button and reach dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAsDemo();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'fauxfolio_token')).toBe(true);
  });

  test('demo user can log in by typing credentials and reach dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.phone, DEMO_USER.pin);
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  });

  test('new user can register and is redirected to dashboard', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, '998877');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  });

  test('logged-in user can log out and cookie is cleared', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAsDemo();
    await expect(page).toHaveURL(/dashboard/);

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    // Wait specifically for the login page — /login|\// would match any URL immediately
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'fauxfolio_token')).toBe(false);
  });
});

// ─── Non-Happy Path: Login ────────────────────────────────────────────────────

test.describe('Auth – login edge cases', () => {
  test('wrong PIN shows error toast', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.phone, '000000');
    // react-hot-toast renders outside the form; look for any visible error text
    await expect(
      page.getByText(/invalid|incorrect|failed|wrong/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 8_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('unregistered phone shows error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('(999) 000-0001', '123456');
    await expect(
      page.getByText(/not found|invalid|failed/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('PIN shorter than 4 digits keeps submit disabled', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.phoneInput.fill(DEMO_USER.phone);
    await login.pinInput.fill('12', { force: true });
    // Button is disabled when pin.length < 4
    await expect(login.submitButton).toBeDisabled();
  });

  test('rate limit triggers after 5 failed login attempts', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // Make 6 attempts — the rate limit window is 5/15 min, so at least the last
    // attempt must trigger a 429 regardless of prior counter state in this run.
    for (let i = 0; i < 6; i++) {
      await login.phoneInput.fill(DEMO_USER.phone);
      await login.pinInput.fill('111111', { force: true });
      await login.submitButton.click();
      // After the rate limit kicks in the alert stays visible; stop looping
      const rateLimitVisible = await page
        .getByText(/rate limit|too many|try again/i)
        .isVisible()
        .catch(() => false);
      if (rateLimitVisible) break;
      await page.waitForTimeout(200);
    }

    await expect(
      page.getByText(/rate limit|too many|try again/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('empty form — submit button is disabled', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.submitButton).toBeDisabled();
  });
});

// ─── Non-Happy Path: Registration ─────────────────────────────────────────────

test.describe('Auth – registration edge cases', () => {
  test('duplicate phone number shows error after step 2', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(DEMO_USER.phone, '123456');
    await expect(
      page.getByText(/exists|taken|already|duplicate/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('short phone number blocks step 1 Continue', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.nameInput.fill('Test User');
    await reg.phoneInput.fill('(123) 456'); // only 6 digits
    await reg.continueButton.click();
    // Should stay on step 1 — step 2 button should NOT appear
    await expect(reg.createAccountButton).not.toBeVisible({ timeout: 3_000 });
  });

  test('missing name blocks step 1 Continue', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.phoneInput.fill(uniquePhone());
    await reg.continueButton.click();
    await expect(reg.createAccountButton).not.toBeVisible({ timeout: 3_000 });
  });

  test('mismatched PINs show inline validation and disable Create Account', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    // Step 1
    await reg.nameInput.fill('Test User');
    await reg.phoneInput.fill(uniquePhone());
    await reg.continueButton.click();
    // Step 2 — fill mismatched PINs
    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('111111', { force: true });
    await pinInputs.nth(1).fill('222222', { force: true });
    // Inline mismatch message
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 3_000 });
    await expect(reg.createAccountButton).toBeDisabled();
  });

  test('all-same-digit PIN is rejected after submit', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, '111111');
    await expect(
      page.getByText(/same digit|not allowed/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('PIN shorter than 4 digits keeps Create Account disabled', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.nameInput.fill('Test User');
    await reg.phoneInput.fill(uniquePhone());
    await reg.continueButton.click();
    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('12', { force: true });
    await expect(reg.createAccountButton).toBeDisabled();
  });
});

// ─── Protected Routes ─────────────────────────────────────────────────────────

test.describe('Auth – protected route guards', () => {
  const protectedRoutes = ['/dashboard', '/portfolio', '/orders', '/watchlist', '/markets'];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login/, { timeout: 8_000 });
    });
  }

  test('expired JWT cookie redirects to login', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'fauxfolio_token',
        value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxfQ.invalid',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });
});

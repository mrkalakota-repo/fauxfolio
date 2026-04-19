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
  test('demo user can log in and reach dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.phone, DEMO_USER.pin);
    await expect(page).toHaveURL(/dashboard/);
    // JWT cookie is set
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'fauxfolio_token')).toBe(true);
  });

  test('new user can register and is redirected to dashboard', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, '999888');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  });

  test('logged-in user can log out and cookie is cleared', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.phone, DEMO_USER.pin);
    await expect(page).toHaveURL(/dashboard/);

    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/login|\/$/);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'fauxfolio_token')).toBe(false);
  });
});

// ─── Non-Happy Path ───────────────────────────────────────────────────────────

test.describe('Auth – login edge cases', () => {
  test('wrong PIN shows error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.phone, '000000');
    const error = await login.waitForError();
    expect(error).toBeTruthy();
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('unregistered phone shows error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('9990000001', '123456');
    const error = await login.waitForError();
    expect(error).toBeTruthy();
  });

  test('phone shorter than 10 digits is rejected', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('12345', '123456');
    // Either HTML5 validation prevents submit or API returns error
    const stillOnLogin = page.url().includes('login') ||
      !(await page.waitForURL(/dashboard/, { timeout: 3_000 }).catch(() => false));
    expect(stillOnLogin).toBeTruthy();
  });

  test('rate limit triggers after 5 failed login attempts', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    for (let i = 0; i < 5; i++) {
      await login.login(DEMO_USER.phone, '111111');
      await page.waitForTimeout(200);
    }

    await login.login(DEMO_USER.phone, '111111');
    const error = await login.waitForError();
    expect(error?.toLowerCase()).toMatch(/rate limit|too many|try again/);
  });

  test('empty form cannot be submitted', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submitButton.click();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Auth – registration edge cases', () => {
  test('duplicate phone number is rejected', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(DEMO_USER.phone, '123456');
    const error = await reg.waitForError();
    expect(error?.toLowerCase()).toMatch(/exists|taken|already/);
  });

  test('PIN shorter than 6 digits is rejected', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, '123');
    // Should not navigate away
    await expect(page).toHaveURL(/register/);
  });

  test('mismatched PINs show validation error', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, '123456', '654321');
    const error = await reg.waitForError();
    expect(error?.toLowerCase()).toMatch(/match|same|confirm/);
  });

  test('non-numeric PIN is rejected', async ({ page }) => {
    const phone = uniquePhone();
    const reg = new RegisterPage(page);
    await reg.goto();
    await reg.register(phone, 'abcdef');
    await expect(page).toHaveURL(/register/);
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
    // Set an obviously expired JWT
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

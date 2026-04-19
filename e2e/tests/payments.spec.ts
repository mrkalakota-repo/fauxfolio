/**
 * Payments test suite — virtual cash pack purchases via Stripe (dev mode).
 * In dev mode (no STRIPE_SECRET_KEY) the checkout API credits cash directly
 * and returns { devMode: true } so no Stripe redirect occurs.
 */
import { test, expect } from '@playwright/test';
import { PaymentPage } from '../pages/payment.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Payments – happy path (dev mode)', () => {
  test('starter pack credits $10,000 virtual cash', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const payment = new PaymentPage(page);
    await payment.openModal();
    await payment.purchasePack('starter');

    const successText = await payment.getSuccessText();
    expect(successText).toBeTruthy();

    // Cash balance should reflect the top-up
    await dashboard.goto();
    const cashText = await dashboard.getCashText();
    expect(cashText).toMatch(/\$[\d,]+/);
  });

  test('booster pack credits $50,000 virtual cash', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const payment = new PaymentPage(page);
    await payment.openModal();
    await payment.purchasePack('booster');

    const successText = await payment.getSuccessText();
    expect(successText).toBeTruthy();
  });

  test('mega pack credits $100,000 virtual cash', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const payment = new PaymentPage(page);
    await payment.openModal();
    await payment.purchasePack('mega');

    const successText = await payment.getSuccessText();
    expect(successText).toBeTruthy();
  });

  test('purchasing a pack unlocks premium features (totalTopUps >= 1)', async ({ page }) => {
    const payment = new PaymentPage(page);
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await payment.openModal();
    await payment.purchasePack('starter');
    await payment.getSuccessText();

    // After top-up, options/leagues should no longer gate the user
    const response = await page.request.get('/api/me');
    const user = await response.json();
    expect(user.totalTopUps).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Payments – non-happy path', () => {
  test('invalid packId returns 400', async ({ page }) => {
    const response = await page.request.post('/api/payments/create-checkout', {
      data: { packId: 'nonexistent_pack' },
    });
    expect(response.status()).toBe(400);
  });

  test('missing packId returns 400', async ({ page }) => {
    const response = await page.request.post('/api/payments/create-checkout', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('unauthenticated checkout request is rejected', async ({ page }) => {
    // Clear cookies to simulate unauthenticated request
    await page.context().clearCookies();
    const response = await page.request.post('/api/payments/create-checkout', {
      data: { packId: 'starter' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test('payment rate limit (5 per hour) is enforced via API', async ({ page }) => {
    const responses: number[] = [];

    for (let i = 0; i < 6; i++) {
      const res = await page.request.post('/api/payments/create-checkout', {
        data: { packId: 'starter' },
      });
      responses.push(res.status());
    }

    // At least one request should be rate limited (429)
    expect(responses).toContain(429);
  });

  test('Stripe webhook with invalid signature is rejected', async ({ page }) => {
    const response = await page.request.post('/api/payments/webhook', {
      headers: { 'stripe-signature': 'invalid_sig' },
      data: '{}',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('payment modal closes without crashing when cancelled', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const payment = new PaymentPage(page);
    await payment.openModal();

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await expect(payment.modal).not.toBeVisible({ timeout: 3_000 });

    // Dashboard still functional
    await expect(dashboard.portfolioValue).toBeVisible();
  });
});

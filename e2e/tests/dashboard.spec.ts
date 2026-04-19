/**
 * Dashboard test suite — runs with saved demo user auth state.
 */
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Dashboard', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  // ─── Happy Path ────────────────────────────────────────────────────────────

  test('loads and displays portfolio value', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(dashboard.portfolioValue).toBeVisible();
  });

  test('cash balance is visible and numeric', async () => {
    await expect(dashboard.cashBalance).toBeVisible();
    const text = await dashboard.getCashText();
    expect(text).toMatch(/\$[\d,]+/);
  });

  test('navigation links are all present', async () => {
    await expect(dashboard.navMarkets).toBeVisible();
    await expect(dashboard.navPortfolio).toBeVisible();
    await expect(dashboard.navOrders).toBeVisible();
    await expect(dashboard.navWatchlist).toBeVisible();
    await expect(dashboard.navLeagues).toBeVisible();
  });

  test('navigating to Markets works', async ({ page }) => {
    await dashboard.navMarkets.click();
    await expect(page).toHaveURL(/markets/);
  });

  test('navigating to Portfolio works', async ({ page }) => {
    await dashboard.navPortfolio.click();
    await expect(page).toHaveURL(/portfolio/);
  });

  test('navigating to Orders works', async ({ page }) => {
    await dashboard.navOrders.click();
    await expect(page).toHaveURL(/orders/);
  });

  // ─── Non-Happy Path ────────────────────────────────────────────────────────

  test('low balance alert appears when cash < $500', async ({ page }) => {
    // Force a low-cash response by intercepting the /api/me endpoint
    await page.route('**/api/portfolio', async (route) => {
      const json = await route.fetch().then((r) => r.json());
      if (json && typeof json === 'object') {
        route.fulfill({ json: { ...json, cashBalance: 100 } });
      } else {
        route.continue();
      }
    });

    await dashboard.goto();
    // Low balance alert or top-up button should appear
    const hasAlert = await dashboard.lowBalanceAlert.isVisible().catch(() => false);
    const hasTopUp = await dashboard.topUpButton.isVisible().catch(() => false);
    expect(hasAlert || hasTopUp).toBe(true);
  });
});

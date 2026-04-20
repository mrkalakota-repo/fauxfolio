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
    await expect(dashboard.navTournaments).toBeVisible();
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
    // Use a fully-stubbed portfolio response so we don't rely on route.fetch()
    await page.route('**/api/portfolio', (route) => {
      route.fulfill({
        json: {
          user: { cashBalance: 100, totalTopUps: 0, name: 'Demo User' },
          holdings: [],
          totalValue: 100,
          dayChange: 0,
          dayChangePercent: 0,
          totalGainLoss: -9900,
          totalGainLossPercent: -99,
          portfolioHistory: [],
        },
      });
    });

    await dashboard.goto();
    // Sidebar shows "Low Balance!" label + "Get More Cash" button when cash < $500
    const hasAlert = await dashboard.lowBalanceAlert.isVisible().catch(() => false);
    const hasTopUp = await dashboard.topUpButton.isVisible().catch(() => false);
    expect(hasAlert || hasTopUp).toBe(true);
  });
});

/**
 * Options trading test suite.
 * Premium feature — requires totalTopUps >= 1.
 * Tests both the gate (non-premium user) and the full flow (premium user).
 */
import { test, expect } from '@playwright/test';
import { OptionsPage } from '../pages/options.page';

const TEST_SYMBOL = 'AAPL';

// ─── Premium Gate ─────────────────────────────────────────────────────────────

test.describe('Options – premium gate', () => {
  test('non-premium user sees upgrade prompt when accessing options', async ({ page }) => {
    // Intercept the options API to return a 403 with upgradeRequired flag
    await page.route(`**/api/options/${TEST_SYMBOL}`, (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Premium required', upgradeRequired: true }),
      });
    });

    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);

    // Upgrade modal or prompt should appear
    await expect(options.upgradeModal).toBeVisible({ timeout: 8_000 });
  });
});

const PREMIUM_PORTFOLIO = {
  user: { cashBalance: 50000, totalTopUps: 1, name: 'Test User' },
  holdings: [],
  totalValue: 50000,
  dayChange: 0,
  dayChangePercent: 0,
  totalGainLoss: 0,
  totalGainLossPercent: 0,
  portfolioHistory: [],
};

// ─── Happy Path (simulated premium) ──────────────────────────────────────────

test.describe('Options – happy path', () => {
  test.beforeEach(async ({ page }) => {
    // Stub portfolio so user appears premium (totalTopUps >= 1)
    await page.route('**/api/portfolio', (route) => {
      route.fulfill({ json: PREMIUM_PORTFOLIO });
    });

    // Stub the API to return a minimal valid option chain matching OptionsPanel's expected shape
    const expiry = new Date(Date.now() + 7 * 86400_000).toISOString();
    const stubChain = {
      calls: [
        {
          id: 'opt-1',
          optionType: 'CALL',
          strikePrice: 190,
          expiresAt: expiry,
          price: 12.5,
          delta: 0.6,
          gamma: 0.05,
          theta: -0.02,
          vega: 0.1,
        },
      ],
      puts: [
        {
          id: 'opt-2',
          optionType: 'PUT',
          strikePrice: 210,
          expiresAt: expiry,
          price: 11.0,
          delta: -0.4,
          gamma: 0.04,
          theta: -0.02,
          vega: 0.09,
        },
      ],
      expiries: [expiry],
    };

    await page.route(`**/api/options/${TEST_SYMBOL}`, (route) => {
      route.fulfill({ json: stubChain });
    });
  });

  test('option chain table renders with CALL and PUT rows', async ({ page }) => {
    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);
    await expect(options.optionChainTable).toBeVisible({ timeout: 8_000 });
    const callCount = await options.callRows.count();
    const putCount = await options.putRows.count();
    expect(callCount).toBeGreaterThan(0);
    expect(putCount).toBeGreaterThan(0);
  });

  test('can open order modal for a CALL option', async ({ page }) => {
    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);
    await expect(options.callRows).toHaveCount(1);
    const buyBtn = options.callRows.first().getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await expect(options.orderModal).toBeVisible();
  });

  test('can open order modal for a PUT option', async ({ page }) => {
    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);
    await expect(options.putRows).toHaveCount(1);
    const buyBtn = options.putRows.first().getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await expect(options.orderModal).toBeVisible();
  });

  test('submitting 0 contracts is rejected', async ({ page }) => {
    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);
    const buyBtn = options.callRows.first().getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await options.orderModal.waitFor({ state: 'visible' });
    await options.quantityInput.fill('0');
    await options.confirmButton.click();
    // Modal should stay open or show validation error
    await expect(options.orderModal).toBeVisible();
  });

  test('submitting negative contracts is rejected', async ({ page }) => {
    const options = new OptionsPage(page);
    await options.gotoForStock(TEST_SYMBOL);
    const buyBtn = options.callRows.first().getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await options.orderModal.waitFor({ state: 'visible' });
    await options.quantityInput.fill('-3');
    await options.confirmButton.click();
    await expect(options.orderModal).toBeVisible();
  });
});

// ─── Positions ────────────────────────────────────────────────────────────────

test.describe('Options – positions', () => {
  test('options positions page loads without error', async ({ page }) => {
    await page.goto('/portfolio');
    // Options positions may be a tab or section on the portfolio page
    const optionsTab = page.getByRole('tab', { name: /options/i }).or(
      page.getByRole('link', { name: /options positions/i })
    );
    if (await optionsTab.isVisible()) {
      await optionsTab.click();
    }
    await expect(page).not.toHaveURL(/error/);
  });
});

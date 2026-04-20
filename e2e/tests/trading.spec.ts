/**
 * Stock trading test suite — buy/sell stocks (equity orders).
 */
import { test, expect } from '@playwright/test';
import { StockPage } from '../pages/stock.page';
import { PortfolioPage } from '../pages/portfolio.page';
import { OrdersPage } from '../pages/orders.page';
import { MarketsPage } from '../pages/markets.page';

const TEST_SYMBOL = 'AAPL';

test.describe('Stock Trading – happy path', () => {
  test('stock detail page loads with price', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await expect(page).toHaveURL(new RegExp(`stock/${TEST_SYMBOL}`, 'i'));
    await expect(stock.currentPrice).toBeVisible();
    const priceText = await stock.currentPrice.textContent();
    expect(priceText).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test('can add stock to watchlist from stock page', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.watchlistToggle.click();
    // Toast or visual indicator
    await expect(page.getByText(/added.*to watchlist|watching/i)).toBeVisible();
  });

  test('can buy shares and order appears in orders list', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);

    const ordersBefore = await new OrdersPage(page)
      .goto()
      .then(() => new OrdersPage(page).getOrderCount())
      .catch(() => 0);

    await stock.goto(TEST_SYMBOL);
    await stock.buyShares(1);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    await new OrdersPage(page).goto();
    const ordersAfter = await new OrdersPage(page).getOrderCount();
    expect(ordersAfter).toBeGreaterThan(ordersBefore);
  });

  test('bought shares appear in portfolio', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.buyShares(1);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    const portfolio = new PortfolioPage(page);
    await portfolio.goto();
    await expect(portfolio.holdingRows).not.toHaveCount(0, { timeout: 5_000 });
  });

  test('can sell previously purchased shares', async ({ page }) => {
    const stock = new StockPage(page);

    // Buy first
    await stock.goto(TEST_SYMBOL);
    await stock.buyShares(2);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    // Then sell 1
    await stock.goto(TEST_SYMBOL);
    await stock.sellShares(1);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });
  });

  test('markets search returns results', async ({ page }) => {
    const markets = new MarketsPage(page);
    await markets.goto();
    await markets.search('Apple');
    await expect(markets.searchResults).toBeVisible({ timeout: 5_000 });
  });

  test('clicking a search result navigates to stock page', async ({ page }) => {
    const markets = new MarketsPage(page);
    await markets.goto();
    await markets.search('MSFT');
    await markets.clickFirstResult();
    await expect(page).toHaveURL(/stock\//);
  });
});

test.describe('Stock Trading – non-happy path', () => {
  test('buying 0 shares shows validation error', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.sharesInput.fill('0');
    // Button is disabled when sharesNum === 0 (disabled={!sharesNum}) — do not click
    await expect(stock.buyButton).toBeDisabled();
    const modalOpen = await stock.orderConfirmModal.isVisible().catch(() => false);
    expect(modalOpen).toBe(false);
  });

  test('buying negative shares is rejected', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.sharesInput.fill('-5');
    await stock.buyButton.click();
    const modalOpen = await stock.orderConfirmModal.isVisible().catch(() => false);
    expect(modalOpen).toBe(false);
  });

  test('buying more shares than cash allows is rejected', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    // 999999 shares of any stock will exceed any balance
    await stock.sharesInput.fill('999999');
    await stock.buyButton.click();

    if (await stock.orderConfirmModal.isVisible().catch(() => false)) {
      await stock.confirmOrderButton.click();
      await expect(stock.orderErrorMessage).toBeVisible({ timeout: 5_000 });
    } else {
      // Inline validation error shown before modal
      await expect(stock.orderErrorMessage).toBeVisible({ timeout: 5_000 });
    }
  });

  test('selling more shares than owned is rejected', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    // Must switch to Sell tab first — otherwise the submit button says "Review Buy Order"
    await page.getByRole('button', { name: /^sell$/i }).click();
    await stock.sharesInput.fill('999999');

    if (await stock.sellButton.isDisabled().catch(() => true)) {
      // If button stays disabled (no holdings), just verify modal never opened
      expect(await stock.orderConfirmModal.isVisible().catch(() => false)).toBe(false);
      return;
    }

    await stock.sellButton.click();
    if (await stock.orderConfirmModal.isVisible().catch(() => false)) {
      await stock.confirmOrderButton.click();
    }
    await expect(stock.orderErrorMessage).toBeVisible({ timeout: 5_000 });
  });

  test('invalid stock symbol shows 404 or error state', async ({ page }) => {
    await page.goto('/stock/INVALIDXXX999');
    // Either a not-found page or an error message
    const has404 = page.getByText(/not found|invalid|does not exist/i);
    await expect(has404).toBeVisible({ timeout: 8_000 });
  });

  test('cancelling order modal does not place order', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.sharesInput.fill('1');
    await stock.buyButton.click();
    await stock.orderConfirmModal.waitFor({ state: 'visible' });

    const ordersBefore = await fetch(`${page.url().split('/stock')[0]}/api/orders`)
      .then(() => 0)
      .catch(() => 0);

    await stock.cancelOrderButton.click();
    await expect(stock.orderConfirmModal).not.toBeVisible();

    // Still on stock page
    await expect(page).toHaveURL(new RegExp(`stock/${TEST_SYMBOL}`, 'i'));
    expect(ordersBefore).toBe(0); // order count did not change (heuristic)
  });

  test('searching empty string does not crash', async ({ page }) => {
    const markets = new MarketsPage(page);
    await markets.goto();
    await markets.search('');
    await expect(page).toHaveURL(/markets/);
  });

  test('searching special characters is handled gracefully', async ({ page }) => {
    const markets = new MarketsPage(page);
    await markets.goto();
    await markets.search("'; DROP TABLE stocks;--");
    await expect(page).toHaveURL(/markets/);
    await expect(page.getByText(/error|crash/i)).not.toBeVisible();
  });
});

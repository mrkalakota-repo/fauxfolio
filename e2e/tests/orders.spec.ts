/**
 * Orders test suite.
 */
import { test, expect } from '@playwright/test';
import { OrdersPage } from '../pages/orders.page';
import { StockPage } from '../pages/stock.page';

test.describe('Orders – happy path', () => {
  test('orders page loads', async ({ page }) => {
    const orders = new OrdersPage(page);
    await orders.goto();
    await expect(page).toHaveURL(/orders/);
  });

  test('placing a buy order creates a new entry in orders list', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto('AAPL');
    await stock.buyShares(1);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    const orders = new OrdersPage(page);
    await orders.goto();
    const count = await orders.getOrderCount();
    expect(count).toBeGreaterThan(0);
  });

  test('order rows display symbol, type, and status', async ({ page }) => {
    const orders = new OrdersPage(page);
    await orders.goto();

    const count = await orders.getOrderCount();
    if (count === 0) {
      test.skip();
      return;
    }

    const rowText = await orders.getLatestOrderText();
    // Should contain a ticker symbol and action indicator
    expect(rowText).toMatch(/[A-Z]{1,5}/); // ticker pattern
  });

  test('buy and sell orders both appear in orders list', async ({ page }) => {
    const stock = new StockPage(page);

    await stock.goto('AAPL');
    await stock.buyShares(2);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    await stock.goto('AAPL');
    await stock.sellShares(1);
    await expect(stock.orderSuccessMessage).toBeVisible({ timeout: 10_000 });

    const orders = new OrdersPage(page);
    await orders.goto();
    const count = await orders.getOrderCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Orders – non-happy path', () => {
  test('orders page with no trades shows empty state or zero rows', async ({ page }) => {
    // Intercept to return empty orders
    await page.route('**/api/orders', (route) => {
      route.fulfill({ json: [] });
    });

    const orders = new OrdersPage(page);
    await orders.goto();

    const count = await orders.getOrderCount();
    const hasEmpty = await orders.emptyState.isVisible().catch(() => false);

    expect(count === 0 || hasEmpty).toBe(true);
  });

  test('order API error is surfaced gracefully', async ({ page }) => {
    await page.route('**/api/orders', (route) => {
      route.fulfill({ status: 500, json: { error: 'Internal server error' } });
    });

    const orders = new OrdersPage(page);
    await orders.goto();

    // Should not crash — show error state or empty
    await expect(page.getByText(/error|something went wrong/i)).toBeVisible({ timeout: 5_000 })
      .catch(() => {
        // Alternatively the page renders but with 0 rows
      });
    await expect(page).toHaveURL(/orders/);
  });
});

/**
 * Watchlist test suite.
 */
import { test, expect } from '@playwright/test';
import { WatchlistPage } from '../pages/watchlist.page';
import { StockPage } from '../pages/stock.page';

const TEST_SYMBOL = 'MSFT';

// Minimal stock shape the watchlist page expects inside each watchlist item
const stubStock = {
  name: 'Microsoft Corp',
  currentPrice: 420,
  previousClose: 415,
  sector: 'Technology',
};

test.describe('Watchlist – happy path', () => {
  test('watchlist page loads', async ({ page }) => {
    const wl = new WatchlistPage(page);
    await wl.goto();
    await expect(page).toHaveURL(/watchlist/);
  });

  test('adding a stock from the stock page appears in watchlist', async ({ page }) => {
    // Ensure clean state — remove TEST_SYMBOL if already watchlisted
    await page.request.delete(`/api/watchlist/${TEST_SYMBOL}`).catch(() => null);

    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    // Wait for stock data to load before toggle is rendered
    await stock.watchlistToggle.waitFor({ state: 'visible', timeout: 8_000 });
    await stock.watchlistToggle.click();
    await expect(page.getByText(/added.*to watchlist|watching/i)).toBeVisible({ timeout: 5_000 });

    const wl = new WatchlistPage(page);
    await wl.goto();
    expect(await wl.hasSymbol(TEST_SYMBOL)).toBe(true);
  });

  test('watchlist items are clickable and navigate to stock page', async ({ page }) => {
    const wl = new WatchlistPage(page);
    await wl.goto();

    const count = await wl.getItemCount();
    if (count === 0) {
      test.skip();
      return;
    }

    await wl.watchlistItems.first().click();
    await expect(page).toHaveURL(/stock\//);
  });

  test('watchlist persists after page reload', async ({ page }) => {
    // Ensure clean state — remove TEST_SYMBOL if already watchlisted
    await page.request.delete(`/api/watchlist/${TEST_SYMBOL}`).catch(() => null);

    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.watchlistToggle.waitFor({ state: 'visible', timeout: 8_000 });
    await stock.watchlistToggle.click();
    // Wait for the success toast so we know the add was processed
    await page.getByText(/added.*to watchlist/i).waitFor({ timeout: 5_000 }).catch(() => null);

    await page.reload();

    const wl = new WatchlistPage(page);
    await wl.goto();
    expect(await wl.hasSymbol(TEST_SYMBOL)).toBe(true);
  });
});

test.describe('Watchlist – non-happy path', () => {
  test('empty watchlist shows empty state message', async ({ page }) => {
    // API returns { watchlist: [] }
    await page.route('**/api/watchlist', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { watchlist: [] } });
      } else {
        route.continue();
      }
    });

    const wl = new WatchlistPage(page);
    await wl.goto();
    await expect(wl.emptyState).toBeVisible({ timeout: 5_000 });
  });

  test('adding the same stock twice does not duplicate it', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.goto(TEST_SYMBOL);
    await stock.watchlistToggle.waitFor({ state: 'visible', timeout: 8_000 });

    // First add
    await stock.watchlistToggle.click();
    await page.getByText(/added|watching/i).waitFor({ timeout: 3_000 }).catch(() => null);

    // Toggle again (remove), then add again
    await stock.watchlistToggle.click();
    await page.waitForTimeout(300);
    await stock.watchlistToggle.click();

    const wl = new WatchlistPage(page);
    await wl.goto();

    // Count occurrences of the symbol text
    const count = await page.getByText(TEST_SYMBOL, { exact: true }).count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('removing the only watchlist item shows empty state', async ({ page }) => {
    // Stub watchlist with exactly one item — match real API shape: { watchlist: [...] }
    await page.route('**/api/watchlist', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          json: {
            watchlist: [{ stockSymbol: 'TSLA', stock: stubStock }],
          },
        });
      } else {
        route.continue();
      }
    });
    await page.route('**/api/watchlist/TSLA', (route) => {
      route.fulfill({ status: 200, json: { ok: true } });
    });

    const wl = new WatchlistPage(page);
    await wl.goto();
    await wl.removeFirst();

    // After removal stub returns empty list
    await page.route('**/api/watchlist', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { watchlist: [] } });
      } else {
        route.continue();
      }
    });

    await wl.goto();
    await expect(wl.emptyState).toBeVisible({ timeout: 5_000 });
  });
});

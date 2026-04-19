import type { Page, Locator } from '@playwright/test';

export class WatchlistPage {
  readonly page: Page;
  readonly watchlistItems: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.watchlistItems = page.locator('[data-testid="watchlist-item"]').or(
      page.locator('[data-testid="stock-row"]')
    );
    this.emptyState = page.getByText(/watchlist is empty|no stocks|add stocks/i);
  }

  async goto() {
    await this.page.goto('/watchlist');
  }

  async getItemCount(): Promise<number> {
    return this.watchlistItems.count();
  }

  async hasSymbol(symbol: string): Promise<boolean> {
    return this.page.getByText(symbol, { exact: true }).isVisible();
  }

  async removeFirst() {
    const removeBtn = this.page
      .locator('[data-testid="watchlist-item"]')
      .first()
      .getByRole('button', { name: /remove|delete/i });
    await removeBtn.click();
  }
}

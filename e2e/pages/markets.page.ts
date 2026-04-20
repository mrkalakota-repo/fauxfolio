import type { Page, Locator } from '@playwright/test';

export class MarketsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly stockRows: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/AAPL, Tesla/i);
    this.stockRows = page.locator('tbody tr');
    // Search results render into the same table — any visible row in tbody
    this.searchResults = page.locator('tbody tr').first();
  }

  async goto() {
    await this.page.goto('/markets');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  async clickFirstResult() {
    await this.stockRows.first().locator('a').first().click();
  }

  async clickStock(symbol: string) {
    await this.page.getByText(symbol, { exact: true }).first().click();
  }
}

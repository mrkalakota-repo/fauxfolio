import type { Page, Locator } from '@playwright/test';

export class MarketsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly stockRows: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search|symbol|ticker/i));
    this.stockRows = page.locator('[data-testid="stock-row"]').or(page.locator('tbody tr'));
    this.searchResults = page.locator('[data-testid="search-results"]').or(
      page.locator('[role="listbox"]')
    );
  }

  async goto() {
    await this.page.goto('/markets');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  async clickFirstResult() {
    await this.searchResults.locator('li, [role="option"]').first().click();
  }

  async clickStock(symbol: string) {
    await this.page.getByText(symbol, { exact: true }).first().click();
  }
}

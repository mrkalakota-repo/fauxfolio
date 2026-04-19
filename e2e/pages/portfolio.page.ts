import type { Page, Locator } from '@playwright/test';

export class PortfolioPage {
  readonly page: Page;
  readonly holdingRows: Locator;
  readonly totalValue: Locator;
  readonly gainLossIndicator: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.holdingRows = page.locator('[data-testid="holding-row"]').or(page.locator('tbody tr'));
    this.totalValue = page.getByTestId('total-value').or(
      page.getByText(/total (portfolio )?value/i).first()
    );
    this.gainLossIndicator = page.getByTestId('gain-loss').or(
      page.getByText(/[+-]\d+\.\d+%/)
    );
    this.emptyState = page.getByText(/no holdings|empty portfolio|start trading/i);
  }

  async goto() {
    await this.page.goto('/portfolio');
  }

  async getHoldingCount(): Promise<number> {
    return this.holdingRows.count();
  }
}

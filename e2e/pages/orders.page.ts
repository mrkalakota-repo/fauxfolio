import type { Page, Locator } from '@playwright/test';

export class OrdersPage {
  readonly page: Page;
  readonly orderRows: Locator;
  readonly emptyState: Locator;
  readonly filterButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderRows = page.locator('[data-testid="order-row"]').or(page.locator('tbody tr'));
    this.emptyState = page.getByText(/no orders|no trades yet/i);
    this.filterButtons = page.getByRole('button').filter({ hasText: /all|buy|sell|open|filled/i });
  }

  async goto() {
    await this.page.goto('/orders');
  }

  async getOrderCount(): Promise<number> {
    return this.orderRows.count();
  }

  async getLatestOrderText(): Promise<string> {
    return (await this.orderRows.first().textContent()) ?? '';
  }
}

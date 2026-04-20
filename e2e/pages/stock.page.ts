import type { Page, Locator } from '@playwright/test';

export class StockPage {
  readonly page: Page;
  readonly stockSymbol: Locator;
  readonly currentPrice: Locator;
  readonly sharesInput: Locator;
  readonly buyButton: Locator;
  readonly sellButton: Locator;
  readonly orderConfirmModal: Locator;
  readonly confirmOrderButton: Locator;
  readonly cancelOrderButton: Locator;
  readonly orderSuccessMessage: Locator;
  readonly orderErrorMessage: Locator;
  readonly watchlistToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stockSymbol = page.getByTestId('stock-symbol').or(page.locator('h1'));
    this.currentPrice = page.getByTestId('current-price').or(
      page.getByText(/\$[\d,]+\.\d{2}/).first()
    );
    this.sharesInput = page.getByLabel(/shares|quantity/i);
    this.buyButton = page.getByRole('button', { name: /review buy order/i });
    this.sellButton = page.getByRole('button', { name: /review sell order/i });
    this.orderConfirmModal = page.getByRole('dialog');
    this.confirmOrderButton = page.getByRole('button', { name: /confirm|place order/i });
    this.cancelOrderButton = page.getByRole('button', { name: /cancel/i });
    // Matches both immediate fill ("Order placed!") and after-hours queue message
    this.orderSuccessMessage = page.getByText(/order (placed|filled|success|queued)|market is closed|order will execute/i);
    this.orderErrorMessage = page.getByRole('alert').or(
      page.getByText(/insufficient|not enough|error/i)
    );
    this.watchlistToggle = page.getByTestId('watchlist-toggle').or(
      page.getByRole('button', { name: /watchlist|bookmark/i })
    );
  }

  async goto(symbol: string) {
    await this.page.goto(`/stock/${symbol}`);
  }

  async buyShares(quantity: number) {
    await this.sharesInput.fill(String(quantity));
    await this.buyButton.click();
    await this.orderConfirmModal.waitFor({ state: 'visible' });
    await this.confirmOrderButton.click();
  }

  async sellShares(quantity: number) {
    // Switch to Sell tab first — button label is "Review Sell Order" only on sell side
    await this.page.getByRole('button', { name: /^sell$/i }).click();
    await this.sharesInput.fill(String(quantity));
    await this.sellButton.click();
    await this.orderConfirmModal.waitFor({ state: 'visible' });
    await this.confirmOrderButton.click();
  }
}

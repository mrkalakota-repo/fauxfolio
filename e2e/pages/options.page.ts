import type { Page, Locator } from '@playwright/test';

export class OptionsPage {
  readonly page: Page;
  readonly optionChainTable: Locator;
  readonly callRows: Locator;
  readonly putRows: Locator;
  readonly expirySelector: Locator;
  readonly upgradeModal: Locator;
  readonly orderModal: Locator;
  readonly quantityInput: Locator;
  readonly confirmButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.optionChainTable = page.getByRole('table').filter({ hasText: /strike|call|put/i });
    this.callRows = page.locator('[data-testid="call-cell"]:has(button)');
    this.putRows = page.locator('[data-testid="put-cell"]:has(button)');
    this.expirySelector = page.getByRole('combobox');
    this.upgradeModal = page.getByRole('dialog').filter({ hasText: /upgrade|premium|get more cash/i }).or(
      page.getByText(/options trading locked|unlock.*cash pack/i)
    );
    this.orderModal = page.getByRole('dialog').filter({ hasText: /buy to open|contract/i });
    this.quantityInput = page.getByLabel(/contracts/i);
    this.confirmButton = page.getByRole('button', { name: /buy.*contract|confirm|place order/i });
    this.successToast = page.getByText(/option (order )?placed|success/i);
    this.errorToast = page.getByRole('alert').or(page.getByText(/error|insufficient/i));
  }

  async gotoForStock(symbol: string) {
    await this.page.goto(`/stock/${symbol}`);
    // Wait for the stock page to render its tab strip (requires stock data to load)
    const optionsTab = this.page.getByRole('button', { name: /^options$/i });
    await optionsTab.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);
    if (await optionsTab.isVisible()) await optionsTab.click();
  }

  async buyCall(strikeIndex = 0, contracts = 1) {
    const buyBtn = this.callRows.nth(strikeIndex).getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await this.orderModal.waitFor({ state: 'visible' });
    await this.quantityInput.fill(String(contracts));
    await this.confirmButton.click();
  }

  async buyPut(strikeIndex = 0, contracts = 1) {
    const buyBtn = this.putRows.nth(strikeIndex).getByRole('button', { name: /buy/i });
    await buyBtn.click();
    await this.orderModal.waitFor({ state: 'visible' });
    await this.quantityInput.fill(String(contracts));
    await this.confirmButton.click();
  }
}

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
    this.optionChainTable = page.getByTestId('option-chain').or(
      page.getByRole('table').filter({ hasText: /strike|call|put/i })
    );
    this.callRows = page.locator('[data-testid="call-row"]').or(
      page.getByRole('row').filter({ hasText: /CALL/i })
    );
    this.putRows = page.locator('[data-testid="put-row"]').or(
      page.getByRole('row').filter({ hasText: /PUT/i })
    );
    this.expirySelector = page.getByLabel(/expiry|expiration/i).or(
      page.getByRole('combobox').filter({ hasText: /expiry/i })
    );
    this.upgradeModal = page.getByRole('dialog').filter({ hasText: /upgrade|premium|get more cash/i });
    this.orderModal = page.getByRole('dialog').filter({ hasText: /option|contract/i });
    this.quantityInput = page.getByLabel(/contracts|quantity/i);
    this.confirmButton = page.getByRole('button', { name: /confirm|place order/i });
    this.successToast = page.getByText(/option (order )?placed|success/i);
    this.errorToast = page.getByRole('alert').or(page.getByText(/error|insufficient/i));
  }

  async gotoForStock(symbol: string) {
    await this.page.goto(`/stock/${symbol}`);
    const optionsTab = this.page.getByRole('tab', { name: /options/i }).or(
      this.page.getByRole('button', { name: /options/i })
    );
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

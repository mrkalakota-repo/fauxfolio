import type { Page, Locator } from '@playwright/test';

export type PackId = 'starter' | 'booster' | 'mega';

const PACK_LABELS: Record<PackId, string> = {
  starter: 'Starter Pack',
  booster: 'Booster Pack',
  mega:    'Mega Pack',
};

export class PaymentPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly getMoreCashButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByRole('dialog').filter({ hasText: /cash|pack|starter|booster|mega/i });
    this.getMoreCashButton = page
      .getByRole('button', { name: /get more cash|add funds|top up/i })
      .first();
  }

  async openModal() {
    await this.getMoreCashButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  /** In dev mode (no STRIPE_SECRET_KEY) this credits cash directly. */
  async purchasePack(packId: PackId) {
    // Select the pack card by its label — unique text that won't match the checkout button
    const packCard = this.modal
      .getByRole('button')
      .filter({ hasText: PACK_LABELS[packId] });
    await packCard.click();
    // Then click the single checkout button (text changes to reflect selected pack)
    const checkoutBtn = this.modal.getByRole('button', { name: /get .+ for/i });
    await checkoutBtn.click();
  }

  async getSuccessText(): Promise<string> {
    const toast = this.page.getByText(/added|credited|received/i);
    await toast.waitFor({ state: 'visible', timeout: 10_000 });
    return (await toast.textContent()) ?? '';
  }
}

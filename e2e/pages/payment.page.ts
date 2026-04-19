import type { Page, Locator } from '@playwright/test';

export type PackId = 'starter' | 'booster' | 'mega';

const PACKS: Record<PackId, { price: string; virtualCash: string }> = {
  starter: { price: '$1.00', virtualCash: '$10,000' },
  booster: { price: '$2.99', virtualCash: '$50,000' },
  mega:    { price: '$4.99', virtualCash: '$100,000' },
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
    const packCard = this.modal.locator(`[data-pack-id="${packId}"]`).or(
      this.modal.getByText(PACKS[packId].virtualCash).locator('..')
    );
    const buyBtn = packCard.getByRole('button', { name: /buy|get|purchase/i });
    await buyBtn.click();
  }

  async getSuccessText(): Promise<string> {
    const toast = this.page.getByText(/added|credited|received/i);
    await toast.waitFor({ state: 'visible', timeout: 10_000 });
    return (await toast.textContent()) ?? '';
  }
}

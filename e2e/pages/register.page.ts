import type { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly pinInput: Locator;
  readonly confirmPinInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.phoneInput = page.getByLabel(/phone/i);
    const pinInputs = page.getByLabel(/pin/i);
    this.pinInput = pinInputs.nth(0);
    this.confirmPinInput = pinInputs.nth(1);
    this.submitButton = page.getByRole('button', { name: /register|create account|sign up/i });
    this.errorMessage = page.getByRole('alert').or(page.locator('[data-testid="error"]'));
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(phone: string, pin: string, confirmPin?: string) {
    await this.phoneInput.fill(phone);
    await this.pinInput.fill(pin);
    await this.confirmPinInput.fill(confirmPin ?? pin);
    await this.submitButton.click();
  }

  async waitForError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5_000 });
    return this.errorMessage.textContent();
  }
}

import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly pinInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.phoneInput = page.getByLabel(/phone/i);
    this.pinInput = page.getByLabel(/pin/i).first();
    this.submitButton = page.getByRole('button', { name: /log in|sign in/i });
    this.errorMessage = page.getByRole('alert').or(page.locator('[data-testid="error"]'));
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(phone: string, pin: string) {
    await this.phoneInput.fill(phone);
    await this.pinInput.fill(pin);
    await this.submitButton.click();
  }

  async waitForError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5_000 });
    return this.errorMessage.textContent();
  }
}

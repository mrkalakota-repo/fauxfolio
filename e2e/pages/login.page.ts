import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly pinInput: Locator;
  readonly submitButton: Locator;
  readonly demoButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // PhoneInput renders <input type="tel"> — no label association
    this.phoneInput = page.locator('input[type="tel"]');
    // PinInput renders an opacity-0 <input type="password"> behind dot visuals.
    // Use .first() to avoid strict-mode violation if the browser injects extra
    // password-manager inputs into the page.
    this.pinInput = page.locator('input[type="password"]').first();
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.demoButton = page.getByRole('button', { name: 'Try Demo Account' });
    this.errorMessage = page.getByRole('alert').or(page.locator('[data-testid="error"]'));
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(phone: string, pin: string) {
    await this.phoneInput.fill(phone);
    // PinInput is opacity-0 — force required to bypass visibility check
    await this.pinInput.fill(pin, { force: true });
    await this.submitButton.click();
  }

  /** Fastest path for demo credentials — uses the pre-fill button */
  async loginAsDemo() {
    await this.demoButton.click();
    await this.submitButton.click();
  }

  async waitForError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5_000 });
    return this.errorMessage.textContent();
  }
}

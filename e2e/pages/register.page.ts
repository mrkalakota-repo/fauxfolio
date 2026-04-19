import type { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly continueButton: Locator;
  readonly createAccountButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Step 1 inputs
    this.nameInput = page.getByPlaceholder('Alex Johnson');
    this.phoneInput = page.locator('input[type="tel"]');
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    // Step 2 submit
    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
    this.errorMessage = page.getByRole('alert').or(page.locator('[data-testid="error"]'));
  }

  async goto() {
    await this.page.goto('/register');
  }

  /**
   * Full 2-step registration flow.
   * Step 1: name + phone → Continue
   * Step 2: PIN + confirmPIN (opacity-0 inputs, force required) → Create Account
   */
  async register(phone: string, pin: string, confirmPin?: string, name = 'Test User') {
    // Step 1
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.continueButton.click();

    // Step 2 — two PinInput hidden inputs appear after Continue
    const pinInputs = this.page.locator('input[type="password"]');
    await pinInputs.nth(0).fill(pin, { force: true });
    await pinInputs.nth(1).fill(confirmPin ?? pin, { force: true });
    await this.createAccountButton.click();
  }

  async waitForError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5_000 });
    return this.errorMessage.textContent();
  }
}

import type { Page, Locator } from '@playwright/test';

export class LeaguesPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly leagueCards: Locator;
  readonly upgradePrompt: Locator;
  readonly createModal: Locator;
  readonly leagueNameInput: Locator;
  readonly submitCreateButton: Locator;
  readonly inviteInput: Locator;
  readonly inviteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByRole('button', { name: /create league/i });
    this.leagueCards = page.locator('[data-testid="league-card"]');
    this.upgradePrompt = page.getByText(/upgrade|premium|purchase/i);
    this.createModal = page.getByRole('dialog').filter({ hasText: /create league/i });
    // Use placeholder to find the input since the label lacks htmlFor association
    this.leagueNameInput = this.createModal
      .getByPlaceholder(/e\.g\.|Friends/i)
      .or(this.createModal.getByLabel(/league name|name/i));
    // Scope submit button inside the modal to avoid matching the "Create League" header button
    this.submitCreateButton = this.createModal.getByRole('button', { name: /create league/i });
    this.inviteInput = page.getByLabel(/phone|invite/i);
    this.inviteButton = page.getByRole('button', { name: /invite|send invite/i });
  }

  async goto() {
    await this.page.goto('/leagues');
  }

  async createLeague(name: string) {
    await this.createButton.click();
    await this.createModal.waitFor({ state: 'visible' });
    await this.leagueNameInput.fill(name);
    await this.submitCreateButton.click();
  }

  async gotoLeague(id: string) {
    await this.page.goto(`/leagues/${id}`);
  }

  async inviteMember(phone: string) {
    await this.inviteInput.fill(phone);
    await this.inviteButton.click();
  }
}

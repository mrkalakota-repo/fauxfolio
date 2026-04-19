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
    this.leagueCards = page.locator('[data-testid="league-card"]').or(
      page.getByRole('article')
    );
    this.upgradePrompt = page.getByText(/upgrade|premium|purchase/i);
    this.createModal = page.getByRole('dialog').filter({ hasText: /create league/i });
    this.leagueNameInput = page.getByLabel(/league name|name/i);
    this.submitCreateButton = page.getByRole('button', { name: /create|submit/i });
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

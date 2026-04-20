import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly portfolioValue: Locator;
  readonly cashBalance: Locator;
  readonly lowBalanceAlert: Locator;
  readonly topUpButton: Locator;
  readonly navDashboard: Locator;
  readonly navMarkets: Locator;
  readonly navPortfolio: Locator;
  readonly navOrders: Locator;
  readonly navWatchlist: Locator;
  readonly navTournaments: Locator;

  constructor(page: Page) {
    this.page = page;
    this.portfolioValue = page.getByTestId('portfolio-value').or(
      page.getByText(/total value|portfolio value/i).first()
    );
    // Target the numeric cash value shown in the sidebar (data-testid added to AppShell)
    this.cashBalance = page.getByTestId('sidebar-cash-balance').or(
      page.getByText(/\$[\d,]+\.\d{2}/).first()
    );
    this.lowBalanceAlert = page.getByText(/low balance|running low/i);
    this.topUpButton = page.getByRole('button', { name: /get more cash|top up|add funds/i });
    this.navDashboard = page.getByRole('link', { name: /dashboard/i });
    this.navMarkets = page.getByRole('link', { name: /markets/i });
    this.navPortfolio = page.getByRole('link', { name: /portfolio/i });
    this.navOrders = page.getByRole('link', { name: /orders/i });
    this.navWatchlist = page.getByRole('link', { name: /watchlist/i });
    this.navTournaments = page.getByRole('link', { name: /tournaments/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async getCashText(): Promise<string> {
    return (await this.cashBalance.textContent()) ?? '';
  }

  async hasLowBalanceWarning(): Promise<boolean> {
    return this.lowBalanceAlert.isVisible();
  }
}

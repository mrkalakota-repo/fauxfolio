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
  readonly navLeagues: Locator;

  constructor(page: Page) {
    this.page = page;
    this.portfolioValue = page.getByTestId('portfolio-value').or(
      page.getByText(/total value|portfolio value/i).first()
    );
    this.cashBalance = page.getByTestId('cash-balance').or(
      page.getByText(/cash balance|available cash/i).first()
    );
    this.lowBalanceAlert = page.getByText(/low balance|running low|get more cash/i);
    this.topUpButton = page.getByRole('button', { name: /top up|get cash|add funds/i });
    this.navDashboard = page.getByRole('link', { name: /dashboard/i });
    this.navMarkets = page.getByRole('link', { name: /markets/i });
    this.navPortfolio = page.getByRole('link', { name: /portfolio/i });
    this.navOrders = page.getByRole('link', { name: /orders/i });
    this.navWatchlist = page.getByRole('link', { name: /watchlist/i });
    this.navLeagues = page.getByRole('link', { name: /leagues/i });
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

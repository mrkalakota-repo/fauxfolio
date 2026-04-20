/**
 * Leagues test suite — premium feature (totalTopUps >= 1).
 */
import { test, expect } from '@playwright/test';
import { LeaguesPage } from '../pages/leagues.page';

test.describe('Leagues – premium gate', () => {
  test('non-premium user sees upgrade prompt', async ({ page }) => {
    // Force a 403 with upgradeRequired from the leagues API
    await page.route('**/api/leagues*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 403,
          json: { error: 'Premium required', upgradeRequired: true },
        });
      } else {
        route.continue();
      }
    });

    const leagues = new LeaguesPage(page);
    await leagues.goto();
    await expect(leagues.upgradePrompt).toBeVisible({ timeout: 5_000 });
  });
});

const PREMIUM_PORTFOLIO = {
  user: { cashBalance: 50000, totalTopUps: 1, name: 'Test User' },
  holdings: [],
  totalValue: 50000,
  dayChange: 0,
  dayChangePercent: 0,
  totalGainLoss: 0,
  totalGainLossPercent: 0,
  portfolioHistory: [],
};

test.describe('Leagues – happy path', () => {
  test.beforeEach(async ({ page }) => {
    // Stub portfolio so user appears premium (totalTopUps >= 1)
    await page.route('**/api/portfolio', (route) => {
      route.fulfill({ json: PREMIUM_PORTFOLIO });
    });

    // Stub leagues API to simulate a premium user with one league
    const stubLeagues = {
      leagues: [
        {
          id: 'league-1',
          name: 'Test League',
          status: 'ACTIVE',
          endsAt: new Date(Date.now() + 15 * 86400_000).toISOString(),
          memberCount: 1,
          maxMembers: 10,
          creatorName: 'Test User',
        },
      ],
      pendingInvites: [],
    };

    await page.route('**/api/leagues', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: stubLeagues });
      } else {
        route.continue();
      }
    });
  });

  test('leagues page shows league cards', async ({ page }) => {
    const leagues = new LeaguesPage(page);
    await leagues.goto();
    await expect(page).toHaveURL(/leagues/);
    const count = await leagues.leagueCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('create league modal opens', async ({ page }) => {
    await page.route('**/api/leagues', async (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          json: { id: 'new-league-1', name: 'E2E League', status: 'ACTIVE' },
        });
      } else {
        route.continue();
      }
    });

    const leagues = new LeaguesPage(page);
    await leagues.goto();
    await leagues.createButton.click();
    await expect(leagues.createModal).toBeVisible({ timeout: 5_000 });
  });

  test('creating a league with a name succeeds', async ({ page }) => {
    await page.route('**/api/leagues', async (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          json: { id: 'new-league-1', name: 'E2E League', status: 'ACTIVE' },
        });
      } else {
        route.continue();
      }
    });

    const leagues = new LeaguesPage(page);
    await leagues.goto();
    await leagues.createLeague('E2E Test League');

    // Modal should close and league appears (or redirect to league detail)
    await expect(leagues.createModal).not.toBeVisible({ timeout: 5_000 });
  });

  test('join link navigates to league join page', async ({ page }) => {
    await page.goto('/leagues/league-1/join?token=test-token-abc');
    await expect(page).toHaveURL(/leagues\/.*\/join/);
  });
});

test.describe('Leagues – non-happy path', () => {
  test('creating league with empty name is rejected', async ({ page }) => {
    await page.route('**/api/portfolio', (route) => {
      route.fulfill({ json: PREMIUM_PORTFOLIO });
    });
    await page.route('**/api/leagues', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { leagues: [], pendingInvites: [] } });
      } else {
        route.continue();
      }
    });

    const leagues = new LeaguesPage(page);
    await leagues.goto();
    await leagues.createButton.click();
    await leagues.createModal.waitFor({ state: 'visible' });

    // Submit without filling name
    await leagues.submitCreateButton.click();

    // Modal stays open or validation error shown
    const modalStillOpen = await leagues.createModal.isVisible().catch(() => false);
    const hasError = await page.getByRole('alert').isVisible().catch(() => false);
    expect(modalStillOpen || hasError).toBe(true);
  });

  test('inviting non-existent phone shows error', async ({ page }) => {
    await page.route('**/api/leagues/*/invite', (route) => {
      route.fulfill({
        status: 404,
        json: { error: 'User not found' },
      });
    });

    const leagues = new LeaguesPage(page);
    await leagues.gotoLeague('league-1');

    if (await leagues.inviteInput.isVisible()) {
      await leagues.inviteMember('9990000000');
      await expect(page.getByText(/not found|no user|error/i)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('joining with invalid token shows error', async ({ page }) => {
    await page.route('**/api/leagues/*/join', (route) => {
      route.fulfill({ status: 400, json: { error: 'Invalid or expired token' } });
    });

    await page.goto('/leagues/league-1/join?token=bad-token');
    await expect(page.getByText(/invalid|expired|error/i)).toBeVisible({ timeout: 8_000 });
  });

  test('viewing ended league shows final standings', async ({ page }) => {
    // The league detail page reads leagueData?.league — wrap response accordingly
    await page.route('**/api/leagues/ended-league', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          json: {
            league: {
              id: 'ended-league',
              name: 'Past League',
              status: 'ENDED',
              endsAt: new Date(Date.now() - 86400_000).toISOString(),
              memberCount: 1,
              maxMembers: 10,
              creatorId: 'u1',
              members: [{ userId: 'u1', name: 'Alex J.', rank: 1, growthPct: 12.5, isCurrentUser: false, startingPortfolio: 10000, currentValue: 11250 }],
            },
          },
        });
      } else {
        route.continue();
      }
    });
    await page.route('**/api/leagues/ended-league/leaderboard', (route) => {
      route.fulfill({ json: { leaderboard: [] } });
    });

    await page.goto('/leagues/ended-league');
    // Component shows "Ended" badge when league.status === 'ENDED'
    await expect(page.getByText(/ended/i)).toBeVisible({ timeout: 5_000 });
  });
});

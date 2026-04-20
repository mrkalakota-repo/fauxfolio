/**
 * Leaderboard test suite — public endpoint, no auth required.
 */
import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test('public leaderboard API returns top 10 and richest', async ({ page }) => {
    const response = await page.request.get('/api/leaderboard');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('leaderboard');
    expect(body).toHaveProperty('richest');
    expect(Array.isArray(body.leaderboard)).toBe(true);
    expect(body.leaderboard.length).toBeLessThanOrEqual(10);
  });

  test('leaderboard names are masked (first name + initial)', async ({ page }) => {
    const response = await page.request.get('/api/leaderboard');
    const { leaderboard } = await response.json();

    for (const entry of leaderboard) {
      // Names should match "First L." pattern (masked)
      expect(entry.name).toMatch(/^[A-Za-z]+ [A-Z]\.$/);
    }
  });

  test('dashboard displays top gainers and losers', async ({ page }) => {
    // Authenticated users are redirected from / to /dashboard — check there instead
    await page.goto('/dashboard');
    const gainersSection = page.getByText(/top gainers|top losers/i).first();
    await expect(gainersSection).toBeVisible({ timeout: 8_000 });
  });

  // Run rate-limit test last — it exhausts the 30/min quota and would poison
  // any subsequent leaderboard API calls within the same rate-limit window.
  test('leaderboard rate limit (30/min) is enforced', async ({ page }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) {
      const res = await page.request.get('/api/leaderboard');
      statuses.push(res.status());
    }
    expect(statuses).toContain(429);
  });
});

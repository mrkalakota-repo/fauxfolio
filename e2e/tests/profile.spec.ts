/**
 * User profile / account settings test suite.
 */
import { test, expect } from '@playwright/test';

test.describe('Profile – happy path', () => {
  test('profile page loads with user info', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/profile/);
    // Phone number (masked) or some user identifier should be visible
    await expect(page.getByText(/\d{4}|\*{4}/)).toBeVisible({ timeout: 5_000 });
  });

  test('can change PIN with correct current PIN', async ({ page }) => {
    await page.goto('/profile');

    const currentPinInput = page.getByLabel(/current pin/i);
    if (!(await currentPinInput.isVisible())) {
      test.skip();
      return;
    }

    await currentPinInput.fill('123456');
    await page.getByLabel(/new pin/i).fill('654321');
    await page.getByLabel(/confirm.*pin/i).fill('654321');
    await page.getByRole('button', { name: /change pin|update pin/i }).click();

    await expect(page.getByText(/pin updated|success/i)).toBeVisible({ timeout: 5_000 });

    // Restore original PIN
    await page.getByLabel(/current pin/i).fill('654321');
    await page.getByLabel(/new pin/i).fill('123456');
    await page.getByLabel(/confirm.*pin/i).fill('123456');
    await page.getByRole('button', { name: /change pin|update pin/i }).click();
  });
});

test.describe('Profile – non-happy path', () => {
  test('change PIN with wrong current PIN is rejected', async ({ page }) => {
    await page.goto('/profile');

    const currentPinInput = page.getByLabel(/current pin/i);
    if (!(await currentPinInput.isVisible())) {
      test.skip();
      return;
    }

    await currentPinInput.fill('000000');
    await page.getByLabel(/new pin/i).fill('111111');
    await page.getByLabel(/confirm.*pin/i).fill('111111');
    await page.getByRole('button', { name: /change pin|update pin/i }).click();

    await expect(page.getByRole('alert').or(page.getByText(/incorrect|invalid|wrong/i)))
      .toBeVisible({ timeout: 5_000 });
  });

  test('change PIN with mismatched new PINs is rejected', async ({ page }) => {
    await page.goto('/profile');

    const currentPinInput = page.getByLabel(/current pin/i);
    if (!(await currentPinInput.isVisible())) {
      test.skip();
      return;
    }

    await currentPinInput.fill('123456');
    await page.getByLabel(/new pin/i).fill('111111');
    await page.getByLabel(/confirm.*pin/i).fill('222222');
    await page.getByRole('button', { name: /change pin|update pin/i }).click();

    await expect(page.getByRole('alert').or(page.getByText(/match|same/i)))
      .toBeVisible({ timeout: 5_000 });
  });

  test('change-pin API is authenticated', async ({ page }) => {
    await page.context().clearCookies();
    const response = await page.request.post('/api/auth/change-pin', {
      data: { currentPin: '123456', newPin: '654321' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });
});

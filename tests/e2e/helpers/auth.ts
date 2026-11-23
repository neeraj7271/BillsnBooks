import { Page, expect } from '@playwright/test';

// Credentials are read from the environment so no real account is committed to
// source control. Set E2E_EMAIL / E2E_PASSWORD in CI or a local .env; the
// placeholders below are obviously-fake defaults for throwaway local runs.
export const TEST_CREDENTIALS = {
  email: process.env.E2E_EMAIL || 'e2e.user@example.test',
  password: process.env.E2E_PASSWORD || 'ChangeMe_E2E!123',
};

export async function loginAsAdmin(page: Page) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.getByPlaceholder(/admin@firm\.com/i).fill(TEST_CREDENTIALS.email);
  await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.password);

  const signInBtn = page.getByRole('button', { name: /^Sign In$/i });
  await signInBtn.click();

  await page.waitForURL(/.*settings\/companies.*/, { timeout: 15000 });
  await expect(page).toHaveURL(/.*settings\/companies.*/);
}

import { Page, expect } from '@playwright/test';

export const TEST_CREDENTIALS = {
  email: 'neeraj8829sini@gmail.com',
  password: 'SecurePassword123!',
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

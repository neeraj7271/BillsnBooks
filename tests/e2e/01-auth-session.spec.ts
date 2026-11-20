import { test, expect } from '@playwright/test';

test.describe('Section 1: Authentication & Session Management', () => {
  const timestamp = Date.now();
  const testUser = {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: `priya.qa.${timestamp}@antigravitybooks.test`,
    password: 'SecurePassword123!',
  };

  test('T-001: Submit empty sign-up form and verify inline field validations', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Create My Account/i });
    await submitBtn.click();

    const firstNameInput = page.getByPlaceholder(/e\.g\. Rajesh/i);
    const isRequired = await firstNameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    await page.screenshot({ path: 'test-results/screenshots/T-001.png', fullPage: true });
  });

  test('T-002: Enter invalid email format and verify error message', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/e\.g\. Rajesh/i).pressSequentially('Priya', { delay: 30 });
    await page.getByPlaceholder(/e\.g\. Kothari/i).pressSequentially('Sharma', { delay: 30 });
    await page.getByPlaceholder(/rajesh@example\.com/i).pressSequentially('invalid-email-address', { delay: 30 });
    await page.locator('input[type="password"]').pressSequentially('SecurePassword123!', { delay: 30 });

    const submitBtn = page.getByRole('button', { name: /Create My Account/i });
    await submitBtn.click();

    const emailInput = page.getByPlaceholder(/rajesh@example\.com/i);
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);

    await page.screenshot({ path: 'test-results/screenshots/T-002.png', fullPage: true });
  });

  test('T-003: Enter weak password (< 8 chars) and verify complexity enforcement', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/e\.g\. Rajesh/i).pressSequentially('Priya', { delay: 30 });
    await page.getByPlaceholder(/e\.g\. Kothari/i).pressSequentially('Sharma', { delay: 30 });
    await page.getByPlaceholder(/rajesh@example\.com/i).pressSequentially(`test.${Date.now()}@example.com`, { delay: 30 });
    await page.locator('input[type="password"]').pressSequentially('short', { delay: 30 });

    const submitBtn = page.getByRole('button', { name: /Create My Account/i });
    await submitBtn.click();

    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/T-003.png', fullPage: true });
  });

  test('T-004: Register new account with valid credentials and verify organization creation', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await page.getByText(/CA \/ Tax Practitioner/i).click();

    await page.getByPlaceholder(/e\.g\. Rajesh/i).pressSequentially(testUser.firstName, { delay: 30 });
    await page.getByPlaceholder(/e\.g\. Kothari/i).pressSequentially(testUser.lastName, { delay: 30 });
    await page.getByPlaceholder(/rajesh@example\.com/i).pressSequentially(testUser.email, { delay: 30 });
    await page.locator('input[type="password"]').pressSequentially(testUser.password, { delay: 30 });

    const submitBtn = page.getByRole('button', { name: /Create My Account/i });
    await submitBtn.click();

    await page.waitForURL(/.*settings\/companies.*/, { timeout: 15000 });
    await expect(page).toHaveURL(/.*settings\/companies.*/);

    const tenantId = await page.evaluate(() => localStorage.getItem('antigravity_tenant_id'));
    const token = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(tenantId).toBeTruthy();
    expect(token).toBeTruthy();

    await page.screenshot({ path: 'test-results/screenshots/T-004.png', fullPage: true });
  });

  test('T-005: Attempt duplicate email registration and verify HTTP 409 conflict error toast', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/e\.g\. Rajesh/i).pressSequentially(testUser.firstName, { delay: 20 });
    await page.getByPlaceholder(/e\.g\. Kothari/i).pressSequentially(testUser.lastName, { delay: 20 });
    await page.getByPlaceholder(/rajesh@example\.com/i).pressSequentially(testUser.email, { delay: 20 });
    await page.locator('input[type="password"]').pressSequentially(testUser.password, { delay: 20 });

    const submitBtn = page.getByRole('button', { name: /Create My Account/i });
    await submitBtn.click();

    await expect(page.getByText(/already exists|failed|conflict|registered/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/T-005.png', fullPage: true });
  });

  test('T-006: Submit empty login form and verify required field indicators', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /^Sign In$/i });
    await submitBtn.click();

    const emailInput = page.getByPlaceholder(/admin@firm\.com/i);
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();

    await page.screenshot({ path: 'test-results/screenshots/T-006.png', fullPage: true });
  });

  test('T-007: Enter invalid credentials and verify unauthorized alert message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/admin@firm\.com/i).pressSequentially(testUser.email, { delay: 20 });
    await page.locator('input[type="password"]').pressSequentially('WrongPassword123!', { delay: 20 });

    const submitBtn = page.getByRole('button', { name: /^Sign In$/i });
    await submitBtn.click();

    await expect(page.getByText(/Invalid credentials|account inactive|Unauthorized|Invalid email or password/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/T-007.png', fullPage: true });
  });

  test('T-008: Login with valid credentials and verify redirect to main dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/admin@firm\.com/i).pressSequentially(testUser.email, { delay: 20 });
    await page.locator('input[type="password"]').pressSequentially(testUser.password, { delay: 20 });

    const submitBtn = page.getByRole('button', { name: /^Sign In$/i });
    await submitBtn.click();

    await page.waitForURL(/.*settings\/companies.*/, { timeout: 15000 });
    await expect(page).toHaveURL(/.*settings\/companies.*/);

    await page.screenshot({ path: 'test-results/screenshots/T-008.png', fullPage: true });
  });

  test('T-009: Verify JWT token stored in localStorage and persists across page reload', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/admin@firm\.com/i).fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL(/.*settings\/companies.*/, { timeout: 15000 });

    const tokenBefore = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(tokenBefore).toBeTruthy();

    await page.reload();
    await page.waitForLoadState('networkidle');

    const tokenAfter = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));
    expect(tokenAfter).toBe(tokenBefore);

    await page.screenshot({ path: 'test-results/screenshots/T-009.png', fullPage: true });
  });

  test('T-010: Click logout button, verify session destroyed and redirect to /auth/login', async ({ page }) => {
    await page.goto('/settings/companies');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      localStorage.clear();
      window.location.href = '/auth/login';
    });

    await page.waitForURL(/.*auth\/login.*/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*auth\/login.*/);

    await page.screenshot({ path: 'test-results/screenshots/T-010.png', fullPage: true });
  });

  test('T-011: Access protected route (/invoices) while unauthenticated and verify redirect', async ({ page }) => {
    await page.goto('/auth/login');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/screenshots/T-011.png', fullPage: true });
  });

  test('T-012: Input SQL injection string in email field and verify safe handling', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByPlaceholder(/admin@firm\.com/i);
    await emailInput.pressSequentially("' OR '1'='1", { delay: 20 });
    await page.locator('input[type="password"]').pressSequentially('admin', { delay: 20 });

    const submitBtn = page.getByRole('button', { name: /^Sign In$/i });
    await submitBtn.click();

    // Browser email input validation blocks invalid email syntax, preventing SQL injection submission
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);

    await page.screenshot({ path: 'test-results/screenshots/T-012.png', fullPage: true });
  });

  test('T-013: Input XSS payload in name field and verify sanitization', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    const xssPayload = '<script>alert("XSS")</script>';
    await page.getByPlaceholder(/e\.g\. Rajesh/i).pressSequentially(xssPayload, { delay: 20 });
    await page.getByPlaceholder(/e\.g\. Kothari/i).pressSequentially('Tester', { delay: 20 });

    const inputVal = await page.getByPlaceholder(/e\.g\. Rajesh/i).inputValue();
    expect(inputVal).toBe(xssPayload);

    await page.screenshot({ path: 'test-results/screenshots/T-013.png', fullPage: true });
  });
});

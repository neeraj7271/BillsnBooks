import { test, expect } from '../helpers/zero-error-fixture';
import * as fs from 'fs';
import * as path from 'path';

const PASS = 'HeavyQaPass@2026!';
const PARTNER_EMAIL = 'layera.t1.1795608414148@heavyqa.test';
const CO1_ID = '89bdaa09-4934-47ea-902e-b821d211bd1c';
const API_BASE = 'http://localhost:4000';
const SCREENS_DIR = path.resolve(process.cwd(), 'docs/practice-v2-screens');

async function loginAs(page: any, email: string, password = PASS) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /^Sign In$/i }).click();
  await page.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });
  await page.evaluate((cid: string) => {
    localStorage.setItem('antigravity_active_company_id', cid);
  }, CO1_ID);
}

async function captureBothThemes(page: any, baseName: string) {
  await page.screenshot({ path: path.join(SCREENS_DIR, `${baseName}.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(SCREENS_DIR, `${baseName}-dark.png`), fullPage: false });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
}

test.describe('Team Management & Enforced Review/Sign-off Engine', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENS_DIR, { recursive: true });
  });

  test('TR.1 Invite colleague to SAME firm -> Accept Invite -> Roles -> Client Team -> Enforced Review Gate -> Sign-off -> Solo Toggle', async ({ page, browser, request }) => {
    await loginAs(page, PARTNER_EMAIL);
    await page.setViewportSize({ width: 1440, height: 900 });

    const partnerTenantId = await page.evaluate(() => localStorage.getItem('antigravity_tenant_id'));
    const partnerToken = await page.evaluate(() => localStorage.getItem('antigravity_access_token'));

    // Ensure firm starts in ENFORCED review mode
    await request.patch(`${API_BASE}/v1/practice/review-settings`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
      data: { reviewMode: 'ENFORCED' },
    });

    // 1. /practice/team: list colleagues + invite new colleague
    await page.goto('/practice/team');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Team & Colleagues')).toBeVisible();
    await captureBothThemes(page, 'team-list');

    const inviteEmail = `colleague.${Date.now()}@heavyqa.test`;
    await page.getByRole('button', { name: /Invite Colleague/i }).click();
    await page.getByPlaceholder('priya@firm.in').fill(inviteEmail);
    await page.getByPlaceholder('Priya Nair').fill('Priya Preparer');
    await page.getByRole('button', { name: /Create Invite/i }).click();
    await expect(page.getByTestId('invite-magic-link')).toBeVisible();
    const magicLink = await page.getByTestId('invite-magic-link').inputValue();
    await captureBothThemes(page, 'invite-member');
    await page.getByRole('button', { name: /^Close$/i }).click();

    // 2. Colleague accepts invite in a fresh browser context -> joins SAME tenantId
    const staffContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const staffPage = await staffContext.newPage();
    await staffPage.goto(magicLink);
    await staffPage.waitForLoadState('networkidle');
    await expect(staffPage.getByText('Join Firm Workspace')).toBeVisible();
    await staffPage.getByPlaceholder('Min 8 characters').fill(PASS);
    await staffPage.getByRole('button', { name: /Accept Invite & Join Firm/i }).click();
    await staffPage.waitForURL((u: URL) => !u.pathname.startsWith('/auth/'), { timeout: 15000 });

    const staffTenantId = await staffPage.evaluate(() => localStorage.getItem('antigravity_tenant_id'));
    expect(staffTenantId).toBe(partnerTenantId);
    const staffToken = await staffPage.evaluate(() => localStorage.getItem('antigravity_access_token'));

    // 3. Permission Roles & Job Roles (/practice/settings/roles)
    await page.goto('/practice/settings/roles');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('e.g. Senior Reviewer / Articled Clerk').fill(`Senior ${Date.now().toString().slice(-3)}`);
    await page.getByRole('button', { name: /Create Role/i }).click();
    await page.waitForTimeout(400);
    await captureBothThemes(page, 'permission-roles');

    // 4. Client 360 -> Team tab (assign job role)
    await page.goto('/practice/clients');
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/practice/clients/"]').filter({ hasText: /Client 360|View|Ltd|Pvt|LLP|Enterprises/i }).first().click();
    await page.waitForURL(/\/practice\/clients\/[0-9a-f-]+/i);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /^Team \(/i }).click();
    await expect(page.getByText('Client Team & Job Role Assignments')).toBeVisible();
    await page.getByRole('button', { name: /Assign to Client/i }).click();
    await page.waitForTimeout(400);
    await captureBothThemes(page, 'job-roles-client');

    // 5. Colleague prepares a job & submits for review -> gated buttons DISABLED for preparer
    await staffPage.evaluate((cid: string) => {
      localStorage.setItem('antigravity_active_company_id', cid);
    }, CO1_ID);
    await staffPage.goto('/practice/jobs');
    await staffPage.waitForLoadState('networkidle');

    // Create a fresh job as the colleague so it starts clean
    await staffPage.getByRole('button', { name: /^New Job$/i }).click();
    await staffPage.getByRole('button', { name: /^Create Job$/i }).click();
    await staffPage.waitForTimeout(600);

    // Open the newest job in Backlog
    await staffPage.locator('[data-testid="kanban-col-BACKLOG"] .cursor-pointer').first().click();
    await expect(staffPage.getByRole('button', { name: /Submit for Review/i })).toBeVisible();
    await staffPage.getByRole('button', { name: /Submit for Review/i }).click();
    await staffPage.waitForTimeout(500);

    // Verify "Filed" / "Done" and "Approve & Sign Off" are DISABLED for the preparer
    await expect(staffPage.getByText(/Awaiting review by Reviewer/i)).toBeVisible();
    await expect(staffPage.getByRole('button', { name: /^Approve & Sign Off$/i })).toBeDisabled();
    await captureBothThemes(staffPage, 'review-gate-blocked');

    // Verify API directly enforces 403 Forbidden if preparer attempts to move to FILED
    const staffUserId = await staffPage.evaluate(() => localStorage.getItem('antigravity_user_id'));
    const jobUrlId = await staffPage.evaluate(async ({ apiBase, tok, uid }) => {
      const r = await fetch(`${apiBase}/v1/practice/jobs`, { headers: { Authorization: `Bearer ${tok}` } });
      const j = await r.json();
      const list = j.data || j;
      const inRev = list.find((x: any) => x.reviewStatus === 'IN_REVIEW' && (!uid || x.preparerUserId === uid)) || list.find((x: any) => x.reviewStatus === 'IN_REVIEW');
      return inRev?.id;
    }, { apiBase: API_BASE, tok: staffToken, uid: staffUserId });
    expect(jobUrlId).toBeTruthy();

    const bypassRes = await request.patch(`${API_BASE}/v1/practice/jobs/${jobUrlId}/stage`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { stage: 'FILED' },
    });
    expect(bypassRes.status()).toBe(403);

    // 6. Partner opens /practice/reviews -> Returns THIS exact job for rework with notes
    const jobTitle = await staffPage.evaluate(async ({ apiBase, tok, jid }) => {
      const r = await fetch(`${apiBase}/v1/practice/jobs/${jid}`, { headers: { Authorization: `Bearer ${tok}` } });
      const j = await r.json();
      return (j.data || j).title;
    }, { apiBase: API_BASE, tok: staffToken, jid: jobUrlId });

    await page.goto('/practice/reviews');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Awaiting My Review & Sign-off')).toBeVisible();
    await captureBothThemes(page, 'review-inbox');

    const reviewCard = page.locator('.rounded-xl.border').filter({ hasText: jobTitle }).first();
    await reviewCard.getByPlaceholder('Review remarks or required rework notes...').fill('Attach GSTR-2B working paper');
    await reviewCard.getByRole('button', { name: /Return for Rework/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/returned to preparer/i)).toBeVisible();

    // Preparer sees Changes Requested on that job & re-submits
    await staffPage.reload();
    await staffPage.waitForLoadState('networkidle');
    await staffPage.getByPlaceholder('Search jobs...').fill(jobTitle);
    await staffPage.waitForTimeout(300);
    await staffPage.locator('[data-testid="kanban-col-IN_PROGRESS"] .cursor-pointer').first().click();
    await expect(staffPage.getByText(/Changes Requested: Attach GSTR-2B working paper/i)).toBeVisible();
    await captureBothThemes(staffPage, 'review-return-notes');
    await staffPage.getByRole('button', { name: /Submit for Review/i }).click();
    await staffPage.waitForTimeout(500);

    // Partner approves & signs off -> full audit timeline visible
    await page.goto('/practice/jobs');
    await page.waitForLoadState('networkidle');
    if (jobTitle) {
      await page.getByPlaceholder('Search jobs...').fill(jobTitle);
      await page.waitForTimeout(300);
    }
    await page.locator('[data-testid="kanban-col-REVIEW"] .cursor-pointer').first().click();
    await page.getByPlaceholder('Review remarks or rework notes...').fill('All schedules verified. Signed off.');
    await page.getByRole('button', { name: /Approve & Sign Off/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Review Audit Timeline')).toBeVisible();
    await expect(page.getByText(/SUBMIT_FOR_REVIEW/i).first()).toBeVisible();
    await expect(page.getByText(/RETURN_FOR_REWORK/i).first()).toBeVisible();
    await expect(page.getByText(/SIGN_OFF/i).first()).toBeVisible();
    await captureBothThemes(page, 'review-signoff-timeline');

    // 7. Solo vs Firm review mode toggle (/practice/settings)
    await page.goto('/practice/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Solo vs Team Review Gate')).toBeVisible();
    await page.getByRole('button', { name: /Solo CA \(Self Sign-Off\)/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/Review gate updated to SELF_SIGNOFF/i)).toBeVisible();
    await captureBothThemes(page, 'solo-vs-firm-toggle');
    await page.getByRole('button', { name: /Firm Mode \(Enforced\)/i }).click();
    await page.waitForTimeout(300);

    await staffContext.close();
  });
});

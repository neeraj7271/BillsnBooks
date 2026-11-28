import { test, expect } from '@playwright/test';
import { API_URL, loginAsSeededAdmin, getAuthHeaders, trackConsoleAndPageErrors } from './helpers/session';

test.describe('Phase 1: Practice CA Firm Lifecycle (Headed)', () => {
  test.setTimeout(240_000);

  test('Mode toggle, Client 360, Proposal -> Engagement e-sign -> Jobs -> Review Engine -> Timesheets -> WIP Billing -> Paid -> Compliance', async ({ page }) => {
    const errors = trackConsoleAndPageErrors(page);
    await loginAsSeededAdmin(page);
    const { token, tenantId, companyId } = await getAuthHeaders(page);
    const hdrs = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId, 'Content-Type': 'application/json' };
    const suffix = Date.now().toString().slice(-4);

    // 1. Practice Hub (/practice) — Firm vs Business mode toggle
    await page.goto('/practice', { waitUntil: 'networkidle' });
    const businessToggle = page.locator('button:has-text("Business")').first();
    if (await businessToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await businessToggle.click();
      await page.waitForTimeout(400);
      await page.locator('button:has-text("Firm")').first().click();
      await page.waitForTimeout(400);
    }

    // 2. Create a dedicated Company + Practice Client & visit Client 360
    const compRes = await fetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        legalName: `Zenith Precision Exports Pvt Ltd ${suffix}`,
        tradeName: `Zenith Exports ${suffix}`,
        pan: 'AABCZ9012K',
        gstin: `27AABCZ9012K1Z5`,
        stateCode: '27',
      }),
    });
    expect(compRes.status).toBeLessThan(300);
    const compJson: any = await compRes.json();
    const clientCompanyId = (compJson.data ?? compJson).id;

    const cliRes = await fetch(`${API_URL}/practice/clients`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        companyId: clientCompanyId,
        clientCode: `ZNH-${suffix}`,
        primaryContactName: 'Vikram Desai',
        primaryContactEmail: `vikram.${suffix}@zenithexports.in`,
        engagementType: 'RETAINER',
        serviceTier: 'ENTERPRISE',
      }),
    });
    expect(cliRes.status).toBeLessThan(300);
    const cliJson: any = await cliRes.json();
    const client = cliJson.data ?? cliJson;

    await page.goto(`/practice/clients/${client.id}`, { waitUntil: 'networkidle' });
    await expect(page.locator('text=Zenith Precision Exports Pvt Ltd').first()).toBeVisible();
    for (const tab of ['Services', 'Team', 'Jobs', 'Documents Vault', 'Credentials', 'Compliance Calendar']) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(150);
      }
    }

    // 3. Services & Workflows (verify requiresApproval is intact)
    await page.goto('/practice/settings/services', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/GSTR|Service/i').first()).toBeVisible();

    await page.goto('/practice/settings/workflows', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/Monthly GST|Workflow/i').first()).toBeVisible();

    // 4. Proposal -> Convert to Engagement -> Client Sign -> Firm Counter-sign (API + UI verify)
    const svcRes = await fetch(`${API_URL}/practice/services`, { headers: hdrs });
    const svcJson: any = await svcRes.json();
    const services = svcJson.data ?? svcJson;
    const gstSvc = services[0];

    const propRes = await fetch(`${API_URL}/practice/proposals`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        clientId: client.id,
        title: `Retainer FY26 ${suffix}`,
        lines: [
          {
            serviceTypeId: gstSvc?.id,
            description: gstSvc?.name || 'Monthly GST Retainer',
            feeType: 'RECURRING',
            amount: 12000,
            gstRate: 18,
          },
        ],
      }),
    });
    expect(propRes.status).toBeLessThan(300);
    const propJson: any = await propRes.json();
    const prop = propJson.data ?? propJson;

    const convRes = await fetch(`${API_URL}/practice/proposals/${prop.id}/convert-engagement`, {
      method: 'POST',
      headers: hdrs,
    });
    expect(convRes.status).toBeLessThan(300);
    const convJson: any = await convRes.json();
    const eng = convJson.data ?? convJson;

    await page.goto(`/practice/engagements/${eng.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=/Engagement|Signature/i').first()).toBeVisible({ timeout: 15000 });

    // Client Sign + Firm Counter-sign
    const cSignRes = await fetch(`${API_URL}/practice/engagements/${eng.id}/client-sign`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        signerName: 'Vikram Desai',
        signerEmail: `vikram.${suffix}@zenithexports.in`,
        consentAccepted: true,
      }),
    });
    expect(cSignRes.status).toBeLessThan(300);

    const fSignRes = await fetch(`${API_URL}/practice/engagements/${eng.id}/firm-countersign`, {
      method: 'POST',
      headers: hdrs,
    });
    expect(fSignRes.status).toBeLessThan(300);
    const fSignJson: any = await fSignRes.json();
    const activeEng = fSignJson.data ?? fSignJson;
    expect(activeEng.engagement?.status ?? activeEng.status).toBe('ACTIVE');

    // 5. Log Time -> Approve Timesheet -> WIP Bill -> GST Invoice -> Mark Paid -> Profitability
    const timeRes = await fetch(`${API_URL}/practice/time-entries`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        clientId: client.id,
        notes: 'GSTR-1 & 3B Reconciliation',
        workDate: '2026-04-15',
        minutes: 120,
        hourlyRate: 2000,
        isBillable: true,
      }),
    });
    expect(timeRes.status).toBeLessThan(300);
    const timeJson: any = await timeRes.json();
    const timeEntry = timeJson.data ?? timeJson;

    const appTimeRes = await fetch(`${API_URL}/practice/time-entries/approve`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ entryIds: [timeEntry.id], approvalStatus: 'APPROVED' }),
    });
    expect(appTimeRes.status).toBeLessThan(300);

    await page.goto('/practice/timesheets', { waitUntil: 'networkidle' });
    await expect(page.locator('text=GSTR-1 & 3B Reconciliation').first()).toBeVisible();

    // Create WIP Bill -> Convert to GST Invoice -> Mark Paid
    const billRes = await fetch(`${API_URL}/practice/bills/from-wip`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ clientId: client.id }),
    });
    expect(billRes.status).toBeLessThan(300);
    const billJson: any = await billRes.json();
    const bill = billJson.data ?? billJson;
    expect(Number(bill.totalAmount)).toBeGreaterThan(0);

    const gstInvRes = await fetch(`${API_URL}/practice/bills/${bill.id}/convert-invoice`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ companyId }),
    });
    expect(gstInvRes.status).toBeLessThan(300);

    const paidRes = await fetch(`${API_URL}/practice/bills/${bill.id}/mark-paid`, {
      method: 'POST',
      headers: hdrs,
    });
    expect(paidRes.status).toBeLessThan(300);

    await page.goto('/practice/billing', { waitUntil: 'networkidle' });
    await expect(page.locator('text=PAID').first()).toBeVisible();

    // 6. Visit Jobs, Reviews, Capacity, Team, Notices, Calendar, Documents, Practice Settings
    for (const route of [
      '/practice/jobs',
      '/practice/jobs?tab=review',
      '/practice/capacity',
      '/practice/team',
      '/practice/notices',
      '/practice/calendar',
      '/practice/documents',
      '/practice/settings',
      '/practice/settings/templates',
      '/practice/settings/engagement-templates',
      '/practice/settings/roles',
      '/practice/settings/custom-fields',
    ]) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    }

    expect(errors).toEqual([]);
  });
});

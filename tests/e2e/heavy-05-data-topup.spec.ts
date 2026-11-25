import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const PASS = 'HeavyQaPass@2026!';
const WEBHOOK_SECRET = 'heavy-qa-webhook-secret-2026';
const API = 'http://localhost:4000';
const STATE_FILE = '/tmp/heavy-e2e/layer-a-state.json';

async function apiJson(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json?.data ?? json };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

test.describe('Heavy E2E Section 1 Continuation: Data Top-Up Across All 9 Companies', () => {
  test.setTimeout(600_000);

  test('Top up all 9 existing companies so every report and UI screen has rich non-empty data', async () => {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const companiesState: any[] = state.companiesState;
    expect(companiesState.length).toBe(9);

    const tokenByTenant = new Map<string, string>();
    const summary: any[] = [];

    for (let coIdx = 0; coIdx < companiesState.length; coIdx++) {
      const co = companiesState[coIdx];
      let token = tokenByTenant.get(co.tenantEmail);
      if (!token) {
        const login = await apiJson('POST', '/v1/auth/login', '', {
          email: co.tenantEmail,
          password: PASS,
        });
        expect(login.status).toBeLessThan(300);
        token = login.data?.tokens?.accessToken || login.data?.accessToken || login.data?.access_token;
        expect(token).toBeTruthy();
        tokenByTenant.set(co.tenantEmail, token!);
      }

      const cid = co.companyId;
      const compRes = await apiJson('GET', `/v1/companies/${cid}`, token!);
      const comp = compRes.data;
      const branchId = comp.branches?.[0]?.id;
      const financialYearId = comp.financialYears?.[0]?.id;
      expect(branchId).toBeTruthy();
      expect(financialYearId).toBeTruthy();

      // 1. Fetch existing parties, items, ledgers, groups
      const [partiesRes, itemsRes, ledgersRes, groupsRes] = await Promise.all([
        apiJson('GET', `/v1/companies/${cid}/parties?limit=50`, token!),
        apiJson('GET', `/v1/companies/${cid}/items?limit=50`, token!),
        apiJson('GET', `/v1/companies/${cid}/ledgers`, token!),
        apiJson('GET', `/v1/companies/${cid}/ledgers/groups`, token!),
      ]);

      const parties: any[] = Array.isArray(partiesRes.data) ? partiesRes.data : [];
      const items: any[] = Array.isArray(itemsRes.data) ? itemsRes.data : [];
      const ledgers: any[] = Array.isArray(ledgersRes.data) ? ledgersRes.data : [];
      const groups: any[] = Array.isArray(groupsRes.data) ? groupsRes.data : [];

      let customers = parties.filter((p) => p.partyType === 'CUSTOMER');
      if (customers.length === 0) customers = parties;
      let vendors = parties.filter((p) => p.partyType === 'VENDOR');

      // Ensure at least 2 vendors & 2 hygiene parties (missing PAN / missing GSTIN)
      if (vendors.length === 0) {
        const vRes = await apiJson('POST', `/v1/companies/${cid}/parties`, token!, {
          name: `Topup Vendor ${co.legalName.slice(0, 12)}`,
          partyType: 'VENDOR',
          registrationType: 'REGULAR',
          gstin: '27AABCV1234F1Z5',
          pan: 'AABCV1234F',
          billingStateCode: '27',
        });
        if (vRes.status < 300) vendors.push(vRes.data);
      }

      // 2 parties intentionally missing PAN and GSTIN
      for (let k = 1; k <= 2; k++) {
        await apiJson('POST', `/v1/companies/${cid}/parties`, token!, {
          name: `Unregistered Hygiene Party ${k} ${cid.slice(0, 4)}`,
          partyType: k === 1 ? 'VENDOR' : 'CUSTOMER',
          registrationType: 'UNREGISTERED',
          billingStateCode: '27',
        });
      }

      // Resolve key ledgers
      const findLedger = (pred: (l: any) => boolean) => ledgers.find(pred);
      const cashLedger = findLedger(
        (l) => l.name.toLowerCase().includes('cash') || (l.group?.name || '').toLowerCase().includes('cash'),
      );
      let bankLedgers = ledgers.filter(
        (l) => l.name.toLowerCase().includes('bank') || (l.group?.name || '').toLowerCase().includes('bank'),
      );
      const debtorLedger = findLedger(
        (l) => l.code === '1161' || l.name.toLowerCase().includes('debtor'),
      );
      const creditorLedger = findLedger(
        (l) => l.code === '2131' || l.name.toLowerCase().includes('creditor') || l.name.toLowerCase().includes('payable'),
      );
      let expenseLedger = findLedger(
        (l) => (l.group?.nature || '') === 'EXPENSE' || l.name.toLowerCase().includes('expense') || l.name.toLowerCase().includes('rent'),
      );
      const salesLedger = findLedger(
        (l) => (l.group?.nature || '') === 'INCOME' || l.name.toLowerCase().includes('sales'),
      );

      const bankGroup = groups.find((g) => g.name.toLowerCase().includes('bank')) || groups[0];
      const expenseGroup = groups.find((g) => g.nature === 'EXPENSE') || groups[0];
      const creditorGroup = groups.find((g) => g.name.toLowerCase().includes('creditor')) || groups[0];

      // Ensure at least 2 bank ledgers exist for inter-bank CONTRA & negative bank
      while (bankLedgers.length < 2 && bankGroup) {
        const idx = bankLedgers.length + 1;
        const created = await apiJson('POST', `/v1/companies/${cid}/ledgers`, token!, {
          name: `Topup Bank Account ${idx}`,
          code: `TOPBANK${idx}_${cid.slice(0, 4)}`,
          groupId: bankGroup.id,
          openingBalance: idx === 1 ? 500000 : 10000,
          isBankOrCash: true,
        });
        if (created.status < 300) bankLedgers.push(created.data);
        else break;
      }

      if (!expenseLedger && expenseGroup) {
        const created = await apiJson('POST', `/v1/companies/${cid}/ledgers`, token!, {
          name: `Topup Operating Expense`,
          code: `TOPEXP_${cid.slice(0, 4)}`,
          groupId: expenseGroup.id,
          openingBalance: 0,
        });
        if (created.status < 300) expenseLedger = created.data;
      }

      // Ensure a dedicated Vendor Creditor ledger (so PAYABLES_SUMMARY & ADVANCE_TO_VENDORS have rows)
      let vendorCreditorLedger = findLedger(
        (l) => l.name.toLowerCase().includes('supplier') || l.name.toLowerCase().includes('vendor'),
      );
      if (!vendorCreditorLedger && creditorGroup) {
        const created = await apiJson('POST', `/v1/companies/${cid}/ledgers`, token!, {
          name: `Topup Supplier Vendor Ledger`,
          code: `TOPVEND_${cid.slice(0, 4)}`,
          groupId: creditorGroup.id,
          openingBalance: 0,
        });
        if (created.status < 300) vendorCreditorLedger = created.data;
      }

      // Ensure squared-off and stagnant ledgers exist
      let squaredLedgerId: string | null = null;
      if (expenseGroup) {
        const sq = await apiJson('POST', `/v1/companies/${cid}/ledgers`, token!, {
          name: `Topup Squared Off Ledger`,
          code: `TOPSQ_${cid.slice(0, 4)}`,
          groupId: expenseGroup.id,
          openingBalance: 0,
        });
        if (sq.status < 300) squaredLedgerId = sq.data.id;

        await apiJson('POST', `/v1/companies/${cid}/ledgers`, token!, {
          name: `Topup Stagnant Dormant Ledger`,
          code: `TOPSTAG_${cid.slice(0, 4)}`,
          groupId: expenseGroup.id,
          openingBalance: 5000,
        });
      }

      // 2. Top-up >= 20 approved Sales Invoices spread across last 3 months
      // (intra-state, inter-state, zero-rated, cess, round-off)
      const createdInvoiceIds: string[] = [];
      const itemSample = items[0] || { id: co.itemIds?.[0], hsnSacCode: '851762', uom: 'NOS' };
      const partySample = customers[0];
      const companyNames = [
        'Vanguard', 'Meridian', 'Solstice', 'Apex', 'Zenith', 'Kaveri', 'Deccan', 'Narmada', 'Vindhya',
      ];
      for (let i = 0; i < 20; i++) {
        const daysAgo = (i * 3 + coIdx * 5) % 85; // varied dates across 3 months per company
        const invDate = isoDaysAgo(daysAgo);
        const pos = (i + coIdx) % 3 === 0 ? '29' : '27'; // mix inter-state & intra-state
        const isZeroRated = i % 5 === 0;
        const hasCess = i % 4 === 0 && !isZeroRated;
        const qty = String(1 + ((i + coIdx) % 4));
        const unitPrice = i % 2 === 0 ? (333.33 + coIdx * 111.17).toFixed(2) : String(1500 + coIdx * 317 + i * 25);

        const invRes = await apiJson('POST', `/v1/companies/${cid}/invoices`, token!, {
          branchId,
          financialYearId,
          partyId: customers[(i + coIdx) % customers.length]?.id || partySample.id,
          invoiceDate: invDate,
          dueDate: invDate,
          placeOfSupplyStateCode: pos,
          documentType: 'TAX_INVOICE',
          taxClassification: isZeroRated ? 'NIL_RATED' : 'TAXABLE',
          isDraft: false,
          items: [
            {
              itemId: (items[(i + coIdx) % Math.max(1, items.length)] || itemSample).id,
              description: `${companyNames[coIdx]} Sales Line ${i + 1}`,
              hsnSacCode: itemSample.hsnSacCode || '851762',
              quantity: qty,
              uom: itemSample.uom || 'NOS',
              unitPrice,
              discountPercent: '0',
              gstRatePercent: isZeroRated ? '5' : '18',
              cessRatePercent: hasCess ? '12' : '0',
            },
          ],
        });
        if (invRes.status < 300 && invRes.data?.id) {
          createdInvoiceIds.push(invRes.data.id);
        }
      }

      const postVoucher = async (
        voucherType: string,
        voucherDate: string,
        narration: string,
        entries: Array<{ ledgerId: string; entryType: 'DEBIT' | 'CREDIT'; amount: string; narration?: string }>,
      ) => {
        return apiJson('POST', `/v1/companies/${cid}/vouchers`, token!, {
          branchId,
          financialYearId,
          voucherType,
          voucherDate,
          narration,
          entries,
        });
      };

      const vCredId = vendorCreditorLedger?.id || creditorLedger?.id;
      const bank1Id = bankLedgers[0]?.id;
      const bank2Id = bankLedgers[1]?.id || bankLedgers[0]?.id;

      // 3. >= 20 approved Purchase / Expense vouchers (varied per company)
      const createdVoucherIds: string[] = [];
      if (expenseLedger && vCredId) {
        for (let i = 0; i < 20; i++) {
          const d = isoDaysAgo(((i * 2 + coIdx * 3) % 75) + 2);
          const amt = String(1500 + coIdx * 437 + i * 250);
          const v = await postVoucher('PURCHASE', d, `Topup Vendor Purchase #${i + 1}`, [
            { ledgerId: expenseLedger.id, entryType: 'DEBIT', amount: amt, narration: `Expense Bill ${i + 1}` },
            { ledgerId: vCredId, entryType: 'CREDIT', amount: amt, narration: `Payable to Vendor ${i + 1}` },
          ]);
          if (v.status < 300 && v.data?.id) createdVoucherIds.push(v.data.id);
        }
      }

      // 4. >= 10 Credit Notes & 5 Debit Notes
      if (salesLedger && debtorLedger) {
        for (let i = 0; i < 10; i++) {
          const d = isoDaysAgo(i * 3 + 1);
          await postVoucher('CREDIT_NOTE', d, `Topup Credit Note #${i + 1}`, [
            { ledgerId: salesLedger.id, entryType: 'DEBIT', amount: '500.00', narration: 'Sales Return' },
            { ledgerId: debtorLedger.id, entryType: 'CREDIT', amount: '500.00', narration: 'Customer Credit' },
          ]);
        }
      }
      if (expenseLedger && vCredId) {
        for (let i = 0; i < 5; i++) {
          const d = isoDaysAgo(i * 4 + 1);
          await postVoucher('DEBIT_NOTE', d, `Topup Debit Note #${i + 1}`, [
            { ledgerId: vCredId, entryType: 'DEBIT', amount: '400.00', narration: 'Purchase Return' },
            { ledgerId: expenseLedger.id, entryType: 'CREDIT', amount: '400.00', narration: 'Vendor Debit' },
          ]);
        }
      }

      // 5. >= 10 Cash Receipts (incl >= 2 over 2L) & >= 10 Cash Payments (incl >= 2 over 10K & negative cash trigger)
      if (cashLedger && debtorLedger && expenseLedger) {
        for (let i = 0; i < 10; i++) {
          const amt = i < 2 ? '250000.00' : String(2000 + i * 500);
          const d = isoDaysAgo(i * 2 + 1);
          await postVoucher('RECEIPT', d, `Topup Cash Receipt #${i + 1}`, [
            { ledgerId: cashLedger.id, entryType: 'DEBIT', amount: amt, narration: `Cash Inflow ${amt}` },
            { ledgerId: debtorLedger.id, entryType: 'CREDIT', amount: amt, narration: 'Customer Cash Receipt' },
          ]);
        }

        for (let i = 0; i < 10; i++) {
          // Make one massive cash payment (1,500,000) so cash goes negative (CASH_NEGATIVE) + several > 10k
          const amt = i === 9 ? '1500000.00' : i < 3 ? '15000.00' : '2500.00';
          const d = isoDaysAgo(i * 2 + 1);
          await postVoucher('PAYMENT', d, `Topup Cash Payment #${i + 1}`, [
            { ledgerId: expenseLedger.id, entryType: 'DEBIT', amount: amt, narration: `Cash Expense ${amt}` },
            { ledgerId: cashLedger.id, entryType: 'CREDIT', amount: amt, narration: `Cash Outflow ${amt}` },
          ]);
        }
      }

      // 6. >= 10 Inter-Bank Transfers (CONTRA) + Bank Negative trigger
      if (bank1Id && bank2Id) {
        for (let i = 0; i < 10; i++) {
          const d = isoDaysAgo(i * 2 + 1);
          const v = await postVoucher('CONTRA', d, `Topup Inter-Bank Transfer #${i + 1}`, [
            { ledgerId: bank2Id, entryType: 'DEBIT', amount: '5000.00', narration: 'Bank Transfer In' },
            { ledgerId: bank1Id, entryType: 'CREDIT', amount: '5000.00', narration: 'Bank Transfer Out' },
          ]);
          if (v.status < 300 && v.data?.id) createdVoucherIds.push(v.data.id);
        }

        if (expenseLedger) {
          await postVoucher('PAYMENT', isoDaysAgo(1), 'Topup Overdraft Bank Negative Trigger', [
            { ledgerId: expenseLedger.id, entryType: 'DEBIT', amount: '2500000.00', narration: 'Large Bank Payment' },
            { ledgerId: bank2Id, entryType: 'CREDIT', amount: '2500000.00', narration: 'Bank Overdrawn' },
          ]);
        }
      }

      // 7. Squared-off ledger movement (Dr 1000 then Cr 1000)
      if (squaredLedgerId && bank1Id) {
        await postVoucher('JOURNAL', isoDaysAgo(5), 'Squared-off Leg 1', [
          { ledgerId: squaredLedgerId, entryType: 'DEBIT', amount: '1000.00' },
          { ledgerId: bank1Id, entryType: 'CREDIT', amount: '1000.00' },
        ]);
        await postVoucher('JOURNAL', isoDaysAgo(4), 'Squared-off Leg 2', [
          { ledgerId: bank1Id, entryType: 'DEBIT', amount: '1000.00' },
          { ledgerId: squaredLedgerId, entryType: 'CREDIT', amount: '1000.00' },
        ]);
      }

      // 8. >= 5 Advances to Vendors (PAYMENT debiting Creditor ledger directly)
      if (creditorLedger && bank1Id) {
        // Create a dedicated advance creditor ledger with Dr > Cr if needed
        for (let i = 0; i < 5; i++) {
          await postVoucher('PAYMENT', isoDaysAgo(i + 1), `Topup Advance to Vendor #${i + 1}`, [
            { ledgerId: creditorLedger.id, entryType: 'DEBIT', amount: '12000.00', narration: 'Vendor Advance' },
            { ledgerId: bank1Id, entryType: 'CREDIT', amount: '12000.00', narration: 'Bank Advance Paid' },
          ]);
        }
      }

      // 9. Bank Accounts & Statements (2 fully reconciled, 2 partly reconciled)
      const accsRes = await apiJson('GET', `/v1/banking/accounts?companyId=${cid}`, token!);
      const existingAccs: any[] = Array.isArray(accsRes.data) ? accsRes.data : [];
      const accountsNeeded = Math.max(0, 4 - existingAccs.length);
      for (let a = 0; a < accountsNeeded; a++) {
        const res = await apiJson('POST', `/v1/banking/accounts`, token!, {
          companyId: cid,
          branchId,
          bankName: `Topup Bank ${existingAccs.length + a + 1}`,
          accountNumber: `99001122${String(existingAccs.length + a + 1).padStart(4, '0')}`,
          ifscCode: 'HDFC0001234',
          accountType: 'CURRENT',
          ledgerId: a % 2 === 0 ? bank1Id : bank2Id,
          openingBalance: 100000,
        });
        if (res.status < 300) existingAccs.push(res.data);
      }

      for (let idx = 0; idx < Math.min(4, existingAccs.length); idx++) {
        const acc = existingAccs[idx];
        const d1 = isoDaysAgo(3);
        const d2 = isoDaysAgo(2);
        const csv = [
          'Date,Narration,Debit,Credit,Balance',
          `${d1},Topup Stmt Row 1 Acc ${idx + 1},5000.00,0,95000.00`,
          `${d2},Topup Stmt Row 2 Acc ${idx + 1},0,5000.00,100000.00`,
        ].join('\n');

        const formData = new FormData();
        formData.append('file', new Blob([csv], { type: 'text/csv' }), `stmt-${idx + 1}.csv`);
        const upRes = await fetch(`${API}/v1/banking/accounts/${acc.id}/statement`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (upRes.ok) {
          const txnsRes = await apiJson('GET', `/v1/banking/accounts/${acc.id}/transactions?status=UNMATCHED`, token!);
          const txns: any[] = Array.isArray(txnsRes.data) ? txnsRes.data : [];
          // For idx 0 & 1: match ALL; for idx 2 & 3: match only 1 (partly reconciled)
          const toMatch = idx < 2 ? txns.length : Math.min(1, txns.length);
          for (let m = 0; m < toMatch; m++) {
            const vId = createdVoucherIds[m % Math.max(1, createdVoucherIds.length)];
            if (vId) {
              await apiJson('POST', `/v1/banking/transactions/${txns[m].id}/match`, token!, {
                voucherId: vId,
              });
            }
          }
        }
      }

      // 10. Payment Links: >= 3 PENDING (CREATED), 3 PAID, 3 EXPIRED
      const expiredLinkIds: string[] = [];
      for (let p = 0; p < 9; p++) {
        const invId = createdInvoiceIds[p % createdInvoiceIds.length];
        if (!invId) continue;
        const plRes = await apiJson('POST', `/v1/companies/${cid}/collections/payment-links`, token!, {
          invoiceId: invId,
          provider: 'RAZORPAY',
          expiresInDays: 30,
        });
        if (plRes.status < 300 && plRes.data?.linkId) {
          if (p >= 3 && p < 6) {
            const sig = crypto
              .createHmac('sha256', WEBHOOK_SECRET)
              .update(`${plRes.data.linkId}|${plRes.data.amount}`)
              .digest('hex');
            await apiJson(
              'POST',
              `/v1/companies/${cid}/collections/payment-links/${plRes.data.linkId}/callback`,
              token!,
              { amountPaid: plRes.data.amount, providerRef: `pay_topup_${p}`, signature: sig },
            );
          } else if (p >= 6) {
            expiredLinkIds.push(plRes.data.linkId);
          }
        }
      }
      if (expiredLinkIds.length > 0) {
        const inList = expiredLinkIds.map((id) => `'${id}'`).join(',');
        execSync(
          `psql -U neeraj -d accounting_platform -c "UPDATE payment_links SET status = 'EXPIRED', expires_at = NOW() - INTERVAL '1 day' WHERE link_id IN (${inList});"`,
          { stdio: 'pipe' },
        );
      }

      summary.push({
        companyId: cid,
        legalName: co.legalName,
        salesInvoicesAdded: createdInvoiceIds.length,
        vouchersCreated: createdVoucherIds.length,
        bankAccounts: existingAccs.length,
        expiredLinks: expiredLinkIds.length,
      });
    }

    fs.writeFileSync('/tmp/heavy-e2e/topup-summary.json', JSON.stringify(summary, null, 2));
    expect(summary.length).toBe(9);
  });
});

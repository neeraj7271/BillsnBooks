const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const DEFAULT_COMPANY_ID = 'c0000000-0000-4000-8000-000000000001';
export const DEFAULT_TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('antigravity_tenant_id');
    if (stored) return stored;
  }
  return DEFAULT_TENANT_ID;
}

export function getActiveUserId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('antigravity_user_id');
    if (stored) return stored;
  }
  return 'b0000000-0000-4000-8000-000000000001';
}

export function getActiveCompanyId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('antigravity_active_company_id');
    if (stored) return stored;
  }
  return DEFAULT_COMPANY_ID;
}

// De-duplicates concurrent refreshes: all 401s share one in-flight refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('antigravity_refresh_token');
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const json = await res.json().catch(() => null);
        const tokens = json?.data?.tokens ?? json?.tokens;
        if (tokens?.accessToken) {
          localStorage.setItem('antigravity_access_token', tokens.accessToken);
          if (tokens.refreshToken) {
            localStorage.setItem('antigravity_refresh_token', tokens.refreshToken);
          }
          return tokens.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        // Cleared on next tick so concurrent callers reuse this result first.
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('antigravity_access_token');
  localStorage.removeItem('antigravity_refresh_token');
  if (!window.location.pathname.startsWith('/auth')) {
    window.location.href = '/auth/login';
  }
}

function buildHeaders(options: RequestInit, accessTokenOverride?: string): Headers {
  const headers = new Headers(options.headers || {});

  const tenantId = getActiveTenantId();
  if (tenantId && !headers.has('x-tenant-id')) {
    headers.set('x-tenant-id', tenantId);
  }

  if (typeof window !== 'undefined') {
    const token = accessTokenOverride || localStorage.getItem('antigravity_access_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const isAuthEndpoint = path.startsWith('/v1/auth/');

  let response = await fetch(url, { ...options, headers: buildHeaders(options) });

  // Transparently refresh an expired access token once, then retry.
  if (response.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: buildHeaders(options, newToken),
      });
    }
    if (response.status === 401) {
      clearSessionAndRedirect();
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg: any =
      json?.error?.message ||
      json?.message ||
      json?.error ||
      `API Error: ${response.status} ${response.statusText}`;

    if (typeof errorMsg === 'object' && errorMsg !== null) {
      errorMsg = errorMsg.message || JSON.stringify(errorMsg);
    }

    const finalMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg);
    throw new Error(finalMsg);
  }

  return json?.data ?? json;
}

export const apiClient = {
  // Authentication & Tenant Registration
  async register(dto: {
    tenantName?: string;
    tenantSlug?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    accountType?: string;
  }) {
    return request<any>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async login(dto: { email: string; password: string }) {
    return request<any>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async logout() {
    try {
      await request<any>('/v1/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort server-side revocation; local tokens are cleared by caller.
    }
  },

  // System Health
  async getHealth() {
    return request<{ status: string; database: string }>('/v1/health');
  },

  // Tally Connector & Masters
  async getTallyConnector(companyId: string = getActiveCompanyId()) {
    return request<any>(`/v1/companies/${companyId}/tally/connector`);
  },

  async getTallyMasters(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/tally/masters`);
  },

  async recordTallyHeartbeat(companyId: string = getActiveCompanyId(), machineName: string = 'ACC-PROD-MUM-01') {
    return request<any>(`/v1/companies/${companyId}/tally/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ machineName, tallyPort: 9000, tallyVersion: 'TallyPrime 4.1' }),
    });
  },

  async previewTallyXml(companyId: string = getActiveCompanyId(), voucherData?: any) {
    return request<{ xml: string }>(`/v1/companies/${companyId}/tally/preview-envelope`, {
      method: 'POST',
      body: JSON.stringify(voucherData || {}),
    });
  },

  // Bulk Import Batches & Staging
  async listImportBatches(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/imports`);
  },

  async uploadImportFile(companyId: string = getActiveCompanyId(), file: File, importType: string = 'SALES_REGISTER') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('importType', importType);

    return request<{
      batch: any;
      detectedHeaders: string[];
      sampleRows: Record<string, any>[];
      recommendedMapping: Record<string, string>;
    }>(`/v1/companies/${companyId}/imports/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  async applyMapping(companyId: string = getActiveCompanyId(), batchId: string, mapping: Record<string, string>) {
    return request<any>(`/v1/companies/${companyId}/imports/${batchId}/map`, {
      method: 'POST',
      body: JSON.stringify(mapping),
    });
  },

  async getImportBatch(companyId: string = getActiveCompanyId(), batchId: string) {
    return request<any>(`/v1/companies/${companyId}/imports/${batchId}`);
  },

  async getImportRows(
    companyId: string = getActiveCompanyId(),
    batchId: string,
    status?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return request<{ rows: any[]; total: number; page: number; limit: number }>(
      `/v1/companies/${companyId}/imports/${batchId}/rows?${params.toString()}`,
    );
  },

  async bulkFixRows(companyId: string = getActiveCompanyId(), batchId: string, payload: {
    rowIds?: string[];
    targetField: string;
    fixValue?: string;
  }) {
    return request<any>(`/v1/companies/${companyId}/imports/${batchId}/rows/bulk-fix`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async approveBatch(companyId: string = getActiveCompanyId(), batchId: string) {
    return request<any>(`/v1/companies/${companyId}/imports/${batchId}/approve`, {
      method: 'POST',
    });
  },

  async scanImportMasters(companyId: string = getActiveCompanyId(), batchId: string) {
    return request<{
      hasMissingMasters: boolean;
      missingParties: any[];
      missingItems: any[];
      unmappedUnits: any[];
      existingPartiesCount: number;
      existingItemsCount: number;
    }>(`/v1/companies/${companyId}/imports/${batchId}/masters/scan`);
  },

  async resolveImportMasters(companyId: string = getActiveCompanyId(), batchId: string, payload: any) {
    return request<{
      created: { createdParties: number; createdItems: number };
      batch: any;
    }>(`/v1/companies/${companyId}/imports/${batchId}/masters/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async autoFixImportGst(companyId: string = getActiveCompanyId(), batchId: string) {
    return request<{
      fixedCount: number;
      batch: any;
    }>(`/v1/companies/${companyId}/imports/${batchId}/auto-fix-gst`, {
      method: 'POST',
    });
  },

  async downloadImportTemplate(type: string, companyId: string = getActiveCompanyId()) {
    const url = `${API_BASE_URL}/v1/companies/${companyId}/imports/templates/${type}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download template: ${res.statusText}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${type}-template.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },

  async postBatchToLedger(companyId: string = getActiveCompanyId(), batchId: string) {
    return request<{ batch: any; postedCount: number }>(`/v1/companies/${companyId}/imports/${batchId}/post`, {
      method: 'POST',
    });
  },

  // Banking & BRS
  async listBankAccounts(companyId?: string) {
    const q = companyId ? `?companyId=${companyId}` : '';
    return request<any[]>(`/v1/banking/accounts${q}`);
  },

  async createBankAccount(data: {
    companyId: string;
    branchId?: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType?: string;
    ledgerId?: string;
    openingBalance?: number;
  }) {
    return request<any>('/v1/banking/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadBankStatement(bankAccountId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<{
      statementId: string;
      totalTransactions: number;
      openingBalance: number;
      closingBalance: number;
      isContinuityValid: boolean;
      unbilledCreditsDiscovered: number;
    }>(`/v1/banking/accounts/${bankAccountId}/statement`, {
      method: 'POST',
      body: formData,
    });
  },

  async getBRSSummary(bankAccountId: string) {
    return request<any>(`/v1/banking/accounts/${bankAccountId}/brs`);
  },

  async listBankTransactions(bankAccountId: string, status?: string) {
    const q = status ? `?status=${status}` : '';
    return request<any[]>(`/v1/banking/accounts/${bankAccountId}/transactions${q}`);
  },

  async getMatchSuggestions(transactionId: string) {
    return request<any[]>(`/v1/banking/transactions/${transactionId}/suggestions`);
  },

  async matchTransaction(transactionId: string, voucherId: string) {
    return request<any>(`/v1/banking/transactions/${transactionId}/match`, {
      method: 'POST',
      body: JSON.stringify({ voucherId }),
    });
  },

  async unmatchTransaction(transactionId: string) {
    return request<any>(`/v1/banking/transactions/${transactionId}/unmatch`, {
      method: 'POST',
    });
  },

  // Sales Discovery
  async listDiscoveryTickets(status?: string) {
    const q = status ? `?status=${status}` : '';
    return request<any[]>(`/v1/banking/discovery/tickets${q}`);
  },

  async scanDiscoveryTickets(bankAccountId?: string) {
    return request<{ createdCount: number }>('/v1/banking/discovery/tickets/scan', {
      method: 'POST',
      body: JSON.stringify({ bankAccountId }),
    });
  },

  async convertDiscoveryTicket(
    ticketId: string,
    payload: {
      targetType: 'ADVANCE_RECEIPT' | 'SALES_INVOICE';
      partyLedgerId: string;
      salesLedgerId?: string;
      narration?: string;
    },
  ) {
    return request<{ voucherId: string; voucherNumber: string }>(
      `/v1/banking/discovery/tickets/${ticketId}/convert`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  // Companies & Branches
  async listCompanies() {
    return request<any[]>('/v1/companies');
  },

  async getCompany(companyId: string) {
    return request<any>(`/v1/companies/${companyId}`);
  },

  async createCompany(data: {
    legalName: string;
    tradeName?: string;
    pan?: string;
    gstin?: string;
    stateCode?: string;
    defaultCurrency?: string;
  }) {
    return request<any>('/v1/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCompany(companyId: string, data: {
    legalName?: string;
    tradeName?: string;
    pan?: string;
    gstin?: string;
    stateCode?: string;
    defaultCurrency?: string;
    addressLine1?: string;
    pincode?: string;
  }) {
    return request<any>(`/v1/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async listBranches(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/branches`);
  },

  async addBranch(companyId: string = getActiveCompanyId(), data: {
    branchName: string;
    gstin?: string;
    stateCode: string;
    addressLine1?: string;
    pincode?: string;
    isHeadOffice?: boolean;
  }) {
    return request<any>(`/v1/companies/${companyId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Ledgers & Chart of Accounts
  async listLedgers(companyId: string = getActiveCompanyId(), groupId?: string) {
    const q = groupId ? `?groupId=${groupId}` : '';
    return request<any[]>(`/v1/companies/${companyId}/ledgers${q}`);
  },

  async getLedgerTree(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/ledgers/tree`);
  },

  async createLedger(companyId: string = getActiveCompanyId(), data: {
    groupId: string;
    code?: string;
    name: string;
    openingBalance?: number;
    isBankOrCash?: boolean;
    scheduleIiiMapping?: string;
    tallyLedgerName?: string;
    gstTaxType?: string;
    gstRate?: number;
  }) {
    return request<any>(`/v1/companies/${companyId}/ledgers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLedger(companyId: string = getActiveCompanyId(), ledgerId: string, data: any) {
    return request<any>(`/v1/companies/${companyId}/ledgers/${ledgerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteLedger(companyId: string = getActiveCompanyId(), ledgerId: string) {
    return request<any>(`/v1/companies/${companyId}/ledgers/${ledgerId}`, {
      method: 'DELETE',
    });
  },

  async listLedgerGroups(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/ledgers/groups`);
  },

  async createLedgerGroup(companyId: string = getActiveCompanyId(), data: {
    parentGroupId?: string;
    code?: string;
    name: string;
    nature?: string;
    tallyGroupName?: string;
    scheduleIiiMapping?: string;
  }) {
    return request<any>(`/v1/companies/${companyId}/ledgers/groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLedgerGroup(companyId: string = getActiveCompanyId(), groupId: string, data: any) {
    return request<any>(`/v1/companies/${companyId}/ledgers/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteLedgerGroup(companyId: string = getActiveCompanyId(), groupId: string) {
    return request<any>(`/v1/companies/${companyId}/ledgers/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  async seedLedgers(companyId: string = getActiveCompanyId(), template: string = 'TRADER') {
    return request<any>(`/v1/companies/${companyId}/ledgers/seed`, {
      method: 'POST',
      body: JSON.stringify({ template }),
    });
  },

  // Vouchers
  async listVouchers(companyId: string = getActiveCompanyId(), params?: {
    voucherType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.voucherType) q.append('voucherType', params.voucherType);
    if (params?.status) q.append('status', params.status);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.toDate) q.append('toDate', params.toDate);
    if (params?.limit) q.append('limit', params.limit.toString());
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/companies/${companyId}/vouchers${queryStr}`);
  },

  async getVoucher(companyId: string = getActiveCompanyId(), voucherId: string) {
    return request<any>(`/v1/companies/${companyId}/vouchers/${voucherId}`);
  },

  async reverseVoucher(companyId: string = getActiveCompanyId(), voucherId: string) {
    return request<any>(`/v1/companies/${companyId}/vouchers/${voucherId}/reverse`, {
      method: 'POST',
    });
  },

  async createVoucher(companyId: string = getActiveCompanyId(), data: any) {
    return request<any>(`/v1/companies/${companyId}/vouchers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Central Numbering Series Configuration
  async listNumberingSeries(
    companyId: string = getActiveCompanyId(),
    docType?: string,
    branchId?: string,
  ) {
    const q = new URLSearchParams();
    if (docType) q.append('docType', docType);
    if (branchId) q.append('branchId', branchId);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/companies/${companyId}/numbering-series${queryStr}`);
  },

  async configureActiveNumberingSeries(
    companyId: string = getActiveCompanyId(),
    data: {
      docType: string;
      branchId?: string | null;
      prefix?: string;
      suffix?: string;
      startSeq: number;
      seqPadding?: number;
      isManual?: boolean;
    },
  ) {
    return request<any>(`/v1/companies/${companyId}/numbering-series/configure`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createNumberingSeries(companyId: string = getActiveCompanyId(), data: any) {
    return request<any>(`/v1/companies/${companyId}/numbering-series`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateNumberingSeries(
    companyId: string = getActiveCompanyId(),
    seriesId: string,
    data: any,
  ) {
    return request<any>(`/v1/companies/${companyId}/numbering-series/${seriesId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Accounting Periods
  async listPeriods(companyId: string = getActiveCompanyId(), financialYearId?: string) {
    const q = financialYearId ? `?financialYearId=${financialYearId}` : '';
    return request<any[]>(`/v1/companies/${companyId}/periods${q}`);
  },

  async lockPeriod(companyId: string = getActiveCompanyId(), periodId: string) {
    return request<any>(`/v1/companies/${companyId}/periods/${periodId}/lock`, {
      method: 'POST',
    });
  },

  async unlockPeriod(companyId: string = getActiveCompanyId(), periodId: string) {
    return request<any>(`/v1/companies/${companyId}/periods/${periodId}/unlock`, {
      method: 'POST',
    });
  },

  // Financial Reports
  async getTrialBalance(companyId: string = getActiveCompanyId(), asOfDate?: string, fromDate?: string) {
    const q = new URLSearchParams();
    if (asOfDate) q.append('asOfDate', asOfDate);
    if (fromDate) q.append('fromDate', fromDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/trial-balance${qs}`);
  },

  async getGeneralLedger(companyId: string = getActiveCompanyId(), ledgerId: string, fromDate?: string, toDate?: string) {
    const q = new URLSearchParams();
    q.append('ledgerId', ledgerId);
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    return request<any>(`/v1/companies/${companyId}/reports/general-ledger?${q.toString()}`);
  },

  async getProfitAndLoss(companyId: string = getActiveCompanyId(), fromDate?: string, toDate?: string) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/profit-and-loss${qs}`);
  },

  async getBalanceSheet(companyId: string = getActiveCompanyId(), asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/balance-sheet${q}`);
  },

  // Parties (Customers & Vendors)
  async listParties(companyId: string = getActiveCompanyId(), partyType?: string) {
    const q = partyType ? `?partyType=${partyType}` : '';
    return request<any[]>(`/v1/companies/${companyId}/parties${q}`);
  },

  async getParty(companyId: string = getActiveCompanyId(), partyId: string) {
    return request<any>(`/v1/companies/${companyId}/parties/${partyId}`);
  },

  async createParty(companyId: string = getActiveCompanyId(), data: any) {
    return request<any>(`/v1/companies/${companyId}/parties`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateParty(companyId: string = getActiveCompanyId(), partyId: string, data: any) {
    return request<any>(`/v1/companies/${companyId}/parties/${partyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteParty(companyId: string = getActiveCompanyId(), partyId: string) {
    return request<any>(`/v1/companies/${companyId}/parties/${partyId}`, {
      method: 'DELETE',
    });
  },

  // Items & Services
  async listItems(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/items`);
  },

  async getItem(companyId: string = getActiveCompanyId(), itemId: string) {
    return request<any>(`/v1/companies/${companyId}/items/${itemId}`);
  },

  async createItem(companyId: string = getActiveCompanyId(), data: any) {
    return request<any>(`/v1/companies/${companyId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateItem(companyId: string = getActiveCompanyId(), itemId: string, data: any) {
    return request<any>(`/v1/companies/${companyId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteItem(companyId: string = getActiveCompanyId(), itemId: string) {
    return request<any>(`/v1/companies/${companyId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // Units of Measurement (UOM Master)
  async listUnits(companyId: string = getActiveCompanyId()) {
    return request<{ standard: any[]; custom: any[] }>(`/v1/companies/${companyId}/items/units`);
  },

  async createCustomUnit(companyId: string = getActiveCompanyId(), data: { code: string; name: string; description?: string }) {
    return request<any>(`/v1/companies/${companyId}/items/units`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCustomUnit(companyId: string = getActiveCompanyId(), code: string, data: { name: string; description?: string }) {
    return request<any>(`/v1/companies/${companyId}/items/units/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCustomUnit(companyId: string = getActiveCompanyId(), code: string) {
    return request<any>(`/v1/companies/${companyId}/items/units/${code}`, {
      method: 'DELETE',
    });
  },

  // Invoices
  async listInvoices(companyId: string = getActiveCompanyId(), params?: {
    status?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.partyId) q.append('partyId', params.partyId);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.toDate) q.append('toDate', params.toDate);
    if (params?.limit) q.append('limit', params.limit.toString());
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/companies/${companyId}/invoices${queryStr}`);
  },

  async getNextInvoiceNumber(
    companyId: string = getActiveCompanyId(),
    documentType: string = 'TAX_INVOICE',
    branchId?: string,
    invoiceDate?: string,
  ) {
    const q = new URLSearchParams();
    if (documentType) q.append('documentType', documentType);
    if (branchId) q.append('branchId', branchId);
    if (invoiceDate) q.append('invoiceDate', invoiceDate);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<{ invoiceNumber: string; isAuto: boolean; seriesPattern?: string }>(
      `/v1/companies/${companyId}/invoices/next-number${queryStr}`
    );
  },

  async getInvoice(companyId: string = getActiveCompanyId(), invoiceId: string) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}`);
  },

  async createInvoice(companyId: string = getActiveCompanyId(), data: any) {
    return request<any>(`/v1/companies/${companyId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInvoice(companyId: string = getActiveCompanyId(), invoiceId: string, data: any) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async approveInvoice(companyId: string = getActiveCompanyId(), invoiceId: string, comments?: string) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  },

  async rejectInvoice(companyId: string = getActiveCompanyId(), invoiceId: string, reason: string) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async convertToTaxInvoice(companyId: string = getActiveCompanyId(), invoiceId: string) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}/convert-to-tax-invoice`, {
      method: 'POST',
    });
  },

  async cancelInvoice(
    companyId: string = getActiveCompanyId(),
    invoiceId: string,
    reason: string,
  ) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async setPromiseToPay(
    companyId: string = getActiveCompanyId(),
    invoiceId: string,
    data: { promiseToPayDate?: string; promiseToPayNotes?: string },
  ) {
    return request<any>(`/v1/companies/${companyId}/invoices/${invoiceId}/promise-to-pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Approvals Inbox
  async listApprovals(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/approvals`);
  },

  async approveRequest(companyId: string = getActiveCompanyId(), requestId: string, comments?: string) {
    return request<any>(`/v1/companies/${companyId}/approvals/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  },

  async rejectRequest(companyId: string = getActiveCompanyId(), requestId: string, reason: string) {
    return request<any>(`/v1/companies/${companyId}/approvals/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Notifications
  async listNotifications(limit: number = 20) {
    return request<any[]>(`/v1/notifications?limit=${limit}`);
  },

  async markNotificationRead(notificationId: string) {
    return request<any>(`/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead() {
    return request<any>('/v1/notifications/read-all', {
      method: 'POST',
    });
  },

  // Phase 5: Practice Management & Client Portal
  async listPracticeClients() {
    return request<any[]>('/v1/practice/clients');
  },

  async createPracticeClient(dto: {
    companyId: string;
    clientCode: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    engagementType?: string;
    serviceTier?: string;
  }) {
    return request<any>('/v1/practice/clients', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listPracticeTasks(filters?: { clientId?: string; status?: string; category?: string }) {
    const q = new URLSearchParams();
    if (filters?.clientId) q.append('clientId', filters.clientId);
    if (filters?.status) q.append('status', filters.status);
    if (filters?.category) q.append('category', filters.category);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/practice/tasks${qs}`);
  },

  async createPracticeTask(dto: {
    clientId: string;
    title: string;
    description?: string;
    category: string;
    statutoryPeriod: string;
    dueDate: string;
    priority?: string;
    assignedToUserId?: string;
  }) {
    return request<any>('/v1/practice/tasks', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updatePracticeTaskStatus(id: string, status: string, filingAcknowledgmentNumber?: string) {
    return request<any>(`/v1/practice/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, filingAcknowledgmentNumber }),
    });
  },

  async addPracticeTaskComment(id: string, comment: string, isInternalOnly: boolean = false) {
    return request<any>(`/v1/practice/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, isInternalOnly }),
    });
  },

  async listPracticeDocuments(clientId?: string) {
    const q = clientId ? `?clientId=${clientId}` : '';
    return request<any[]>(`/v1/practice/documents${q}`);
  },

  async createPracticeDocumentRequest(dto: {
    clientId: string;
    title: string;
    description?: string;
    documentType: string;
    period: string;
    dueDate?: string;
  }) {
    return request<any>('/v1/practice/documents', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async uploadClientDocument(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>(`/v1/practice/documents/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  async fetchProtectedBlob(path: string): Promise<{ blob: Blob; contentType: string; sha256?: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
    const tenantId = getActiveTenantId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Download failed (${res.status})`);
    }
    const blob = await res.blob();
    return {
      blob,
      contentType: res.headers.get('content-type') || 'application/octet-stream',
      sha256: res.headers.get('x-content-sha256') || undefined,
    };
  },

  async getClientVault(clientId: string, params?: { folderId?: string; q?: string }) {
    const sp = new URLSearchParams();
    if (params?.folderId) sp.set('folderId', params.folderId);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<any>(`/v1/practice/vault/clients/${clientId}${qs}`);
  },

  async listAllVaultFiles(params?: { clientId?: string; folderName?: string; q?: string }) {
    const sp = new URLSearchParams();
    if (params?.clientId) sp.set('clientId', params.clientId);
    if (params?.folderName) sp.set('folderName', params.folderName);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<any[]>(`/v1/practice/vault/files${qs}`);
  },

  async createVaultFolder(clientId: string, name: string, parentId?: string) {
    return request<any>(`/v1/practice/vault/clients/${clientId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  },

  async renameVaultFolder(folderId: string, name: string) {
    return request<any>(`/v1/practice/vault/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async uploadToVault(
    clientId: string,
    file: File,
    opts?: { folderId?: string; replaceFileGroupId?: string },
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (opts?.folderId) formData.append('folderId', opts.folderId);
    if (opts?.replaceFileGroupId) formData.append('replaceFileGroupId', opts.replaceFileGroupId);
    return request<any>(`/v1/practice/vault/clients/${clientId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  async listVaultFileVersions(fileId: string) {
    return request<any[]>(`/v1/practice/documents/files/${fileId}/versions`);
  },

  async restoreVaultFileVersion(fileId: string) {
    return request<any>(`/v1/practice/documents/files/${fileId}/restore`, {
      method: 'POST',
    });
  },

  async updateVaultFile(fileId: string, updates: { fileName?: string; folderId?: string | null }) {
    return request<any>(`/v1/practice/documents/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async getVaultFileAudit(fileId: string) {
    return request<any[]>(`/v1/practice/documents/files/${fileId}/audit`);
  },

  async deleteVaultFile(fileId: string) {
    return request<any>(`/v1/practice/documents/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  async uploadBrandingAsset(companyId: string, key: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);
    return request<{ key: string; storageKey: string; url: string }>(
      `/v1/companies/${companyId}/settings/branding/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
  },

  async reviewClientDocument(id: string, status: 'ACCEPTED' | 'REJECTED', rejectionReason?: string) {
    return request<any>(`/v1/practice/documents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, rejectionReason }),
    });
  },

  async getPracticeCalendar(month?: string) {
    const q = month ? `?month=${month}` : '';
    return request<any>(`/v1/practice/calendar${q}`);
  },

  async getPracticeDashboard() {
    return request<any>('/v1/practice/dashboard');
  },

  async getPracticeWorkload() {
    return request<any>('/v1/practice/workload');
  },

  async listWorkflowTemplates() {
    return request<any[]>('/v1/practice/workflow-templates');
  },

  async listPracticeJobs(params?: { clientId?: string; stage?: string; assignedToUserId?: string }) {
    const sp = new URLSearchParams();
    if (params?.clientId) sp.set('clientId', params.clientId);
    if (params?.stage) sp.set('stage', params.stage);
    if (params?.assignedToUserId) sp.set('assignedToUserId', params.assignedToUserId);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<any[]>(`/v1/practice/jobs${qs}`);
  },

  async createPracticeJob(payload: any) {
    return request<any>('/v1/practice/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPracticeJob(jobId: string) {
    return request<any>(`/v1/practice/jobs/${jobId}`);
  },

  async movePracticeJobStage(jobId: string, stage: string, filingAckNumber?: string) {
    return request<any>(`/v1/practice/jobs/${jobId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage, filingAckNumber }),
    });
  },

  async assignPracticeJob(jobId: string, assignedToUserId: string | null) {
    return request<any>(`/v1/practice/jobs/${jobId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedToUserId }),
    });
  },

  async toggleJobChecklist(jobId: string, itemId: string) {
    return request<any>(`/v1/practice/jobs/${jobId}/checklist/${itemId}`, {
      method: 'PATCH',
    });
  },

  async addJobComment(jobId: string, comment: string) {
    return request<any>(`/v1/practice/jobs/${jobId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  async getClient360(clientId: string) {
    return request<any>(`/v1/practice/clients/${clientId}/360`);
  },

  async addClientContact(clientId: string, payload: any) {
    return request<any>(`/v1/practice/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteClientContact(contactId: string) {
    return request<any>(`/v1/practice/contacts/${contactId}`, {
      method: 'DELETE',
    });
  },

  // Practice Platform v2: Service Master, Workflows, Client-Work Mapping, Credentials, Custom Fields
  async listPracticeServices(includeInactive = false) {
    const q = includeInactive ? '?includeInactive=true' : '';
    return request<any[]>(`/v1/practice/services${q}`);
  },

  async getPracticeServiceCategories() {
    return request<string[]>('/v1/practice/services/categories');
  },

  async createPracticeService(payload: any) {
    return request<any>('/v1/practice/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePracticeService(id: string, payload: any) {
    return request<any>(`/v1/practice/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async clonePracticeService(id: string) {
    return request<any>(`/v1/practice/services/${id}/clone`, {
      method: 'POST',
    });
  },

  async deletePracticeService(id: string) {
    return request<any>(`/v1/practice/services/${id}`, {
      method: 'DELETE',
    });
  },

  async createWorkflowTemplate(payload: any) {
    return request<any>('/v1/practice/workflow-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateWorkflowTemplate(id: string, payload: any) {
    return request<any>(`/v1/practice/workflow-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteWorkflowTemplate(id: string) {
    return request<any>(`/v1/practice/workflow-templates/${id}`, {
      method: 'DELETE',
    });
  },

  async listClientServices(clientId: string) {
    return request<any[]>(`/v1/practice/clients/${clientId}/services`);
  },

  async subscribeClientServices(clientId: string, items: any[]) {
    return request<any[]>(`/v1/practice/clients/${clientId}/services`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async updateClientService(id: string, payload: any) {
    return request<any>(`/v1/practice/client-services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async removeClientService(id: string) {
    return request<any>(`/v1/practice/client-services/${id}`, {
      method: 'DELETE',
    });
  },

  async spawnDuePracticeJobs(period?: string) {
    return request<any>('/v1/practice/jobs/spawn-due', {
      method: 'POST',
      body: JSON.stringify(period ? { period } : {}),
    });
  },

  async updateJobCustomData(jobId: string, payload: { customFields?: Record<string, any>; labels?: string[] }) {
    return request<any>(`/v1/practice/jobs/${jobId}/custom`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updatePracticeClient(clientId: string, payload: any) {
    return request<any>(`/v1/practice/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async listClientCredentials(clientId: string) {
    return request<any[]>(`/v1/practice/clients/${clientId}/credentials`);
  },

  async upsertClientCredential(clientId: string, payload: any) {
    return request<any>(`/v1/practice/clients/${clientId}/credentials`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async revealClientCredential(credId: string) {
    return request<any>(`/v1/practice/credentials/${credId}/reveal`, {
      method: 'POST',
    });
  },

  async deleteClientCredential(credId: string) {
    return request<any>(`/v1/practice/credentials/${credId}`, {
      method: 'DELETE',
    });
  },

  async getClientCredentialAudit(clientId: string) {
    return request<any[]>(`/v1/practice/clients/${clientId}/credentials/audit`);
  },

  async listCustomFields(entityType?: 'CLIENT' | 'JOB') {
    const q = entityType ? `?entityType=${entityType}` : '';
    return request<any[]>(`/v1/practice/custom-fields${q}`);
  },

  async createCustomField(payload: any) {
    return request<any>('/v1/practice/custom-fields', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomField(id: string) {
    return request<any>(`/v1/practice/custom-fields/${id}`, {
      method: 'DELETE',
    });
  },

  async listPracticeLabels(entityType?: 'CLIENT' | 'JOB' | 'ALL') {
    const q = entityType ? `?entityType=${entityType}` : '';
    return request<any[]>(`/v1/practice/labels${q}`);
  },

  async createPracticeLabel(payload: any) {
    return request<any>('/v1/practice/labels', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deletePracticeLabel(id: string) {
    return request<any>(`/v1/practice/labels/${id}`, {
      method: 'DELETE',
    });
  },

  // Practice Platform v2 Phase 2: Proposals, Engagements, e-Sign, Time & Billing, Capacity, Notices, Reminders, Mode, Dashboard
  async listProposals() {
    return request<any[]>('/v1/practice/proposals');
  },

  async getProposal(id: string) {
    return request<any>(`/v1/practice/proposals/${id}`);
  },

  async getProposalPdfBlob(id: string): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
    const res = await fetch(`${API_BASE_URL}/v1/practice/proposals/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to generate proposal PDF');
    return await res.blob();
  },

  async createProposal(payload: any) {
    return request<any>('/v1/practice/proposals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProposalStatus(id: string, status: string) {
    return request<any>(`/v1/practice/proposals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async listEngagementTemplates() {
    return request<any[]>('/v1/practice/engagement-templates');
  },

  async upsertEngagementTemplate(payload: any) {
    return request<any>('/v1/practice/engagement-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listEngagements(clientId?: string) {
    const q = clientId ? `?clientId=${clientId}` : '';
    return request<any[]>(`/v1/practice/engagements${q}`);
  },

  async getEngagement(id: string) {
    return request<any>(`/v1/practice/engagements/${id}`);
  },

  async convertProposalToEngagement(proposalId: string, templateId?: string) {
    return request<any>(`/v1/practice/proposals/${proposalId}/convert-engagement`, {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
  },

  async clientSignEngagement(engagementId: string, payload: any) {
    return request<any>(`/v1/practice/engagements/${engagementId}/client-sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async firmCountersignEngagement(engagementId: string) {
    return request<any>(`/v1/practice/engagements/${engagementId}/firm-countersign`, {
      method: 'POST',
    });
  },

  async listTimeEntries(filters?: { jobId?: string; clientId?: string; userId?: string; unbilledOnly?: boolean }) {
    const q = new URLSearchParams();
    if (filters?.jobId) q.set('jobId', filters.jobId);
    if (filters?.clientId) q.set('clientId', filters.clientId);
    if (filters?.userId) q.set('userId', filters.userId);
    if (filters?.unbilledOnly) q.set('unbilledOnly', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/practice/time-entries${qs}`);
  },

  async logTimeEntry(payload: any) {
    return request<any>('/v1/practice/time-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveTimesheet(entryIds: string[], approvalStatus: 'SUBMITTED' | 'APPROVED') {
    return request<any>('/v1/practice/time-entries/approve', {
      method: 'POST',
      body: JSON.stringify({ entryIds, approvalStatus }),
    });
  },

  async getUnbilledWip() {
    return request<any[]>('/v1/practice/billing/wip');
  },

  async listPracticeBills(clientId?: string) {
    const q = clientId ? `?clientId=${clientId}` : '';
    return request<any[]>(`/v1/practice/bills${q}`);
  },

  async createPracticeBillFromWip(payload: any) {
    return request<any>('/v1/practice/bills/from-wip', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async convertBillToGstInvoice(billId: string, companyId: string = getActiveCompanyId()) {
    return request<any>(`/v1/practice/bills/${billId}/convert-invoice`, {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    });
  },

  async markPracticeBillPaid(billId: string) {
    return request<any>(`/v1/practice/bills/${billId}/mark-paid`, {
      method: 'POST',
    });
  },

  async getProfitabilityReport() {
    return request<any>('/v1/practice/profitability');
  },

  async getCapacityHeatmap() {
    return request<any>('/v1/practice/capacity');
  },

  async reassignCapacityJob(jobId: string, assignedToUserId: string | null) {
    return request<any>('/v1/practice/capacity/reassign', {
      method: 'POST',
      body: JSON.stringify({ jobId, assignedToUserId }),
    });
  },

  async listPracticeNotices(filters?: { authority?: string; status?: string; clientId?: string }) {
    const q = new URLSearchParams();
    if (filters?.authority) q.set('authority', filters.authority);
    if (filters?.status) q.set('status', filters.status);
    if (filters?.clientId) q.set('clientId', filters.clientId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/v1/practice/notices${qs}`);
  },

  async createPracticeNotice(payload: any) {
    return request<any>('/v1/practice/notices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePracticeNotice(id: string, payload: any) {
    return request<any>(`/v1/practice/notices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async listReminderTemplates() {
    return request<any[]>('/v1/practice/reminder-templates');
  },

  async upsertReminderTemplate(payload: any) {
    return request<any>('/v1/practice/reminder-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async listNotificationRules() {
    return request<any[]>('/v1/practice/notification-rules');
  },

  async upsertNotificationRule(payload: any) {
    return request<any>('/v1/practice/notification-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async runNotificationRules() {
    return request<any>('/v1/practice/notification-rules/run', {
      method: 'POST',
    });
  },

  async getWorkspaceMode() {
    return request<{ practiceMode: 'FIRM' | 'BUSINESS' }>('/v1/practice/workspace-mode');
  },

  async setWorkspaceMode(practiceMode: 'FIRM' | 'BUSINESS') {
    return request<{ practiceMode: 'FIRM' | 'BUSINESS' }>('/v1/practice/workspace-mode', {
      method: 'PATCH',
      body: JSON.stringify({ practiceMode }),
    });
  },

  async getCommandCenterDashboard() {
    return request<any>('/v1/practice/command-center');
  },

  // Collections & Ageing (Phase 6)
  async getArAgeingSummary(companyId: string = getActiveCompanyId(), asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return request<any>(`/v1/companies/${companyId}/collections/ageing/summary${q}`);
  },

  async getPartyAgeing(companyId: string = getActiveCompanyId(), asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return request<any[]>(`/v1/companies/${companyId}/collections/ageing/parties${q}`);
  },

  async getInvoicesAgeing(companyId: string = getActiveCompanyId(), asOfDate?: string) {
    const q = asOfDate ? `?asOfDate=${asOfDate}` : '';
    return request<any[]>(`/v1/companies/${companyId}/collections/ageing/invoices${q}`);
  },

  async setCollectionsPromiseToPay(
    companyId: string = getActiveCompanyId(),
    invoiceId: string,
    promiseToPayDate?: string,
    promiseToPayNotes?: string,
  ) {
    return request<any>(`/v1/companies/${companyId}/collections/ageing/invoices/${invoiceId}/promise-to-pay`, {
      method: 'POST',
      body: JSON.stringify({ promiseToPayDate, promiseToPayNotes }),
    });
  },

  async listRecurringSchedules(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/collections/recurring`);
  },

  async createRecurringSchedule(companyId: string = getActiveCompanyId(), dto: any) {
    return request<any>(`/v1/companies/${companyId}/collections/recurring`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateRecurringScheduleStatus(companyId: string = getActiveCompanyId(), scheduleId: string, status: string) {
    return request<any>(`/v1/companies/${companyId}/collections/recurring/${scheduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async triggerRecurringRun(companyId: string = getActiveCompanyId(), scheduleId: string) {
    return request<any>(`/v1/companies/${companyId}/collections/recurring/${scheduleId}/run`, {
      method: 'POST',
    });
  },

  async listPaymentLinks(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/collections/payment-links`);
  },

  async createPaymentLink(companyId: string = getActiveCompanyId(), dto: any) {
    return request<any>(`/v1/companies/${companyId}/collections/payment-links`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async simulatePaymentCallback(companyId: string = getActiveCompanyId(), linkId: string) {
    return request<any>(`/v1/companies/${companyId}/collections/payment-links/${linkId}/callback`, {
      method: 'POST',
    });
  },

  async listGatewaySettlements(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/collections/settlements`);
  },

  async reconcileGatewaySettlement(companyId: string = getActiveCompanyId(), dto: any) {
    return request<any>(`/v1/companies/${companyId}/collections/settlements/reconcile`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listReminders(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/collections/reminders`);
  },

  async sendCollectionReminder(companyId: string = getActiveCompanyId(), dto: any) {
    return request<any>(`/v1/companies/${companyId}/collections/reminders`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Settings & Configuration
  async getCompanySettings(companyId: string = getActiveCompanyId(), branchId?: string, docType?: string) {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (docType) params.append('docType', docType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<any>(`/v1/companies/${companyId}/settings${qs}`);
    if (Array.isArray(res)) {
      const map: Record<string, any> = {};
      for (const item of res) {
        if (item && item.key) {
          map[item.key] = item.value;
        }
      }
      return map;
    }
    return res || {};
  },

  async listResolvedSettings(companyId: string = getActiveCompanyId(), branchId?: string, docType?: string) {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (docType) params.append('docType', docType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request<any[]>(`/v1/companies/${companyId}/settings${qs}`);
    return Array.isArray(res) ? res : [];
  },

  async updateCompanySetting(
    companyId: string = getActiveCompanyId(),
    key: string,
    value: any,
    scope: string = 'COMPANY',
    scopeId?: string | null,
    reason?: string,
  ) {
    return request<any>(`/v1/companies/${companyId}/settings`, {
      method: 'POST',
      body: JSON.stringify({ key, value, scope, scopeId, reason }),
    });
  },

  async setCompanySetting(
    companyId: string = getActiveCompanyId(),
    key: string,
    value: any,
    scope: string = 'COMPANY',
    scopeId?: string | null,
    reason?: string,
  ) {
    return this.updateCompanySetting(companyId, key, value, scope, scopeId, reason);
  },

  // --- Enterprise Reports & Analytics ---
  async getReportsCatalog(companyId: string = getActiveCompanyId()) {
    return request<any[]>(`/v1/companies/${companyId}/reports/catalog`);
  },

  async toggleFavoriteReport(companyId: string = getActiveCompanyId(), reportKey: string) {
    return request<any>(`/v1/companies/${companyId}/reports/favorites/${reportKey}/toggle`, {
      method: 'POST',
    });
  },

  async getCustomerSalesReport(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/customer-sales${qs}`);
  },

  async getCustomerSales(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    return this.getCustomerSalesReport(companyId, fromDate, toDate);
  },

  async getItemSalesReport(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/item-sales${qs}`);
  },

  async getItemSales(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    return this.getItemSalesReport(companyId, fromDate, toDate);
  },

  async getExpensesMonthly(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/expenses/monthly${qs}`);
  },

  async getExpensesVendor(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/expenses/vendor${qs}`);
  },

  async getExpensesCategory(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/expenses/category${qs}`);
  },

  async getExpensesRegister(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
    voucherType?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    if (voucherType) q.append('voucherType', voucherType);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/expenses/register${qs}`);
  },

  async getPurchasesItems(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/purchases/items${qs}`);
  },

  async getCashBankAudit(
    companyId: string = getActiveCompanyId(),
    auditType: string = 'cash-negative',
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    q.append('auditType', auditType);
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    return request<any>(`/v1/companies/${companyId}/reports/cash-bank-audit?${q.toString()}`);
  },

  async getPayablesSummary(
    companyId: string = getActiveCompanyId(),
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/payables/summary${qs}`);
  },

  async getPayablesAgeing(
    companyId: string = getActiveCompanyId(),
    method: string = 'tally',
    asOfDate?: string,
  ) {
    const q = new URLSearchParams();
    if (method) q.append('method', method);
    if (asOfDate) q.append('asOfDate', asOfDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any>(`/v1/companies/${companyId}/reports/payables/ageing${qs}`);
  },

  async getLedgerHygiene(
    companyId: string = getActiveCompanyId(),
    hygieneType: string = 'squared-off',
  ) {
    return request<any>(`/v1/companies/${companyId}/reports/ledger-hygiene?hygieneType=${hygieneType}`);
  },

  async downloadReportExport(
    companyId: string = getActiveCompanyId(),
    reportKey: string,
    format: 'xlsx' | 'pdf',
    fromDate?: string,
    toDate?: string,
  ) {
    const q = new URLSearchParams();
    q.append('format', format);
    if (fromDate) q.append('fromDate', fromDate);
    if (toDate) q.append('toDate', toDate);

    const token = typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
    const tenantId = getActiveTenantId();
    const userId = getActiveUserId();
    if (tenantId) q.append('tenantId', tenantId);
    if (userId) q.append('userId', userId);
    const url = `${API_BASE_URL}/v1/companies/${companyId}/reports/${reportKey}/export?${q.toString()}`;

    if (format === 'pdf') {
      // In PDF mode, open popup synchronously to satisfy browser user gesture & Playwright listeners, then stream HTML
      const printWin = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
      try {
        const res = await fetch(url, {
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            'x-tenant-id': tenantId,
            'x-user-id': userId,
          },
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Export preview failed: ${err}`);
        }

        const html = await res.text();
        if (printWin && !printWin.closed) {
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
        } else if (typeof window !== 'undefined') {
          const blob = new Blob([html], { type: 'text/html' });
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        }
      } catch (e) {
        if (printWin && !printWin.closed) printWin.close();
        throw e;
      }
      return;
    }

    const res = await fetch(url, {
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Export failed: ${err}`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const disposition = res.headers.get('content-disposition');
    let filename = `${reportKey.toLowerCase()}_report_${Date.now()}.${format}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async shareReport(
    companyId: string = getActiveCompanyId(),
    reportKey: string,
    payload: {
      channel: 'EMAIL' | 'WHATSAPP' | 'DIRECT_LINK';
      recipientEmail?: string;
      recipientPhone?: string;
      expiresInHours?: number;
      filters?: any;
      remarks?: string;
    },
  ) {
    return request<any>(`/v1/companies/${companyId}/reports/${reportKey}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSharedReport(token: string) {
    return request<any>(`/v1/reports/shared/${token}`);
  },

  // --- Notification Architecture & Settings ---
  async getNotificationSettings(companyId: string = getActiveCompanyId()) {
    return request<any>(`/v1/companies/${companyId}/notifications/settings`);
  },

  async updateNotificationSettings(companyId: string = getActiveCompanyId(), payload: any) {
    return request<any>(`/v1/companies/${companyId}/notifications/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async sendTestNotification(companyId: string = getActiveCompanyId(), channel: string = 'IN_APP') {
    return request<any>(`/v1/companies/${companyId}/notifications/test`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  },

  async triggerNotificationScan(companyId: string = getActiveCompanyId(), simulatedDate?: string) {
    return request<any>(`/v1/companies/${companyId}/notifications/trigger-scan`, {
      method: 'POST',
      body: JSON.stringify({ simulatedDate }),
    });
  },

  // --- Developer Operations ---
  async replayJourneys() {
    return request<any>('/v1/dev/replay-journeys', {
      method: 'POST',
    });
  },

  async clearTenant() {
    return request<any>('/v1/dev/clear-tenant', {
      method: 'POST',
    });
  },
};


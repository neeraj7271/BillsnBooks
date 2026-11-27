# Backend Pagination Gap Analysis

**Branch:** `ux/refresh-v4`  
**Date:** November 2026  
**Scope:** Status of pagination support across all 14 list endpoints and recommendations for unified backend pagination.

---

## 1. Summary

In accordance with Section 0 ("Backend is frozen — not one line of `apps/api/**` changes"), client-side pagination fallback was wired across all list pages with full URL query string synchronization (`?page=N&pageSize=M`), persisted page size selection (`localStorage`), and responsive UI (`[10, 25, 50, 100]`, Indian comma grouping, keyboard shortcuts `[` / `]` / `Home` / `End`).

The table below catalogs every endpoint currently audited, its existing backend contract, and the proposed unified target contract for the upcoming backend campaign.

---

## 2. Endpoint Audit Matrix

| Route / Module | Current API Endpoint | Current Backend Params | Current Response Shape | Gap Description |
|---|---|---|---|---|
| **Invoices** | `GET /v1/companies/:companyId/invoices` | `status`, `partyId`, `fromDate`, `toDate`, `limit` | `Invoice[]` | Missing `page`, `pageSize`, `total`, `totalPages` envelope. Backend takes `limit` but does not paginate by page offset. |
| **Vouchers** | `GET /v1/companies/:companyId/vouchers` | `voucherType`, `status`, `fromDate`, `toDate`, `limit` | `Voucher[]` | Missing offset pagination envelope; returns unpaginated array. |
| **Approvals** | `GET /v1/companies/:companyId/approvals` | None | `ApprovalRequest[]` | Returns full unpaginated array. |
| **Banking Txns** | `GET /v1/bank-accounts/:id/transactions` | `filter` (`MATCHED`/`UNMATCHED`/`ALL`) | `BankTxn[]` | No pagination params supported. |
| **Banking Discovery** | `GET /v1/discovery-tickets` | `status` | `Ticket[]` | No pagination params supported. |
| **Parties** | `GET /v1/companies/:companyId/parties` | `partyType` | `Party[]` | Ships entire party database (10,000+ counterparties) in a single response. Needs urgent SQL LIMIT/OFFSET. |
| **Items** | `GET /v1/companies/:companyId/items` | None | `Item[]` | Ships entire inventory/service catalog in one response. |
| **Practice Clients** | `GET /v1/practice/clients` | None | `ClientItem[]` | Returns all firm clients without pagination. |
| **Practice Tasks** | `GET /v1/practice/tasks` | `clientId`, `status`, `category` | `TaskItem[]` | Returns all compliance tasks matching filters. |
| **Practice Documents**| `GET /v1/practice/documents` | `clientId` | `DocItem[]` | Returns all document requests. |
| **Payment Links** | `GET /v1/companies/:companyId/collections/payment-links` | None | `PaymentLinkDto[]` | Unpaginated array. |
| **Recurring Schedules**| `GET /v1/companies/:companyId/collections/recurring-schedules` | None | `RecurringScheduleDto[]` | Unpaginated array. |
| **AR Ageing Breakdown**| `GET /v1/companies/:companyId/collections/party-ageing` | None | `PartyAgeingDto[]` | Unpaginated array of all debtor accounts. |
| **Imports History** | `GET /v1/companies/:companyId/import-batches` | None | `ImportBatch[]` | Unpaginated array of ingestion sessions. |
| **Customer Sales** | `GET /v1/companies/:companyId/reports/CUSTOMER_SALES` | `fromDate`, `toDate` | `{ rows: CustomerRow[], totalAmount: number }` | Report rows computed over full date range. |
| **Item Sales** | `GET /v1/companies/:companyId/reports/ITEM_SALES` | `fromDate`, `toDate` | `{ rows: ItemRow[], summary: ... }` | Report rows computed over full date range. |
| **General Ledger** | `GET /v1/companies/:companyId/reports/GENERAL_LEDGER` | `fromDate`, `toDate`, `ledgerId` | `{ entries: LedgerEntry[], openingBalance, closingBalance }` | Entry list can exceed thousands of rows. |

---

## 3. Recommended Unified Schema for Follow-up Backend PR

To unify all paginated endpoints, the backend should adopt NestJS interceptors or standard pagination DTOs:

### Request Query Parameters
```ts
export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### Standard Response Envelope
```ts
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

### TypeORM Query Helper Implementation
```ts
export async function paginateQuery<T>(
  queryBuilder: SelectQueryBuilder<T>,
  options: PaginationQueryDto,
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));

  const [data, total] = await queryBuilder
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
```

---

## 4. Immediate Frontend Mitigation

All frontend list pages in `apps/web` now use `useTablePagination` and `@platform/ui`'s enhanced `DataTable`:
1. If the endpoint responds with an array, client-side windowing is transparently applied with zero flicker.
2. The URL search query parameters `?page=N&pageSize=M` are continuously updated via `next/navigation`.
3. User page size preference is saved per page in `localStorage` (`dt_page_size_<key>`).
4. Once the backend adds the envelope above, the client will immediately pass the parameters without changing any UI layout or user experience.

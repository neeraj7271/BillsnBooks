# Backend Notification Contract Gap Analysis

**Branch:** `ux/refresh-v4`  
**Date:** November 2026  
**Scope:** Frontend Notification Center Integration & Future Backend Schema Recommendations

---

## 1. Summary

In Section 5, the Notification Bell was rebuilt as a full Linear/Slack-inspired Notification Center in `apps/web/src/components/notification-center.tsx`, complemented by a dedicated full-page management route at `apps/web/src/app/notifications/page.tsx`.

The frontend reuses existing API endpoints:
- `GET /v1/notifications?limit=20` (`apiClient.listNotifications`)
- `POST /v1/notifications/:id/read` (`apiClient.markNotificationRead`)
- `POST /v1/notifications/read-all` (`apiClient.markAllNotificationsRead`)

Because backend modification is frozen for this campaign, client-side fallbacks were implemented to derive missing attributes cleanly. This document catalogs the schema gaps for the upcoming backend ticket.

---

## 2. Identified Schema Gaps

| Field / Capability | Current Status in Backend DTO | Frontend Fallback / Mitigation | Recommended Backend DTO Update |
|---|---|---|---|
| **Explicit `actionUrl`** | Absent. The backend provides `entityType` and `entityId`. | Client maps `entityType === 'INVOICE'` -> `/invoices/${entityId}`, `'APPROVAL'` -> `/approvals`, `'BANK'` -> `/banking`, etc. | Add `actionUrl?: string` to `NotificationOrmEntity` and DTO for custom deep-linking. |
| **Notification Category** | Absent. Only coarse `NotificationType` enum is provided. | Client infers category from string patterns (`APPROVAL`, `INVOICE`, `PAYMENT`, `SYSTEM`). | Add `category: 'INVOICING' \| 'GOVERNANCE' \| 'BANKING' \| 'SYSTEM'` to normalize grouping. |
| **Server-Side Date Grouping** | Absent. Backend returns flat array ordered by `createdAt DESC`. | Client groups notifications into `Today`, `Yesterday`, `This week`, and `Earlier` using local device timezone. | Add optional `?grouped=true` query param or return metadata `{ unreadToday: number, unreadTotal: number }`. |
| **Total Unread Count Header** | Absent. `GET /v1/notifications` returns array of items only. | Client computes unread count over fetched page slice (`items.filter(n => !n.isRead).length`). | Add `X-Total-Unread-Count: <number>` response header or provide envelope `{ data: Notification[], unreadCount: number }`. |
| **Snooze API Endpoint** | Absent. | Client supports in-memory/client snooze of 1 hour. | Add `POST /v1/notifications/:id/snooze` with `{ until: ISOString }` and filter out snoozed items in query builder. |
| **Soft Delete / Dismiss** | Absent. | Client filters out dismissed notification IDs locally. | Add `DELETE /v1/notifications/:id` or `POST /v1/notifications/:id/dismiss`. |

---

## 3. Recommended Future Response Schema

```typescript
export interface NotificationResponseDto {
  id: string;
  title: string;
  message: string;
  category: 'INVOICING' | 'GOVERNANCE' | 'BANKING' | 'SYSTEM' | 'SECURITY';
  actionUrl: string;
  isRead: boolean;
  snoozedUntil: string | null;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

export interface NotificationFeedEnvelope {
  data: NotificationResponseDto[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
```

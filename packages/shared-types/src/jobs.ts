export interface BaseJobPayload {
  tenantId: string;
  companyId?: string;
  correlationId: string;
  userId?: string;
  timestamp: string;
}

export interface OutboxDispatchJobPayload extends BaseJobPayload {
  outboxId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface AuditJobPayload extends BaseJobPayload {
  auditLogId: string;
  entityType: string;
  entityId: string;
  action: string;
}


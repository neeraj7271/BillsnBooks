export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
  correlationId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorEnvelope;
  meta?: PaginationMeta;
}


export interface LogContext {
  requestId?: string;
  correlationId?: string;
  event?: string;
  attempt?: number;
  [key: string]: unknown;
}

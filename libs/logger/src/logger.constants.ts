export const LOG_KEYS = {
  REQUEST_ID: 'requestId',
  CORRELATION_ID: 'correlationId',
  EVENT: 'event',
  ATTEMPT: 'attempt',
  SERVICE: 'service',
} as const;

export const SENSITIVE_FIELDS = [
  'cardNumber',
  'cvv',
  'req.headers.authorization',
  'password',
  'token',
] as const;

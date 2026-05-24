import { Params } from 'nestjs-pino';
import { SENSITIVE_FIELDS } from './logger.constants';

let appInitialized = false;

export function setAppInitialized(): void {
  appInitialized = true;
}

export function buildLoggerConfig(serviceName: string): Params {
  const isNonProd = process.env.NODE_ENV !== 'production';

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? 'info',
      base: null,
      formatters: {
        level: (label) => ({ level: label.toLocaleUpperCase() }),
        log: (obj: Record<string, unknown>): Record<string, unknown> => {
          if (!appInitialized) {
            const { context: _c, service: _s, ...rest } = obj;
            void _c;
            void _s;
            return rest;
          }
          return { service: serviceName, ...obj };
        },
      },
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      redact: {
        paths: [...SENSITIVE_FIELDS],
        censor: '[REDACTED]',
      },
      transport: isNonProd
        ? {
            target: 'pino-pretty',
            options: {
              colorize: false,
              singleLine: false,
              translateTime: "SYS:yyyy-mm-dd'T'HH:MM:ss.lo",
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
    },
  };
}

import { Params } from 'nestjs-pino';
import { SENSITIVE_FIELDS } from './logger.constants';

export function buildLoggerConfig(serviceName: string): Params {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? 'info',
      base: { service: serviceName },
      redact: {
        paths: [...SENSITIVE_FIELDS],
        censor: '[REDACTED]',
      },
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          id: req.id,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
}

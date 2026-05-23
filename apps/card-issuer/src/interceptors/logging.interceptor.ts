import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Response } from 'express';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Injectable()
class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ body: unknown }>();
    this.logger.info({ body: req.body }, 'Incoming request');
    const start = Date.now();
    const getDuration = () => Date.now() - start;
    return next.handle().pipe(
      tap((response: Response) =>
        this.logger.info(
          { response, durationMs: getDuration() },
          'Outgoing response',
        ),
      ),
      catchError((error: unknown) => {
        this.logger.error(
          { error, durationMs: getDuration() },
          'Request failed',
        );
        return throwError(() => error);
      }),
    );
  }
}

export const LoggingInterceptorProvider = {
  provide: APP_INTERCEPTOR,
  useClass: LoggingInterceptor,
};

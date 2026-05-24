import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptorProvider } from './logging.interceptor';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

function makeContext(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body }),
    }),
  } as ExecutionContext;
}

function makeHandler(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

function makeErrorHandler(error: unknown): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('LoggingInterceptor', () => {
  let interceptor: any;

  beforeEach(() => {
    const InterceptorClass = LoggingInterceptorProvider.useClass as new (...args: any[]) => any;
    interceptor = new InterceptorClass(mockLogger);
  });

  it('logs the incoming request body', () => {
    const body = { customer: { name: 'test' } };
    interceptor.intercept(makeContext(body), makeHandler({})).subscribe();
    expect(mockLogger.info).toHaveBeenCalledWith({ body }, 'Incoming request');
  });

  it('logs the outgoing response with durationMs', (done) => {
    const response = { requestId: 'req-1', status: 'PENDING' };
    interceptor.intercept(makeContext({}), makeHandler(response)).subscribe({
      complete: () => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ response, durationMs: expect.any(Number) }),
          'Outgoing response',
        );
        done();
      },
    });
  });

  it('logs the error with durationMs on failure', (done) => {
    const error = new Error('use case failed');
    interceptor.intercept(makeContext({}), makeErrorHandler(error)).subscribe({
      error: () => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({ error, durationMs: expect.any(Number) }),
          'Request failed',
        );
        done();
      },
    });
  });

  it('re-throws the original error', (done) => {
    const error = new Error('original error');
    interceptor.intercept(makeContext({}), makeErrorHandler(error)).subscribe({
      error: (err: unknown) => {
        expect(err).toBe(error);
        done();
      },
    });
  });

  it('returns the response value unchanged', (done) => {
    const response = { requestId: 'abc', status: 'PENDING' };
    interceptor.intercept(makeContext({}), makeHandler(response)).subscribe({
      next: (value: unknown) => {
        expect(value).toEqual(response);
        done();
      },
    });
  });
});

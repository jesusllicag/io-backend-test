describe('logger.config', () => {
  describe('buildLoggerConfig - before app initialization', () => {
    let buildLoggerConfig: (serviceName: string) => any;

    beforeEach(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./logger.config') as typeof import('./logger.config');
        buildLoggerConfig = mod.buildLoggerConfig;
      });
    });

    it('returns a config object with pinoHttp', () => {
      const config = buildLoggerConfig('test-service');
      expect(config).toHaveProperty('pinoHttp');
    });

    it('log formatter strips context and service fields when not initialized', () => {
      const config = buildLoggerConfig('test-service');
      const logFormatter = config.pinoHttp.formatters.log as (obj: Record<string, unknown>) => Record<string, unknown>;
      const result = logFormatter({ context: 'Bootstrap', service: 'old', msg: 'hello' });
      expect(result).not.toHaveProperty('context');
      expect(result).not.toHaveProperty('service');
      expect(result).toHaveProperty('msg', 'hello');
    });

    it('level formatter uppercases the label', () => {
      const config = buildLoggerConfig('test-service');
      const levelFormatter = config.pinoHttp.formatters.level as (label: string) => Record<string, unknown>;
      expect(levelFormatter('info')).toEqual({ level: 'INFO' });
      expect(levelFormatter('error')).toEqual({ level: 'ERROR' });
    });

    it('sets log level from LOG_LEVEL env var', () => {
      process.env.LOG_LEVEL = 'debug';
      const config = buildLoggerConfig('test-service');
      expect(config.pinoHttp.level).toBe('debug');
      delete process.env.LOG_LEVEL;
    });

    it('defaults log level to info', () => {
      delete process.env.LOG_LEVEL;
      const config = buildLoggerConfig('test-service');
      expect(config.pinoHttp.level).toBe('info');
    });

    it('uses pino-pretty transport in non-production', () => {
      process.env.NODE_ENV = 'development';
      const config = buildLoggerConfig('test-service');
      expect(config.pinoHttp.transport).toBeDefined();
      expect(config.pinoHttp.transport.target).toBe('pino-pretty');
    });

    it('does not set transport in production', () => {
      process.env.NODE_ENV = 'production';
      const config = buildLoggerConfig('test-service');
      expect(config.pinoHttp.transport).toBeUndefined();
      delete process.env.NODE_ENV;
    });

    it('redacts sensitive fields', () => {
      const config = buildLoggerConfig('test-service');
      const redactPaths = config.pinoHttp.redact.paths as string[];
      expect(redactPaths).toContain('cvv');
      expect(redactPaths).toContain('password');
    });

    it('timestamp function returns a JSON-compatible timestamp string', () => {
      const config = buildLoggerConfig('test-service');
      const timestamp = config.pinoHttp.timestamp as () => string;
      const result = timestamp();
      expect(result).toMatch(/^,"timestamp":"\d{4}-\d{2}-\d{2}T/);
    });

    it('req serializer returns undefined to suppress request logging', () => {
      const config = buildLoggerConfig('test-service');
      const reqSerializer = (config.pinoHttp.serializers as any).req;
      expect(reqSerializer({})).toBeUndefined();
    });

    it('res serializer returns undefined to suppress response logging', () => {
      const config = buildLoggerConfig('test-service');
      const resSerializer = (config.pinoHttp.serializers as any).res;
      expect(resSerializer({})).toBeUndefined();
    });
  });

  describe('buildLoggerConfig - after setAppInitialized', () => {
    let buildLoggerConfig: (serviceName: string) => any;
    let setAppInitialized: () => void;

    beforeEach(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./logger.config') as typeof import('./logger.config');
        buildLoggerConfig = mod.buildLoggerConfig;
        setAppInitialized = mod.setAppInitialized;
      });
      setAppInitialized();
    });

    it('log formatter prepends service name after initialization', () => {
      const config = buildLoggerConfig('my-service');
      const logFormatter = config.pinoHttp.formatters.log as (obj: Record<string, unknown>) => Record<string, unknown>;
      const result = logFormatter({ msg: 'hello' });
      expect(result).toEqual({ service: 'my-service', msg: 'hello' });
    });

    it('preserves all original fields in the log object', () => {
      const config = buildLoggerConfig('my-service');
      const logFormatter = config.pinoHttp.formatters.log as (obj: Record<string, unknown>) => Record<string, unknown>;
      const result = logFormatter({ msg: 'test', requestId: 'req-1', level: 'info' });
      expect(result).toMatchObject({ service: 'my-service', msg: 'test', requestId: 'req-1' });
    });
  });
});

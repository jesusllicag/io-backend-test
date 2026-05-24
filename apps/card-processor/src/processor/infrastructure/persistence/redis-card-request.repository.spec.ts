import Redis from 'ioredis';
import { RedisRepositoryProvider } from './redis-card-request.repository';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis');
jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((_key: string, defaultValue?: string) => defaultValue),
} as unknown as ConfigService;

const storedData = {
  requestId: 'req-1',
  customer: { documentType: 'DNI', documentNumber: '12345678', fullName: 'John', age: 25, email: 'j@j.com' },
  product: { type: 'VISA', currency: 'PEN' },
  forceError: false,
  status: 'PENDING',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('RedisCardRequestRepository (card-processor)', () => {
  let repo: any;
  let redisInstance: any;

  beforeEach(() => {
    redisInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(86400),
    };
    MockedRedis.mockImplementation(() => redisInstance as unknown as Redis);

    const RepositoryClass = RedisRepositoryProvider.useClass as new (...args: any[]) => any;
    repo = new RepositoryClass(mockLogger, mockConfigService);
  });

  describe('onModuleInit', () => {
    it('connects to Redis', async () => {
      await repo.onModuleInit();
      expect(redisInstance.connect).toHaveBeenCalledTimes(1);
    });

    it('logs connection message', async () => {
      await repo.onModuleInit();
      expect(mockLogger.info).toHaveBeenCalledWith('Redis connected (card-processor)');
    });
  });

  describe('onModuleDestroy', () => {
    it('quits the Redis connection', async () => {
      await repo.onModuleDestroy();
      expect(redisInstance.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    it('logs warning and returns when key not found', async () => {
      redisInstance.get.mockResolvedValueOnce(null);
      await repo.updateStatus('req-missing', 'ISSUED');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { requestId: 'req-missing' },
        'Card request not found for update',
      );
      expect(redisInstance.setex).not.toHaveBeenCalled();
    });

    it('updates status and writes back to Redis', async () => {
      redisInstance.get.mockResolvedValueOnce(JSON.stringify(storedData));
      redisInstance.ttl.mockResolvedValueOnce(3600);

      await repo.updateStatus('req-1', 'ISSUED');

      expect(redisInstance.setex).toHaveBeenCalledWith(
        'card:request:req-1',
        3600,
        expect.stringContaining('"status":"ISSUED"'),
      );
    });

    it('updates updatedAt when storing', async () => {
      redisInstance.get.mockResolvedValueOnce(JSON.stringify(storedData));
      redisInstance.ttl.mockResolvedValueOnce(3600);

      await repo.updateStatus('req-1', 'FAILED');

      const storedJson = JSON.parse(redisInstance.setex.mock.calls[0][2]);
      expect(storedJson.updatedAt).not.toBe(storedData.updatedAt);
    });

    it('sets card field when provided', async () => {
      redisInstance.get.mockResolvedValueOnce(JSON.stringify(storedData));
      redisInstance.ttl.mockResolvedValueOnce(3600);
      const card = { id: 'c1', number: '4111', expiryDate: '01/30', cvv: '123' };

      await repo.updateStatus('req-1', 'ISSUED', card);

      const storedJson = JSON.parse(redisInstance.setex.mock.calls[0][2]);
      expect(storedJson.card).toEqual(card);
    });

    it('sets errorMessage field when provided', async () => {
      redisInstance.get.mockResolvedValueOnce(JSON.stringify(storedData));
      redisInstance.ttl.mockResolvedValueOnce(3600);

      await repo.updateStatus('req-1', 'FAILED', undefined, 'issuer error');

      const storedJson = JSON.parse(redisInstance.setex.mock.calls[0][2]);
      expect(storedJson.errorMessage).toBe('issuer error');
    });

    it('falls back to 86400s TTL when ttl returns 0 or negative', async () => {
      redisInstance.get.mockResolvedValueOnce(JSON.stringify(storedData));
      redisInstance.ttl.mockResolvedValueOnce(0);

      await repo.updateStatus('req-1', 'FAILED');

      expect(redisInstance.setex).toHaveBeenCalledWith(
        expect.any(String),
        86400,
        expect.any(String),
      );
    });
  });

  describe('deleteByRequestId', () => {
    it('deletes the key from Redis', async () => {
      await repo.deleteByRequestId('req-1');
      expect(redisInstance.del).toHaveBeenCalledWith('card:request:req-1');
    });

    it('logs deletion', async () => {
      await repo.deleteByRequestId('req-1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { requestId: 'req-1' },
        'Card request deleted from Redis',
      );
    });
  });
});

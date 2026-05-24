import Redis from 'ioredis';
import { RedisProvider } from './redis-card-request.repository';
import { CardRequestEntity } from '../../domain/card-request.entity';
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

const customer = { documentType: 'DNI' as const, documentNumber: '12345678', fullName: 'John', age: 25, email: 'j@j.com' };
const product = { type: 'VISA' as const, currency: 'PEN' as const };

function makeEntity(requestId = 'req-1'): CardRequestEntity {
  return new CardRequestEntity(requestId, customer, product, false, 'PENDING');
}

describe('RedisCardRequestRepository (card-issuer)', () => {
  let repo: any;
  let redisInstance: any;

  beforeEach(() => {
    redisInstance = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    MockedRedis.mockImplementation(() => redisInstance as unknown as Redis);

    const RepositoryClass = RedisProvider.useClass as new (...args: any[]) => any;
    repo = new RepositoryClass(mockLogger, mockConfigService);
  });

  describe('onModuleInit', () => {
    it('connects to Redis', async () => {
      await repo.onModuleInit();
      expect(redisInstance.connect).toHaveBeenCalledTimes(1);
    });

    it('logs Redis connected', async () => {
      await repo.onModuleInit();
      expect(mockLogger.info).toHaveBeenCalledWith('Redis connected (card-issuer)');
    });
  });

  describe('onModuleDestroy', () => {
    it('quits the Redis connection', async () => {
      await repo.onModuleDestroy();
      expect(redisInstance.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('save', () => {
    it('stores the entity JSON at the key-prefixed requestId', async () => {
      const entity = makeEntity();
      await repo.save(entity);
      expect(redisInstance.setex).toHaveBeenCalledWith(
        'card:request:req-1',
        86400,
        entity.toString(),
      );
    });

    it('stores the document index at doc-prefixed documentNumber', async () => {
      const entity = makeEntity();
      await repo.save(entity);
      expect(redisInstance.setex).toHaveBeenCalledWith(
        'card:doc:12345678',
        86400,
        'req-1',
      );
    });

    it('calls setex exactly twice', async () => {
      await repo.save(makeEntity());
      expect(redisInstance.setex).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByRequestId', () => {
    it('returns null when key is not found', async () => {
      redisInstance.get.mockResolvedValueOnce(null);
      const result = await repo.findByRequestId('req-1');
      expect(result).toBeNull();
    });

    it('returns a CardRequestEntity when key exists', async () => {
      const entity = makeEntity();
      redisInstance.get.mockResolvedValueOnce(entity.toString());
      const result = await repo.findByRequestId('req-1');
      expect(result).toBeInstanceOf(CardRequestEntity);
      expect(result.requestId).toBe('req-1');
    });

    it('deserializes all entity fields correctly', async () => {
      const entity = makeEntity();
      entity.markAsIssued({ id: 'c1', number: '4111', expiryDate: '01/30', cvv: '123' });
      redisInstance.get.mockResolvedValueOnce(entity.toString());
      const result = await repo.findByRequestId('req-1');
      expect(result.status).toBe('ISSUED');
      expect(result.card).toEqual(entity.card);
    });

    it('looks up by the correct Redis key', async () => {
      await repo.findByRequestId('req-abc');
      expect(redisInstance.get).toHaveBeenCalledWith('card:request:req-abc');
    });
  });

  describe('findByDocumentNumber', () => {
    it('returns null when document index is not found', async () => {
      redisInstance.get.mockResolvedValueOnce(null);
      const result = await repo.findByDocumentNumber('12345678');
      expect(result).toBeNull();
    });

    it('looks up via doc index prefix', async () => {
      redisInstance.get.mockResolvedValueOnce(null);
      await repo.findByDocumentNumber('99999999');
      expect(redisInstance.get).toHaveBeenCalledWith('card:doc:99999999');
    });

    it('returns entity when document index resolves to a stored request', async () => {
      const entity = makeEntity();
      redisInstance.get
        .mockResolvedValueOnce('req-1')
        .mockResolvedValueOnce(entity.toString());
      const result = await repo.findByDocumentNumber('12345678');
      expect(result).toBeInstanceOf(CardRequestEntity);
      expect(result.requestId).toBe('req-1');
    });

    it('returns null when the resolved requestId has no entity', async () => {
      redisInstance.get
        .mockResolvedValueOnce('req-orphan')
        .mockResolvedValueOnce(null);
      const result = await repo.findByDocumentNumber('12345678');
      expect(result).toBeNull();
    });
  });
});

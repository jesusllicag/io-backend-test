import { KafkaAdminService } from './kafka.admin';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('KafkaAdminService', () => {
  let service: KafkaAdminService;
  let mockAdmin: any;
  let mockKafkaClient: any;

  beforeEach(() => {
    mockAdmin = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      createTopics: jest.fn().mockResolvedValue(true),
    };
    mockKafkaClient = {
      kafka: {
        admin: jest.fn().mockReturnValue(mockAdmin),
      },
    };
    service = new KafkaAdminService(mockLogger as any, mockKafkaClient as any);
  });

  describe('ensureTopics', () => {
    it('connects the admin client', async () => {
      await service.ensureTopics(['topic-a']);
      expect(mockAdmin.connect).toHaveBeenCalledTimes(1);
    });

    it('creates topics with correct configuration', async () => {
      await service.ensureTopics(['io.card.requested.v1', 'io.cards.issued.v1']);
      expect(mockAdmin.createTopics).toHaveBeenCalledWith({
        waitForLeaders: true,
        topics: [
          { topic: 'io.card.requested.v1', numPartitions: 1, replicationFactor: 1 },
          { topic: 'io.cards.issued.v1', numPartitions: 1, replicationFactor: 1 },
        ],
      });
    });

    it('disconnects the admin client after success', async () => {
      await service.ensureTopics(['topic-a']);
      expect(mockAdmin.disconnect).toHaveBeenCalledTimes(1);
    });

    it('logs "Kafka topics created" when topics are new', async () => {
      mockAdmin.createTopics.mockResolvedValueOnce(true);
      await service.ensureTopics(['topic-a']);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { topics: ['topic-a'], created: true },
        'Kafka topics created',
      );
    });

    it('logs "Kafka topics already exist" when topics are pre-existing', async () => {
      mockAdmin.createTopics.mockResolvedValueOnce(false);
      await service.ensureTopics(['topic-a']);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { topics: ['topic-a'], created: false },
        'Kafka topics already exist',
      );
    });

    it('disconnects even when createTopics throws', async () => {
      mockAdmin.createTopics.mockRejectedValueOnce(new Error('broker error'));
      await expect(service.ensureTopics(['topic-a'])).rejects.toThrow('broker error');
      expect(mockAdmin.disconnect).toHaveBeenCalledTimes(1);
    });

    it('creates a new admin instance on each call', async () => {
      await service.ensureTopics(['topic-a']);
      await service.ensureTopics(['topic-b']);
      expect(mockKafkaClient.kafka.admin).toHaveBeenCalledTimes(2);
    });
  });
});

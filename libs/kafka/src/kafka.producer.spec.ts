import { KafkaProducerService } from './kafka.producer';
import { TOPICS } from './kafka.topics';
import { CloudEvent } from '@contracts/types/cloud-event.types';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let mockProducer: any;
  let mockAdmin: any;
  let mockKafkaClient: any;

  beforeEach(() => {
    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    };
    mockAdmin = {
      ensureTopics: jest.fn().mockResolvedValue(undefined),
    };
    mockKafkaClient = {
      kafka: {
        producer: jest.fn().mockReturnValue(mockProducer),
      },
    };
    service = new KafkaProducerService(mockKafkaClient as any, mockAdmin as any, mockLogger as any);
  });

  describe('onModuleInit', () => {
    it('ensures all topics before connecting', async () => {
      await service.onModuleInit();
      expect(mockAdmin.ensureTopics).toHaveBeenCalledWith(Object.values(TOPICS));
    });

    it('connects the producer', async () => {
      await service.onModuleInit();
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    });

    it('ensures topics before connecting producer', async () => {
      const callOrder: string[] = [];
      mockAdmin.ensureTopics.mockImplementation(async () => { callOrder.push('ensureTopics'); });
      mockProducer.connect.mockImplementation(async () => { callOrder.push('connect'); });

      await service.onModuleInit();
      expect(callOrder).toEqual(['ensureTopics', 'connect']);
    });

    it('logs producer connected', async () => {
      await service.onModuleInit();
      expect(mockLogger.info).toHaveBeenCalledWith('Kafka producer connected');
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects the producer', async () => {
      await service.onModuleDestroy();
      expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('logs producer disconnected', async () => {
      await service.onModuleDestroy();
      expect(mockLogger.info).toHaveBeenCalledWith('Kafka producer disconnected');
    });
  });

  describe('publish', () => {
    const event: CloudEvent<{ requestId: string }> = {
      id: 1,
      source: 'req-abc',
      type: TOPICS.CARD_REQUESTED,
      data: { requestId: 'req-abc' },
    };

    it('sends message to the correct topic', async () => {
      await service.publish(TOPICS.CARD_REQUESTED, event);
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: TOPICS.CARD_REQUESTED,
        messages: [{ key: 'req-abc', value: JSON.stringify(event) }],
      });
    });

    it('uses event.source as the message key', async () => {
      await service.publish(TOPICS.CARD_REQUESTED, event);
      const record = mockProducer.send.mock.calls[0][0];
      expect(record.messages[0].key).toBe('req-abc');
    });

    it('serializes the event as JSON', async () => {
      await service.publish(TOPICS.CARD_REQUESTED, event);
      const record = mockProducer.send.mock.calls[0][0];
      expect(record.messages[0].value).toBe(JSON.stringify(event));
    });

    it('logs the published event', async () => {
      await service.publish(TOPICS.CARD_REQUESTED, event);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { event: event.type, source: event.source, id: event.id },
        'Event published',
      );
    });
  });
});

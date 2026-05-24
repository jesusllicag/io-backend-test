import { KafkaConsumerService } from './kafka.consumer';
import { EachMessagePayload } from 'kafkajs';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let mockConsumer: any;
  let mockKafkaClient: any;

  beforeEach(() => {
    mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    };
    mockKafkaClient = {
      kafka: {
        consumer: jest.fn().mockReturnValue(mockConsumer),
      },
    };
    service = new KafkaConsumerService(mockLogger as any, mockKafkaClient as any);
  });

  describe('subscribe', () => {
    const handler = jest.fn().mockResolvedValue(undefined);

    it('creates a consumer with the given groupId', async () => {
      await service.subscribe('group-1', ['topic-a'], handler);
      expect(mockKafkaClient.kafka.consumer).toHaveBeenCalledWith({ groupId: 'group-1' });
    });

    it('connects the consumer', async () => {
      await service.subscribe('group-1', ['topic-a'], handler);
      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    });

    it('subscribes to each topic with fromBeginning: false', async () => {
      await service.subscribe('group-1', ['topic-a', 'topic-b'], handler);
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'topic-a', fromBeginning: false });
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({ topic: 'topic-b', fromBeginning: false });
    });

    it('starts the consumer run loop', async () => {
      await service.subscribe('group-1', ['topic-a'], handler);
      expect(mockConsumer.run).toHaveBeenCalledWith(
        expect.objectContaining({ eachMessage: expect.any(Function) }),
      );
    });

    it('logs consumer started with groupId and topics', async () => {
      await service.subscribe('group-1', ['topic-a'], handler);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { groupId: 'group-1', topics: ['topic-a'] },
        'Kafka consumer started',
      );
    });

    it('throws when registering the same groupId twice', async () => {
      await service.subscribe('group-dup', ['topic-a'], handler);
      await expect(service.subscribe('group-dup', ['topic-a'], handler)).rejects.toThrow(
        'Consumer group group-dup already exists',
      );
    });

    describe('eachMessage handler', () => {
      let capturedEachMessage: (payload: EachMessagePayload) => Promise<void>;

      beforeEach(async () => {
        mockConsumer.run.mockImplementation(async ({ eachMessage }: any) => {
          capturedEachMessage = eachMessage;
        });
        await service.subscribe('group-msg', ['topic-a'], handler);
      });

      const makePayload = (value: string | null): EachMessagePayload =>
        ({
          topic: 'topic-a',
          partition: 0,
          message: { offset: '0', value: value ? Buffer.from(value) : null },
        }) as unknown as EachMessagePayload;

      it('calls the user handler with the payload', async () => {
        const payload = makePayload('{"key":"value"}');
        await capturedEachMessage(payload);
        expect(handler).toHaveBeenCalledWith(payload);
      });

      it('logs message received', async () => {
        const payload = makePayload('{}');
        await capturedEachMessage(payload);
        expect(mockLogger.info).toHaveBeenCalledWith(
          { topic: 'topic-a', offset: '0' },
          'Message received',
        );
      });

      it('logs error and re-throws when handler fails', async () => {
        const err = new Error('processing failed');
        handler.mockRejectedValueOnce(err);
        const payload = makePayload('{}');
        await expect(capturedEachMessage(payload)).rejects.toThrow('processing failed');
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({ error: err, topic: 'topic-a', offset: '0' }),
          'Message processing failed',
        );
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects all registered consumers', async () => {
      const mockConsumer2 = { ...mockConsumer, disconnect: jest.fn().mockResolvedValue(undefined) };
      mockKafkaClient.kafka.consumer
        .mockReturnValueOnce(mockConsumer)
        .mockReturnValueOnce(mockConsumer2);

      await service.subscribe('group-1', ['topic-a'], jest.fn());
      await service.subscribe('group-2', ['topic-b'], jest.fn());

      await service.onModuleDestroy();

      expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
      expect(mockConsumer2.disconnect).toHaveBeenCalledTimes(1);
    });

    it('logs consumers disconnected', async () => {
      await service.onModuleDestroy();
      expect(mockLogger.info).toHaveBeenCalledWith('Kafka consumers disconnected');
    });

    it('handles no registered consumers gracefully', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});

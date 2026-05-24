import { CardRequestedConsumer } from './card-requested.consumer';
import { TOPICS } from '@kafka/kafka.topics';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { EachMessagePayload } from 'kafkajs';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockKafkaConsumer = {
  subscribe: jest.fn().mockResolvedValue(undefined),
};

const mockProcessCard = {
  execute: jest.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const validEventData: CardRequestedData = {
  requestId: 'req-1',
  customer: { documentType: 'DNI', documentNumber: '12345678', fullName: 'John', age: 25, email: 'j@j.com' },
  product: { type: 'VISA', currency: 'PEN' },
  forceError: false,
  attempt: 1,
  status: 'PENDING',
};

const validEvent: CloudEvent<CardRequestedData> = {
  id: 1,
  source: 'req-1',
  type: TOPICS.CARD_REQUESTED,
  data: validEventData,
};

function makePayload(value: Buffer | null, offset = '0'): EachMessagePayload {
  return {
    topic: TOPICS.CARD_REQUESTED,
    partition: 0,
    message: { offset, value } as any,
    heartbeat: jest.fn(),
    pause: jest.fn(),
  } as unknown as EachMessagePayload;
}

describe('CardRequestedConsumer', () => {
  let consumer: CardRequestedConsumer;
  let capturedHandler: (payload: EachMessagePayload) => Promise<void>;

  beforeEach(async () => {
    consumer = new CardRequestedConsumer(
      mockKafkaConsumer as any,
      mockProcessCard as any,
      mockLogger as any,
    );
    await consumer.onModuleInit();
    capturedHandler = mockKafkaConsumer.subscribe.mock.calls[0][2];
  });

  describe('onModuleInit', () => {
    it('subscribes with correct groupId', () => {
      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith(
        'card-processor-group',
        expect.any(Array),
        expect.any(Function),
      );
    });

    it('subscribes to CARD_REQUESTED topic', () => {
      expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith(
        expect.any(String),
        [TOPICS.CARD_REQUESTED],
        expect.any(Function),
      );
    });
  });

  describe('message handling', () => {
    it('parses the message and calls processCard.execute', async () => {
      const payload = makePayload(Buffer.from(JSON.stringify(validEvent)));
      await capturedHandler(payload);
      expect(mockProcessCard.execute).toHaveBeenCalledWith(validEventData);
    });

    it('logs the received event', async () => {
      const payload = makePayload(Buffer.from(JSON.stringify(validEvent)));
      await capturedHandler(payload);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-1', event: TOPICS.CARD_REQUESTED }),
        'Received card requested event',
      );
    });

    it('logs warning and skips when message value is null', async () => {
      const payload = makePayload(null);
      await capturedHandler(payload);
      expect(mockLogger.warn).toHaveBeenCalledWith('Received empty message, skipping');
      expect(mockProcessCard.execute).not.toHaveBeenCalled();
    });

    it('logs error and skips when message is invalid JSON', async () => {
      const payload = makePayload(Buffer.from('not valid json'));
      await capturedHandler(payload);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ raw: 'not valid json' }),
        'Failed to parse Kafka message',
      );
      expect(mockProcessCard.execute).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by processCard.execute', async () => {
      mockProcessCard.execute.mockRejectedValueOnce(new Error('processing error'));
      const payload = makePayload(Buffer.from(JSON.stringify(validEvent)));
      await expect(capturedHandler(payload)).rejects.toThrow('processing error');
    });
  });
});

import { KafkaEventPublisherAdapter } from '../../../../../../apps/card-processor/src/processor/infrastructure/kafka/kafka-event-publisher.adapter';
import { CloudEvent } from '@contracts/types/cloud-event.types';

const mockProducer = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('KafkaEventPublisherAdapter (card-processor)', () => {
  let adapter: KafkaEventPublisherAdapter;

  beforeEach(() => {
    adapter = new KafkaEventPublisherAdapter(mockProducer as any);
  });

  describe('publish', () => {
    it('delegates to producer.publish with the same topic and event', async () => {
      const event: CloudEvent<{ requestId: string }> = {
        id: 1,
        source: 'req-1',
        type: 'io.cards.issued.v1',
        data: { requestId: 'req-1' },
      };
      await adapter.publish('io.cards.issued.v1', event);
      expect(mockProducer.publish).toHaveBeenCalledWith('io.cards.issued.v1', event);
    });

    it('propagates errors from the producer', async () => {
      mockProducer.publish.mockRejectedValueOnce(new Error('send failed'));
      const event: CloudEvent<unknown> = { id: 2, source: 's', type: 't', data: {} };
      await expect(adapter.publish('topic', event)).rejects.toThrow('send failed');
    });

    it('does not transform the event before passing it to the producer', async () => {
      const event: CloudEvent<{ custom: boolean }> = {
        id: 3,
        source: 'src',
        type: 'custom.type',
        data: { custom: true },
        errors: [{ message: 'err', attempt: 1 }],
      };
      await adapter.publish('custom.type', event);
      expect(mockProducer.publish).toHaveBeenCalledWith('custom.type', event);
    });
  });
});

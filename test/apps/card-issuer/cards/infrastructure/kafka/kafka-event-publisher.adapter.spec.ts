import { KafkaEventPublisherProvider } from '../../../../../../apps/card-issuer/src/cards/infrastructure/kafka/kafka-event-publisher.adapter';
import { CloudEvent } from '@contracts/types/cloud-event.types';

const mockProducer = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('KafkaEventPublisherAdapter (card-issuer)', () => {
  let adapter: any;

  beforeEach(() => {
    const AdapterClass = KafkaEventPublisherProvider.useClass as new (...args: any[]) => any;
    adapter = new AdapterClass(mockProducer);
  });

  describe('publish', () => {
    it('delegates to producer.publish with same arguments', async () => {
      const event: CloudEvent<{ requestId: string }> = {
        id: 1,
        source: 'req-1',
        type: 'io.card.requested.v1',
        data: { requestId: 'req-1' },
      };
      await adapter.publish('io.card.requested.v1', event);
      expect(mockProducer.publish).toHaveBeenCalledWith('io.card.requested.v1', event);
    });

    it('propagates errors from the producer', async () => {
      mockProducer.publish.mockRejectedValueOnce(new Error('broker unavailable'));
      const event: CloudEvent<unknown> = { id: 1, source: 's', type: 't', data: {} };
      await expect(adapter.publish('topic', event)).rejects.toThrow('broker unavailable');
    });
  });
});

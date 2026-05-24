import { KafkaClientService } from '../../../libs/kafka/src/kafka.client';
import { Kafka } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({})),
}));

const MockedKafka = Kafka as jest.MockedClass<typeof Kafka>;

function makeConfigService(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
}

describe('KafkaClientService', () => {
  beforeEach(() => {
    MockedKafka.mockClear();
  });

  it('creates Kafka with SERVICE_NAME and KAFKA_BROKER from config', () => {
    const config = makeConfigService({
      SERVICE_NAME: 'card-issuer',
      KAFKA_BROKER: 'broker1:9092,broker2:9092',
    });
    new KafkaClientService(config);

    expect(MockedKafka).toHaveBeenCalledWith({
      clientId: 'card-issuer',
      brokers: ['broker1:9092', 'broker2:9092'],
      retry: { retries: 5 },
    });
  });

  it('uses default clientId and broker when env vars are absent', () => {
    const config = makeConfigService({});
    new KafkaClientService(config);

    expect(MockedKafka).toHaveBeenCalledWith({
      clientId: 'io-service',
      brokers: ['localhost:9092'],
      retry: { retries: 5 },
    });
  });

  it('exposes the kafka instance as a public property', () => {
    const config = makeConfigService({});
    const service = new KafkaClientService(config);
    expect(service.kafka).toBeDefined();
  });

  it('splits comma-separated brokers into an array', () => {
    const config = makeConfigService({ KAFKA_BROKER: 'a:9092,b:9092,c:9092' });
    new KafkaClientService(config);

    const call = MockedKafka.mock.calls[0][0];
    expect(call.brokers).toEqual(['a:9092', 'b:9092', 'c:9092']);
  });
});

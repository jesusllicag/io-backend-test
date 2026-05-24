import {
  ClassProvider,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import {
  CARD_REQUEST_REPOSITORY,
  CardRequestRepositoryPort,
} from '../../domain/card-request.repository.port';
import { CardRequestEntity } from '../../domain/card-request.entity';
import {
  Customer,
  Product,
  Card,
  CardStatusValue,
} from '@contracts/types/cloud-event.types';
import { ConfigService } from '@nestjs/config';

@Injectable()
class RedisCardRequestRepository
  implements CardRequestRepositoryPort, OnModuleInit, OnModuleDestroy
{
  private client: Redis;

  private readonly keyPrefix: string;
  private readonly docIndexPrefix: string;
  private readonly ttlSeconds: string;

  constructor(
    @InjectPinoLogger(RedisCardRequestRepository.name)
    private readonly logger: PinoLogger,
    private readonly env: ConfigService,
  ) {
    this.client = new Redis(
      this.env.get('REDIS_URL', 'redis://localhost:6379'),
      {
        lazyConnect: true,
      },
    );
    this.keyPrefix = this.env.get('KEY_PREFIX', 'card:request:');
    this.docIndexPrefix = this.env.get('DOC_INDEX_PREFIX', 'card:doc:');
    this.ttlSeconds = this.env.get('TTL_SECONDS', '86400');
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.info('Redis connected (card-issuer)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async save(entity: CardRequestEntity): Promise<void> {
    const envkey = this.keyPrefix + entity.requestId;
    const reqKey = this.docIndexPrefix + entity.customer.documentNumber;

    await this.client.setex(envkey, Number(this.ttlSeconds), entity.toString());
    await this.client.setex(reqKey, Number(this.ttlSeconds), entity.requestId);
  }

  async findByRequestId(requestId: string): Promise<CardRequestEntity | null> {
    const raw = await this.client.get(this.keyPrefix + requestId);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  async findByDocumentNumber(
    documentNumber: string,
  ): Promise<CardRequestEntity | null> {
    this.logger.info(`Looking up card by doc. number: ${documentNumber}`);
    const requestId = await this.client.get(
      this.docIndexPrefix + documentNumber,
    );
    if (!requestId) return null;
    return this.findByRequestId(requestId);
  }

  private deserialize(raw: string): CardRequestEntity {
    const data = JSON.parse(raw) as {
      requestId: string;
      customer: Customer;
      product: Product;
      forceError: boolean;
      status: CardStatusValue;
      card?: Card;
      errorMessage?: string;
      createdAt: string;
      updatedAt: string;
    };

    const entity = new CardRequestEntity(
      data.requestId,
      data.customer,
      data.product,
      data.forceError,
      data.status,
      data.card,
      data.errorMessage,
      data.createdAt,
      data.updatedAt,
    );
    return entity;
  }
}

export const RedisProvider: ClassProvider = {
  provide: CARD_REQUEST_REPOSITORY,
  useClass: RedisCardRequestRepository,
};

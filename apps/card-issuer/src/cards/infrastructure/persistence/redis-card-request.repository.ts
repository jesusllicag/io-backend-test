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
import { Customer, Product, Card } from '@contracts/types/cloud-event.types';

const KEY_PREFIX = 'card:request:';
const DOC_INDEX_PREFIX = 'card:doc:';
const TTL_SECONDS = 86400; // 24h

@Injectable()
class RedisCardRequestRepository
  implements CardRequestRepositoryPort, OnModuleInit, OnModuleDestroy
{
  private client: Redis;

  constructor(
    @InjectPinoLogger(RedisCardRequestRepository.name)
    private readonly logger: PinoLogger,
  ) {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.info('Redis connected (card-issuer)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async save(entity: CardRequestEntity): Promise<void> {
    const key = KEY_PREFIX + entity.requestId;
    const docKey = DOC_INDEX_PREFIX + entity.customer.documentNumber;

    await this.client.setex(key, TTL_SECONDS, JSON.stringify(entity.toJSON()));
    await this.client.setex(docKey, TTL_SECONDS, entity.requestId);
  }

  async findByRequestId(requestId: string): Promise<CardRequestEntity | null> {
    const raw = await this.client.get(KEY_PREFIX + requestId);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  async findByDocumentNumber(
    documentNumber: string,
  ): Promise<CardRequestEntity | null> {
    this.logger.info(`Looking up card by doc. number: ${documentNumber}`);
    const requestId = await this.client.get(DOC_INDEX_PREFIX + documentNumber);
    if (!requestId) return null;
    return this.findByRequestId(requestId);
  }

  private deserialize(raw: string): CardRequestEntity {
    const data = JSON.parse(raw);
    const entity = new CardRequestEntity(
      data.requestId as string,
      data.customer as Customer,
      data.product as Product,
      data.forceError as boolean,
      data.status,
      data.card as Card | undefined,
      data.errorMessage as string | undefined,
      data.createdAt as string,
      data.updatedAt as string,
    );
    return entity;
  }
}

export const RedisProvider: ClassProvider = {
  provide: CARD_REQUEST_REPOSITORY,
  useClass: RedisCardRequestRepository,
};

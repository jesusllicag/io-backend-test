import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CardIssueDto } from '@contracts/schemas/card-issue.schema';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { generateRequestId, nextEventId } from '@common/utils/id.utils';
import { TOPICS } from '@kafka/kafka.topics';
import {
  CARD_REQUEST_REPOSITORY,
  CardRequestRepositoryPort,
} from '../domain/card-request.repository.port';
import {
  EVENT_PUBLISHER,
  EventPublisherPort,
} from '../domain/event-publisher.port';
import { CardRequestEntity } from '../domain/card-request.entity';

export interface IssueCardResult {
  requestId: string;
  status: 'PENDING';
}

@Injectable()
export class IssueCardUseCase {
  constructor(
    @Inject(CARD_REQUEST_REPOSITORY)
    private readonly repository: CardRequestRepositoryPort,
    @Inject(EVENT_PUBLISHER)
    private readonly publisher: EventPublisherPort,
    @InjectPinoLogger(IssueCardUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(dto: CardIssueDto): Promise<IssueCardResult> {
    await this.findExistingRequest(dto);

    const requestId = await this.createCardRequest(dto);

    await this.publishCardRequestedEvent(requestId, dto);

    return this.toResponse(requestId);
  }

  private async findExistingRequest(dto: CardIssueDto) {
    const existing = await this.repository.findByDocumentNumber(
      dto.customer.documentNumber,
    );

    if (existing) {
      this.logger.error('Customer already has a card request');
      throw new ConflictException(
        `Customer ${dto.customer.documentNumber} already has a card request`,
      );
    }
  }

  private async createCardRequest(dto: CardIssueDto): Promise<string> {
    const requestId = generateRequestId();

    const entity = new CardRequestEntity(
      requestId,
      dto.customer,
      dto.product,
      dto.forceError ?? false,
      'PENDING',
    );

    await this.repository.save(entity);

    return requestId;
  }

  private async publishCardRequestedEvent(
    requestId: string,
    dto: CardIssueDto,
  ) {
    const event: CloudEvent<CardRequestedData> = {
      id: nextEventId(),
      source: requestId,
      type: TOPICS.CARD_REQUESTED,
      data: {
        requestId,
        customer: dto.customer,
        product: dto.product,
        forceError: dto.forceError ?? false,
        attempt: 1,
        status: 'PENDING',
      },
    };

    await this.publisher.publish(TOPICS.CARD_REQUESTED, event);

    this.logger.info({ requestId }, 'Card issue request created');
  }

  private toResponse(requestId: string): IssueCardResult {
    return { requestId, status: 'PENDING' };
  }
}

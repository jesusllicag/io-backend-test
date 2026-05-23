import { CardRequestEntity } from './card-request.entity';

export const CARD_REQUEST_REPOSITORY = Symbol('CARD_REQUEST_REPOSITORY');

export interface CardRequestRepositoryPort {
  save(cardRequest: CardRequestEntity): Promise<void>;
  findByRequestId(requestId: string): Promise<CardRequestEntity | null>;
  findByDocumentNumber(documentNumber: string): Promise<CardRequestEntity | null>;
}

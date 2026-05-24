import { Card, CardStatusValue } from '@contracts/types/cloud-event.types';

export const CARD_REQUEST_REPOSITORY = Symbol('CARD_REQUEST_REPOSITORY');

export interface CardRequestUpdatePort {
  updateStatus(
    requestId: string,
    status: CardStatusValue,
    card?: Card,
    errorMessage?: string,
  ): Promise<void>;

  deleteByRequestId(requestId: string): Promise<void>;
}

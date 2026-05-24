import { CardRequestedData } from './card-requested.event';

export interface CardDlqData {
  requestId: string;
  attempts: number;
  reason: string;
  originalPayload: CardRequestedData;
  status: 'FAILED';
}

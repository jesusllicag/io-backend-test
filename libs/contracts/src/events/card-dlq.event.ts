import { CardRequestedData } from './card-requested.event';
import { ErrorDetails } from '../types/cloud-event.types';

export interface CardDlqData {
  requestId: string;
  attempts: number;
  reason: string;
  error: ErrorDetails;
  originalPayload: CardRequestedData;
  status: 'FAILED';
}

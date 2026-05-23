import { Customer, Product } from '../types/cloud-event.types';

export interface CardRequestedData {
  requestId: string;
  customer: Customer;
  product: Product;
  forceError: boolean;
  attempt: number;
  status: 'PENDING';
}

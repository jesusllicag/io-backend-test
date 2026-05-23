import {
  Card,
  Customer,
  ErrorDetails,
  Product,
} from '../types/cloud-event.types';

export interface CardIssuedData {
  requestId: string;
  card: Card;
  customer: Customer;
  product: Product;
  status: 'ISSUED';
  errors?: ErrorDetails[];
}

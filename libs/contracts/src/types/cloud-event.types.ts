export interface CloudEvent<T = unknown> {
  id: number;
  source: string;
  type: string;
  data: T;
  errors?: ErrorDetails[];
}

export interface CardStatus {
  PENDING: 'PENDING';
  ISSUED: 'ISSUED';
  FAILED: 'FAILED';
}

export type CardStatusValue = 'PENDING' | 'ISSUED' | 'FAILED';

export interface Customer {
  documentType: 'DNI';
  documentNumber: string;
  fullName: string;
  age: number;
  email: string;
}

export interface Product {
  type: 'VISA';
  currency: 'PEN' | 'USD';
}

export interface Card {
  id: string;
  number: string;
  expiryDate: string;
  cvv: string;
}

export interface ErrorDetails {
  message: string;
  attempt: number;
}

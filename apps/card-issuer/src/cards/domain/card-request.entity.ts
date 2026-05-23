import { Card, CardStatusValue, Customer, Product } from '@contracts/types/cloud-event.types';

export class CardRequestEntity {
  constructor(
    public readonly requestId: string,
    public readonly customer: Customer,
    public readonly product: Product,
    public readonly forceError: boolean,
    public status: CardStatusValue,
    public card?: Card,
    public errorMessage?: string,
    public readonly createdAt: string = new Date().toISOString(),
    public updatedAt: string = new Date().toISOString(),
  ) {}

  markAsIssued(card: Card): void {
    this.status = 'ISSUED';
    this.card = card;
    this.updatedAt = new Date().toISOString();
  }

  markAsFailed(reason: string): void {
    this.status = 'FAILED';
    this.errorMessage = reason;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      requestId: this.requestId,
      customer: this.customer,
      product: this.product,
      forceError: this.forceError,
      status: this.status,
      card: this.card,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

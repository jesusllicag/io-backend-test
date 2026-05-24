import { CardIssueSchema } from './card-issue.schema';

const validPayload = {
  customer: {
    documentType: 'DNI' as const,
    documentNumber: '12345678',
    fullName: 'John Doe',
    age: 25,
    email: 'john@example.com',
  },
  product: {
    type: 'VISA' as const,
    currency: 'PEN' as const,
  },
};

describe('CardIssueSchema', () => {
  describe('valid input', () => {
    it('accepts a valid payload', () => {
      const result = CardIssueSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults forceError to false when not provided', () => {
      const result = CardIssueSchema.safeParse(validPayload);
      expect(result.success && result.data.forceError).toBe(false);
    });

    it('accepts forceError: true', () => {
      const result = CardIssueSchema.safeParse({ ...validPayload, forceError: true });
      expect(result.success && result.data.forceError).toBe(true);
    });

    it('accepts USD currency', () => {
      const payload = { ...validPayload, product: { type: 'VISA' as const, currency: 'USD' as const } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid customer.documentType', () => {
    it('rejects non-DNI document type', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, documentType: 'PASSPORT' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid customer.documentNumber', () => {
    it('rejects document number shorter than 8 digits', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, documentNumber: '1234567' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects document number longer than 8 digits', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, documentNumber: '123456789' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects document number with non-digit characters', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, documentNumber: '1234567A' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid customer.fullName', () => {
    it('rejects single-character name', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, fullName: 'A' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid customer.age', () => {
    it('rejects age below 18', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, age: 17 } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects age above 120', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, age: 121 } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('accepts boundary age of 18', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, age: 18 } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects non-integer age', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, age: 25.5 } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid customer.email', () => {
    it('rejects invalid email format', () => {
      const payload = { ...validPayload, customer: { ...validPayload.customer, email: 'not-an-email' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid product', () => {
    it('rejects non-VISA product type', () => {
      const payload = { ...validPayload, product: { type: 'MASTERCARD', currency: 'PEN' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects unsupported currency', () => {
      const payload = { ...validPayload, product: { type: 'VISA', currency: 'EUR' } };
      const result = CardIssueSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('rejects empty object', () => {
      const result = CardIssueSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects missing customer', () => {
      const result = CardIssueSchema.safeParse({ product: validPayload.product });
      expect(result.success).toBe(false);
    });

    it('rejects missing product', () => {
      const result = CardIssueSchema.safeParse({ customer: validPayload.customer });
      expect(result.success).toBe(false);
    });
  });
});

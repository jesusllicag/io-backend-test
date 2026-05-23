import { z } from 'zod';

const CustomerSchema = z.object({
  documentType: z.literal('DNI'),
  documentNumber: z
    .string()
    .length(8, 'Document number must be 8 digits')
    .regex(/^\d{8}$/, 'Document number must contain only digits'),
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  age: z
    .number()
    .int()
    .min(18, 'Customer must be at least 18 years old')
    .max(120),
  email: z.string().email('Invalid email format'),
});

const ProductSchema = z.object({
  type: z.literal('VISA'),
  currency: z.enum(['PEN', 'USD']),
});

export const CardIssueSchema = z.object({
  customer: CustomerSchema,
  product: ProductSchema,
  forceError: z.boolean().optional().default(false),
});

export type CardIssueDto = z.infer<typeof CardIssueSchema>;

import { z } from 'zod';

export const createDealSchema = z.object({
  organizationId: z.string().uuid().optional(),
  leadId: z.string().uuid('Lead ID must be a valid UUID'),
  propertyUnitId: z.string().uuid('Property unit ID must be a valid UUID'),
  developerProjectId: z.string().uuid().optional(),
  closingBrokerId: z.string().uuid().optional().nullable(),
  agreementValue: z.number().positive('Agreement value must be positive').optional(),
  brokeragePercent: z.number().min(0.5).max(10).default(2.5),
  repSplitPercent: z.number().min(0).max(100).default(50),
  coBrokerName: z.string().optional().nullable(),
  coBrokerSharePercent: z.number().min(0).max(100).default(0),
  dealStatus: z.enum([
    'TOKEN_RECEIVED',
    'AGREEMENT_REGISTERED',
    'INVOICE_SENT',
    'PAYMENT_RECEIVED',
    'CANCELLED',
  ]).default('TOKEN_RECEIVED'),
  developerInvoiceNumber: z.string().optional().nullable(),
  notes: z.string().optional().default('Booked via physical site visit tour'),
});

export const updateDealStatusSchema = z.object({
  dealStatus: z.enum([
    'TOKEN_RECEIVED',
    'AGREEMENT_REGISTERED',
    'INVOICE_SENT',
    'PAYMENT_RECEIVED',
    'CANCELLED',
  ]),
  developerInvoiceNumber: z.string().optional().nullable(),
  paymentReceivedDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const simulateCommissionSchema = z.object({
  agreementValue: z.number().positive('Agreement value must be positive'),
  brokeragePercent: z.number().min(0.5).max(10).default(2.5),
  repSplitPercent: z.number().min(0).max(100).default(50),
  coBrokerSharePercent: z.number().min(0).max(100).default(0),
});

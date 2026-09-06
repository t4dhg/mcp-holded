import { z } from 'zod';
import { Amount, Id, NullableId, NullableString } from './shared.js';

/** Built from GET /payments (200 records) and GET /payments/{id}. Dot decimals. */
export const Payment = z.looseObject({
  id: Id,
  type: z.string(),
  bank_account_id: NullableId.optional(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  amount: Amount,
  description: NullableString.optional(),
  date: z.string(),
  status: z.string(),
  reconciliation_status: z.string().optional(),
  total_documents: Amount.optional(),
  total_transactions: Amount.optional(),
  total_advance: Amount.optional(),
  document_type: NullableString.optional(),
  document_id: NullableId.optional(),
});
export type Payment = z.infer<typeof Payment>;

/** GET /payment-methods. Note the camelCase keys, unlike the rest of v2. */
export const PaymentMethod = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: NullableString.optional(),
  isDefault: z.boolean().optional(),
  bankingAccountId: NullableId.optional(),
  dueDays: z.number().nullable().optional(),
  connectionId: NullableString.optional(),
});
export type PaymentMethod = z.infer<typeof PaymentMethod>;

import { z } from 'zod';
import { Amount, Id, NullableAmount, NullableId, NullableString } from './shared.js';

/** GET /treasury/accounts and /{id}. Dot decimals. */
export const TreasuryAccount = z.looseObject({
  id: Id,
  name: z.string(),
  type: z.string(),
  currency: z.string(),
  balance: Amount,
  iban: NullableString.optional(),
  bic: NullableString.optional(),
  account_number: NullableString.optional(),
  creditor_id: NullableString.optional(),
  issuer_id: NullableString.optional(),
  archived: z.boolean(),
  synced_at: NullableString.optional(),
  accounting_account_id: NullableId.optional(),
  accounting_account_number: z.number().nullable().optional(),
  institution_id: NullableString.optional(),
  institution_name: NullableString.optional(),
  transactions_pending_to_reconcile: z.number().optional(),
});
export type TreasuryAccount = z.infer<typeof TreasuryAccount>;

/** GET /treasury/accounts/{id}/bank-movements. */
export const BankMovement = z.looseObject({
  id: Id,
  banking_account_id: Id,
  description: NullableString.optional(),
  note: NullableString.optional(),
  amount: Amount,
  currency: z.string(),
  balance: NullableAmount.optional(),
  accounting_amount: NullableAmount.optional(),
  accounting_currency: NullableString.optional(),
  booking_date: NullableString.optional(),
  value_date: NullableString.optional(),
  status: z.string(),
  reconciled_amount: NullableAmount.optional(),
  origin: NullableString.optional(),
  flagged_at: NullableString.optional(),
});
export type BankMovement = z.infer<typeof BankMovement>;

/** GET /treasury/remittances: account has none; shape from the OpenAPI response. */
export const Remittance = z.looseObject({
  id: Id,
  type: z.string(),
  treasury_id: Id.optional(),
  description: NullableString.optional(),
  date: NullableString.optional(),
  mode: NullableString.optional(),
  iban: NullableString.optional(),
  swift: NullableString.optional(),
  creditor_id: NullableString.optional(),
  issuer_id: NullableString.optional(),
  total: Amount.optional(),
  status: z.string(),
});
export type Remittance = z.infer<typeof Remittance>;

/** GET /treasury/cashflow/invoicing-forecasts: undocumented response and no records; kept open. */
export const InvoicingForecast = z.looseObject({ id: Id.optional() });

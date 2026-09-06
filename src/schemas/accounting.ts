import { z } from 'zod';
import { Amount, Id, NullableAmount, NullableId, NullableString, StringList } from './shared.js';

/** GET /accounting-accounts. debit/credit/balance are movements for the requested date range. */
export const AccountingAccount = z.looseObject({
  id: Id,
  color: NullableString.optional(),
  number: z.number(),
  name: z.string(),
  description: NullableString.optional(),
  group: NullableString.optional(),
  debit: Amount.optional(),
  credit: Amount.optional(),
  balance: Amount.optional(),
  archived: z.boolean().optional(),
  non_deductible: z.boolean().optional(),
});
export type AccountingAccount = z.infer<typeof AccountingAccount>;

/** GET /ledger-entries. Note the DD/MM/YYYY date, unlike every other endpoint. */
export const LedgerEntry = z.looseObject({
  entry_number: z.number(),
  line: z.number(),
  date: z.string(),
  type: NullableString.optional(),
  description: NullableString.optional(),
  doc_description: NullableString.optional(),
  account: z.number(),
  debit: Amount,
  credit: Amount,
  tags: StringList.optional(),
  checked: z.boolean().optional(),
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

/** GET /expenses-accounts and /{id}. */
export const ExpensesAccount = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
  color: NullableString.optional(),
  account_num: z.number(),
  archived: z.boolean().optional(),
  non_deductible: z.boolean().optional(),
});
export type ExpensesAccount = z.infer<typeof ExpensesAccount>;

/** GET /sales-channels. */
export const SalesChannel = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
  color: NullableString.optional(),
  account_num: z.number(),
  archived: z.boolean().optional(),
});
export type SalesChannel = z.infer<typeof SalesChannel>;

/** GET /taxes. */
export const Tax = z.looseObject({
  id: Id,
  name: z.string(),
  amount: NullableAmount.optional(),
  scope: NullableString.optional(),
  key: z.string(),
  group: NullableString.optional(),
  type: NullableString.optional(),
  items: z.array(z.unknown()).optional(),
  status: z.boolean().optional(),
  visible: z.boolean().optional(),
  scheme: z.boolean().optional(),
});
export type Tax = z.infer<typeof Tax>;

/** GET /numbering-series/{type}. */
export const NumberingSeries = z.looseObject({
  id: Id,
  name: z.string(),
  format: z.string(),
  last: z.number(),
  type: z.string(),
  refund_numbering_series_id: NullableId.optional(),
  verifactu_excluded: z.boolean().optional(),
});
export type NumberingSeries = z.infer<typeof NumberingSeries>;

export const NUMBERING_SERIES_TYPES = [
  'invoice',
  'purchase',
  'estimate',
  'creditnote',
  'salesorder',
  'waybill',
  'salesreceipt',
  'purchaserefund',
] as const;

/** GET /tags returns `{ items: [{ name }] }`. */
export const Tag = z.looseObject({ name: z.string() });
export type Tag = z.infer<typeof Tag>;

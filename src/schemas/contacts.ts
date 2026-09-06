import { z } from 'zod';
import {
  Address,
  Amount,
  CustomField,
  Id,
  NullableId,
  NullableString,
  StringList,
} from './shared.js';

/** Built from GET /contacts and GET /contacts/{id} (identical field sets). */
export const ContactRecordRef = z.looseObject({
  num: z.number(),
  name: z.string(),
});

export const ContactDefaults = z.looseObject({
  sales_channel: NullableId.optional(),
  expenses_account: NullableId.optional(),
  due_days: z.number().nullable().optional(),
  payment_day: z.number().nullable().optional(),
  payment_method: NullableId.optional(),
  discount: z.union([z.number(), Amount]).nullable().optional(),
  language: NullableString.optional(),
  currency: NullableString.optional(),
  sales_tax: StringList.nullable().optional(),
  purchases_tax: StringList.nullable().optional(),
  numbering_series: NullableId.optional(),
});

export const Contact = z.looseObject({
  id: Id,
  custom_id: NullableString.optional(),
  name: z.string(),
  code: NullableString.optional(),
  vat_number: NullableString.optional(),
  trade_name: NullableString.optional(),
  is_person: z.boolean().optional(),
  email: NullableString.optional(),
  extra_emails: StringList.optional(),
  website: NullableString.optional(),
  mobile: NullableString.optional(),
  phone: NullableString.optional(),
  /** client, supplier, debtor, creditor, lead; null on some legacy contacts (seen live). */
  type: NullableString,
  iban: NullableString.optional(),
  swift: NullableString.optional(),
  sepa_ref: NullableString.optional(),
  group_id: NullableId.optional(),
  tags: StringList.optional(),
  created_at: NullableString.optional(),
  updated_at: NullableString.optional(),
  bill_address: Address.nullable().optional(),
  client_record: ContactRecordRef.nullable().optional(),
  supplier_record: ContactRecordRef.nullable().optional(),
  defaults: ContactDefaults.nullable().optional(),
  shipping_addresses: z.array(z.unknown()).optional(),
  notes: z.array(z.unknown()).optional(),
  contact_persons: z.array(z.unknown()).optional(),
  custom_fields: z.array(CustomField).optional(),
  social_networks: z.record(z.string(), z.unknown()).nullable().optional(),
  rate: z.unknown().optional(),
});
export type Contact = z.infer<typeof Contact>;

/** GET /contact-groups: account has none; shape from the OpenAPI ContactGroupApiDto. */
export const ContactGroup = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
  color: NullableString.optional(),
});
export type ContactGroup = z.infer<typeof ContactGroup>;

/** GET /contacts/{id}/attachments returns `{ items: string[] }` (filenames). */
export const ContactAttachments = z.looseObject({ items: z.array(z.string()) });

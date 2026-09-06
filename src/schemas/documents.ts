import { z } from 'zod';
import {
  Amount,
  CustomField,
  Id,
  NullableAmount,
  NullableId,
  NullableString,
  StringList,
} from './shared.js';

/**
 * One shape covers every sales and purchase document type. Built from real
 * invoices, purchases, credit notes, estimates, proformas, waybills, purchase
 * orders, purchase refunds and recurring invoices; nullability widened where the
 * OpenAPI DTOs for the empty types (sales orders, sales receipts, receipt
 * notes, purchase shipments) allow null.
 */
export const DocumentLine = z.looseObject({
  line_id: NullableId.optional(),
  name: z.string().nullable().optional(),
  type: NullableString.optional(),
  description: NullableString.optional(),
  price: NullableAmount.optional(),
  units: NullableAmount.optional(),
  discount: NullableAmount.optional(),
  tax: NullableString.optional(),
  taxes: z.array(z.unknown()).optional(),
  tags: StringList.optional(),
  product_id: NullableId.optional(),
  variant_id: NullableId.optional(),
  service_id: NullableId.optional(),
  sku: NullableString.optional(),
  weight: NullableAmount.optional(),
  cost_price: NullableAmount.optional(),
  account: NullableId.optional(),
  project_id: NullableId.optional(),
  retention: NullableAmount.optional(),
  unit_type: NullableString.optional(),
});

export const DocumentStatus = z.enum([
  'pending',
  'completed',
  'partial',
  'cancelled',
  'failed',
  'overdue',
  'outstanding',
]);

export const PaymentDetail = z.looseObject({
  id: Id,
  amount: Amount,
  date: z.string(),
  bank_id: NullableId.optional(),
});

/** Fields common to list and get responses. */
export const DocumentSummary = z.looseObject({
  id: Id,
  document_number: NullableString.optional(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  description: NullableString.optional(),
  date: NullableString.optional(),
  due_date: NullableString.optional(),
  subtotal: Amount,
  discount: Amount,
  total: Amount,
  tax: Amount,
  currency: z.string(),
  status: z.string(),
  tags: StringList.optional(),
  custom_fields: z.array(CustomField).optional(),
  draft: z.boolean().optional(),
  lines: z.array(DocumentLine),
  sii_status: z.unknown().optional(),
  verifactu_status: z.unknown().optional(),
  payment_method_id: NullableId.optional(),
  payments_total: NullableAmount.optional(),
  payments_pending: NullableAmount.optional(),
  deduction_date: NullableString.optional(),
  // recurring invoices
  periodicity: NullableString.optional(),
  convert_automatically: z.boolean().optional(),
  end_date: NullableString.optional(),
  next_invoice_scheduled_at: NullableString.optional(),
});
export type DocumentSummary = z.infer<typeof DocumentSummary>;

/** GET /{type}/{id} adds these on top of the summary. */
export const Document = DocumentSummary.extend({
  accounting_date: NullableString.optional(),
  approved_at: NullableString.optional(),
  body: NullableString.optional(),
  currency_change: NullableString.optional(),
  design_id: NullableId.optional(),
  forecast_date: NullableString.optional(),
  from: z.unknown().optional(),
  language: NullableString.optional(),
  multiple_due_dates: z.unknown().optional(),
  notes: NullableString.optional(),
  payments_detail: z.array(PaymentDetail).optional(),
  payments_refunds: NullableAmount.optional(),
  pipeline_id: NullableId.optional(),
  projects_summary: z.array(z.unknown()).optional(),
  shipping: z.unknown().optional(),
  shipping_data: z.unknown().optional(),
  warehouse_id: NullableId.optional(),
  show_total: z.unknown().optional(),
  tax_included: z.unknown().optional(),
  // waybills
  delivery_date: NullableString.optional(),
  pickup_date: NullableString.optional(),
  internal_notes: NullableString.optional(),
  tracking_key: NullableString.optional(),
  tracking_name: NullableString.optional(),
  tracking_number: NullableString.optional(),
  // recurring invoices
  contact_payment_day: z.number().nullable().optional(),
  due_days: z.number().nullable().optional(),
});
export type Document = z.infer<typeof Document>;

/**
 * GET /{type}/{id}/attachments. Built from a real purchase attachment: the
 * only field is `id`, of the form `<documentId>_<uuid>.<ext>`, which is also
 * the value to pass to GET /{type}/{id}/attachments/{attachmentId}.
 */
export const DocumentAttachment = z.looseObject({ id: z.string() });

/** GET /purchase-orders/{id}/received-items; account has none, kept open. */
export const ReceivedItem = z.looseObject({});

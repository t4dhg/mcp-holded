/**
 * Write contracts, taken from the Holded v2 OpenAPI document
 * (https://api.holded.com/openapi/api2.json, fetched 2026-09-06). Required
 * fields are enforced; every other documented field is typed and optional;
 * unknown keys are rejected so a typo does not silently vanish.
 */
import { z } from 'zod';

const Str = z.string();
const NStr = z.string().nullable();
const NNum = z.number().nullable();
const NBool = z.boolean().nullable();
const StrList = z.array(z.string());
const CustomFieldInput = z.strictObject({ field: Str, value: z.unknown() });

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------
export const AddressInput = z.strictObject({
  address: NStr.optional(),
  city: NStr.optional(),
  postal_code: NStr.optional(),
  province: NStr.optional(),
  country: NStr.optional(),
  country_code: NStr.optional(),
  info: NStr.optional(),
});

export const ContactDefaultsInput = z.strictObject({
  sales_channel: NStr.optional(),
  expenses_account: NStr.optional(),
  due_days: NNum.optional(),
  payment_day: NNum.optional(),
  payment_method: NStr.optional(),
  discount: NNum.optional(),
  language: NStr.optional(),
  currency: NStr.optional(),
  sales_tax: StrList.nullable().optional(),
  purchases_tax: StrList.nullable().optional(),
  numbering_series: NStr.optional(),
});

export const ContactInput = z.strictObject({
  name: Str,
  code: NStr.optional(),
  vat_number: NStr.optional(),
  trade_name: NStr.optional(),
  is_person: z.boolean().optional(),
  email: NStr.optional(),
  phone: NStr.optional(),
  mobile: NStr.optional(),
  website: NStr.optional(),
  type: z.enum(['client', 'debtor', 'supplier', 'creditor', 'lead']).nullable().optional(),
  client_record: NNum.optional(),
  supplier_record: NNum.optional(),
  iban: NStr.optional(),
  swift: NStr.optional(),
  sepa_ref: NStr.optional(),
  bill_address: AddressInput.optional(),
  tags: StrList.optional(),
  custom_fields: z.array(CustomFieldInput).optional(),
  defaults: ContactDefaultsInput.optional(),
  contact_persons: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ContactInput = z.infer<typeof ContactInput>;

export const ContactIdsInput = z.strictObject({ contact_ids: z.array(Str).min(1) });
export const ContactGroupInput = z.strictObject({
  name: Str,
  description: Str.optional(),
  color: Str.optional(),
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const DocumentLineInput = z.strictObject({
  name: Str,
  type: z.enum(['product', 'service', 'title']).nullable().optional(),
  description: NStr.optional(),
  product_id: NStr.optional(),
  service_id: NStr.optional(),
  units: NNum.optional(),
  price: NNum.optional(),
  discount: NNum.optional(),
  taxes: StrList.optional(),
  tags: StrList.optional(),
  sku: NStr.optional(),
  weight: NNum.optional(),
  cost_price: NNum.optional(),
  account: NStr.optional(),
  project_id: NStr.optional(),
  unit_type: NStr.optional(),
  retention: NNum.optional(),
});

export const DocumentInput = z.strictObject({
  contact_id: Str,
  contact_name: Str.optional(),
  description: NStr.optional(),
  date: Str.optional(),
  due_date: NStr.optional(),
  notes: NStr.optional(),
  body: NStr.optional(),
  language: NStr.optional(),
  currency: NStr.optional(),
  currency_change: NNum.optional(),
  items: z.array(DocumentLineInput).min(1),
  tags: StrList.optional(),
  custom_fields: z.array(CustomFieldInput).optional(),
  number: NStr.optional(),
  number_line_id: NStr.optional(),
  warehouse_id: NStr.optional(),
  sales_channel_id: NStr.optional(),
  discount: NNum.optional(),
  payment_method_id: NStr.optional(),
  design_id: NStr.optional(),
});
export type DocumentInput = z.infer<typeof DocumentInput>;

/** PUT bodies have no required fields, but Holded replaces the document with what is sent. */
export const DocumentUpdateInput = DocumentInput.partial();

export const RecurringInvoiceInput = DocumentInput.extend({
  periodicity: Str,
  convert_automatically: z.boolean().optional(),
  due_days: NNum.optional(),
  contact_payment_day: NNum.optional(),
  end_date: NStr.optional(),
});
export const RecurringInvoiceUpdateInput = RecurringInvoiceInput.partial();

export const DocumentPaymentInput = z.strictObject({
  amount: Str.nullable().optional(),
  treasury_id: NStr.optional(),
  date: Str.optional(),
  description: NStr.optional(),
});

export const SendInput = z.strictObject({
  emails: z.array(Str.email()).min(1),
  subject: NStr.optional(),
  message: NStr.optional(),
  mail_template_id: NStr.optional(),
  cc: z.array(Str.email()).optional(),
  bcc: z.array(Str.email()).optional(),
});

export const PipelineInput = z.strictObject({ pipeline_id: Str });
export const EstimateDecisionInput = z.strictObject({
  name: NStr.optional(),
  comment: NStr.optional(),
});
export const ReceiveInput = z.strictObject({
  items: z.array(z.strictObject({ line_id: Str, units: z.number() })).min(1),
  date: NStr.optional(),
  warehouse_id: NStr.optional(),
});
export const SkipInput = z.strictObject({ date: Str });
export const IdsInput = z.strictObject({ ids: z.array(Str).min(1) });
export const BulkApproveInput = z.strictObject({
  ids: z.array(Str).optional(),
  filter: z
    .strictObject({
      start_date: Str.optional(),
      end_date: Str.optional(),
      contact_id: Str.optional(),
    })
    .optional(),
});

export const CONVERTIBLE_TYPES = [
  'invoice',
  'creditnote',
  'estimate',
  'salesorder',
  'salesreceipt',
  'purchase',
  'order',
  'proform',
  'waybill',
] as const;
export const ConvertInput = z.strictObject({
  source_type: z.enum(CONVERTIBLE_TYPES),
  source_id: Str,
  target_type: z.enum(CONVERTIBLE_TYPES),
  date: NStr.optional(),
  due_date: NStr.optional(),
  number_line_id: NStr.optional(),
  description: NStr.optional(),
  notes: NStr.optional(),
  draft: NBool.optional(),
});

// ---------------------------------------------------------------------------
// Payments, treasury
// ---------------------------------------------------------------------------
export const PaymentInput = z.strictObject({
  type: z.enum(['payment', 'collection']),
  amount: Str,
  date: Str,
  bank_account_id: NStr.optional(),
  contact_id: NStr.optional(),
  description: NStr.optional(),
});
export const PaymentUpdateInput = PaymentInput.partial();

export const TreasuryAccountInput = z.strictObject({
  name: Str,
  type: z.enum(['bank', 'card', 'gateway', 'cash']),
  currency: Str.optional(),
  iban: NStr.optional(),
  bic: NStr.optional(),
  account_number: NStr.optional(),
  creditor_id: NStr.optional(),
  issuer_id: NStr.optional(),
});
export const TreasuryAccountUpdateInput = z.strictObject({
  name: Str,
  currency: Str,
  accounting_account_id: Str,
  auto_sync: z.boolean(),
  iban: NStr.optional(),
  bic: NStr.optional(),
  creditor_id: NStr.optional(),
  issuer_id: NStr.optional(),
  default_account: z.boolean().optional(),
});
const BankMovementInput = z.strictObject({
  amount: Str,
  description: Str,
  balance: Str,
  value_date: NStr.optional(),
});
export const BankMovementsInput = z.union([
  BankMovementInput,
  z.array(BankMovementInput).min(1).max(100),
]);
export const ReconcileInput = z.strictObject({
  documents: z
    .array(
      z.strictObject({
        document_id: Str,
        document_type: z.enum([
          'invoice',
          'salesreceipt',
          'purchase',
          'creditnote',
          'purchaserefund',
          'payroll',
          'payment',
          'remittance',
          'purchasereceipt',
          'collection',
          'receipt',
          'entry',
        ]),
      })
    )
    .min(1),
});
export const InvoicingForecastInput = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// Accounting
// ---------------------------------------------------------------------------
export const LedgerEntryInput = z.strictObject({
  date: Str,
  notes: NStr.optional(),
  contact_id: NStr.optional(),
  lines: z
    .array(
      z.strictObject({
        account: z.number().int(),
        description: NStr.optional(),
        debit: Str,
        credit: Str,
        tags: StrList.optional(),
      })
    )
    .min(2),
});
export const AccountingAccountInput = z.strictObject({
  prefix: z.number().int(),
  number: NNum.optional(),
  name: Str,
  description: NStr.optional(),
  color: NStr.optional(),
});
export const ExpensesAccountInput = z.strictObject({
  name: Str,
  account_num: z.number().int(),
  color: NStr.optional(),
});
export const ExpensesAccountUpdateInput = z.strictObject({ name: Str, color: NStr.optional() });
export const SalesChannelInput = ExpensesAccountInput;
export const SalesChannelUpdateInput = ExpensesAccountUpdateInput;
export const NumberingSeriesInput = z.strictObject({
  name: Str,
  format: Str,
  last: z.number().int().optional(),
  refund_numbering_series_id: NStr.optional(),
  verifactu_excluded: z.boolean().optional(),
});
export const TagInput = z.strictObject({ name: Str });

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export const ProductInput = z.strictObject({
  name: Str,
  kind: z.enum(['simple', 'lots', 'pack', 'variants', 'serialnumbers']),
  description: NStr.optional(),
  sku: NStr.optional(),
  barcode: NStr.optional(),
  price: NStr.optional(),
  cost: NStr.optional(),
  purchase_price: NStr.optional(),
  tags: StrList.optional(),
  taxes: StrList.optional(),
  stock: NNum.optional(),
  weight: NNum.optional(),
  has_stock: z.boolean(),
  for_sale: z.boolean(),
  for_purchase: z.boolean(),
  variants: z.array(z.record(z.string(), z.unknown())).optional(),
  pack_items: z.array(z.strictObject({ product_selection: Str, units: z.number() })).optional(),
});
export const ProductUpdateInput = z.strictObject({
  name: Str,
  description: NStr.optional(),
  sku: NStr.optional(),
  barcode: NStr.optional(),
  price: NStr.optional(),
  cost: NStr.optional(),
  purchase_price: NStr.optional(),
  weight: NNum.optional(),
  tags: StrList.optional(),
  taxes: StrList.optional(),
  for_sale: z.boolean(),
  for_purchase: z.boolean(),
  archived: z.boolean(),
  variants: z.array(z.record(z.string(), z.unknown())).optional(),
  pack_items: z.array(z.strictObject({ product_selection: Str, units: z.number() })).optional(),
  show_start_date: NBool.optional(),
  show_end_date: NBool.optional(),
});
export const StockUpdateInput = z.strictObject({
  warehouse_id: Str,
  variant_id: NStr.optional(),
  stock_variation: z.number(),
  description: NStr.optional(),
});
export const ServiceInput = z.strictObject({
  name: Str,
  description: NStr.optional(),
  price: z.number().optional(),
  cost: NNum.optional(),
  tax: NNum.optional(),
  taxes: StrList.optional(),
  tags: StrList.optional(),
  sales_channel_id: NStr.optional(),
  code: NStr.optional(),
  color: NStr.optional(),
  duration: NNum.optional(),
});
export const WarehouseInput = z.strictObject({
  name: Str,
  email: NStr.optional(),
  phone: NStr.optional(),
  mobile: NStr.optional(),
  default: z.boolean().optional(),
  address: AddressInput.optional(),
});
export const PriceListInput = z.strictObject({ name: Str, description: NStr.optional() });
export const ProductionOrderInput = z
  .object({
    manufactured_product: z.object({ product_id: Str, name: Str }).catchall(z.unknown()),
  })
  .catchall(z.unknown());
export const ProductionOrderUpdateInput = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export const EmployeeInput = z.strictObject({
  name: Str,
  last_name: Str,
  email: Str.email(),
  workplace_id: NStr.optional(),
  phone: NStr.optional(),
  mobile: NStr.optional(),
  date_of_birth: NStr.optional(),
  gender: NStr.optional(),
  main_language: NStr.optional(),
  nationality: NStr.optional(),
  code: NStr.optional(),
  social_security_number: NStr.optional(),
  iban: NStr.optional(),
  reporting_to: NStr.optional(),
  team_ids: StrList.optional(),
});
export const PayslipPaymentInput = z.strictObject({
  amount: NStr.optional(),
  date: NStr.optional(),
  bank_account_id: NStr.optional(),
});

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
export const FunnelInput = z.strictObject({ name: Str });
export const LeadInput = z.strictObject({
  funnel_id: Str,
  contact_id: Str,
  name: Str,
  stage_id: NStr.optional(),
  value: NNum.optional(),
  potential: NNum.optional(),
  due_date: NStr.optional(),
  custom_fields: z.array(z.record(z.string(), z.unknown())).optional(),
});
export const LeadUpdateInput = LeadInput.partial().extend({
  status: z.enum(['open', 'won', 'lost']).optional(),
});
export const LeadStageInput = z.strictObject({ stage_id: Str });
export const LeadDatesInput = z.strictObject({ due_date: Str });
export const LeadNoteInput = z.strictObject({ title: Str, description: Str });
export const LeadNoteUpdateInput = z.strictObject({
  note_id: Str,
  title: NStr.optional(),
  description: NStr.optional(),
});
export const LeadTaskInput = z.strictObject({ name: Str });
export const LeadTaskUpdateInput = z.strictObject({ task_id: Str, name: Str });
export const LeadTaskDeleteInput = z.strictObject({ task_id: Str });

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const ProjectInput = z.strictObject({
  name: Str,
  description: NStr.optional(),
  due_date: NStr.optional(),
  contact_id: NStr.optional(),
});
export const ProjectUpdateInput = ProjectInput.partial().extend({
  status: NNum.optional(),
  start_date: NStr.optional(),
  billable: NBool.optional(),
  tags: StrList.optional(),
  allow_notifications: NBool.optional(),
  lists: z.array(z.record(z.string(), z.unknown())).optional(),
});
export const TaskInput = z.strictObject({
  project_id: Str,
  name: Str,
  description: NStr.optional(),
  due_date: NStr.optional(),
  priority: NNum.optional(),
  status: NStr.optional(),
  assigned_to: StrList.optional(),
});
export const TaskUpdateInput = TaskInput.partial();
export const ProjectTimeInput = z.strictObject({
  duration: z.number().int(),
  user_id: Str.optional(),
  description: NStr.optional(),
  date: NStr.optional(),
  task_id: NStr.optional(),
  cost_per_hour: NStr.optional(),
  category: NStr.optional(),
});
export const ProjectTimeUpdateInput = ProjectTimeInput.partial();

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------
export const EventInput = z.strictObject({
  name: Str,
  user_id: NStr.optional(),
  contact_id: NStr.optional(),
  contact_name: NStr.optional(),
  kind: NStr.optional(),
  description: NStr.optional(),
  start_date: Str,
  end_date: NStr.optional(),
  duration: NNum.optional(),
  status: NNum.optional(),
  tags: StrList.optional(),
  lead_id: NStr.optional(),
  location: NStr.optional(),
  participants: z.array(z.strictObject({ email: Str.email(), name: NStr.optional() })).optional(),
});
export const EventUpdateInput = EventInput.partial();
export const BookingInput = z.strictObject({
  location_id: Str,
  service_id: Str,
  date_time: Str,
  language: Str,
  custom_fields: z.array(z.strictObject({ key: Str, value: NStr })).optional(),
});
export const BookingUpdateInput = z.strictObject({
  date_time: NStr.optional(),
  custom_fields: z.array(z.strictObject({ key: Str, value: NStr })).optional(),
});

// ---------------------------------------------------------------------------
// Inbox, webhooks
// ---------------------------------------------------------------------------
export const InboxAttachInput = z.strictObject({
  documentId: Str,
  documentType: z.enum(['purchase', 'order', 'purchaserefund', 'receipt']),
});
export const InboxUpdateInput = z.record(z.string(), z.unknown());
export const WebhookInput = z.strictObject({
  url: Str.url(),
  events: z.array(Str).min(1),
  version: NStr.optional(),
  description: Str.optional(),
});
export const WebhookUpdateInput = z.strictObject({
  url: Str.url(),
  events: z.array(Str).min(1),
  description: Str.optional(),
});

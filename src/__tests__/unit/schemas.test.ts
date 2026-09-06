import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as S from '../../schemas/index.js';
import { pageSchema } from '../../pagination.js';
import { fixture, fixtureNames } from './helpers.js';

/**
 * Every fixture is a real Holded v2 response, anonymised. Each one must parse
 * with the schema its API function uses. A fixture with no entry here fails the
 * "every fixture is covered" test below.
 */
const LIST: Record<string, z.ZodTypeAny> = {
  contacts: S.Contact,
  'contacts-search': S.Contact,
  'contact-groups': S.ContactGroup,
  invoices: S.DocumentSummary,
  'invoices-find-by-number': S.DocumentSummary,
  'invoice-attachments': S.DocumentAttachment,
  'purchase-attachments': S.DocumentAttachment,
  purchases: S.DocumentSummary,
  'credit-notes': S.DocumentSummary,
  estimates: S.DocumentSummary,
  proformas: S.DocumentSummary,
  waybills: S.DocumentSummary,
  'sales-orders': S.DocumentSummary,
  'sales-receipts': S.DocumentSummary,
  'receipt-notes': S.DocumentSummary,
  'purchase-orders': S.DocumentSummary,
  'purchase-refunds': S.DocumentSummary,
  'purchase-shipments': S.DocumentSummary,
  'recurring-invoices': S.DocumentSummary,
  payments: S.Payment,
  'payment-methods': S.PaymentMethod,
  'numbering-series-invoice': S.NumberingSeries,
  'numbering-series-empty': S.NumberingSeries,
  'treasury-accounts': S.TreasuryAccount,
  'bank-movements': S.BankMovement,
  remittances: S.Remittance,
  'invoicing-forecasts': S.InvoicingForecast,
  taxes: S.Tax,
  'expenses-accounts': S.ExpensesAccount,
  'accounting-accounts': S.AccountingAccount,
  'ledger-entries': S.LedgerEntry,
  'sales-channels': S.SalesChannel,
  tags: S.Tag,
  products: S.Product,
  services: S.Service,
  warehouses: S.Warehouse,
  'warehouse-stock': S.WarehouseStockLine,
  'price-lists': S.PriceList,
  'production-orders': S.ProductionOrder,
  employees: S.Employee,
  'employee-times': S.EmployeeTime,
  'salary-records': S.SalaryRecord,
  payslips: S.Payslip,
  funnels: S.Funnel,
  leads: S.Lead,
  projects: S.Project,
  tasks: S.Task,
  'project-times': S.ProjectTime,
  events: S.CalendarEvent,
  bookings: S.Booking,
  'booking-locations': S.BookingLocation,
  inbox: S.InboxDocument,
  webhooks: S.Webhook,
};

const SINGLE: Record<string, z.ZodTypeAny> = {
  contact: S.Contact,
  'contact-attachments': S.ContactAttachments,
  invoice: S.Document,
  'invoice-paid': S.Document,
  purchase: S.Document,
  'credit-note': S.Document,
  estimate: S.Document,
  proforma: S.Document,
  waybill: S.Document,
  'purchase-order': S.Document,
  'purchase-refund': S.Document,
  'recurring-invoice': S.Document,
  'treasury-account': S.TreasuryAccount,
  'product-stock': S.ProductStock,
  'webhook-events': S.WebhookEvents,
  usage: S.Usage,
};

const ERRORS = ['error-400', 'error-403', 'error-404', 'error-404-route'];

describe('response schemas against real fixtures', () => {
  for (const [name, item] of Object.entries(LIST)) {
    it(`parses list fixture ${name}`, () => {
      const result = pageSchema(item).safeParse(fixture(name));
      expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
    });
  }

  for (const [name, schema] of Object.entries(SINGLE)) {
    it(`parses record fixture ${name}`, () => {
      const result = schema.safeParse(fixture(name));
      expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
    });
  }

  it('covers every fixture file', () => {
    const covered = new Set([...Object.keys(LIST), ...Object.keys(SINGLE), ...ERRORS]);
    expect(fixtureNames().filter(f => !covered.has(f))).toEqual([]);
  });

  it('keeps the paid invoice payments_detail typed', () => {
    const doc = S.Document.parse(fixture('invoice-paid'));
    expect(doc.payments_detail?.[0]?.amount).toMatch(/^\d+,\d{2}$/);
  });

  it('rejects a document whose total is not a decimal string', () => {
    const doc = fixture<{ items: Record<string, unknown>[] }>('invoices').items[0]!;
    expect(S.DocumentSummary.safeParse({ ...doc, total: 12.5 }).success).toBe(false);
    expect(S.DocumentSummary.safeParse({ ...doc, total: 'abc' }).success).toBe(false);
  });

  it('accepts both comma and dot decimals', () => {
    expect(S.Amount.safeParse('63500,00').success).toBe(true);
    expect(S.Amount.safeParse('-1495.56').success).toBe(true);
    expect(S.Amount.safeParse('8.3').success).toBe(true);
    expect(S.Amount.safeParse('1,000.00').success).toBe(false);
  });

  it('accepts a contact with a null type, as seen live on legacy contacts', () => {
    const contact = fixture<{ items: Record<string, unknown>[] }>('contacts').items[0]!;
    expect(S.Contact.safeParse({ ...contact, type: null }).success).toBe(true);
  });

  it('keeps unknown fields (loose objects) so new API fields do not break parsing', () => {
    const contact = fixture<{ items: Record<string, unknown>[] }>('contacts').items[0]!;
    const parsed = S.Contact.parse({ ...contact, brand_new_field: 1 });
    expect((parsed as Record<string, unknown>).brand_new_field).toBe(1);
  });
});

describe('write input contracts', () => {
  it('requires contact_id and at least one item on a document', () => {
    expect(S.inputs.DocumentInput.safeParse({ contact_id: 'abc', items: [] }).success).toBe(false);
    expect(
      S.inputs.DocumentInput.safeParse({ contact_id: 'abc', items: [{ name: 'Line', price: 10 }] })
        .success
    ).toBe(true);
  });

  it('rejects unknown keys so typos surface', () => {
    const r = S.inputs.ContactInput.safeParse({ name: 'X', emial: 'a@b.c' });
    expect(r.success).toBe(false);
  });

  it('requires a balanced-looking ledger entry with two or more lines', () => {
    expect(
      S.inputs.LedgerEntryInput.safeParse({
        date: '2026-09-01',
        lines: [{ account: 43000001, debit: '10.00', credit: '0.00' }],
      }).success
    ).toBe(false);
  });

  it('accepts a single movement or an array of up to 100 movements', () => {
    const one = { amount: '-1.00', description: 'x', balance: '9.00' };
    expect(S.inputs.BankMovementsInput.safeParse(one).success).toBe(true);
    expect(S.inputs.BankMovementsInput.safeParse([one, one]).success).toBe(true);
    expect(S.inputs.BankMovementsInput.safeParse(Array(101).fill(one)).success).toBe(false);
  });
});

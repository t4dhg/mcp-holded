import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from '../../api/index.js';
import { SchemaValidationError } from '../../errors.js';
import { fixture, setEnv, stubFetch } from './helpers.js';

const url = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  String(fetchMock.mock.calls[call]![0]);
const method = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  (fetchMock.mock.calls[call]![1] as RequestInit).method;

describe('api layer', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('lists contacts with exact-match filters and returns a normalised page', async () => {
    const fetchMock = stubFetch({ body: fixture('contacts') });
    const page = await api.listContacts({ limit: 3, email: 'user3@example.com' });
    expect(url(fetchMock)).toContain('/contacts?limit=3&email=user3%40example.com');
    expect(page.items).toHaveLength(3);
    expect(page.has_more).toBe(true);
    expect(page.cursor).toBe(page.items[2]!.id);
  });

  it('searches contacts through /contacts/search?name=', async () => {
    const fetchMock = stubFetch({ body: fixture('contacts-search') });
    await api.searchContacts('bella');
    expect(url(fetchMock)).toContain('/contacts/search?name=bella');
  });

  it('creates a contact then re-reads it', async () => {
    const contact = fixture('contact');
    const fetchMock = stubFetch({ status: 201, body: { id: 'abc' } }, { body: contact });
    const created = await api.createContact({ name: 'Example' });
    expect(method(fetchMock, 0)).toBe('POST');
    expect(url(fetchMock, 1)).toContain('/contacts/abc');
    expect(created.name).toBe((contact as { name: string }).name);
  });

  it('throws SchemaValidationError when a response does not match', async () => {
    stubFetch({ body: { items: [{ id: 1, name: 2 }] } });
    await expect(api.listContacts()).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('normalises unpaginated configuration lists', async () => {
    stubFetch({ body: fixture('taxes') });
    const page = await api.listTaxes();
    expect(page.cursor).toBeNull();
    expect(page.has_more).toBe(false);
    expect(page.items.length).toBe(3);
  });

  it('maps document types to their v2 paths', () => {
    expect(api.documentPath('invoice')).toBe('/invoices');
    expect(api.documentPath('credit_note')).toBe('/credit-notes');
    expect(api.documentPath('purchase_refund')).toBe('/purchase-refunds');
    expect(api.documentPath('recurring_invoice')).toBe('/recurring-invoices');
  });

  it('refuses operations Holded does not offer for a document type, before any request', async () => {
    const fetchMock = stubFetch({ body: {} });
    await expect(api.listDocumentAttachments('purchase_refund', 'abc')).rejects.toThrow(
      /does not offer "attachments" for purchase refund/
    );
    await expect(api.getDocumentPdf('purchase', 'abc')).rejects.toThrow(/does not offer "pdf"/);
    await expect(
      api.sendDocument('purchase', 'abc', { emails: ['a@example.com'] })
    ).rejects.toThrow(/does not offer "send"/);
    await expect(api.recordDocumentPayment('estimate', 'abc', {})).rejects.toThrow(/"payments"/);
    await expect(api.approveDocument('recurring_invoice', 'abc')).rejects.toThrow(/"approve"/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(() => api.assertSupported('invoice', 'cancel')).not.toThrow();
    expect(() => api.assertSupported('credit_note', 'payments')).not.toThrow();
  });

  it('reads a purchase refund under /purchases/refund/{id}', async () => {
    const fetchMock = stubFetch({ body: fixture('purchase-refund') });
    await api.getDocument('purchase_refund', 'abc');
    expect(url(fetchMock)).toContain('/purchases/refund/abc');
  });

  it('lists invoices with the documented filters', async () => {
    const fetchMock = stubFetch({ body: fixture('invoices') });
    await api.listDocuments('invoice', {
      status: 'pending',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      sort: '-date',
      contact_id: 'c1',
    });
    const u = url(fetchMock);
    for (const part of [
      'status=pending',
      'start_date=2026-01-01',
      'end_date=2026-03-31',
      'sort=-date',
      'contact_id=c1',
    ]) {
      expect(u).toContain(part);
    }
  });

  it('deletes documents with DELETE and bulk-deletes invoices with a body', async () => {
    const fetchMock = stubFetch({ status: 204 }, { status: 200, body: {} });
    await api.deleteDocument('invoice', 'abc');
    expect(method(fetchMock, 0)).toBe('DELETE');
    await api.bulkDeleteInvoices(['a', 'b']);
    expect(method(fetchMock, 1)).toBe('DELETE');
    expect((fetchMock.mock.calls[1]![1] as RequestInit).body).toBe('{"ids":["a","b"]}');
  });

  it('records a payment against an invoice', async () => {
    const fetchMock = stubFetch({ body: { id: 'p1' } });
    await api.recordDocumentPayment('invoice', 'inv1', { amount: '10,00', date: '2026-09-01' });
    expect(url(fetchMock)).toContain('/invoices/inv1/payments');
    expect(method(fetchMock)).toBe('POST');
  });

  it('parses payments, treasury accounts and bank movements', async () => {
    stubFetch({ body: fixture('payments') });
    const payments = await api.listPayments({ start_date: '2026-09-01' });
    expect(payments.items[0]!.amount).toMatch(/^-?\d+(\.\d+)?$/);

    stubFetch({ body: fixture('treasury-accounts') });
    const accounts = await api.listTreasuryAccounts({ type: 'bank' });
    expect(accounts.items.length).toBeGreaterThan(0);

    const fetchMock = stubFetch({ body: fixture('bank-movements') });
    const movements = await api.listBankMovements('acc1', { start_date: '2026-09-01' });
    expect(url(fetchMock)).toContain(
      '/treasury/accounts/acc1/bank-movements?start_date=2026-09-01'
    );
    expect(movements.items[0]!.status).toBeDefined();
  });

  it('parses the chart of accounts with balances and ledger entries', async () => {
    stubFetch({ body: fixture('accounting-accounts') });
    const accounts = await api.listAccountingAccounts({
      start_date: '2026-01-01',
      end_date: '2026-09-06',
    });
    expect(accounts.items[0]!.balance).toBeDefined();

    const fetchMock = stubFetch({ body: fixture('ledger-entries') });
    const ledger = await api.listLedgerEntries({
      start_date: '2026-09-01',
      end_date: '2026-09-06',
    });
    expect(url(fetchMock)).toContain('start_date=2026-09-01&end_date=2026-09-06');
    expect(ledger.items[0]!.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('lists numbering series per document type', async () => {
    const fetchMock = stubFetch({ body: fixture('numbering-series-invoice') });
    const page = await api.listNumberingSeries('invoice');
    expect(url(fetchMock)).toContain('/numbering-series/invoice');
    expect(page.items[0]!.format).toBeDefined();
  });

  it('updates a warehouse with PATCH and a product with PUT', async () => {
    const fetchMock = stubFetch({ body: {} }, { body: fixture('warehouses').items[0] });
    await api.updateWarehouse('w1', { name: 'Main' });
    expect(method(fetchMock, 0)).toBe('PATCH');

    const fetchMock2 = stubFetch({ body: {} }, { body: fixture('products').items[0] });
    await api.updateProduct('p1', {
      name: 'X',
      for_sale: true,
      for_purchase: false,
      archived: false,
    });
    expect(method(fetchMock2, 0)).toBe('PUT');
  });

  it('uploads attachments as multipart form data', async () => {
    const fetchMock = stubFetch({ body: { ok: true } });
    await api.attachContactFile('c1', new Uint8Array([1, 2, 3]), 'note.pdf', 'application/pdf');
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    const file = (init.body as FormData).get('file') as File;
    expect(file.name).toBe('note.pdf');
  });

  it('reads employee, salary record, inbox and usage fixtures', async () => {
    stubFetch({ body: fixture('employees') });
    expect((await api.listEmployees({ search: 'x' })).items.length).toBe(2);
    stubFetch({ body: fixture('salary-records') });
    expect((await api.listSalaryRecords()).items[0]!.total_payable).toMatch(/,/);
    stubFetch({ body: fixture('inbox') });
    expect((await api.listInbox()).items[0]!.status).toBeDefined();
    stubFetch({ body: fixture('usage') });
    expect((await api.getUsage()).limit).toBeGreaterThan(0);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseAmount,
  formatAmount,
  previousMonth,
  previousQuarter,
  resolveWindow,
  today,
  toolCall,
  userMessage,
  preRead,
} from '../../prompts/shared.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';
import { setEnv, stubFetch } from './helpers.js';
import { buildAgeingReport } from '../../prompts/receivables.js';

async function connectedClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

function promptText(result: { messages: { content: { text?: string } }[] }): string {
  return result.messages.map(m => m.content.text ?? '').join('\n');
}

describe('prompt helpers', () => {
  it('parses both decimal conventions without losing cents', () => {
    expect(parseAmount('63500,00')).toBe(63500);
    expect(parseAmount('8.3')).toBe(8.3);
    expect(parseAmount('-1.234,56')).toBeCloseTo(-1234.56, 2);
    expect(parseAmount('0.00')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it('formats a total to two decimals with a currency', () => {
    expect(formatAmount(1234.5, 'EUR')).toBe('1234.50 EUR');
    expect(formatAmount(0)).toBe('0.00');
  });

  it('resolves the previous calendar month, including across a year boundary', () => {
    expect(previousMonth('2026-09-07')).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(previousMonth('2026-01-15')).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(previousMonth('2026-03-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('resolves the previous calendar quarter', () => {
    expect(previousQuarter('2026-09-07')).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(previousQuarter('2026-02-01')).toEqual({ start: '2025-10-01', end: '2025-12-31' });
  });

  it('prefers explicit window arguments over the fallback', () => {
    const fallback = { start: '2026-08-01', end: '2026-08-31' };
    expect(resolveWindow('2026-01-01', '2026-01-31', fallback)).toEqual({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    });
    expect(resolveWindow(undefined, undefined, fallback)).toEqual({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
    });
  });

  it('renders a copy-pasteable tool call', () => {
    expect(toolCall('holded_sales', { action: 'list', type: 'invoice' })).toBe(
      "holded_sales({ action: 'list', type: 'invoice' })"
    );
    expect(toolCall('holded_treasury', { action: 'reconcile', confirm: true })).toBe(
      "holded_treasury({ action: 'reconcile', confirm: true })"
    );
  });

  it('builds a single user message from lines', () => {
    const result = userMessage(['first', 'second']);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    expect(result.messages[0]!.content.text).toBe('first\nsecond');
  });

  it('reads today from the injected clock', () => {
    expect(today({ now: () => new Date('2026-09-07T10:30:00Z') })).toBe('2026-09-07');
  });

  it('reports a failed pre-read instead of throwing', async () => {
    const failed = await preRead('the invoices', async () => {
      throw new Error('403 Access denied');
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.message).toContain('the invoices');
      expect(failed.message).toContain('403 Access denied');
    }
  });

  it('returns the value on a successful pre-read', async () => {
    const ok = await preRead('the invoices', async () => [1, 2, 3]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toEqual([1, 2, 3]);
  });
});

describe('holded_aged_receivables', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  const docs = [
    {
      id: '1',
      document_number: 'F-001',
      contact_id: 'c1',
      contact_name: 'Acme SL',
      date: '2026-05-01',
      due_date: '2026-05-31',
      subtotal: '1000,00',
      discount: '0,00',
      total: '1210,00',
      tax: '210,00',
      currency: 'EUR',
      status: 'pending',
      payments_pending: '1210,00',
      lines: [],
    },
    {
      id: '2',
      document_number: 'F-002',
      contact_id: 'c1',
      contact_name: 'Acme SL',
      date: '2026-08-20',
      due_date: '2026-09-20',
      subtotal: '500,00',
      discount: '0,00',
      total: '605,00',
      tax: '105,00',
      currency: 'EUR',
      status: 'pending',
      payments_pending: '605,00',
      lines: [],
    },
    {
      id: '3',
      document_number: 'F-003',
      contact_id: 'c2',
      contact_name: 'Beta SA',
      date: '2026-07-15',
      due_date: '2026-08-15',
      subtotal: '200,00',
      discount: '0,00',
      total: '242,00',
      tax: '42,00',
      currency: 'EUR',
      status: 'pending',
      payments_pending: '121,00',
      lines: [],
    },
  ];

  it('buckets by days overdue and totals the oldest bucket first', () => {
    const report = buildAgeingReport(docs, '2026-09-07');
    // F-001 due 2026-05-31 is 99 days late, F-003 due 2026-08-15 is 23 days late,
    // F-002 due 2026-09-20 is not yet due.
    expect(report).toMatch(/Over 90 days/);
    expect(report).toMatch(/1210\.00/);
    expect(report).toMatch(/Not yet due/);
    expect(report).toMatch(/605\.00/);
    // Only the unpaid remainder of F-003 counts, not its total.
    expect(report).toMatch(/121\.00/);
    expect(report).not.toMatch(/242\.00/);
  });

  it('orders contacts by outstanding amount, worst first', () => {
    const report = buildAgeingReport(docs, '2026-09-07');
    expect(report.indexOf('Acme SL')).toBeLessThan(report.indexOf('Beta SA'));
  });

  it('says so when nothing is outstanding', () => {
    expect(buildAgeingReport([], '2026-09-07')).toMatch(/Nothing outstanding/i);
  });

  it('does not resurrect a fully paid invoice at its total', () => {
    const paid = [
      {
        id: '4',
        document_number: 'F-004',
        contact_id: 'c3',
        contact_name: 'Gamma SL',
        date: '2026-01-01',
        due_date: '2026-01-31',
        subtotal: '500,00',
        discount: '0,00',
        total: '605,00',
        tax: '105,00',
        currency: 'EUR',
        status: 'paid',
        payments_pending: '0,00',
        lines: [],
      },
    ];
    const report = buildAgeingReport(paid, '2026-09-07');
    expect(report).toMatch(/Nothing outstanding/i);
    expect(report).not.toMatch(/605\.00/);
  });

  it('is registered and returns a read-only report', async () => {
    stubFetch({ body: { items: docs, cursor: null, has_more: false } });
    const client = await connectedClient();
    const { prompts } = await client.listPrompts();
    expect(prompts.map(p => p.name)).toContain('holded_aged_receivables');
    const result = await client.getPrompt({
      name: 'holded_aged_receivables',
      arguments: { as_of: '2026-09-07' },
    });
    const body = promptText(result);
    expect(body).toMatch(/Acme SL/);
    expect(body).toMatch(/written nothing/i);
  });

  it('reports a failed read rather than throwing', async () => {
    stubFetch({ status: 403, body: { title: 'Access denied', status: 403 } });
    const client = await connectedClient();
    const result = await client.getPrompt({
      name: 'holded_aged_receivables',
      arguments: { as_of: '2026-09-07' },
    });
    expect(promptText(result)).toMatch(/Could not read/i);
  });
});

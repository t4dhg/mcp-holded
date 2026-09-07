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
import { summariseByTaxKey } from '../../prompts/vat.js';

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

describe('holded_vat_summary', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  const invoices = [
    {
      id: '1',
      contact_name: 'Acme SL',
      date: '2026-04-10',
      subtotal: '1000,00',
      discount: '0,00',
      total: '1210,00',
      tax: '210,00',
      currency: 'EUR',
      status: 'paid',
      lines: [{ name: 'Licence', price: '1000,00', units: '1', taxes: ['s_iva0'] }],
    },
    {
      id: '2',
      contact_name: 'Beta SA',
      date: '2026-05-02',
      subtotal: '200,00',
      discount: '0,00',
      total: '220,00',
      tax: '20,00',
      currency: 'EUR',
      status: 'paid',
      lines: [{ name: 'Books', price: '200,00', units: '1', taxes: ['s_nos'] }],
    },
    {
      id: '3',
      contact_name: 'Acme SL',
      date: '2026-06-20',
      subtotal: '500,00',
      discount: '0,00',
      total: '605,00',
      tax: '105,00',
      currency: 'EUR',
      status: 'paid',
      lines: [{ name: 'Support', price: '500,00', units: '1', taxes: ['s_iva0'] }],
    },
  ];

  const RATES = new Map<string, number>([
    ['s_iva0', 21],
    ['s_nos', 10],
  ]);

  it('groups base and quota by tax key using the account rates', () => {
    const rows = summariseByTaxKey(invoices, RATES);
    const first = rows.find(r => r.key === 's_iva0');
    expect(first?.base).toBeCloseTo(1500, 2);
    expect(first?.quota).toBeCloseTo(315, 2);
    expect(first?.count).toBe(2);
    expect(first?.rateKnown).toBe(true);
    const second = rows.find(r => r.key === 's_nos');
    expect(second?.base).toBeCloseTo(200, 2);
    expect(second?.quota).toBeCloseTo(20, 2);
  });

  it('reports a zero quota and flags a key that is not a configured tax', () => {
    const rows = summariseByTaxKey(invoices, new Map());
    expect(rows.every(r => r.quota === 0)).toBe(true);
    expect(rows.every(r => r.rateKnown === false)).toBe(true);
  });

  it('does not infer a rate from the key name', () => {
    const named = [
      {
        id: '9',
        date: '2026-04-01',
        subtotal: '100,00',
        discount: '0,00',
        total: '121,00',
        tax: '21,00',
        currency: 'EUR',
        status: 'paid',
        lines: [{ name: 'Thing', price: '100,00', units: '1', taxes: ['s_iva_21'] }],
      },
    ];
    const rows = summariseByTaxKey(named as never, new Map());
    expect(rows[0]?.quota).toBe(0);
    expect(rows[0]?.rateKnown).toBe(false);
  });

  it('groups lines with no tax key under an explicit label', () => {
    const rows = summariseByTaxKey(
      [
        {
          id: '4',
          date: '2026-04-01',
          subtotal: '100,00',
          discount: '0,00',
          total: '100,00',
          tax: '0,00',
          currency: 'EUR',
          status: 'paid',
          lines: [{ name: 'Exempt', price: '100,00', units: '1' }],
        },
      ] as never,
      RATES
    );
    expect(rows.map(r => r.key)).toContain('no tax key');
    expect(rows[0]?.rateKnown).toBe(false);
  });

  it('defaults to the previous calendar quarter and disclaims advice', async () => {
    stubFetch(
      {
        body: {
          items: [
            {
              id: 't1',
              name: 'IVA general',
              amount: '21',
              scope: 'sales',
              key: 's_iva0',
              group: 'iva',
              type: 'percentage',
            },
            {
              id: 't2',
              name: 'Recargo',
              amount: '10',
              scope: 'sales',
              key: 's_nos',
              group: 'iva',
              type: 'percentage',
            },
          ],
          cursor: null,
          has_more: false,
        },
      },
      { body: { items: invoices, cursor: null, has_more: false } },
      { body: { items: [], cursor: null, has_more: false } }
    );
    const client = await connectedClient();
    const result = await client.getPrompt({ name: 'holded_vat_summary', arguments: {} });
    const body = promptText(result);
    expect(body).toMatch(/Modelo 303/);
    expect(body).toMatch(/not a filing/i);
    expect(body).toMatch(/not tax advice/i);
  });
});

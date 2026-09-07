/**
 * holded_vat_summary: output and input VAT grouped by tax key, for preparing
 * Modelo 303.
 *
 * This is arithmetic over documents, not a filing and not advice. The output
 * says so, because a number that looks official invites being copied straight
 * into a return.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import type { DocumentSummary } from '../schemas/index.js';
import {
  PRE_READ_LIMIT,
  READ_ONLY_NOTICE,
  formatAmount,
  parseAmount,
  preRead,
  previousQuarter,
  resolveWindow,
  today,
  toolCall,
  userMessage,
  type PromptDeps,
} from './shared.js';

const NO_KEY = 'no tax key';

interface TaxKeyRow {
  key: string;
  base: number;
  quota: number;
  count: number;
  rateKnown: boolean;
  rate: number | null;
}

/**
 * Base and quota per tax key.
 *
 * A line's `taxes` array holds the keys. The rate comes from the account's own
 * tax records, passed in as a key-to-rate map, because a Holded tax key does
 * not encode its rate: real keys look like `s_iva0`, `s_nos` and
 * `tax_2327_sales`, and the rate lives in the record's `amount` field. A key
 * with no known rate reports a zero quota and `rateKnown: false` rather than
 * an invented figure.
 */
export function summariseByTaxKey(
  docs: DocumentSummary[],
  rates: Map<string, number>
): TaxKeyRow[] {
  const totals = new Map<
    string,
    { base: number; quota: number; count: number; rateKnown: boolean }
  >();

  for (const doc of docs) {
    for (const line of doc.lines ?? []) {
      const price = parseAmount((line as { price?: string | null }).price ?? null);
      const rawUnits = (line as { units?: string | null }).units;
      const units = rawUnits == null ? 1 : parseAmount(rawUnits);
      const discount = parseAmount((line as { discount?: string | null }).discount ?? null);
      const base = price * units * (1 - discount / 100);
      const keys = ((line as { taxes?: unknown[] }).taxes ?? []).filter(
        (t): t is string => typeof t === 'string'
      );
      const applied = keys.length > 0 ? keys : [NO_KEY];

      for (const key of applied) {
        const known = rates.has(key);
        const percentage = rates.get(key) ?? 0;
        const entry = totals.get(key) ?? { base: 0, quota: 0, count: 0, rateKnown: known };
        entry.base += base;
        entry.quota += (base * percentage) / 100;
        entry.count += 1;
        entry.rateKnown = known;
        totals.set(key, entry);
      }
    }
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, ...value, rate: rates.get(key) ?? null }))
    .sort((a, b) => b.base - a.base);
}

function table(rows: TaxKeyRow[]): string {
  if (rows.length === 0) return '_No documents in the window._';
  const body = rows
    .map(
      r =>
        `| \`${r.key}\` | ${r.rate === null ? 'unknown' : String(r.rate)} | ${r.count} | ${formatAmount(r.base)} | ${formatAmount(r.quota)} |`
    )
    .join('\n');
  const base = rows.reduce((sum, r) => sum + r.base, 0);
  const quota = rows.reduce((sum, r) => sum + r.quota, 0);
  return `| Tax key | Rate % | Lines | Base | Quota |
| --- | --- | --- | --- | --- |
${body}
| **Total** | | | **${formatAmount(base)}** | **${formatAmount(quota)}** |`;
}

export function registerVatPrompt(server: McpServer, deps: PromptDeps = {}): void {
  server.registerPrompt(
    'holded_vat_summary',
    {
      title: 'VAT summary for Modelo 303 preparation',
      description:
        'Output and input VAT grouped by tax key for a period, with base and quota per key. ' +
        'Read-only. Defaults to the previous calendar quarter. A working aid, not a filing.',
      argsSchema: {
        start_date: z.string().optional().describe('Start YYYY-MM-DD (default: previous quarter)'),
        end_date: z.string().optional().describe('End YYYY-MM-DD (default: previous quarter)'),
      },
    },
    async ({ start_date, end_date }) => {
      const window = resolveWindow(start_date, end_date, previousQuarter(today(deps)));

      const taxes = await preRead('the tax rates', () => api.listTaxes());
      const rates = new Map<string, number>();
      if (taxes.ok) {
        for (const tax of taxes.value.items) {
          // `Tax.amount` is optional and nullable: a tax record that exists but
          // carries no rate must NOT be registered here. Registering it at 0
          // would make `rates.has(key)` true, which reports a genuine 0% tax
          // with a real quota instead of falling through to the `rateKnown:
          // false` path below, silently understating a Modelo 303 quota.
          if (tax.amount != null) {
            rates.set(tax.key, parseAmount(tax.amount));
          }
        }
      }

      const sales = await preRead('the sales invoices', () =>
        api.listDocuments('invoice', {
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );
      const purchases = await preRead('the purchase invoices', () =>
        api.listDocuments('purchase', {
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );

      const problems = [
        ...(taxes.ok ? [] : [taxes.message]),
        ...(sales.ok ? [] : [sales.message]),
        ...(purchases.ok ? [] : [purchases.message]),
      ];

      const salesItems = sales.ok ? sales.value.items : [];
      const purchaseItems = purchases.ok ? purchases.value.items : [];
      const truncated =
        (sales.ok && sales.value.has_more) || (purchases.ok && purchases.value.has_more);

      return userMessage([
        `Summarise VAT for ${window.start_date} to ${window.end_date}.`,
        '',
        ...(problems.length > 0 ? [...problems, ''] : []),
        truncated
          ? `Data read: the first ${salesItems.length} sales and ${purchaseItems.length} purchase documents. There are more, so these figures are incomplete and must not be used as totals.`
          : `Data read: all ${salesItems.length} sales and ${purchaseItems.length} purchase documents in the window.`,
        '',
        '### Output VAT (IVA devengado, sales)',
        '',
        table(summariseByTaxKey(salesItems, rates)),
        '',
        '### Input VAT (IVA soportado, purchases)',
        '',
        table(summariseByTaxKey(purchaseItems, rates)),
        '',
        'Do this:',
        '1. Read the Data read line first. If the figures are incomplete, say so before any number and stop short of a balance.',
        '2. Report output VAT and input VAT per tax key, then the difference.',
        "3. Flag any line grouped under `no tax key`, and any key whose rate is shown as unknown because it is not among the account's configured taxes. Both need a human to check before the figures are used.",
        '4. State plainly that this is arithmetic over the documents in Holded, that it is **a working aid for preparing Modelo 303, not a filing and not tax advice**, and that the figures must be reconciled against the accounting ledger before use.',
        '',
        `Tax keys configured in this account: read the resource \`holded://reference/taxes\`, or ${toolCall('holded_accounting', { action: 'list_taxes' })}.`,
        `To reconcile against the ledger: ${toolCall('holded_accounting', { action: 'list_ledger', start_date: window.start_date, end_date: window.end_date })}. Ledger dates are DD/MM/YYYY.`,
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}

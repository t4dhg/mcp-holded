/**
 * The account's own configuration, as resources.
 *
 * A model cannot construct a valid Holded write without these: an invoice line
 * needs a real tax key, a ledger entry needs a real account number, and
 * record_payment needs a real method id. Guessing produces a 400 at best and a
 * wrong invoice at worst.
 *
 * Two rules. Reads are memoised, because MCP clients re-read resources at the
 * start of every conversation and four uncached reads per conversation is
 * wasteful against a 100 request per minute limit. And a handler never throws:
 * an expired key must not make the server look broken.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api/index.js';
import { NUMBERING_SERIES_TYPES } from '../schemas/index.js';
import { debug } from '../config.js';

export const TAXES_URI = 'holded://reference/taxes';
export const NUMBERING_SERIES_URI = 'holded://reference/numbering-series';
export const PAYMENT_METHODS_URI = 'holded://reference/payment-methods';
export const ACCOUNTING_ACCOUNTS_URI = 'holded://reference/accounting-accounts';

export const REFERENCE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  at: number;
  text: string;
}

const cache = new Map<string, CacheEntry>();

/** Test seam. The server never calls this; each process starts empty. */
export function clearReferenceCache(): void {
  cache.clear();
}

/**
 * Render a reference, memoised, never throwing.
 *
 * `fallbackTool` names the tool that reads the same data, so a caller who hits
 * a failure has somewhere to go instead of a dead end.
 */
async function render(
  uri: string,
  fallbackTool: string,
  build: () => Promise<string>,
  now: () => number = Date.now
): Promise<string> {
  const hit = cache.get(uri);
  if (hit && now() - hit.at < REFERENCE_TTL_MS) return hit.text;

  try {
    const text = await build();
    cache.set(uri, { at: now(), text });
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debug(`resource ${uri} failed`, message);
    // Deliberately not cached: the next read should retry.
    return `# Reference unavailable

\`${uri}\` could not be read from the Holded API.

    ${message}

This is a live reference, so it needs a working v2 Personal Access Token. Check that \`HOLDED_API_KEY\` is a \`pat_<id>_<secret>\` value and that it has not been revoked; a bad key returns 403 rather than 401.

You can read the same data through the \`${fallbackTool}\` tool, which will report the error in full.
`;
  }
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '_None configured in this account._\n';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace(/\|/g, '\\|');
}

async function buildTaxes(): Promise<string> {
  const page = await api.listTaxes();
  const rows = page.items.map(tax => {
    const t = tax as Record<string, unknown>;
    return [cell(t.key ?? t.id), cell(t.name), cell(t.amount), cell(t.type), cell(t.scope)];
  });
  return `# Taxes configured in this account

Use the **key** verbatim in a document line's \`taxes\` array, for example \`"taxes": ["s_iva_21"]\`. The key is not the id and not the rate; a line built from a guessed key is rejected or silently mis-taxed. \`scope\` says whether the key applies to sales or purchases, which determines which one a caller should pick.

${markdownTable(['Key', 'Name', 'Rate', 'Type', 'Scope'], rows)}

Read by \`holded_accounting({ action: 'list_taxes' })\`. Country-specific keys: \`holded_accounting({ action: 'tax_keys', country: 'ES' })\`.
`;
}

async function buildNumberingSeries(): Promise<string> {
  const sections: string[] = [];
  for (const type of NUMBERING_SERIES_TYPES) {
    const page = await api.listNumberingSeries(type);
    const rows = page.items.map(series => {
      const s = series as Record<string, unknown>;
      return [cell(s.id), cell(s.name), cell(s.format), cell(s.last), cell(s.verifactu_excluded)];
    });
    sections.push(
      `## \`${type}\`\n\n${markdownTable(['Id', 'Name', 'Format', 'Last number', 'Verifactu excluded'], rows)}`
    );
  }
  return `# Numbering series

A document is numbered from a series. The series type names differ from the document type names: a credit note uses \`creditnote\`, a sales order uses \`salesorder\`. \`last\` is the last number issued from the series, and \`verifactu_excluded\` matters because approving an invoice is an irreversible Verifactu step; check whether the series a caller is about to use is in or out of that regime.

${sections.join('\n\n')}

Read by \`holded_accounting({ action: 'list_numbering_series', series_type: '<type>' })\`.
`;
}

async function buildPaymentMethods(): Promise<string> {
  const page = await api.listPaymentMethods();
  const rows = page.items.map(method => {
    const m = method as Record<string, unknown>;
    return [cell(m.id), cell(m.name), cell(m.type), cell(m.bankingAccountId)];
  });
  return `# Payment methods

\`record_payment\` and a document's \`payment_method_id\` both need one of these ids.

${markdownTable(['Id', 'Name', 'Type', 'Banking account'], rows)}

Read by \`holded_payments({ action: 'list_methods' })\`.
`;
}

async function buildAccountingAccounts(): Promise<string> {
  const page = await api.listAccountingAccounts({});
  const rows = page.items.map(account => {
    const a = account as Record<string, unknown>;
    return [cell(a.num ?? a.number ?? a.id), cell(a.name), cell(a.group), cell(a.description)];
  });
  return `# Chart of accounts

A ledger entry needs real account numbers. These follow the Spanish Plan General de Contabilidad and are not guessable.

${markdownTable(['Number', 'Name', 'Group', 'Description'], rows)}

Amounts on ledger entries use a **dot** decimal separator, and ledger dates are **DD/MM/YYYY**. See \`holded://guide/api-behaviour\`.

Read by \`holded_accounting({ action: 'list_accounts' })\`.
`;
}

const REFERENCES: {
  name: string;
  uri: string;
  title: string;
  description: string;
  fallbackTool: string;
  build: () => Promise<string>;
}[] = [
  {
    name: 'taxes_reference',
    uri: TAXES_URI,
    title: 'Taxes and tax keys',
    description:
      "The account's tax keys, names and percentages. A document line's `taxes` array needs the " +
      'key verbatim, for example `s_iva_21`. Read this before building an invoice.',
    fallbackTool: "holded_accounting({ action: 'list_taxes' })",
    build: buildTaxes,
  },
  {
    name: 'numbering_series_reference',
    uri: NUMBERING_SERIES_URI,
    title: 'Numbering series',
    description:
      'The numbering series configured for each document type, with formats and the last number ' +
      'issued.',
    fallbackTool: "holded_accounting({ action: 'list_numbering_series' })",
    build: buildNumberingSeries,
  },
  {
    name: 'payment_methods_reference',
    uri: PAYMENT_METHODS_URI,
    title: 'Payment methods',
    description:
      'Payment method ids, needed by record_payment and by a document payment_method_id.',
    fallbackTool: "holded_payments({ action: 'list_methods' })",
    build: buildPaymentMethods,
  },
  {
    name: 'accounting_accounts_reference',
    uri: ACCOUNTING_ACCOUNTS_URI,
    title: 'Chart of accounts',
    description:
      'The account numbers of the chart of accounts, needed for ledger entries. Spanish PGC ' +
      'numbering, which cannot be guessed.',
    fallbackTool: "holded_accounting({ action: 'list_accounts' })",
    build: buildAccountingAccounts,
  },
];

export function registerReferenceResources(server: McpServer): void {
  for (const ref of REFERENCES) {
    server.registerResource(
      ref.name,
      ref.uri,
      { title: ref.title, description: ref.description, mimeType: 'text/markdown' },
      async uri => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: await render(ref.uri, ref.fallbackTool, ref.build),
          },
        ],
      })
    );
  }
}

/**
 * holded_aged_receivables: what is owed, by whom, and how late.
 *
 * Outstanding means the unpaid remainder (`payments_pending`), not the
 * document total, so a part-paid invoice contributes only what is left. When
 * `payments_pending` is absent, the remainder is derived (total less paid,
 * via `unpaidRemainder` in shared.ts) rather than assumed to be the whole
 * total, which would double the amount chased on a part-paid invoice with a
 * missing figure.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import type { DocumentSummary } from '../schemas/index.js';
import {
  PRE_READ_LIMIT,
  READ_ONLY_NOTICE,
  formatAmount,
  preRead,
  remainderWasDerived,
  toolCall,
  today,
  unpaidRemainder,
  userMessage,
  type PromptDeps,
} from './shared.js';

const BUCKET_LABELS = [
  'Over 90 days',
  '61 to 90 days',
  '31 to 60 days',
  '1 to 30 days',
  'Not yet due',
] as const;

type BucketLabel = (typeof BUCKET_LABELS)[number];

/** Gapless and total over the integers, so there is no unreachable branch to guard. */
function bucketFor(late: number): BucketLabel {
  if (late > 90) return 'Over 90 days';
  if (late > 60) return '61 to 90 days';
  if (late > 30) return '31 to 60 days';
  if (late > 0) return '1 to 30 days';
  return 'Not yet due';
}

function daysLate(dueDate: string | null | undefined, asOf: string): number {
  if (!dueDate) return 0;
  const due = Date.parse(dueDate.slice(0, 10));
  const at = Date.parse(asOf);
  if (Number.isNaN(due) || Number.isNaN(at)) return 0;
  return Math.floor((at - due) / 86_400_000);
}

export function buildAgeingReport(docs: DocumentSummary[], asOf: string): string {
  const open = docs.filter(d => unpaidRemainder(d) > 0);
  if (open.length === 0) return `Nothing outstanding as at ${asOf}.`;

  const bucketOf = (doc: DocumentSummary): BucketLabel => bucketFor(daysLate(doc.due_date, asOf));

  const bucketTotals = BUCKET_LABELS.map(label => ({
    label,
    total: open.filter(d => bucketOf(d) === label).reduce((sum, d) => sum + unpaidRemainder(d), 0),
    count: open.filter(d => bucketOf(d) === label).length,
  })).filter(b => b.count > 0);

  const byContact = new Map<string, { name: string; total: number; docs: DocumentSummary[] }>();
  for (const doc of open) {
    const key = doc.contact_id ?? doc.contact_name ?? 'unknown';
    const entry = byContact.get(key) ?? {
      name: doc.contact_name ?? `Contact ${key}`,
      total: 0,
      docs: [],
    };
    entry.total += unpaidRemainder(doc);
    entry.docs.push(doc);
    byContact.set(key, entry);
  }

  const contacts = [...byContact.entries()].sort((a, b) => b[1].total - a[1].total);
  const grand = open.reduce((sum, d) => sum + unpaidRemainder(d), 0);
  const currency = open[0]?.currency;

  const lines: string[] = [
    `## Outstanding as at ${asOf}`,
    '',
    `Total ${formatAmount(grand, currency)} across ${open.length} document${open.length === 1 ? '' : 's'} and ${contacts.length} contact${contacts.length === 1 ? '' : 's'}.`,
    '',
    '| Age | Documents | Outstanding |',
    '| --- | --- | --- |',
    ...bucketTotals.map(b => `| ${b.label} | ${b.count} | ${formatAmount(b.total, currency)} |`),
    '',
    '## By contact, worst first',
    '',
    '| Contact | Outstanding | Documents |',
    '| --- | --- | --- |',
  ];

  for (const [id, entry] of contacts) {
    const detail = entry.docs
      .sort((a, b) => daysLate(b.due_date, asOf) - daysLate(a.due_date, asOf))
      .map(d => {
        const late = daysLate(d.due_date, asOf);
        const age = late > 0 ? `${late}d late` : 'not due';
        return `${d.document_number ?? d.id} ${formatAmount(unpaidRemainder(d), d.currency)} (${age})`;
      })
      .join('; ');
    lines.push(`| ${entry.name} (${id}) | ${formatAmount(entry.total, currency)} | ${detail} |`);
  }

  const derivedDocs = open.filter(remainderWasDerived);
  if (derivedDocs.length > 0) {
    lines.push(
      '',
      `Outstanding was derived as total less paid for ${derivedDocs.map(d => d.document_number ?? d.id).join(', ')}, because the API did not report a pending figure for them. Check those against Holded before chasing.`
    );
  }

  return lines.join('\n');
}

export function registerReceivablesPrompt(server: McpServer, deps: PromptDeps = {}): void {
  server.registerPrompt(
    'holded_aged_receivables',
    {
      title: 'Aged receivables',
      description:
        'Who owes money, how much, and how late, bucketed by days overdue and grouped by ' +
        'contact. Read-only. Defaults to today.',
      argsSchema: {
        as_of: z.string().optional().describe('Ageing date YYYY-MM-DD (default: today)'),
        contact_id: z.string().optional().describe('Limit to one contact'),
      },
    },
    async ({ as_of, contact_id }) => {
      const asOf = as_of ?? today(deps);
      const read = await preRead('the outstanding sales invoices', () =>
        api.listDocuments('invoice', {
          status: 'pending',
          limit: PRE_READ_LIMIT,
          ...(contact_id ? { contact_id } : {}),
        })
      );

      if (!read.ok) {
        return userMessage([
          `Report the aged receivables as at ${asOf}.`,
          '',
          read.message,
          '',
          `Say the read failed and suggest retrying with ${toolCall('holded_sales', { action: 'list', type: 'invoice', status: 'pending' })}.`,
        ]);
      }

      const page = read.value;
      const coverage = page.has_more
        ? `Data read: the first ${page.items.length} pending invoices. There are more, so these figures are a floor, not a total. Continue with cursor "${page.cursor}".`
        : `Data read: all ${page.items.length} pending invoices.`;

      return userMessage([
        `Report the aged receivables as at ${asOf}${contact_id ? ` for contact ${contact_id}` : ''}.`,
        '',
        'The ageing has already been run for you:',
        '',
        coverage,
        '',
        buildAgeingReport(page.items, asOf),
        '',
        'Do this:',
        '1. Read the Data read line first. If the figures are a floor rather than a total, say so before any number.',
        '2. Give the total outstanding and the split by age bucket.',
        '3. Name the contacts to chase first, worst and oldest first, with the document numbers.',
        '4. Flag any part-paid document, where only the remainder is outstanding.',
        '5. If nothing is outstanding, say so in one line.',
        '',
        `To see one contact's full history: ${toolCall('holded_contacts', { action: 'get', id: '<contact_id>' })}, or use the holded_contact_statement prompt.`,
        `To record a payment once received: ${toolCall('holded_sales', { action: 'record_payment', type: 'invoice', id: '<document_id>' })}.`,
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}

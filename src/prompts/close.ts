/**
 * holded_month_end_close: what is still open at the end of a period.
 *
 * Draft detection uses each document's own `draft` flag rather than the
 * approval_status list parameter, whose accepted values are not verified; a
 * guessed enum returns the wrong set without erroring.
 *
 * Inbox documents only count as open work when their own `status` is not
 * `done`. An inbox record Holded has already processed is not outstanding,
 * and listing it as open produces a false positive, which is exactly what
 * stops a person trusting a checklist. `done` is the only status value
 * verified against real data to mean complete; every other value is treated
 * as needing attention rather than guessed at.
 *
 * The bank side is delegated to holded_bank_reconciliation rather than
 * duplicated, because that prompt already resolves the treasury account.
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
  previousMonth,
  resolveWindow,
  today,
  toolCall,
  userMessage,
  type PromptDeps,
} from './shared.js';

function isOverdue(doc: DocumentSummary, asOf: string): boolean {
  const outstanding = parseAmount(doc.payments_pending ?? null);
  if (outstanding <= 0) return false;
  if (!doc.due_date) return false;
  return doc.due_date.slice(0, 10) < asOf;
}

export function buildChecklist(input: {
  drafts: DocumentSummary[];
  overdue: DocumentSummary[];
  inbox: { open: number; done: number };
  asOf: string;
}): string {
  const items: string[] = [];

  if (input.drafts.length > 0) {
    const total = input.drafts.reduce((sum, d) => sum + parseAmount(d.total), 0);
    const [firstDraft] = input.drafts;
    items.push(
      `${items.length + 1}. **${input.drafts.length} sales document${input.drafts.length === 1 ? '' : 's'} still in draft**, ${formatAmount(total, firstDraft?.currency)} in total. A draft has no legal number and is not in the books.\n${input.drafts.map(d => `   - \`${d.id}\` ${d.date ?? ''} ${formatAmount(parseAmount(d.total), d.currency)}`).join('\n')}\n\n   Approving assigns the legal number and **cannot be undone under Verifactu**. Check the contact, lines, taxes and series first, then ${toolCall('holded_sales', { action: 'approve', type: 'invoice', id: '<document_id>', confirm: true })}.`
    );
  }

  if (input.overdue.length > 0) {
    const total = input.overdue.reduce(
      (sum, d) => sum + parseAmount(d.payments_pending ?? null),
      0
    );
    const [firstOverdue] = input.overdue;
    items.push(
      `${items.length + 1}. **${input.overdue.length} invoice${input.overdue.length === 1 ? '' : 's'} past due** as at ${input.asOf}, ${formatAmount(total, firstOverdue?.currency)} outstanding. Run the \`holded_aged_receivables\` prompt for the ageing by contact.`
    );
  }

  if (input.inbox.open > 0) {
    items.push(
      `${items.length + 1}. **${input.inbox.open} inbox document${input.inbox.open === 1 ? '' : 's'} still to process**${input.inbox.done > 0 ? `, with ${input.inbox.done} already done` : ''}. Each open one is a supplier document that may still need attaching to a purchase. ${toolCall('holded_inbox', { action: 'list' })}.`
    );
  }

  const bankItem = `${items.length + 1}. **Bank reconciliation.** Not checked here. Run the \`holded_bank_reconciliation\` prompt for the same window; it resolves the treasury account and proposes the matches.`;
  items.push(bankItem);

  if (input.drafts.length === 0 && input.overdue.length === 0 && input.inbox.open === 0) {
    return `## Close as at ${input.asOf}\n\nNothing open on the document side: no drafts, nothing past due, no inbox documents still to process.\n\n${bankItem}`;
  }

  return `## Close as at ${input.asOf}\n\n${items.join('\n\n')}`;
}

export function registerClosePrompt(server: McpServer, deps: PromptDeps = {}): void {
  server.registerPrompt(
    'holded_month_end_close',
    {
      title: 'Month-end close checklist',
      description:
        'What is still open at the end of a period: documents in draft, invoices past due, and ' +
        'inbox documents still to process, each with the call that resolves it. Read-only. ' +
        'Defaults to the previous month.',
      argsSchema: {
        start_date: z.string().optional().describe('Start YYYY-MM-DD (default: previous month)'),
        end_date: z.string().optional().describe('End YYYY-MM-DD (default: previous month)'),
      },
    },
    async ({ start_date, end_date }) => {
      const window = resolveWindow(start_date, end_date, previousMonth(today(deps)));

      const invoices = await preRead('the sales invoices in the period', () =>
        api.listDocuments('invoice', {
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );
      const inbox = await preRead('the inbox documents in the period', () =>
        api.listInbox({
          start_date: window.start_date,
          end_date: window.end_date,
          limit: PRE_READ_LIMIT,
        })
      );

      if (!invoices.ok) {
        return userMessage([
          `Run the close checklist for ${window.start_date} to ${window.end_date}.`,
          '',
          invoices.message,
          '',
          'Say the read failed and stop. A close checklist built from a failed read is worse than none.',
        ]);
      }

      const items = invoices.value.items;
      const inboxItems = inbox.ok ? inbox.value.items : [];
      const inboxDone = inboxItems.filter(d => d.status === 'done').length;
      const inboxCounts = inbox.ok
        ? { open: inboxItems.length - inboxDone, done: inboxDone }
        : { open: 0, done: 0 };

      const checklist = buildChecklist({
        drafts: items.filter(d => d.draft === true),
        overdue: items.filter(d => isOverdue(d, window.end_date)),
        inbox: inboxCounts,
        asOf: window.end_date,
      });

      return userMessage([
        `Run the month-end close checklist for ${window.start_date} to ${window.end_date}.`,
        '',
        invoices.value.has_more
          ? `Data read: the first ${items.length} invoices in the window. There are more, so this checklist is incomplete.`
          : `Data read: all ${items.length} invoices in the window.`,
        ...(inbox.ok ? [] : ['', `Inbox not read: ${inbox.message}`]),
        '',
        checklist,
        '',
        'Do this:',
        '1. Read the Data read line first and say if the checklist is incomplete.',
        '2. Work through the items in order, most consequential first.',
        '3. For anything in draft, say explicitly that approving is irreversible under Verifactu before offering the call.',
        '4. Do not approve, send or delete anything yourself. Present the calls and let the person decide.',
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}

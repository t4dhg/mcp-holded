/**
 * holded_contact_statement: what one contact has been invoiced, has paid, and
 * still owes.
 *
 * Built from each document's own payment fields rather than from a payments
 * list, because listPayments has no contact filter. Per-payment detail lives
 * on the single-document read, which returns payments_detail.
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
  remainderWasDerived,
  toolCall,
  unpaidRemainder,
  userMessage,
  type PromptDeps,
} from './shared.js';

export function buildStatement(contactName: string, docs: DocumentSummary[]): string {
  if (docs.length === 0) return `${contactName} has no sales documents.`;

  const invoiced = docs.reduce((sum, d) => sum + parseAmount(d.total), 0);
  const paid = docs.reduce((sum, d) => sum + parseAmount(d.payments_total ?? null), 0);
  const outstanding = docs.reduce((sum, d) => sum + unpaidRemainder(d), 0);
  const currency = docs[0]?.currency;

  const unpaid = docs
    .filter(d => unpaidRemainder(d) > 0)
    .sort((a, b) => (a.due_date ?? a.date ?? '').localeCompare(b.due_date ?? b.date ?? ''));

  const [oldestUnpaid] = unpaid;
  const oldestLine = oldestUnpaid
    ? `Oldest unpaid: ${oldestUnpaid.document_number ?? oldestUnpaid.id}, due ${oldestUnpaid.due_date ?? 'unknown'}, ${formatAmount(unpaidRemainder(oldestUnpaid), oldestUnpaid.currency)} outstanding.`
    : 'Nothing outstanding.';

  const rows = [...docs]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .map(
      d =>
        `| ${d.document_number ?? d.id} | ${d.date ?? ''} | ${d.due_date ?? ''} | ${formatAmount(parseAmount(d.total), d.currency)} | ${formatAmount(parseAmount(d.payments_total ?? null), d.currency)} | ${formatAmount(unpaidRemainder(d), d.currency)} | ${d.status} |`
    );

  const derivedDocs = docs.filter(remainderWasDerived);
  const derivedLine =
    derivedDocs.length > 0
      ? `Outstanding was derived as total less paid for ${derivedDocs.map(d => d.document_number ?? d.id).join(', ')}, because the API did not report a pending figure for them. Check those against Holded before sending this to a customer.`
      : null;

  return [
    `## Statement of account: ${contactName}`,
    '',
    `Invoiced ${formatAmount(invoiced, currency)}, paid ${formatAmount(paid, currency)}, outstanding ${formatAmount(outstanding, currency)} across ${docs.length} document${docs.length === 1 ? '' : 's'}.`,
    '',
    oldestLine,
    '',
    '| Document | Date | Due | Total | Paid | Outstanding | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    ...(derivedLine ? ['', derivedLine] : []),
  ].join('\n');
}

export function registerStatementPrompt(server: McpServer, deps: PromptDeps = {}): void {
  void deps;
  server.registerPrompt(
    'holded_contact_statement',
    {
      title: 'Statement of account for a contact',
      description:
        'What one contact has been invoiced, has paid and still owes, document by document. ' +
        'Read-only. Give either contact_id or name.',
      argsSchema: {
        contact_id: z.string().optional().describe('Contact id (24 hex characters)'),
        name: z.string().optional().describe('Contact name, matched as a substring'),
      },
    },
    async ({ contact_id, name }) => {
      if (!contact_id && !name) {
        return userMessage([
          'Produce a statement of account, but no contact was given.',
          '',
          `Ask the person for a contact name or id. To search: ${toolCall('holded_contacts', { action: 'search', name: '<name>' })}.`,
        ]);
      }

      let resolvedId = contact_id;
      let resolvedName = contact_id ?? '';

      if (!resolvedId && name) {
        const found = await preRead(`contacts matching "${name}"`, () =>
          api.searchContacts(name, { limit: 20 })
        );
        if (!found.ok) {
          return userMessage([`Produce a statement of account for "${name}".`, '', found.message]);
        }
        const matches = found.value.items;
        if (matches.length === 0) {
          return userMessage([
            `Produce a statement of account for "${name}".`,
            '',
            `No contact matched "${name}". Tell the person, and suggest ${toolCall('holded_contacts', { action: 'list' })} to browse.`,
          ]);
        }
        if (matches.length > 1) {
          return userMessage([
            `Produce a statement of account for "${name}".`,
            '',
            `The search matched ${matches.length} contacts, so ask which one rather than choosing:`,
            '',
            ...matches.map(c => `- \`${c.id}\` ${c.name}`),
            '',
            'Then run this prompt again with `contact_id`.',
          ]);
        }
        const [match] = matches;
        if (!match) {
          return userMessage([
            `Produce a statement of account for "${name}".`,
            '',
            `No contact matched "${name}". Tell the person, and suggest ${toolCall('holded_contacts', { action: 'list' })} to browse.`,
          ]);
        }
        resolvedId = match.id;
        resolvedName = match.name;
      }

      if (!resolvedId) {
        return userMessage([
          'Produce a statement of account, but no contact could be resolved.',
          '',
          `Give a contact_id, or a name that matches exactly one contact. To search: ${toolCall('holded_contacts', { action: 'search', name: '<name>' })}.`,
        ]);
      }

      if (!resolvedName || resolvedName === resolvedId) {
        const contact = await preRead(`contact ${resolvedId}`, () => api.getContact(resolvedId));
        resolvedName = contact.ok ? contact.value.name : `Contact ${resolvedId}`;
      }

      const docs = await preRead(`the sales invoices for ${resolvedName}`, () =>
        api.listDocuments('invoice', { contact_id: resolvedId, limit: PRE_READ_LIMIT })
      );
      if (!docs.ok) {
        return userMessage([
          `Produce a statement of account for ${resolvedName} (${resolvedId}).`,
          '',
          docs.message,
        ]);
      }

      return userMessage([
        `Produce a statement of account for ${resolvedName} (${resolvedId}).`,
        '',
        docs.value.has_more
          ? `Data read: the first ${docs.value.items.length} invoices. There are more, so the totals are partial.`
          : `Data read: all ${docs.value.items.length} invoices for this contact.`,
        '',
        buildStatement(resolvedName, docs.value.items),
        '',
        'Do this:',
        '1. Read the Data read line first and say if the totals are partial.',
        '2. Give invoiced, paid and outstanding, then the oldest unpaid document.',
        '3. Present the document table in a form that could be sent to the customer.',
        '4. Note that paid and outstanding come from each document rather than from a payments list, because the Holded payments endpoint cannot be filtered by contact.',
        '',
        `For the individual payments against one document: ${toolCall('holded_sales', { action: 'get', type: 'invoice', id: '<document_id>' })}, which returns \`payments_detail\`.`,
        `For the customer's own portal link: ${toolCall('holded_contacts', { action: 'portal_link', id: resolvedId })}.`,
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}

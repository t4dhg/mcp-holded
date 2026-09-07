/**
 * holded_draft_invoice: assemble a create payload for review, and stop.
 *
 * The prompt never creates and never approves. `create` makes a draft;
 * `approve` assigns the legal number and cannot be undone under Verifactu.
 * Those are two decisions and they belong in two turns, with a person in
 * between. The instructions say so explicitly, because a model that has just
 * created a document is one step from approving it.
 *
 * There is no numbering-series argument. DocumentInput is a strict schema and
 * accepts no field named numbering_series_id or series; the only numbering
 * keys it takes are `number` and `number_line_id`. A prompt that invented a
 * mapping to one of those would be guessing, so it emits neither and says so.
 *
 * Tax keys come from the account's own /taxes records and are used verbatim.
 * A Holded tax key does not encode its rate, so the rate shown next to each
 * key is read from the record, never invented.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import {
  READ_ONLY_NOTICE,
  preRead,
  today,
  toolCall,
  userMessage,
  type PromptDeps,
} from './shared.js';

export function registerDraftInvoicePrompt(server: McpServer, deps: PromptDeps = {}): void {
  server.registerPrompt(
    'holded_draft_invoice',
    {
      title: 'Draft a sales invoice for review',
      description:
        'Resolve the contact, look up the real tax keys, and assemble a complete invoice payload ' +
        'for a person to review. Creates nothing. Never approves.',
      argsSchema: {
        contact: z.string().describe('Contact id, or a name to search for'),
        description: z
          .string()
          .describe('What to invoice, in words, e.g. "annual licence 1000 EUR plus 21% VAT"'),
        date: z.string().optional().describe('Invoice date YYYY-MM-DD (default: today)'),
      },
    },
    async ({ contact, description, date }) => {
      const invoiceDate = date ?? today(deps);
      const looksLikeId = /^[0-9a-f]{24}$/i.test(contact);

      let contactId = looksLikeId ? contact : undefined;
      let contactName = looksLikeId ? contact : '';

      if (!contactId) {
        const found = await preRead(`contacts matching "${contact}"`, () =>
          api.searchContacts(contact, { limit: 20 })
        );
        if (!found.ok) {
          return userMessage([
            `Draft an invoice for "${contact}": ${description}`,
            '',
            found.message,
          ]);
        }
        const matches = found.value.items;
        if (matches.length === 0) {
          return userMessage([
            `Draft an invoice for "${contact}": ${description}`,
            '',
            `No contact matched "${contact}". Ask the person whether to create one first with ${toolCall('holded_contacts', { action: 'create' })}, and do not invent a contact id.`,
          ]);
        }
        if (matches.length > 1) {
          return userMessage([
            `Draft an invoice for "${contact}": ${description}`,
            '',
            `The search matched ${matches.length} contacts. Ask which one; do not choose, and do not draft anything yet:`,
            '',
            ...matches.map(c => `- \`${c.id}\` ${c.name}`),
            '',
            'Then run this prompt again with the id.',
          ]);
        }
        const [match] = matches;
        if (!match) {
          return userMessage([
            `Draft an invoice for "${contact}": ${description}`,
            '',
            `No contact matched "${contact}". Ask the person whether to create one first with ${toolCall('holded_contacts', { action: 'create' })}, and do not invent a contact id.`,
          ]);
        }
        contactId = match.id;
        contactName = match.name;
      }

      if (!contactName || contactName === contactId) {
        const record = await preRead(`contact ${contactId}`, () => api.getContact(contactId));
        contactName = record.ok ? record.value.name : `Contact ${contactId}`;
      }

      const taxes = await preRead('the tax keys', () => api.listTaxes());
      const taxLines = taxes.ok
        ? taxes.value.items
            .map(t => `- \`${t.key}\` ${t.name}${t.amount != null ? ` ${t.amount}%` : ''}`)
            .join('\n')
        : taxes.message;

      return userMessage([
        `Draft a sales invoice for ${contactName} (${contactId}), dated ${invoiceDate}.`,
        '',
        `What to invoice, in the person's words: ${description}`,
        '',
        '### Tax keys available in this account',
        '',
        taxLines,
        '',
        "Use one of these keys verbatim in each line's `taxes` array. Do not invent a key and do not put a percentage there.",
        '',
        'Do this:',
        '1. Turn the description into explicit lines, each with `name`, `units`, `price` and `taxes`. Ask about anything you had to assume: quantities, unit prices, whether a price includes VAT, and which tax key applies.',
        '2. Show the person the complete payload and the computed totals, and wait for them to approve it. Do not call anything yet.',
        `3. Only once they approve, create it as a draft: ${toolCall('holded_sales', { action: 'create', type: 'invoice' })} with \`data\` set to the payload below.`,
        '4. Report the new document id and stop there.',
        '',
        '**Do not call `approve` in this turn, or in the same turn as `create`.** `create` makes a draft, which is editable and deletable. `approve` assigns the legal invoice number, and under Verifactu that cannot be undone: a mistake then needs a credit note, not an edit. Approving is a separate decision for the person, on a document they have seen.',
        '',
        'Payload shape, with the values still to be filled in from the description:',
        '',
        '```json',
        JSON.stringify(
          {
            contact_id: contactId,
            date: invoiceDate,
            items: [{ name: '<line description>', units: 1, price: 0, taxes: ['<tax key>'] }],
          },
          null,
          2
        ),
        '```',
        '',
        'The payload has no numbering-series field. Holded numbers the document from the series configured for its type, and `holded://reference/numbering-series` shows which series exist. If the person needs a specific document number, `number` accepts one explicitly; do not invent a series id.',
        '`units`, `price` and `discount` are numbers in a create payload, even though the API returns amounts as strings on reads.',
        '',
        'Document amounts use a comma decimal separator on the way back out. See `holded://guide/api-behaviour`.',
        '',
        READ_ONLY_NOTICE,
      ]);
    }
  );
}

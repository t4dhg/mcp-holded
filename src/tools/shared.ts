/**
 * Shared pieces for the tool handlers: argument fragments, the confirmation
 * gate, result formatting and local file helpers.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { z } from 'zod';
import type { Page } from '../pagination.js';
import { clampLimit, formatPageInfo } from '../pagination.js';
import { jsonResponse, type ToolResult } from '../tool-utils.js';
import { getOperationPolicy, getWarningMessage, type OperationName } from '../write-safety.js';
import { parseInput } from '../validate.js';

export const CATEGORIES: Record<string, { name: string; description: string }> = {
  contacts: { name: 'Contacts', description: 'Customers, suppliers, contact groups, attachments' },
  sales: {
    name: 'Sales documents',
    description:
      'Invoices, credit notes, estimates, proformas, sales receipts, sales orders, waybills, receipt notes, recurring invoices',
  },
  purchases: {
    name: 'Purchase documents',
    description: 'Purchases (bills), purchase refunds, purchase orders, purchase shipments',
  },
  payments: { name: 'Payments', description: 'Payments, collections and payment methods' },
  treasury: {
    name: 'Treasury',
    description:
      'Banking accounts, bank movements, reconciliation, remittances, cashflow forecasts',
  },
  accounting: {
    name: 'Accounting',
    description:
      'Chart of accounts, ledger entries, taxes, expenses accounts, sales channels, numbering series, tags',
  },
  catalog: {
    name: 'Catalog',
    description: 'Products, stock, services, warehouses, price lists, production orders',
  },
  team: { name: 'Team', description: 'Employees, time tracking, salary records, payslips' },
  crm: { name: 'CRM', description: 'Funnels and leads' },
  projects: { name: 'Projects', description: 'Projects, tasks and project time tracking' },
  calendar: { name: 'Calendar', description: 'Events, bookings and booking locations' },
  inbox: { name: 'Inbox', description: 'Scanned incoming documents' },
  webhooks: { name: 'Webhooks', description: 'Webhooks, event catalogue and API usage' },
  request: {
    name: 'Raw request',
    description: 'Any v2 endpoint, with confirmation required for writes',
  },
};

/** Gate a high-risk operation. Missing policy entries fail the build because `OperationName` is a closed union. */
export function checkConfirmation(
  operation: OperationName,
  confirm?: boolean,
  upload?: { filePath: string; destination: string }
): { needsConfirmation: true; message: string } | { needsConfirmation: false } {
  const policy = getOperationPolicy(operation);
  if (policy.requiresConfirmation && confirm !== true) {
    const details = upload
      ? `\nLocal file: ${JSON.stringify(resolve(upload.filePath))}\nDestination: ${JSON.stringify(upload.destination)}`
      : '';
    return {
      needsConfirmation: true,
      message: `${getWarningMessage(operation)}${details}\n\nTo proceed, call this tool again with the same arguments and \`confirm: true\`.`,
    };
  }
  return { needsConfirmation: false };
}

export const listArgs = {
  limit: z.number().int().min(1).max(200).optional().describe('Page size, 1 to 200 (default 50)'),
  cursor: z.string().optional().describe('Cursor from the previous page to continue listing'),
};

export const confirmArg = z
  .boolean()
  .optional()
  .describe(
    'Required for gated actions. The first call without it sends nothing and explains what would happen.'
  );

export const dataArg = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Payload for create and update actions, following the Holded v2 request contract');

export const idArg = z.string().optional().describe('Record id (24 hex characters)');

export function pageResponse(page: Page<unknown>, noun: string): ToolResult {
  return jsonResponse(page.items, `${formatPageInfo(page, noun)}.`);
}

export function paging(args: { limit?: number; cursor?: string }) {
  return { limit: clampLimit(args.limit), cursor: args.cursor };
}

/** Validate `data` against a write contract, with a clear error when it is missing. */
export function data<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
  context: string
): z.output<T> {
  if (value === undefined) throw new Error(`\`data\` is required for ${context}`);
  return parseInput(schema, value, context);
}

export async function savePdf(bytes: Uint8Array, outputPath: string): Promise<ToolResult> {
  const target = resolve(outputPath);
  // Exclusive creation refuses both existing files and symlinks at the output path.
  await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
  return jsonResponse({ path: target, bytes: bytes.byteLength }, 'PDF saved.');
}

export async function readLocalFile(
  filePath: string
): Promise<{ bytes: Uint8Array; filename: string }> {
  const target = resolve(filePath);
  const bytes = new Uint8Array(await readFile(target));
  return { bytes, filename: basename(target) };
}

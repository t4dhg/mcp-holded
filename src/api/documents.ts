/**
 * Sales and purchase documents share one API shape in Holded v2. The path
 * differs per type, and a few types have extra verbs.
 */
import { deleteOne, getBinary, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import {
  Document,
  DocumentAttachment,
  DocumentSummary,
  ReceivedItem,
  inputs,
} from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage, uploadFile } from './shared.js';
import type { z } from 'zod';

export const SALES_TYPES = {
  invoice: '/invoices',
  credit_note: '/credit-notes',
  estimate: '/estimates',
  proforma: '/proformas',
  sales_receipt: '/sales-receipts',
  sales_order: '/sales-orders',
  waybill: '/waybills',
  receipt_note: '/receipt-notes',
  recurring_invoice: '/recurring-invoices',
} as const;

export const PURCHASE_TYPES = {
  purchase: '/purchases',
  purchase_refund: '/purchase-refunds',
  purchase_order: '/purchase-orders',
  purchase_shipment: '/purchase-shipments',
} as const;

export type SalesType = keyof typeof SALES_TYPES;
export type PurchaseType = keyof typeof PURCHASE_TYPES;
export type DocumentType = SalesType | PurchaseType;

export function documentPath(type: DocumentType): string {
  return type in SALES_TYPES
    ? SALES_TYPES[type as SalesType]
    : PURCHASE_TYPES[type as PurchaseType];
}

/**
 * Which verbs Holded v2 exposes per document type, from the OpenAPI document
 * and confirmed live where the account had records (purchase refunds have no
 * attachments route; purchases have no pdf or send route). Calling an
 * unsupported combination fails here with a clear message instead of a 404.
 */
export type DocumentOperation =
  | 'update'
  | 'delete'
  | 'approve'
  | 'cancel'
  | 'send'
  | 'pipeline'
  | 'pdf'
  | 'attachments'
  | 'payments'
  | 'accept'
  | 'reject'
  | 'receive'
  | 'skip'
  | 'schedule';

const STANDARD: DocumentOperation[] = [
  'update',
  'delete',
  'approve',
  'send',
  'pipeline',
  'pdf',
  'attachments',
];

export const SUPPORTED_OPERATIONS: Record<DocumentType, ReadonlySet<DocumentOperation>> = {
  invoice: new Set([...STANDARD, 'payments', 'cancel']),
  credit_note: new Set([...STANDARD, 'payments']),
  estimate: new Set([...STANDARD, 'accept', 'reject']),
  proforma: new Set(STANDARD),
  sales_receipt: new Set([...STANDARD, 'payments']),
  sales_order: new Set(STANDARD),
  waybill: new Set(STANDARD),
  receipt_note: new Set([...STANDARD, 'payments']),
  recurring_invoice: new Set(['update', 'delete', 'skip', 'schedule']),
  purchase: new Set(['update', 'delete', 'approve', 'pipeline', 'attachments', 'payments']),
  purchase_refund: new Set([]),
  purchase_order: new Set([...STANDARD, 'receive']),
  purchase_shipment: new Set(['update', 'delete', 'approve']),
};

export function assertSupported(type: DocumentType, operation: DocumentOperation): void {
  if (!SUPPORTED_OPERATIONS[type].has(operation)) {
    throw new Error(
      `Holded v2 does not offer "${operation}" for ${type.replace('_', ' ')} documents. Available: ${[...SUPPORTED_OPERATIONS[type]].join(', ') || 'list, get, create only'}.`
    );
  }
}

/** Purchase refunds are listed at /purchase-refunds but read and created under /purchases/refund. */
function recordPath(type: DocumentType, id: string): string {
  if (type === 'purchase_refund') return `/purchases/refund/${seg(id)}`;
  return `${documentPath(type)}/${seg(id)}`;
}

export interface ListDocumentsParams {
  limit?: number;
  cursor?: string;
  contact_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  due_date_start?: string;
  due_date_end?: string;
  sort?: string;
  approval_status?: string;
  accounting_account_num?: number;
}

export function listDocuments(
  type: DocumentType,
  params: ListDocumentsParams = {}
): Promise<Page<DocumentSummary>> {
  return fetchPage(documentPath(type), DocumentSummary, { ...params });
}

export function getDocument(type: DocumentType, id: string): Promise<Document> {
  return fetchOne(recordPath(type, id), Document);
}

export function findInvoicesByNumber(
  documentNumber: string,
  params: { limit?: number; cursor?: string } = {}
): Promise<Page<DocumentSummary>> {
  return fetchPage('/invoices/find-by-number', DocumentSummary, {
    document_number: documentNumber,
    ...params,
  });
}

export async function getDocumentPdf(type: DocumentType, id: string): Promise<Uint8Array> {
  assertSupported(type, 'pdf');
  return getBinary(`${documentPath(type)}/${seg(id)}/pdf`);
}

export async function listDocumentAttachments(type: DocumentType, id: string) {
  assertSupported(type, 'attachments');
  return fetchPage(`${documentPath(type)}/${seg(id)}/attachments`, DocumentAttachment);
}

export async function attachDocumentFile(
  type: DocumentType,
  id: string,
  bytes: Uint8Array,
  filename: string,
  contentType?: string
): Promise<unknown> {
  assertSupported(type, 'attachments');
  return uploadFile(
    `${documentPath(type)}/${seg(id)}/attachments`,
    'file',
    bytes,
    filename,
    contentType
  );
}

export async function createDocument(
  type: DocumentType,
  input: z.infer<typeof inputs.DocumentInput> | z.infer<typeof inputs.RecurringInvoiceInput>
): Promise<Document> {
  const endpoint = type === 'purchase_refund' ? '/purchases/refund' : documentPath(type);
  const id = await createAndReturnId(endpoint, input);
  return getDocument(type, id);
}

export async function updateDocument(
  type: DocumentType,
  id: string,
  input: Record<string, unknown>
): Promise<Document> {
  assertSupported(type, 'update');
  await put(recordPath(type, id), input);
  return getDocument(type, id);
}

export async function deleteDocument(type: DocumentType, id: string): Promise<void> {
  assertSupported(type, 'delete');
  await deleteOne(recordPath(type, id));
}

/** Assigns the legal number. Irreversible. */
export async function approveDocument(type: DocumentType, id: string): Promise<unknown> {
  assertSupported(type, 'approve');
  return post(`${documentPath(type)}/${seg(id)}/approve`);
}

export function cancelInvoice(id: string): Promise<unknown> {
  return post(`/invoices/${seg(id)}/cancel`);
}

/** Emails the document. Outward-facing. */
export async function sendDocument(
  type: DocumentType,
  id: string,
  input: z.infer<typeof inputs.SendInput>
): Promise<unknown> {
  assertSupported(type, 'send');
  return post(`${documentPath(type)}/${seg(id)}/send`, input);
}

export async function setDocumentPipeline(type: DocumentType, id: string, pipelineId: string) {
  assertSupported(type, 'pipeline');
  return put(`${documentPath(type)}/${seg(id)}/pipeline`, { pipeline_id: pipelineId });
}

export async function recordDocumentPayment(
  type: DocumentType,
  id: string,
  input: z.infer<typeof inputs.DocumentPaymentInput>
): Promise<unknown> {
  assertSupported(type, 'payments');
  return post(`${documentPath(type)}/${seg(id)}/payments`, input);
}

export function acceptEstimate(id: string, input: z.infer<typeof inputs.EstimateDecisionInput>) {
  return post(`/estimates/${seg(id)}/accept`, input);
}

export function rejectEstimate(id: string, input: z.infer<typeof inputs.EstimateDecisionInput>) {
  return post(`/estimates/${seg(id)}/reject`, input);
}

export function receivePurchaseOrder(id: string, input: z.infer<typeof inputs.ReceiveInput>) {
  return post(`/purchase-orders/${seg(id)}/receive`, input);
}

export function listReceivedItems(id: string) {
  return fetchPage(`/purchase-orders/${seg(id)}/received-items`, ReceivedItem);
}

export function convertDocument(input: z.infer<typeof inputs.ConvertInput>): Promise<unknown> {
  return post('/documents/convert', input);
}

export function skipRecurringInvoice(id: string, date: string): Promise<unknown> {
  return post(`/recurring-invoices/${seg(id)}/skip`, { date });
}

export function getRecurringInvoiceSchedule(id: string): Promise<unknown> {
  return fetchOne(`/recurring-invoices/${seg(id)}/schedule`, DocumentAttachment);
}

export function bulkApproveInvoices(input: z.infer<typeof inputs.BulkApproveInput>) {
  return post('/invoices/bulk/approve', input);
}

export function bulkCancelInvoices(ids: string[]) {
  return post('/invoices/bulk/cancel', { ids });
}

export async function bulkDeleteInvoices(ids: string[]): Promise<void> {
  await deleteOne('/invoices', { ids });
}

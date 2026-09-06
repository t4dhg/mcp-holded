import { deleteOne, getBinary, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import { InboxDocument, inputs } from '../schemas/index.js';
import { fetchOne, fetchPage, uploadFile } from './shared.js';
import type { z } from 'zod';

export interface ListInboxParams {
  limit?: number;
  cursor?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  user_id?: string;
}

export function listInbox(params: ListInboxParams = {}): Promise<Page<InboxDocument>> {
  return fetchPage('/inbox', InboxDocument, { ...params });
}

export function getInboxDocument(id: string): Promise<InboxDocument> {
  return fetchOne(`/inbox/${seg(id)}`, InboxDocument);
}

export function uploadInboxDocument(
  bytes: Uint8Array,
  filename: string,
  contentType?: string
): Promise<unknown> {
  return uploadFile('/inbox', 'document', bytes, filename, contentType);
}

export function downloadInboxFile(id: string, filename: string): Promise<Uint8Array> {
  return getBinary(`/inbox/${seg(id)}/files/${seg(filename)}/download`);
}

export function updateInboxDocument(id: string, input: Record<string, unknown>) {
  return put(`/inbox/${seg(id)}`, input);
}

export function attachInboxDocument(id: string, input: z.infer<typeof inputs.InboxAttachInput>) {
  return post(`/inbox/${seg(id)}/attach`, input);
}

export async function deleteInboxDocument(id: string): Promise<void> {
  await deleteOne(`/inbox/${seg(id)}`);
}

import { deleteOne, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import { Contact, ContactAttachments, ContactGroup, inputs } from '../schemas/index.js';
import { parseResponse } from '../validate.js';
import { createAndReturnId, fetchOne, fetchPage, uploadFile } from './shared.js';
import type { z } from 'zod';

export interface ListContactsParams {
  limit?: number;
  cursor?: string;
  email?: string;
  code?: string;
  phone?: string;
  mobile?: string;
  custom_id?: string;
}

export function listContacts(params: ListContactsParams = {}): Promise<Page<Contact>> {
  return fetchPage('/contacts', Contact, { ...params });
}

/** Substring search on name. This is the only text search v2 offers; `query` on /contacts is ignored. */
export function searchContacts(name: string, params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/contacts/search', Contact, { name, ...params });
}

export function getContact(id: string): Promise<Contact> {
  return fetchOne(`/contacts/${seg(id)}`, Contact);
}

export async function createContact(input: z.infer<typeof inputs.ContactInput>): Promise<Contact> {
  const id = await createAndReturnId('/contacts', input);
  return getContact(id);
}

export async function updateContact(
  id: string,
  input: z.infer<typeof inputs.ContactInput>
): Promise<Contact> {
  await put(`/contacts/${seg(id)}`, input);
  return getContact(id);
}

export async function deleteContact(id: string): Promise<void> {
  await deleteOne(`/contacts/${seg(id)}`);
}

export async function bulkArchiveContacts(contactIds: string[]): Promise<unknown> {
  return post('/contacts/bulk-archive', { contact_ids: contactIds });
}

/** Deletes several contacts at once. Destructive despite the POST verb. */
export async function bulkDeleteContacts(contactIds: string[]): Promise<unknown> {
  return post('/contacts/bulk-delete', { contact_ids: contactIds });
}

export async function listContactAttachments(id: string): Promise<string[]> {
  const raw = await fetchOne(`/contacts/${seg(id)}/attachments`, ContactAttachments);
  return raw.items;
}

export function attachContactFile(
  id: string,
  bytes: Uint8Array,
  filename: string,
  contentType?: string
): Promise<unknown> {
  return uploadFile(`/contacts/${seg(id)}/attachments`, 'file', bytes, filename, contentType);
}

export function getContactPortalLink(id: string): Promise<unknown> {
  return fetchOne(`/contacts/${seg(id)}/portal-link`, ContactAttachments.partial().loose());
}

export function listContactGroups(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/contact-groups', ContactGroup, { ...params });
}

export function getContactGroup(id: string) {
  return fetchOne(`/contact-groups/${seg(id)}`, ContactGroup);
}

export async function createContactGroup(input: z.infer<typeof inputs.ContactGroupInput>) {
  const id = await createAndReturnId('/contact-groups', input);
  return getContactGroup(id);
}

export async function updateContactGroup(
  id: string,
  input: z.infer<typeof inputs.ContactGroupInput>
) {
  await put(`/contact-groups/${seg(id)}`, input);
  return getContactGroup(id);
}

export async function deleteContactGroup(id: string): Promise<void> {
  await deleteOne(`/contact-groups/${seg(id)}`);
}

export { parseResponse };

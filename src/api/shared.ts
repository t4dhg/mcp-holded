/**
 * Helpers shared by the API modules.
 */
import { z } from 'zod';
import { get, post, postForm, seg } from '../http-client.js';
import { pageSchema, toPage, type Page } from '../pagination.js';
import { IdResponse } from '../schemas/index.js';
import { parseResponse } from '../validate.js';
import type { QueryParams } from '../http-client.js';

/** GET a cursor-paginated (or unpaginated) list and validate every item. */
export async function fetchPage<T extends z.ZodTypeAny>(
  endpoint: string,
  item: T,
  params?: QueryParams
): Promise<Page<z.output<T>>> {
  const raw = await get<unknown>(endpoint, params);
  const parsed = parseResponse(pageSchema(item), raw, `GET ${endpoint}`);
  return toPage(parsed);
}

/** GET one record and validate it. */
export async function fetchOne<T extends z.ZodTypeAny>(
  endpoint: string,
  schema: T,
  params?: QueryParams
): Promise<z.output<T>> {
  const raw = await get<unknown>(endpoint, params);
  return parseResponse(schema, raw, `GET ${endpoint}`);
}

/** Holded answers every create with `{ id }`. */
export async function createAndReturnId(endpoint: string, body: unknown): Promise<string> {
  const raw = await post<unknown>(endpoint, body);
  return parseResponse(IdResponse, raw, `POST ${endpoint}`).id;
}

/**
 * Upload a file as multipart/form-data. `field` is the form field name Holded
 * expects (`file` for attachments, `document` for the inbox).
 */
export async function uploadFile<T>(
  endpoint: string,
  field: string,
  bytes: Uint8Array,
  filename: string,
  contentType = 'application/octet-stream'
): Promise<T> {
  const form = new FormData();
  form.append(field, new Blob([bytes as unknown as ArrayBuffer], { type: contentType }), filename);
  return postForm<T>(endpoint, form);
}

export { seg };

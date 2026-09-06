/**
 * Confirmation gate for the low-level holded_request tool.
 *
 * DELETE removes a record for good, PUT and PATCH overwrite one, and Holded
 * also hides destructive operations behind POST: bulk cancel, bulk delete,
 * archive, approve (locks a legal number), send (emails a customer) and
 * reconcile. All of those need `confirm: true`. The first call sends nothing and
 * returns exactly what would be sent so the confirmation is informed.
 */

import { buildUrl, type HttpMethod, type QueryParams } from './http-client.js';

export const GATED_METHODS: ReadonlySet<HttpMethod> = new Set(['DELETE', 'PUT', 'PATCH']);
export const GATED_POST_PATH =
  /(^|\/)(bulk[^/]*|cancel|archive|approve|send|reconcile|ship|ship-by-lines|skip|clock-in|clock-out)(\/|$)/i;

export interface RawCall {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  confirm?: boolean;
}

export function isDestructiveRawCall(method: HttpMethod, path: string): boolean {
  if (GATED_METHODS.has(method)) return true;
  return method === 'POST' && GATED_POST_PATH.test(path);
}

export function checkRawRequestConfirmation(
  call: RawCall,
  baseUrl: string
): { proceed: true } | { proceed: false; message: string } {
  if (!isDestructiveRawCall(call.method, call.path) || call.confirm === true) {
    return { proceed: true };
  }
  const url = buildUrl(baseUrl, call.path, call.query);
  const verb =
    call.method === 'DELETE'
      ? 'permanently delete'
      : call.method === 'POST'
        ? 'irreversibly change'
        : 'overwrite';
  const body = call.body !== undefined ? `\nBody: ${JSON.stringify(call.body)}` : '';
  return {
    proceed: false,
    message:
      `This would ${verb} Holded data and cannot be undone:\n` +
      `${call.method} ${url}${body}\n\n` +
      'Nothing has been sent. To proceed, call this tool again with the same arguments and `confirm: true`.',
  };
}

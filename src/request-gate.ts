/**
 * Confirmation gate for the low-level holded_request tool.
 *
 * Raw writes require confirmation regardless of how Holded names the endpoint.
 * The first call sends nothing and returns the method, URL, and request body.
 */

import { buildUrl, type HttpMethod, type QueryParams } from './http-client.js';

export function isRawEndpointPath(path: string): boolean {
  if (!path.startsWith('/') || path.includes('//') || /[?#\\\s\p{Cc}]/u.test(path)) return false;
  return path.split('/').every(segment => {
    try {
      const decoded = decodeURIComponent(segment);
      // Separators, control characters and additional escapes can change how a
      // downstream server interprets the route. Dot segments can escape the base path.
      return decoded !== '.' && decoded !== '..' && !/[/?#\\\p{Cc}]|%[0-9a-f]{2}/iu.test(decoded);
    } catch {
      return false;
    }
  });
}

export interface RawCall {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  confirm?: boolean;
}

export function checkRawRequestConfirmation(
  call: RawCall,
  baseUrl: string
): { proceed: true } | { proceed: false; message: string } {
  if (call.method === 'GET' || call.confirm === true) {
    return { proceed: true };
  }
  const url = buildUrl(baseUrl, call.path, call.query);
  const verb = call.method === 'DELETE' ? 'permanently delete' : 'change';
  const body = call.body !== undefined ? `\nBody: ${JSON.stringify(call.body)}` : '';
  return {
    proceed: false,
    message:
      `This request would ${verb} Holded data:\n` +
      `${call.method} ${url}${body}\n\n` +
      'Nothing has been sent. To proceed, call this tool again with the same arguments and `confirm: true`.',
  };
}

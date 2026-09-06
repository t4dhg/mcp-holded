import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { vi } from 'vitest';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');

export function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, `${name}.json`), 'utf8')) as T;
}

export function fixtureNames(): string[] {
  return readdirSync(fixturesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));
}

export interface MockResponseInit {
  status?: number;
  body?: unknown;
  text?: string;
  headers?: Record<string, string>;
}

export function mockResponse(init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;
  const headers = new Headers({ 'content-type': 'application/json', ...(init.headers ?? {}) });
  const text = init.text ?? (init.body === undefined ? '' : JSON.stringify(init.body));
  // Response() rejects a body for 204, 205 and 304.
  const body = [204, 205, 304].includes(status) ? null : text;
  return new Response(body, { status, headers });
}

export function stubFetch(...responses: (MockResponseInit | (() => Response))[]) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce(typeof r === 'function' ? r() : mockResponse(r));
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function setEnv() {
  vi.stubEnv('HOLDED_API_KEY', 'pat_test_secret');
  vi.stubEnv('HOLDED_BASE_URL', 'https://api.holded.test/api/v2');
  vi.stubEnv('HOLDED_MAX_RETRIES', '3');
  vi.stubEnv('HOLDED_TIMEOUT_MS', '2000');
}

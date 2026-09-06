import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildUrl,
  deleteOne,
  get,
  getBackoffDelay,
  getBinary,
  holdedRequest,
  looksLikeHtml,
  post,
} from '../../http-client.js';
import {
  AuthorizationError,
  MethodNotAllowedError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  UnexpectedHtmlError,
  ValidationError,
} from '../../errors.js';
import { fixture, mockResponse, setEnv, stubFetch } from './helpers.js';

describe('http client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('sends Bearer auth and drops empty query params', async () => {
    const fetchMock = stubFetch({ body: { items: [] } });
    await get('/contacts', { limit: 2, cursor: undefined, email: '', archived: false });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.holded.test/api/v2/contacts?limit=2&archived=false');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer pat_test_secret',
    });
  });

  it('builds URLs with and without a leading slash', () => {
    expect(buildUrl('https://x/api/v2', 'contacts')).toBe('https://x/api/v2/contacts');
    expect(buildUrl('https://x/api/v2', '/contacts', { a: 1 })).toBe(
      'https://x/api/v2/contacts?a=1'
    );
  });

  it('maps a 403 problem to AuthorizationError with the detail', async () => {
    stubFetch({ status: 403, body: fixture('error-403') });
    await expect(get('/contacts')).rejects.toBeInstanceOf(AuthorizationError);
    stubFetch({ status: 403, body: fixture('error-403') });
    await expect(get('/contacts')).rejects.toThrow(/Access denied/);
  });

  it('maps the "No route found" 404 to NotFoundError carrying the message', async () => {
    stubFetch({ status: 404, body: fixture('error-404-route') });
    await expect(get('/numberingseries')).rejects.toThrow(/No route found/);
  });

  it('maps a 404 problem to NotFoundError', async () => {
    stubFetch({ status: 404, body: fixture('error-404') });
    await expect(get('/employees/me')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps a 400 problem to ValidationError with the Holded detail', async () => {
    stubFetch({ status: 400, body: fixture('error-400') });
    await expect(get('/contacts', { cursor: 'bogus' })).rejects.toThrow(/Error parsing ObjectId/);
    stubFetch({ status: 400, body: fixture('error-400') });
    await expect(get('/contacts')).rejects.toBeInstanceOf(ValidationError);
  });

  it('maps 405 to MethodNotAllowedError', async () => {
    stubFetch({ status: 405, body: { message: 'No route found for "GET ..."' } });
    await expect(get('/invoices/x/payments')).rejects.toBeInstanceOf(MethodNotAllowedError);
  });

  it('treats the HTML app shell as an error even with a 200', async () => {
    stubFetch({
      status: 200,
      text: '<!DOCTYPE html>\n<html><head lang="es">',
      headers: { 'content-type': 'text/html' },
    });
    await expect(get('/contacts/notanid')).rejects.toBeInstanceOf(UnexpectedHtmlError);
    expect(looksLikeHtml('  <html>', null)).toBe(true);
    expect(looksLikeHtml('{"a":1}', 'application/json')).toBe(false);
  });

  it('retries a GET on 429 honouring Retry-After, then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(
      { status: 429, body: { detail: 'Rate limit exceeded' }, headers: { 'retry-after': '1' } },
      { body: { ok: true } }
    );
    const promise = get<{ ok: boolean }>('/contacts');
    await vi.advanceTimersByTimeAsync(1100);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('retries a GET on 5xx up to maxRetries and then throws ServerError', async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetch(
      { status: 502, text: 'bad gateway' },
      { status: 503, text: 'unavailable' },
      { status: 500, text: 'boom' }
    );
    const promise = get('/contacts').catch(e => e);
    await vi.advanceTimersByTimeAsync(30000);
    const error = await promise;
    expect(error).toBeInstanceOf(ServerError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('never retries a POST, even on a retryable status', async () => {
    const fetchMock = stubFetch({ status: 503, text: 'unavailable' });
    await expect(post('/contacts', { name: 'x' })).rejects.toBeInstanceOf(ServerError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never retries a DELETE and returns undefined on an empty body', async () => {
    const fetchMock = stubFetch({ status: 204, text: '' });
    await expect(deleteOne('/contacts/abc')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('DELETE');
  });

  it('serialises a JSON body with the content type', async () => {
    const fetchMock = stubFetch({ status: 201, body: { id: 'abc' } });
    await post('/contacts', { name: 'Example' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe('{"name":"Example"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('turns an abort into TimeoutError and does not hang', async () => {
    vi.stubEnv('HOLDED_MAX_RETRIES', '1');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          })
      )
    );
    await expect(holdedRequest('/slow', { timeout: 10 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('returns bytes for binary responses and rejects HTML there too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        })
      )
    );
    const bytes = await getBinary('/invoices/abc/pdf');
    expect(Array.from(bytes)).toEqual([37, 80, 68, 70]);

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          mockResponse({ status: 200, text: '<html>', headers: { 'content-type': 'text/html' } })
        )
    );
    await expect(getBinary('/invoices/abc/pdf')).rejects.toBeInstanceOf(UnexpectedHtmlError);
  });

  it('caps backoff at 10 seconds plus jitter', () => {
    for (let attempt = 1; attempt <= 8; attempt++) {
      const d = getBackoffDelay(attempt);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(12000);
    }
    expect(getBackoffDelay(1)).toBeLessThanOrEqual(1200);
  });

  it('exposes RateLimitError.retryAfter', async () => {
    vi.stubEnv('HOLDED_MAX_RETRIES', '1');
    stubFetch({ status: 429, body: {}, headers: { 'retry-after': '7' } });
    const error = await get('/x').catch(e => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(7);
  });
});

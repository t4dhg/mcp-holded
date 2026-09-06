/**
 * HTTP client for the Holded v2 API.
 *
 * - Bearer auth from HOLDED_API_KEY.
 * - GET requests retry with exponential backoff and jitter, honouring Retry-After.
 * - Writes never retry: Holded has no idempotency key, so a retried POST could
 *   create a second invoice.
 * - RFC 7807 problem bodies, `{ message }` route errors and the HTML app shell
 *   are all turned into typed errors (see errors.ts).
 */

import { getConfig, debug } from './config.js';
import {
  errorFromResponse,
  isRetryableError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  UnexpectedHtmlError,
  type ProblemDetails,
} from './errors.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParamValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryParamValue>;

export interface RequestOptions {
  method?: HttpMethod;
  params?: QueryParams;
  /** JSON body. Serialised as-is. */
  body?: unknown;
  /** Multipart body. Takes precedence over `body`. */
  form?: FormData;
  timeout?: number;
  maxRetries?: number;
  /** `binary` returns the raw bytes (PDF downloads). */
  responseType?: 'json' | 'binary';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Exponential backoff capped at 10 s with plus or minus 20 percent jitter. */
export function getBackoffDelay(attempt: number, baseDelay = 1000): number {
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, 10000);
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.round(capped + jitter);
}

/** Build the request URL. Empty, null and undefined params are dropped, which is what Holded expects. */
export function buildUrl(baseUrl: string, endpoint: string, params?: QueryParams): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

const HTML_PATTERN = /^\s*<(!doctype|html)\b/i;

export function looksLikeHtml(text: string, contentType: string | null): boolean {
  return (contentType ?? '').includes('text/html') || HTML_PATTERN.test(text.slice(0, 200));
}

async function handleJsonResponse<T>(
  response: Response,
  endpoint: string,
  method: HttpMethod
): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get('content-type');

  if (looksLikeHtml(text, contentType)) {
    throw new UnexpectedHtmlError(response.status, endpoint);
  }

  // An empty body (204 on DELETE, some 200s) is `undefined`, never null, so
  // callers can distinguish "nothing" from a JSON null.
  let parsed: unknown = undefined;
  if (text.trim() !== '') {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (response.ok) {
    debug('Response', { endpoint, method, status: response.status });
    return parsed as T;
  }

  debug(`API error ${response.status}`, { endpoint, method, body: text.slice(0, 500) });
  throw errorFromResponse(
    response.status,
    endpoint,
    method,
    (parsed ?? null) as ProblemDetails | string | null,
    response.headers.get('retry-after')
  );
}

async function handleBinaryResponse(
  response: Response,
  endpoint: string,
  method: HttpMethod
): Promise<Uint8Array> {
  if (!response.ok) {
    const text = await response.text();
    if (looksLikeHtml(text, response.headers.get('content-type'))) {
      throw new UnexpectedHtmlError(response.status, endpoint);
    }
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep text
    }
    throw errorFromResponse(
      response.status,
      endpoint,
      method,
      parsed as ProblemDetails | string,
      response.headers.get('retry-after')
    );
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new UnexpectedHtmlError(response.status, endpoint);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Make a request. GETs retry on 429, 5xx, timeouts and network errors; every
 * other method is sent exactly once.
 */
export async function holdedRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const config = getConfig();
  const method = options.method ?? 'GET';
  const url = buildUrl(config.baseUrl, endpoint, options.params);
  const timeout = options.timeout ?? config.timeout;
  const maxAttempts = method === 'GET' ? Math.max(1, options.maxRetries ?? config.maxRetries) : 1;

  debug(`${method} ${url}`);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: options.responseType === 'binary' ? '*/*' : 'application/json',
      };
      let body: BodyInit | undefined;
      if (options.form) {
        body = options.form;
      } else if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      }

      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      clearTimeout(timer);

      if (options.responseType === 'binary') {
        return (await handleBinaryResponse(response, endpoint, method)) as T;
      }
      return await handleJsonResponse<T>(response, endpoint, method);
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new TimeoutError(timeout, endpoint);
      } else if (error instanceof TypeError) {
        lastError = new NetworkError(error.message, error);
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new NetworkError('Unknown failure');
      }

      const shouldRetry = attempt < maxAttempts && isRetryableError(lastError);
      if (!shouldRetry) break;

      const delay =
        lastError instanceof RateLimitError && lastError.retryAfter
          ? lastError.retryAfter * 1000
          : getBackoffDelay(attempt);
      debug(`Retry ${attempt}/${maxAttempts} in ${delay}ms`, { error: lastError.message });
      await sleep(delay);
    }
  }

  throw lastError ?? new NetworkError('Request failed');
}

export function get<T>(endpoint: string, params?: QueryParams): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'GET', params });
}

export function getBinary(endpoint: string, params?: QueryParams): Promise<Uint8Array> {
  return holdedRequest<Uint8Array>(endpoint, { method: 'GET', params, responseType: 'binary' });
}

export function post<T>(endpoint: string, body?: unknown, params?: QueryParams): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'POST', body, params });
}

export function postForm<T>(endpoint: string, form: FormData): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'POST', form });
}

export function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'PUT', body });
}

export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'PATCH', body });
}

/** Irreversible. Every exported API function that calls this is picked up by the confirmation-coverage test. */
export function deleteOne<T>(endpoint: string, body?: unknown): Promise<T> {
  return holdedRequest<T>(endpoint, { method: 'DELETE', body });
}

/** Encode one path segment (ids, filenames, tag names). */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

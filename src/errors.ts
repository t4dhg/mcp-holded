/**
 * Structured errors for the Holded v2 client.
 *
 * Holded answers 400, 403 and 404 with RFC 7807 problem details
 * (`{ type, title, status, detail }`), unknown routes with `{ message }`, and
 * some malformed paths with its HTML app shell and a 200 or 405. Every one of
 * those becomes a typed error here so tool handlers can report something useful.
 */

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  message?: string;
}

export class HoldedError extends Error {
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: { isRetryable?: boolean; context?: Record<string, unknown>; cause?: Error }
  ) {
    super(message);
    this.name = 'HoldedError';
    this.isRetryable = options?.isRetryable ?? false;
    this.context = options?.context;
    if (options?.cause) this.cause = options.cause;
  }
}

export class HttpError extends HoldedError {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(
    statusCode: number,
    endpoint: string,
    message: string,
    options?: { isRetryable?: boolean; context?: Record<string, unknown> }
  ) {
    super(message, options);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/** 401. Not observed live (Holded uses 403 for bad keys) but kept for completeness. */
export class AuthenticationError extends HttpError {
  constructor(endpoint: string, context?: Record<string, unknown>) {
    super(401, endpoint, 'Authentication failed. Check HOLDED_API_KEY.', { context });
    this.name = 'AuthenticationError';
  }
}

/** 403. Holded returns this for a missing, malformed or revoked key as well as for real permission problems. */
export class AuthorizationError extends HttpError {
  constructor(endpoint: string, detail?: string, context?: Record<string, unknown>) {
    super(
      403,
      endpoint,
      `Access denied${detail ? ` (${detail})` : ''}. Holded answers 403 both for an invalid HOLDED_API_KEY and for a token without permission for this resource.`,
      { context }
    );
    this.name = 'AuthorizationError';
  }
}

/** 404. Either a record that does not exist or a path that is not a v2 route. */
export class NotFoundError extends HttpError {
  constructor(endpoint: string, detail?: string, context?: Record<string, unknown>) {
    super(404, endpoint, detail ? `Not found: ${detail}` : `Not found: ${endpoint}`, { context });
    this.name = 'NotFoundError';
  }
}

/** 405. Holded uses it when the method is wrong or a path segment was taken for an id. */
export class MethodNotAllowedError extends HttpError {
  constructor(endpoint: string, method: string, context?: Record<string, unknown>) {
    super(405, endpoint, `${method} is not allowed on ${endpoint}.`, { context });
    this.name = 'MethodNotAllowedError';
  }
}

/** 400. Holded's detail is specific ("Invalid status \"paid\". Allowed values: ...") so it is passed through. */
export class ValidationError extends HttpError {
  constructor(endpoint: string, detail: string, context?: Record<string, unknown>) {
    super(400, endpoint, `Bad request: ${detail}`, { context });
    this.name = 'ValidationError';
  }
}

/** 422. Payload rejected by server-side validation. */
export class UnprocessableEntityError extends HttpError {
  constructor(endpoint: string, detail: string, context?: Record<string, unknown>) {
    super(422, endpoint, `Unprocessable: ${detail}`, { context });
    this.name = 'UnprocessableEntityError';
  }
}

/** 429. Holded documents 100 requests per minute per key. */
export class RateLimitError extends HttpError {
  public readonly retryAfter?: number;

  constructor(endpoint: string, retryAfter?: number, context?: Record<string, unknown>) {
    super(
      429,
      endpoint,
      retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : 'Rate limit exceeded (Holded allows 100 requests per minute per key).',
      { isRetryable: true, context }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends HttpError {
  constructor(statusCode: number, endpoint: string, detail?: string) {
    super(
      statusCode,
      endpoint,
      `Holded server error ${statusCode}${detail ? `: ${detail}` : ''}.`,
      {
        isRetryable: true,
      }
    );
    this.name = 'ServerError';
  }
}

/**
 * api.holded.com serves its single-page web app for some malformed paths, with
 * a 200 or a 405. Treating that as a success would hand a wall of HTML to the
 * model, so it is an error in its own right.
 */
export class UnexpectedHtmlError extends HttpError {
  constructor(statusCode: number, endpoint: string) {
    super(
      statusCode,
      endpoint,
      `Holded returned an HTML page (HTTP ${statusCode}) for ${endpoint}. The path is probably not a v2 route or has a malformed id.`
    );
    this.name = 'UnexpectedHtmlError';
  }
}

export class TimeoutError extends HoldedError {
  public readonly timeoutMs: number;
  constructor(timeoutMs: number, endpoint: string) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms.`, {
      isRetryable: true,
      context: { endpoint },
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class NetworkError extends HoldedError {
  constructor(message: string, cause?: Error) {
    super(`Network error: ${message}`, { isRetryable: true, cause });
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends HoldedError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** A response that does not match the schema built from real responses. */
export class SchemaValidationError extends HoldedError {
  public readonly issues: string[];
  constructor(context: string, issues: string[]) {
    super(
      `Response from ${context} did not match the expected schema: ${issues.slice(0, 5).join('; ')}${issues.length > 5 ? ` (and ${issues.length - 5} more)` : ''}`,
      { context: { source: context } }
    );
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

/** Input from the model that does not match the write contract. */
export class InputValidationError extends HoldedError {
  public readonly issues: string[];
  constructor(context: string, issues: string[]) {
    super(`Invalid input for ${context}: ${issues.join('; ')}`);
    this.name = 'InputValidationError';
    this.issues = issues;
  }
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof HoldedError && error.isRetryable;
}

/** Build the typed error for a non-2xx response. */
export function errorFromResponse(
  status: number,
  endpoint: string,
  method: string,
  body: ProblemDetails | string | null,
  retryAfterHeader?: string | null
): HttpError {
  const problem = body && typeof body === 'object' ? body : undefined;
  const detail = problem?.detail ?? problem?.message ?? (typeof body === 'string' ? body : '');
  const context = problem ? { raw: problem } : undefined;
  switch (status) {
    case 400:
      return new ValidationError(endpoint, detail || 'Bad request', context);
    case 401:
      return new AuthenticationError(endpoint, context);
    case 403:
      return new AuthorizationError(endpoint, detail || undefined, context);
    case 404:
      return new NotFoundError(endpoint, detail || undefined, context);
    case 405:
      return new MethodNotAllowedError(endpoint, method, context);
    case 422:
      return new UnprocessableEntityError(endpoint, detail || 'Unprocessable entity', context);
    case 429: {
      const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;
      return new RateLimitError(
        endpoint,
        retryAfter && !Number.isNaN(retryAfter) ? retryAfter : undefined,
        context
      );
    }
    default:
      if (status >= 500) return new ServerError(status, endpoint, detail || undefined);
      return new HttpError(
        status,
        endpoint,
        `Holded API error ${status}: ${detail || 'no detail'}`,
        {
          context,
        }
      );
  }
}

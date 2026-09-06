import { z } from 'zod';
import { InputValidationError, SchemaValidationError } from './errors.js';

function issueStrings(error: z.ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.length ? issue.path.map(String).join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
}

/** Validate an API response against a schema built from real responses. */
export function parseResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: string
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new SchemaValidationError(context, issueStrings(result.error));
  return result.data;
}

/** Validate model-supplied input against a write contract before anything is sent. */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: string
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new InputValidationError(context, issueStrings(result.error));
  return result.data;
}

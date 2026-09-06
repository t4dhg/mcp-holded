/**
 * Helpers shared by every tool handler.
 */

interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  [x: string]: unknown;
  content: TextContent[];
  isError?: boolean;
}

export function textResponse(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

export function jsonResponse(data: unknown, prefix?: string): ToolResult {
  const json = JSON.stringify(data, null, 2);
  return textResponse(prefix ? `${prefix}\n\n${json}` : json);
}

export function formatToolError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

export function requireArg<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`\`${name}\` is required for this action`);
  }
  return value;
}

/**
 * MCP prompts: workflows a person invokes by name.
 *
 * Each one pre-reads the facts and hands back a report plus the exact tool
 * calls to act on it. See src/prompts/shared.ts for the shape.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PromptDeps } from './shared.js';
import { registerReceivablesPrompt } from './receivables.js';
import { registerVatPrompt } from './vat.js';

export function registerPrompts(server: McpServer, deps: PromptDeps = {}): void {
  registerReceivablesPrompt(server, deps);
  registerVatPrompt(server, deps);
}

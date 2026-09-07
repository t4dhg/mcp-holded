/**
 * MCP prompts: workflows a person invokes by name.
 *
 * Each one pre-reads the facts and hands back a report plus the exact tool
 * calls to act on it. See src/prompts/shared.ts for the shape.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PromptDeps } from './shared.js';

export function registerPrompts(server: McpServer, _deps: PromptDeps = {}): void {
  // Prompt registrations are added by the tasks that follow.
  void server;
}

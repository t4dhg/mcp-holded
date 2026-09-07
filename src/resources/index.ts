/**
 * MCP resources: read-only context a client can attach to a conversation.
 *
 * Each resource exists because of a specific way the API misleads a model that
 * holds only the tool schemas. A resource that merely wraps a list endpoint
 * does not belong here; that is what the tools are for.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGuideResources } from './guides.js';
import { registerIrreversibleResource } from './irreversible.js';
import { registerReferenceResources } from './references.js';

export function registerResources(server: McpServer): void {
  registerGuideResources(server);
  registerIrreversibleResource(server);
  registerReferenceResources(server);
}

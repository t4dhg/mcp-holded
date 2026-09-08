#!/usr/bin/env node
/**
 * MCP server for the Holded API v2.
 *
 * Fourteen hierarchical tools, one per domain, each with an `action`
 * parameter, plus `holded_discover` to list them and `holded_request` as a
 * gated escape hatch for anything without a dedicated action.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getConfig, debug } from '../config.js';
import { textResponse } from '../tool-utils.js';
import { CATEGORIES } from './shared.js';
import { registerContactsTool } from './contacts.js';
import { registerSalesTool } from './sales.js';
import { registerPurchasesTool } from './purchases.js';
import { registerPaymentsTool } from './payments.js';
import { registerTreasuryTool } from './treasury.js';
import { registerAccountingTool } from './accounting.js';
import { registerCatalogTool } from './catalog.js';
import { registerTeamTool } from './team.js';
import { registerCrmTool } from './crm.js';
import { registerProjectsTool } from './projects.js';
import { registerCalendarTool } from './calendar.js';
import { registerInboxTool } from './inbox.js';
import { registerWebhooksTool } from './webhooks.js';
import { registerRequestTool } from './request.js';
import { registerResources } from '../resources/index.js';
import { registerPrompts } from '../prompts/index.js';

export const SERVER_VERSION = '2.1.0';

export function createServer(): McpServer {
  const server = new McpServer({ name: 'holded', version: SERVER_VERSION });

  server.registerTool(
    'holded_discover',
    {
      title: 'Discover Holded tools',
      description:
        'List the Holded tool domains. Each domain is one tool named holded_<domain> with an `action` parameter; call it with no action to see the actions in its error message, or read the tool description.',
      inputSchema: {},
    },
    () =>
      textResponse(
        Object.entries(CATEGORIES)
          .map(([key, cat]) => `- holded_${key}: ${cat.name}. ${cat.description}`)
          .join('\n')
      )
  );

  registerContactsTool(server);
  registerSalesTool(server);
  registerPurchasesTool(server);
  registerPaymentsTool(server);
  registerTreasuryTool(server);
  registerAccountingTool(server);
  registerCatalogTool(server);
  registerTeamTool(server);
  registerCrmTool(server);
  registerProjectsTool(server);
  registerCalendarTool(server);
  registerInboxTool(server);
  registerWebhooksTool(server);
  registerRequestTool(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

export async function main(): Promise<void> {
  // Fail fast on a missing or v1-shaped key instead of on the first tool call.
  const config = getConfig();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  debug(`MCP server running on stdio, base ${config.baseUrl}`);
}

// z is re-exported so tool modules and tests share one zod instance.
export { z };

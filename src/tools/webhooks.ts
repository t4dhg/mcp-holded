import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import { inputs } from '../schemas/index.js';
import { formatToolError, jsonResponse, requireArg, textResponse } from '../tool-utils.js';
import {
  checkConfirmation,
  confirmArg,
  data,
  dataArg,
  idArg,
  listArgs,
  pageResponse,
  paging,
} from './shared.js';

export function registerWebhooksTool(server: McpServer) {
  server.registerTool(
    'holded_webhooks',
    {
      title: 'Holded webhooks',
      description:
        'Webhooks and API usage. Actions: list, get, events (supported event types), create, update, enable, disable, delete, usage (API quota for the current month).',
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'events',
          'create',
          'update',
          'enable',
          'disable',
          'delete',
          'usage',
        ]),
        id: idArg,
        usage_type: z.string().optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list':
            return pageResponse(await api.listWebhooks(paging(args)), 'webhook');
          case 'get':
            return jsonResponse(await api.getWebhook(requireArg(args.id, 'id')));
          case 'events':
            return jsonResponse(await api.listWebhookEvents());
          case 'create':
            return jsonResponse(
              await api.createWebhook(data(inputs.WebhookInput, args.data, 'create webhook')),
              'Webhook created.'
            );
          case 'update': {
            const gate = checkConfirmation('update_webhook', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateWebhook(
                requireArg(args.id, 'id'),
                data(inputs.WebhookUpdateInput, args.data, 'update webhook')
              ),
              'Webhook updated.'
            );
          }
          case 'enable':
            return jsonResponse(
              await api.enableWebhook(requireArg(args.id, 'id')),
              'Webhook enabled.'
            );
          case 'disable': {
            const gate = checkConfirmation('disable_webhook', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.disableWebhook(requireArg(args.id, 'id')),
              'Webhook disabled.'
            );
          }
          case 'delete': {
            const gate = checkConfirmation('delete_webhook', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteWebhook(requireArg(args.id, 'id'));
            return textResponse(`Webhook ${args.id} deleted.`);
          }
          case 'usage':
            return jsonResponse(await api.getUsage(args.usage_type));
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

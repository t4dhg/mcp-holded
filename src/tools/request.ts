import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBaseUrl } from '../config.js';
import { holdedRequest } from '../http-client.js';
import { checkRawRequestConfirmation } from '../request-gate.js';
import { formatToolError, jsonResponse, textResponse } from '../tool-utils.js';

export function registerRequestTool(server: McpServer) {
  server.registerTool(
    'holded_request',
    {
      title: 'Call any Holded v2 endpoint',
      description:
        'Low-level escape hatch for the ~350 v2 operations. `path` is relative to https://api.holded.com/api/v2 and must start with "/". Responses are returned unvalidated. DELETE, PUT, PATCH, and POST to paths containing bulk, cancel, archive, approve, send, reconcile, ship, skip, clock-in or clock-out require `confirm: true`; the first call returns the exact request and sends nothing. Prefer the domain tools, which validate inputs and responses.',
      inputSchema: {
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        path: z.string().regex(/^\//, 'path must start with /'),
        query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        body: z.record(z.string(), z.unknown()).optional(),
        confirm: z.boolean().optional(),
      },
    },
    async ({ method, path, query, body, confirm }) => {
      try {
        const gate = checkRawRequestConfirmation(
          { method, path, query, body, confirm },
          getBaseUrl()
        );
        if (!gate.proceed) return textResponse(gate.message);
        const result = await holdedRequest<unknown>(path, { method, params: query, body });
        return jsonResponse(result ?? { ok: true, status: 'no content' });
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

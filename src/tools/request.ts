import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBaseUrl } from '../config.js';
import { holdedRequest } from '../http-client.js';
import { checkRawRequestConfirmation, isRawEndpointPath } from '../request-gate.js';
import { formatToolError, jsonResponse, textResponse } from '../tool-utils.js';

export function registerRequestTool(server: McpServer) {
  server.registerTool(
    'holded_request',
    {
      title: 'Call any Holded v2 endpoint',
      description:
        'Low-level access to Holded v2. Use a relative endpoint path starting with "/" and pass URL parameters in `query`. Responses are returned unvalidated. Every POST, PUT, PATCH, and DELETE requires `confirm: true`. A call without it previews the request and sends nothing. Prefer the domain tools, which validate inputs and responses.',
      inputSchema: {
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        path: z
          .string()
          .refine(
            isRawEndpointPath,
            'Use a relative API path starting with / and put parameters in query'
          ),
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

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

export function registerPaymentsTool(server: McpServer) {
  server.registerTool(
    'holded_payments',
    {
      title: 'Holded payments',
      description:
        'Payments (money out) and collections (money in). Actions: list (start_date, end_date, banking_account_id, document_id), get, create, update, delete, list_methods, get_method. Amounts are strings with a dot decimal separator.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete', 'list_methods', 'get_method']),
        id: idArg,
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        banking_account_id: z.string().optional(),
        document_id: z.string().optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list':
            return pageResponse(
              await api.listPayments({
                ...paging(args),
                start_date: args.start_date,
                end_date: args.end_date,
                banking_account_id: args.banking_account_id,
                document_id: args.document_id,
              }),
              'payment'
            );
          case 'get':
            return jsonResponse(await api.getPayment(requireArg(args.id, 'id')));
          case 'create':
            return jsonResponse(
              await api.createPayment(data(inputs.PaymentInput, args.data, 'create payment')),
              'Payment created.'
            );
          case 'update': {
            const gate = checkConfirmation('update_payment', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updatePayment(
                requireArg(args.id, 'id'),
                data(inputs.PaymentUpdateInput, args.data, 'update payment')
              ),
              'Payment updated.'
            );
          }
          case 'delete': {
            const gate = checkConfirmation('delete_payment', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deletePayment(requireArg(args.id, 'id'));
            return textResponse(`Payment ${args.id} deleted.`);
          }
          case 'list_methods':
            return pageResponse(await api.listPaymentMethods(paging(args)), 'payment method');
          case 'get_method':
            return jsonResponse(await api.getPaymentMethod(requireArg(args.id, 'id')));
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

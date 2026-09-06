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

export function registerTreasuryTool(server: McpServer) {
  server.registerTool(
    'holded_treasury',
    {
      title: 'Holded treasury',
      description:
        'Banking accounts and their movements. Actions: list_accounts (type, archived), get_account, create_account, update_account, archive_account, delete_account, list_movements (bank movements of account `id`, start_date, end_date), list_cash_movements, create_movements (manual movements), reconcile (movement_id plus data.documents), list_remittances, get_remittance, list_forecasts, get_forecast, create_forecast, update_forecast, delete_forecast. Amounts are strings with a dot decimal separator.',
      inputSchema: {
        action: z.enum([
          'list_accounts',
          'get_account',
          'create_account',
          'update_account',
          'archive_account',
          'delete_account',
          'list_movements',
          'list_cash_movements',
          'create_movements',
          'reconcile',
          'list_remittances',
          'get_remittance',
          'list_forecasts',
          'get_forecast',
          'create_forecast',
          'update_forecast',
          'delete_forecast',
        ]),
        id: idArg,
        movement_id: z.string().optional(),
        type: z.enum(['bank', 'card', 'gateway', 'cash']).optional(),
        archived: z.boolean().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        remittance_type: z.enum(['inbound', 'outbound']).optional(),
        status: z.enum(['pending', 'completed', 'processing']).optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_accounts':
            return pageResponse(
              await api.listTreasuryAccounts({
                ...paging(args),
                type: args.type,
                archived: args.archived,
              }),
              'account'
            );
          case 'get_account':
            return jsonResponse(await api.getTreasuryAccount(requireArg(args.id, 'id')));
          case 'create_account':
            return jsonResponse(
              await api.createTreasuryAccount(
                data(inputs.TreasuryAccountInput, args.data, 'create account')
              ),
              'Account created.'
            );
          case 'update_account': {
            const gate = checkConfirmation('update_treasury_account', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateTreasuryAccount(
                requireArg(args.id, 'id'),
                data(inputs.TreasuryAccountUpdateInput, args.data, 'update account')
              ),
              'Account updated.'
            );
          }
          case 'archive_account': {
            const gate = checkConfirmation('archive_treasury_account', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.archiveTreasuryAccount(requireArg(args.id, 'id')),
              'Account archived.'
            );
          }
          case 'delete_account': {
            const gate = checkConfirmation('delete_treasury_account', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteTreasuryAccount(requireArg(args.id, 'id'));
            return textResponse(`Account ${args.id} deleted.`);
          }
          case 'list_movements':
            return pageResponse(
              await api.listBankMovements(requireArg(args.id, 'id'), {
                ...paging(args),
                start_date: args.start_date,
                end_date: args.end_date,
              }),
              'movement'
            );
          case 'list_cash_movements':
            return pageResponse(
              await api.listCashMovements(requireArg(args.id, 'id'), {
                ...paging(args),
                start_date: args.start_date,
                end_date: args.end_date,
              }),
              'movement'
            );
          case 'create_movements':
            return jsonResponse(
              await api.createBankMovements(
                requireArg(args.id, 'id'),
                data(inputs.BankMovementsInput, args.data, 'create movements')
              ),
              'Movements created.'
            );
          case 'reconcile': {
            const gate = checkConfirmation('reconcile_bank_movement', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.reconcileBankMovement(
                requireArg(args.id, 'id'),
                requireArg(args.movement_id, 'movement_id'),
                data(inputs.ReconcileInput, args.data, 'reconcile')
              ),
              'Movement reconciled.'
            );
          }
          case 'list_remittances':
            return pageResponse(
              await api.listRemittances({
                ...paging(args),
                type: args.remittance_type,
                status: args.status,
                start_date: args.start_date,
                end_date: args.end_date,
              }),
              'remittance'
            );
          case 'get_remittance':
            return jsonResponse(await api.getRemittance(requireArg(args.id, 'id')));
          case 'list_forecasts':
            return pageResponse(await api.listInvoicingForecasts(paging(args)), 'forecast');
          case 'get_forecast':
            return jsonResponse(await api.getInvoicingForecast(requireArg(args.id, 'id')));
          case 'create_forecast':
            return jsonResponse(
              await api.createInvoicingForecast(
                data(inputs.InvoicingForecastInput, args.data, 'create forecast')
              ),
              'Forecast created.'
            );
          case 'update_forecast': {
            const gate = checkConfirmation('update_invoicing_forecast', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateInvoicingForecast(
                requireArg(args.id, 'id'),
                data(inputs.InvoicingForecastInput, args.data, 'update forecast')
              ),
              'Forecast updated.'
            );
          }
          case 'delete_forecast': {
            const gate = checkConfirmation('delete_invoicing_forecast', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteInvoicingForecast(requireArg(args.id, 'id'));
            return textResponse(`Forecast ${args.id} deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

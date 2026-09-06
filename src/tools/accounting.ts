import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import { NUMBERING_SERIES_TYPES, inputs } from '../schemas/index.js';
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

export function registerAccountingTool(server: McpServer) {
  server.registerTool(
    'holded_accounting',
    {
      title: 'Holded accounting',
      description:
        'Chart of accounts, journal, taxes and configuration lists. Actions: list_accounts (start_date and end_date add debit, credit and balance for the window; include_empty), create_account, list_ledger (start_date and end_date required; account), create_ledger_entry, list_taxes, tax_keys (country), list_expenses_accounts, get_expenses_account, create_expenses_account, update_expenses_account, delete_expenses_account, list_sales_channels, get_sales_channel, create_sales_channel, update_sales_channel, delete_sales_channel, list_numbering_series (series_type), create_numbering_series, update_numbering_series, delete_numbering_series, list_tags, create_tag, delete_tag (name). Ledger dates are DD/MM/YYYY; amounts use a dot decimal separator.',
      inputSchema: {
        action: z.enum([
          'list_accounts',
          'create_account',
          'list_ledger',
          'create_ledger_entry',
          'list_taxes',
          'tax_keys',
          'list_expenses_accounts',
          'get_expenses_account',
          'create_expenses_account',
          'update_expenses_account',
          'delete_expenses_account',
          'list_sales_channels',
          'get_sales_channel',
          'create_sales_channel',
          'update_sales_channel',
          'delete_sales_channel',
          'list_numbering_series',
          'create_numbering_series',
          'update_numbering_series',
          'delete_numbering_series',
          'list_tags',
          'create_tag',
          'delete_tag',
        ]),
        id: idArg,
        name: z.string().optional().describe('Tag name for create_tag and delete_tag'),
        series_type: z
          .enum(NUMBERING_SERIES_TYPES)
          .optional()
          .describe('Numbering series document type'),
        country: z.string().optional().describe('ISO country code for tax_keys'),
        section: z.string().optional(),
        account: z.number().int().optional().describe('Account number filter for list_ledger'),
        archived: z.boolean().optional(),
        include_empty: z.boolean().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
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
              await api.listAccountingAccounts({
                archived: args.archived,
                start_date: args.start_date,
                end_date: args.end_date,
                include_empty: args.include_empty,
              }),
              'account'
            );
          case 'create_account':
            return jsonResponse(
              await api.createAccountingAccount(
                data(inputs.AccountingAccountInput, args.data, 'create accounting account')
              ),
              'Account created.'
            );
          case 'list_ledger':
            return pageResponse(
              await api.listLedgerEntries({
                ...paging(args),
                start_date: requireArg(args.start_date, 'start_date'),
                end_date: requireArg(args.end_date, 'end_date'),
                account: args.account,
              }),
              'ledger line'
            );
          case 'create_ledger_entry':
            return jsonResponse(
              await api.createLedgerEntry(
                data(inputs.LedgerEntryInput, args.data, 'create ledger entry')
              ),
              'Ledger entry posted.'
            );
          case 'list_taxes':
            return pageResponse(await api.listTaxes(), 'tax');
          case 'tax_keys':
            return pageResponse(
              await api.listTaxKeysByCountry(requireArg(args.country, 'country'), args.section),
              'tax key'
            );
          case 'list_expenses_accounts':
            return pageResponse(await api.listExpensesAccounts(), 'expenses account');
          case 'get_expenses_account':
            return jsonResponse(await api.getExpensesAccount(requireArg(args.id, 'id')));
          case 'create_expenses_account':
            return jsonResponse(
              await api.createExpensesAccount(
                data(inputs.ExpensesAccountInput, args.data, 'create expenses account')
              ),
              'Expenses account created.'
            );
          case 'update_expenses_account': {
            const gate = checkConfirmation('update_expenses_account', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateExpensesAccount(
                requireArg(args.id, 'id'),
                data(inputs.ExpensesAccountUpdateInput, args.data, 'update expenses account')
              ),
              'Expenses account updated.'
            );
          }
          case 'delete_expenses_account': {
            const gate = checkConfirmation('delete_expenses_account', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteExpensesAccount(requireArg(args.id, 'id'));
            return textResponse(`Expenses account ${args.id} deleted.`);
          }
          case 'list_sales_channels':
            return pageResponse(await api.listSalesChannels(), 'sales channel');
          case 'get_sales_channel':
            return jsonResponse(await api.getSalesChannel(requireArg(args.id, 'id')));
          case 'create_sales_channel':
            return jsonResponse(
              await api.createSalesChannel(
                data(inputs.SalesChannelInput, args.data, 'create sales channel')
              ),
              'Sales channel created.'
            );
          case 'update_sales_channel': {
            const gate = checkConfirmation('update_sales_channel', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateSalesChannel(
                requireArg(args.id, 'id'),
                data(inputs.SalesChannelUpdateInput, args.data, 'update sales channel')
              ),
              'Sales channel updated.'
            );
          }
          case 'delete_sales_channel': {
            const gate = checkConfirmation('delete_sales_channel', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteSalesChannel(requireArg(args.id, 'id'));
            return textResponse(`Sales channel ${args.id} deleted.`);
          }
          case 'list_numbering_series':
            return pageResponse(
              await api.listNumberingSeries(requireArg(args.series_type, 'series_type')),
              'numbering series'
            );
          case 'create_numbering_series':
            return jsonResponse(
              await api.createNumberingSeries(
                requireArg(args.series_type, 'series_type'),
                data(inputs.NumberingSeriesInput, args.data, 'create numbering series')
              ),
              'Numbering series created.'
            );
          case 'update_numbering_series': {
            const gate = checkConfirmation('update_numbering_series', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateNumberingSeries(
                requireArg(args.series_type, 'series_type'),
                requireArg(args.id, 'id'),
                data(inputs.NumberingSeriesInput, args.data, 'update numbering series')
              ),
              'Numbering series updated.'
            );
          }
          case 'delete_numbering_series': {
            const gate = checkConfirmation('delete_numbering_series', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteNumberingSeries(
              requireArg(args.series_type, 'series_type'),
              requireArg(args.id, 'id')
            );
            return textResponse(`Numbering series ${args.id} deleted.`);
          }
          case 'list_tags':
            return pageResponse(await api.listTags(), 'tag');
          case 'create_tag':
            return jsonResponse(await api.createTag(requireArg(args.name, 'name')), 'Tag created.');
          case 'delete_tag': {
            const gate = checkConfirmation('delete_tag', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteTag(requireArg(args.name, 'name'));
            return textResponse(`Tag "${args.name}" deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

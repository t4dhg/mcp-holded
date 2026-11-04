import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import { SALES_TYPES, type SalesType } from '../api/documents.js';
import { inputs } from '../schemas/index.js';
import { inputArray } from '../schemas/input-array.js';
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
  readLocalFile,
  savePdf,
} from './shared.js';

export const documentListArgs = {
  contact_id: z.string().optional(),
  status: z
    .enum(['pending', 'completed', 'partial', 'cancelled', 'failed', 'overdue', 'outstanding'])
    .optional(),
  start_date: z.string().optional().describe('YYYY-MM-DD, inclusive'),
  end_date: z.string().optional().describe('YYYY-MM-DD, inclusive'),
  due_date_start: z.string().optional(),
  due_date_end: z.string().optional(),
  sort: z.enum(['date', '-date', 'dueDate', '-dueDate', 'total', '-total']).optional(),
  approval_status: z.enum(['draft', 'approved']).optional(),
};

export function registerSalesTool(server: McpServer) {
  server.registerTool(
    'holded_sales',
    {
      title: 'Holded sales documents',
      description:
        'Sales documents by `type`: invoice, credit_note, estimate, proforma, sales_receipt, sales_order, waybill, receipt_note, recurring_invoice. Actions: list, get, find_by_number (invoices), pdf (needs output_path), list_attachments, attach (file_path), schedule (recurring), create, update, delete, approve, cancel (invoices), send (emails), set_pipeline, record_payment, convert, accept, reject (estimates), skip (recurring), bulk_approve, bulk_cancel, bulk_delete (invoices). Amounts in responses are strings with a comma decimal separator.',
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'find_by_number',
          'pdf',
          'list_attachments',
          'attach',
          'schedule',
          'create',
          'update',
          'delete',
          'approve',
          'cancel',
          'send',
          'set_pipeline',
          'record_payment',
          'convert',
          'accept',
          'reject',
          'skip',
          'bulk_approve',
          'bulk_cancel',
          'bulk_delete',
        ]),
        type: z
          .enum(Object.keys(SALES_TYPES) as [SalesType, ...SalesType[]])
          .default('invoice')
          .describe('Document type (default invoice)'),
        id: idArg,
        ids: inputArray(z.string())
          .optional()
          .describe('Invoice ids for bulk actions (maximum 1000)'),
        document_number: z.string().optional().describe('For find_by_number'),
        output_path: z.string().optional().describe('Where to save the PDF'),
        file_path: z.string().optional().describe('Local file to upload for attach'),
        pipeline_id: z.string().optional(),
        date: z.string().optional().describe('Occurrence date for skip'),
        data: dataArg,
        confirm: confirmArg,
        ...documentListArgs,
        ...listArgs,
      },
    },
    async args => {
      const type = args.type;
      try {
        switch (args.action) {
          case 'list':
            return pageResponse(
              await api.listDocuments(type, {
                ...paging(args),
                contact_id: args.contact_id,
                status: args.status,
                start_date: args.start_date,
                end_date: args.end_date,
                due_date_start: args.due_date_start,
                due_date_end: args.due_date_end,
                sort: args.sort,
                approval_status: args.approval_status,
              }),
              type.replace('_', ' ')
            );
          case 'get':
            return jsonResponse(await api.getDocument(type, requireArg(args.id, 'id')));
          case 'find_by_number':
            return pageResponse(
              await api.findInvoicesByNumber(
                requireArg(args.document_number, 'document_number'),
                paging(args)
              ),
              'invoice'
            );
          case 'pdf':
            return savePdf(
              await api.getDocumentPdf(type, requireArg(args.id, 'id')),
              requireArg(args.output_path, 'output_path')
            );
          case 'list_attachments':
            return pageResponse(
              await api.listDocumentAttachments(type, requireArg(args.id, 'id')),
              'attachment'
            );
          case 'attach': {
            const file = await readLocalFile(requireArg(args.file_path, 'file_path'));
            return jsonResponse(
              await api.attachDocumentFile(
                type,
                requireArg(args.id, 'id'),
                file.bytes,
                file.filename
              ),
              'File attached.'
            );
          }
          case 'schedule':
            return jsonResponse(await api.getRecurringInvoiceSchedule(requireArg(args.id, 'id')));
          case 'create': {
            const schema =
              type === 'recurring_invoice' ? inputs.RecurringInvoiceInput : inputs.DocumentInput;
            return jsonResponse(
              await api.createDocument(type, data(schema, args.data, `create ${type}`)),
              `${type} created.`
            );
          }
          case 'update': {
            const gate = checkConfirmation(
              type === 'recurring_invoice' ? 'update_recurring_invoice' : 'update_document',
              args.confirm
            );
            if (gate.needsConfirmation) return textResponse(gate.message);
            const schema =
              type === 'recurring_invoice'
                ? inputs.RecurringInvoiceUpdateInput
                : inputs.DocumentUpdateInput;
            return jsonResponse(
              await api.updateDocument(
                type,
                requireArg(args.id, 'id'),
                data(schema, args.data, `update ${type}`)
              ),
              `${type} updated.`
            );
          }
          case 'delete': {
            const gate = checkConfirmation(
              type === 'recurring_invoice' ? 'delete_recurring_invoice' : 'delete_document',
              args.confirm
            );
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteDocument(type, requireArg(args.id, 'id'));
            return textResponse(`${type} ${args.id} deleted.`);
          }
          case 'approve': {
            const gate = checkConfirmation('approve_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.approveDocument(type, requireArg(args.id, 'id')),
              `${type} approved.`
            );
          }
          case 'cancel': {
            const gate = checkConfirmation('cancel_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.cancelInvoice(requireArg(args.id, 'id')),
              'Invoice cancelled.'
            );
          }
          case 'send': {
            const gate = checkConfirmation('send_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.sendDocument(
                type,
                requireArg(args.id, 'id'),
                data(inputs.SendInput, args.data, `send ${type}`)
              ),
              `${type} sent.`
            );
          }
          case 'set_pipeline': {
            const gate = checkConfirmation('set_document_pipeline', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.setDocumentPipeline(
                type,
                requireArg(args.id, 'id'),
                requireArg(args.pipeline_id, 'pipeline_id')
              ),
              'Pipeline set.'
            );
          }
          case 'record_payment':
            return jsonResponse(
              await api.recordDocumentPayment(
                type,
                requireArg(args.id, 'id'),
                data(inputs.DocumentPaymentInput, args.data, 'record payment')
              ),
              'Payment recorded.'
            );
          case 'convert':
            return jsonResponse(
              await api.convertDocument(data(inputs.ConvertInput, args.data, 'convert document')),
              'Document converted.'
            );
          case 'accept':
            return jsonResponse(
              await api.acceptEstimate(
                requireArg(args.id, 'id'),
                data(inputs.EstimateDecisionInput, args.data ?? {}, 'accept estimate')
              ),
              'Estimate accepted.'
            );
          case 'reject':
            return jsonResponse(
              await api.rejectEstimate(
                requireArg(args.id, 'id'),
                data(inputs.EstimateDecisionInput, args.data ?? {}, 'reject estimate')
              ),
              'Estimate rejected.'
            );
          case 'skip': {
            const gate = checkConfirmation('skip_recurring_invoice', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.skipRecurringInvoice(
                requireArg(args.id, 'id'),
                requireArg(args.date, 'date')
              ),
              'Occurrence skipped.'
            );
          }
          case 'bulk_approve': {
            const gate = checkConfirmation('bulk_approve_invoices', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.bulkApproveInvoices(
                data(inputs.BulkApproveInput, args.data ?? { ids: args.ids }, 'bulk approve')
              ),
              'Invoices approved.'
            );
          }
          case 'bulk_cancel': {
            const gate = checkConfirmation('bulk_cancel_invoices', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.bulkCancelInvoices(requireArg(args.ids, 'ids')),
              'Invoices cancelled.'
            );
          }
          case 'bulk_delete': {
            const gate = checkConfirmation('bulk_delete_invoices', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.bulkDeleteInvoices(requireArg(args.ids, 'ids'));
            return textResponse(`${args.ids?.length ?? 0} invoices deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

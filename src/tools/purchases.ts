import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
import { PURCHASE_TYPES, type PurchaseType } from '../api/documents.js';
import { inputs } from '../schemas/index.js';
import { formatToolError, jsonResponse, requireArg, textResponse } from '../tool-utils.js';
import { documentListArgs } from './sales.js';
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

export function registerPurchasesTool(server: McpServer) {
  server.registerTool(
    'holded_purchases',
    {
      title: 'Holded purchase documents',
      description:
        'Purchase documents by `type`: purchase (supplier bill), purchase_refund, purchase_order, purchase_shipment. Actions: list, get, pdf (output_path), list_attachments, attach (file_path), received_items (orders), create, update, delete, approve, send, set_pipeline, record_payment, receive (orders). Amounts in responses are strings with a comma decimal separator.',
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'pdf',
          'list_attachments',
          'attach',
          'received_items',
          'create',
          'update',
          'delete',
          'approve',
          'send',
          'set_pipeline',
          'record_payment',
          'receive',
        ]),
        type: z
          .enum(Object.keys(PURCHASE_TYPES) as [PurchaseType, ...PurchaseType[]])
          .default('purchase'),
        id: idArg,
        output_path: z.string().optional().describe('New path to save the PDF without overwriting'),
        file_path: z
          .string()
          .optional()
          .describe('Local file to upload for attach (requires confirmation)'),
        pipeline_id: z.string().optional(),
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
          case 'pdf':
            return await savePdf(
              await api.getDocumentPdf(type, requireArg(args.id, 'id')),
              requireArg(args.output_path, 'output_path')
            );
          case 'list_attachments':
            return pageResponse(
              await api.listDocumentAttachments(type, requireArg(args.id, 'id')),
              'attachment'
            );
          case 'attach': {
            const id = requireArg(args.id, 'id');
            const filePath = requireArg(args.file_path, 'file_path');
            const gate = checkConfirmation('attach_document_file', args.confirm, {
              filePath,
              destination: `Holded ${type} ${id}`,
            });
            if (gate.needsConfirmation) return textResponse(gate.message);
            const file = await readLocalFile(filePath);
            return jsonResponse(
              await api.attachDocumentFile(type, id, file.bytes, file.filename),
              'File attached.'
            );
          }
          case 'received_items':
            return pageResponse(await api.listReceivedItems(requireArg(args.id, 'id')), 'item');
          case 'create':
            return jsonResponse(
              await api.createDocument(
                type,
                data(inputs.DocumentInput, args.data, `create ${type}`)
              ),
              `${type} created.`
            );
          case 'update': {
            const gate = checkConfirmation('update_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateDocument(
                type,
                requireArg(args.id, 'id'),
                data(inputs.DocumentUpdateInput, args.data, `update ${type}`)
              ),
              `${type} updated.`
            );
          }
          case 'delete': {
            const gate = checkConfirmation('delete_document', args.confirm);
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
          case 'receive':
            return jsonResponse(
              await api.receivePurchaseOrder(
                requireArg(args.id, 'id'),
                data(inputs.ReceiveInput, args.data, 'receive purchase order')
              ),
              'Units received.'
            );
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

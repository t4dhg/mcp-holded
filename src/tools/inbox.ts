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
  readLocalFile,
  savePdf,
} from './shared.js';

export function registerInboxTool(server: McpServer) {
  server.registerTool(
    'holded_inbox',
    {
      title: 'Holded inbox',
      description:
        'Incoming documents scanned by Holded. Actions: list (status, start_date, end_date, user_id), get, upload (file_path), download (filename, output_path), update, attach (data.documentId, data.documentType), delete.',
      inputSchema: {
        action: z.enum(['list', 'get', 'upload', 'download', 'update', 'attach', 'delete']),
        id: idArg,
        status: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        user_id: z.string().optional(),
        file_path: z.string().optional().describe('Local file to upload'),
        filename: z.string().optional().describe('Stored filename for download'),
        output_path: z.string().optional(),
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
              await api.listInbox({
                ...paging(args),
                status: args.status,
                start_date: args.start_date,
                end_date: args.end_date,
                user_id: args.user_id,
              }),
              'inbox document'
            );
          case 'get':
            return jsonResponse(await api.getInboxDocument(requireArg(args.id, 'id')));
          case 'upload': {
            const file = await readLocalFile(requireArg(args.file_path, 'file_path'));
            return jsonResponse(
              await api.uploadInboxDocument(file.bytes, file.filename),
              'Document uploaded.'
            );
          }
          case 'download':
            return savePdf(
              await api.downloadInboxFile(
                requireArg(args.id, 'id'),
                requireArg(args.filename, 'filename')
              ),
              requireArg(args.output_path, 'output_path')
            );
          case 'update': {
            const gate = checkConfirmation('update_inbox_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateInboxDocument(
                requireArg(args.id, 'id'),
                data(inputs.InboxUpdateInput, args.data, 'update inbox document')
              ),
              'Inbox document updated.'
            );
          }
          case 'attach': {
            const gate = checkConfirmation('attach_inbox_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.attachInboxDocument(
                requireArg(args.id, 'id'),
                data(inputs.InboxAttachInput, args.data, 'attach inbox document')
              ),
              'Inbox document attached.'
            );
          }
          case 'delete': {
            const gate = checkConfirmation('delete_inbox_document', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteInboxDocument(requireArg(args.id, 'id'));
            return textResponse(`Inbox document ${args.id} deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as api from '../api/index.js';
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
} from './shared.js';

export function registerContactsTool(server: McpServer) {
  server.registerTool(
    'holded_contacts',
    {
      title: 'Holded contacts',
      description:
        'Customers and suppliers. Actions: list (filters email, code, phone, mobile, custom_id are exact matches), search (substring on name), get, create, update, delete, bulk_archive, bulk_delete, list_attachments, attach, portal_link, list_groups, get_group, create_group, update_group, delete_group.',
      inputSchema: {
        action: z.enum([
          'list',
          'search',
          'get',
          'create',
          'update',
          'delete',
          'bulk_archive',
          'bulk_delete',
          'list_attachments',
          'attach',
          'portal_link',
          'list_groups',
          'get_group',
          'create_group',
          'update_group',
          'delete_group',
        ]),
        id: idArg,
        ids: inputArray(z.string())
          .optional()
          .describe('Contact ids for bulk actions (maximum 1000)'),
        name: z.string().optional().describe('Name fragment for search'),
        email: z.string().optional(),
        code: z.string().optional().describe('Tax id (NIF/CIF) exact match'),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        custom_id: z.string().optional(),
        file_path: z
          .string()
          .optional()
          .describe('Local file to upload for attach (requires confirmation)'),
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
              await api.listContacts({
                ...paging(args),
                email: args.email,
                code: args.code,
                phone: args.phone,
                mobile: args.mobile,
                custom_id: args.custom_id,
              }),
              'contact'
            );
          case 'search':
            return pageResponse(
              await api.searchContacts(requireArg(args.name, 'name'), paging(args)),
              'contact'
            );
          case 'get':
            return jsonResponse(await api.getContact(requireArg(args.id, 'id')));
          case 'create':
            return jsonResponse(
              await api.createContact(data(inputs.ContactInput, args.data, 'create contact')),
              'Contact created.'
            );
          case 'update': {
            const gate = checkConfirmation('update_contact', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateContact(
                requireArg(args.id, 'id'),
                data(inputs.ContactInput, args.data, 'update contact')
              ),
              'Contact updated.'
            );
          }
          case 'delete': {
            const gate = checkConfirmation('delete_contact', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteContact(requireArg(args.id, 'id'));
            return textResponse(`Contact ${args.id} deleted.`);
          }
          case 'bulk_archive': {
            const gate = checkConfirmation('bulk_archive_contacts', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.bulkArchiveContacts(requireArg(args.ids, 'ids')),
              'Contacts archived.'
            );
          }
          case 'bulk_delete': {
            const gate = checkConfirmation('bulk_delete_contacts', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.bulkDeleteContacts(requireArg(args.ids, 'ids')),
              'Contacts deleted.'
            );
          }
          case 'list_attachments':
            return jsonResponse(await api.listContactAttachments(requireArg(args.id, 'id')));
          case 'attach': {
            const id = requireArg(args.id, 'id');
            const filePath = requireArg(args.file_path, 'file_path');
            const gate = checkConfirmation('attach_contact_file', args.confirm, {
              filePath,
              destination: `Holded contact ${id}`,
            });
            if (gate.needsConfirmation) return textResponse(gate.message);
            const file = await readLocalFile(filePath);
            return jsonResponse(
              await api.attachContactFile(id, file.bytes, file.filename),
              'File attached.'
            );
          }
          case 'portal_link':
            return jsonResponse(await api.getContactPortalLink(requireArg(args.id, 'id')));
          case 'list_groups':
            return pageResponse(await api.listContactGroups(paging(args)), 'contact group');
          case 'get_group':
            return jsonResponse(await api.getContactGroup(requireArg(args.id, 'id')));
          case 'create_group':
            return jsonResponse(
              await api.createContactGroup(
                data(inputs.ContactGroupInput, args.data, 'create contact group')
              ),
              'Contact group created.'
            );
          case 'update_group': {
            const gate = checkConfirmation('update_contact_group', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateContactGroup(
                requireArg(args.id, 'id'),
                data(inputs.ContactGroupInput, args.data, 'update contact group')
              ),
              'Contact group updated.'
            );
          }
          case 'delete_group': {
            const gate = checkConfirmation('delete_contact_group', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteContactGroup(requireArg(args.id, 'id'));
            return textResponse(`Contact group ${args.id} deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

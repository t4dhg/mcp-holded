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

export function registerCrmTool(server: McpServer) {
  server.registerTool(
    'holded_crm',
    {
      title: 'Holded CRM',
      description:
        'Funnels and leads. Actions: list_funnels, get_funnel, create_funnel, update_funnel, delete_funnel, list_leads, get_lead, create_lead, update_lead, delete_lead, move_stage (stage_id), update_dates (due_date), add_note, update_note, add_task, update_task, delete_task (task_id).',
      inputSchema: {
        action: z.enum([
          'list_funnels',
          'get_funnel',
          'create_funnel',
          'update_funnel',
          'delete_funnel',
          'list_leads',
          'get_lead',
          'create_lead',
          'update_lead',
          'delete_lead',
          'move_stage',
          'update_dates',
          'add_note',
          'update_note',
          'add_task',
          'update_task',
          'delete_task',
        ]),
        id: idArg,
        stage_id: z.string().optional(),
        due_date: z.string().optional(),
        task_id: z.string().optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_funnels':
            return pageResponse(await api.listFunnels(paging(args)), 'funnel');
          case 'get_funnel':
            return jsonResponse(await api.getFunnel(requireArg(args.id, 'id')));
          case 'create_funnel':
            return jsonResponse(
              await api.createFunnel(data(inputs.FunnelInput, args.data, 'create funnel')),
              'Funnel created.'
            );
          case 'update_funnel': {
            const gate = checkConfirmation('update_funnel', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateFunnel(
                requireArg(args.id, 'id'),
                data(inputs.FunnelInput, args.data, 'update funnel')
              ),
              'Funnel updated.'
            );
          }
          case 'delete_funnel': {
            const gate = checkConfirmation('delete_funnel', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteFunnel(requireArg(args.id, 'id'));
            return textResponse(`Funnel ${args.id} deleted.`);
          }
          case 'list_leads':
            return pageResponse(await api.listLeads(paging(args)), 'lead');
          case 'get_lead':
            return jsonResponse(await api.getLead(requireArg(args.id, 'id')));
          case 'create_lead':
            return jsonResponse(
              await api.createLead(data(inputs.LeadInput, args.data, 'create lead')),
              'Lead created.'
            );
          case 'update_lead': {
            const gate = checkConfirmation('update_lead', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateLead(
                requireArg(args.id, 'id'),
                data(inputs.LeadUpdateInput, args.data, 'update lead')
              ),
              'Lead updated.'
            );
          }
          case 'delete_lead': {
            const gate = checkConfirmation('delete_lead', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteLead(requireArg(args.id, 'id'));
            return textResponse(`Lead ${args.id} deleted.`);
          }
          case 'move_stage': {
            const gate = checkConfirmation('move_lead_stage', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.moveLeadStage(
                requireArg(args.id, 'id'),
                requireArg(args.stage_id, 'stage_id')
              ),
              'Lead moved.'
            );
          }
          case 'update_dates': {
            const gate = checkConfirmation('update_lead_dates', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateLeadDates(
                requireArg(args.id, 'id'),
                requireArg(args.due_date, 'due_date')
              ),
              'Lead dates updated.'
            );
          }
          case 'add_note':
            return jsonResponse(
              await api.createLeadNote(
                requireArg(args.id, 'id'),
                data(inputs.LeadNoteInput, args.data, 'add lead note')
              ),
              'Note added.'
            );
          case 'update_note': {
            const gate = checkConfirmation('update_lead_note', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateLeadNote(
                requireArg(args.id, 'id'),
                data(inputs.LeadNoteUpdateInput, args.data, 'update lead note')
              ),
              'Note updated.'
            );
          }
          case 'add_task':
            return jsonResponse(
              await api.createLeadTask(
                requireArg(args.id, 'id'),
                data(inputs.LeadTaskInput, args.data, 'add lead task')
              ),
              'Task added.'
            );
          case 'update_task': {
            const gate = checkConfirmation('update_lead_task', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateLeadTask(
                requireArg(args.id, 'id'),
                data(inputs.LeadTaskUpdateInput, args.data, 'update lead task')
              ),
              'Task updated.'
            );
          }
          case 'delete_task': {
            const gate = checkConfirmation('delete_lead_task', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteLeadTask(
              requireArg(args.id, 'id'),
              requireArg(args.task_id, 'task_id')
            );
            return textResponse(`Task ${args.task_id} deleted from lead ${args.id}.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

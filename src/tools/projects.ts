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

export function registerProjectsTool(server: McpServer) {
  server.registerTool(
    'holded_projects',
    {
      title: 'Holded projects',
      description:
        'Projects, tasks and time tracking. Actions: list_projects (status), get_project, project_summary, create_project, update_project, delete_project, list_tasks, get_task, create_task, update_task, delete_task, list_times (project_id optional), get_time (project_id, time_id), create_time (project_id), update_time, delete_time.',
      inputSchema: {
        action: z.enum([
          'list_projects',
          'get_project',
          'project_summary',
          'create_project',
          'update_project',
          'delete_project',
          'list_tasks',
          'get_task',
          'create_task',
          'update_task',
          'delete_task',
          'list_times',
          'get_time',
          'create_time',
          'update_time',
          'delete_time',
        ]),
        id: idArg,
        project_id: z.string().optional(),
        time_id: z.string().optional(),
        status: z
          .enum(['active', 'in_progress', 'completed', 'cancelled', 'waiting', 'budgeted'])
          .optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_projects':
            return pageResponse(
              await api.listProjects({ ...paging(args), status: args.status }),
              'project'
            );
          case 'get_project':
            return jsonResponse(await api.getProject(requireArg(args.id, 'id')));
          case 'project_summary':
            return jsonResponse(await api.getProjectSummary(requireArg(args.id, 'id')));
          case 'create_project':
            return jsonResponse(
              await api.createProject(data(inputs.ProjectInput, args.data, 'create project')),
              'Project created.'
            );
          case 'update_project': {
            const gate = checkConfirmation('update_project', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateProject(
                requireArg(args.id, 'id'),
                data(inputs.ProjectUpdateInput, args.data, 'update project')
              ),
              'Project updated.'
            );
          }
          case 'delete_project': {
            const gate = checkConfirmation('delete_project', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteProject(requireArg(args.id, 'id'));
            return textResponse(`Project ${args.id} deleted.`);
          }
          case 'list_tasks':
            return pageResponse(await api.listTasks(paging(args)), 'task');
          case 'get_task':
            return jsonResponse(await api.getTask(requireArg(args.id, 'id')));
          case 'create_task':
            return jsonResponse(
              await api.createTask(data(inputs.TaskInput, args.data, 'create task')),
              'Task created.'
            );
          case 'update_task': {
            const gate = checkConfirmation('update_task', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateTask(
                requireArg(args.id, 'id'),
                data(inputs.TaskUpdateInput, args.data, 'update task')
              ),
              'Task updated.'
            );
          }
          case 'delete_task': {
            const gate = checkConfirmation('delete_task', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteTask(requireArg(args.id, 'id'));
            return textResponse(`Task ${args.id} deleted.`);
          }
          case 'list_times':
            return pageResponse(
              await api.listProjectTimes(args.project_id, paging(args)),
              'time entry'
            );
          case 'get_time':
            return jsonResponse(
              await api.getProjectTime(
                requireArg(args.project_id, 'project_id'),
                requireArg(args.time_id, 'time_id')
              )
            );
          case 'create_time':
            return jsonResponse(
              await api.createProjectTime(
                requireArg(args.project_id, 'project_id'),
                data(inputs.ProjectTimeInput, args.data, 'create time entry')
              ),
              'Time entry created.'
            );
          case 'update_time': {
            const gate = checkConfirmation('update_project_time', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateProjectTime(
                requireArg(args.project_id, 'project_id'),
                requireArg(args.time_id, 'time_id'),
                data(inputs.ProjectTimeUpdateInput, args.data, 'update time entry')
              ),
              'Time entry updated.'
            );
          }
          case 'delete_time': {
            const gate = checkConfirmation('delete_project_time', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteProjectTime(
              requireArg(args.project_id, 'project_id'),
              requireArg(args.time_id, 'time_id')
            );
            return textResponse(`Time entry ${args.time_id} deleted.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

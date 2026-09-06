import { z } from 'zod';
import { Amount, Id, NullableId, NullableString, StringList } from './shared.js';

/** GET /projects: account has none; shape from the OpenAPI ProjectApiDto. */
export const Project = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
  type: NullableString.optional(),
  key: NullableString.optional(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  start_date: NullableString.optional(),
  due_date: NullableString.optional(),
  tags: StringList.optional(),
  archived: z.boolean().optional(),
  status: z.union([z.number(), z.string()]).optional(),
  number_of_tasks: z.number().optional(),
  completed_tasks: z.number().optional(),
  billable: z.boolean().optional(),
});

/** GET /tasks: account has none; shape from the OpenAPI TaskApiDto. */
export const Task = z.looseObject({
  id: Id,
  project_id: NullableId.optional(),
  list_id: NullableId.optional(),
  name: z.string(),
  description: NullableString.optional(),
  status: NullableString.optional(),
  priority: z.number().optional(),
  start_date: NullableString.optional(),
  due_date: NullableString.optional(),
  archived: z.boolean().optional(),
  assigned_to: z.array(z.unknown()).optional(),
});

/** GET /project-times and /projects/{id}/times: account has none; shape from the OpenAPI ProjectTimeApiDto. */
export const ProjectTime = z.looseObject({
  id: Id,
  duration: z.number().optional(),
  user_name: NullableString.optional(),
  description: NullableString.optional(),
  cost_per_hour: Amount.optional(),
  user_id: NullableId.optional(),
  task_id: NullableId.optional(),
  date: NullableString.optional(),
  approved: z.boolean().optional(),
  total_cost: Amount.optional(),
  category: NullableString.optional(),
});

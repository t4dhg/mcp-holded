import { z } from 'zod';
import { Amount, Id, NullableId, NullableString } from './shared.js';

/** GET /funnels and /{id}. */
export const FunnelStage = z.looseObject({
  id: Id,
  name: z.string(),
  key: NullableString.optional(),
  description: NullableString.optional(),
  deal_probability: z.number().optional(),
  rotting_days: z.number().optional(),
});

export const Funnel = z.looseObject({
  id: Id,
  name: z.string(),
  stages: z.array(FunnelStage).optional(),
  labels: z.array(z.unknown()).optional(),
  created_at: NullableString.optional(),
  updated_at: NullableString.optional(),
});
export type Funnel = z.infer<typeof Funnel>;

/** GET /leads: account has none; shape from the OpenAPI LeadApiDto. */
export const Lead = z.looseObject({
  id: Id,
  user_id: NullableId.optional(),
  funnel_id: NullableId.optional(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  name: z.string(),
  person_id: NullableId.optional(),
  person_name: NullableString.optional(),
  value: Amount.optional(),
  potential: Amount.optional(),
  due_date: NullableString.optional(),
  stage_id: NullableId.optional(),
  created_at: NullableString.optional(),
  updated_at: NullableString.optional(),
  custom_fields: z.array(z.unknown()).optional(),
  status: NullableString.optional(),
});
export type Lead = z.infer<typeof Lead>;

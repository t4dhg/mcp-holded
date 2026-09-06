import { z } from 'zod';
import { Id, NullableString, StringList } from './shared.js';

/** GET /webhooks: account has none; shape from the OpenAPI response. */
export const Webhook = z.looseObject({
  id: Id,
  url: z.string(),
  events: StringList.optional(),
  version: NullableString.optional(),
  description: NullableString.optional(),
  enabled: z.boolean().optional(),
  created_at: NullableString.optional(),
  updated_at: NullableString.optional(),
});

/** GET /webhooks/events returns `{ data: { <resource>: [event, ...] } }`. */
export const WebhookEvents = z.looseObject({
  data: z.record(z.string(), z.unknown()),
});

/** GET /usage. */
export const Usage = z.looseObject({
  type: z.string(),
  period: z.string(),
  usage: z.number(),
  limit: z.number(),
  count: z.number().optional(),
  next_plan: NullableString.optional(),
  next_limit: z.number().nullable().optional(),
  secondary_usages: z.record(z.string(), z.number()).optional(),
  user_usages: z.unknown().optional(),
});

import { z } from 'zod';
import { Id, NullableAmount, NullableString } from './shared.js';

/** GET /inbox and /{id}. Built from 50 real scanned documents. */
export const InboxDocument = z.looseObject({
  id: Id,
  status: z.string(),
  origin: z
    .looseObject({
      id: NullableString.optional(),
      name: NullableString.optional(),
      type: NullableString.optional(),
      source: NullableString.optional(),
    })
    .nullable()
    .optional(),
  document_number: NullableString.optional(),
  type: NullableString.optional(),
  outcome: z.unknown().optional(),
  date: NullableString.optional(),
  contact_name: NullableString.optional(),
  total: NullableAmount.optional(),
  file: z
    .looseObject({
      filename: z.string().optional(),
      path: z.string().optional(),
    })
    .nullable()
    .optional(),
  thumbnail: z.unknown().optional(),
  scanned_at: NullableString.optional(),
  seen_at: NullableString.optional(),
  errors: z.array(z.unknown()).optional(),
  draft: z.unknown().optional(),
});
export type InboxDocument = z.infer<typeof InboxDocument>;

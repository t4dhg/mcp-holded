import { z } from 'zod';
import { Id, NullableId, NullableString, StringList } from './shared.js';

/** GET /events: account has none; shape from the OpenAPI EventApiDto. */
export const CalendarEvent = z.looseObject({
  id: Id,
  name: z.string(),
  contact_id: NullableId.optional(),
  contact_name: NullableString.optional(),
  kind: NullableString.optional(),
  description: NullableString.optional(),
  start_date: NullableString.optional(),
  end_date: NullableString.optional(),
  status: z.union([z.number(), z.string()]).optional(),
  tags: StringList.optional(),
  location: NullableString.optional(),
  lead_id: NullableId.optional(),
  funnel_id: NullableId.optional(),
});

/** GET /bookings: account has none; shape from the OpenAPI response. */
export const Booking = z.looseObject({
  id: Id,
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration: z.number().optional(),
  status: NullableString.optional(),
  service: z.unknown().optional(),
  space: z.unknown().optional(),
  outcome: z.unknown().optional(),
  custom_fields: z.array(z.unknown()).optional(),
});

/** GET /booking-locations (real record). */
export const BookingLocation = z.looseObject({
  id: Id,
  name: z.string(),
  description: NullableString.optional(),
  active: z.boolean().optional(),
  available_services: z.array(z.unknown()).optional(),
});

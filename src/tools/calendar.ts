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

export function registerCalendarTool(server: McpServer) {
  server.registerTool(
    'holded_calendar',
    {
      title: 'Holded calendar',
      description:
        'Events and bookings. Actions: list_events, get_event, create_event, update_event, delete_event, list_bookings (start_date, end_date, service_id, sort_field, sort_order), get_booking, create_booking, update_booking, cancel_booking, list_locations, slots (id is the location id; data carries the query, for example { date, service_id }).',
      inputSchema: {
        action: z.enum([
          'list_events',
          'get_event',
          'create_event',
          'update_event',
          'delete_event',
          'list_bookings',
          'get_booking',
          'create_booking',
          'update_booking',
          'cancel_booking',
          'list_locations',
          'slots',
        ]),
        id: idArg,
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        service_id: z.string().optional(),
        sort_field: z.enum(['start_time', 'created_at']).optional(),
        sort_order: z.enum(['asc', 'desc']).optional(),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_events':
            return pageResponse(await api.listEvents(paging(args)), 'event');
          case 'get_event':
            return jsonResponse(await api.getEvent(requireArg(args.id, 'id')));
          case 'create_event':
            return jsonResponse(
              await api.createEvent(data(inputs.EventInput, args.data, 'create event')),
              'Event created.'
            );
          case 'update_event': {
            const gate = checkConfirmation('update_event', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateEvent(
                requireArg(args.id, 'id'),
                data(inputs.EventUpdateInput, args.data, 'update event')
              ),
              'Event updated.'
            );
          }
          case 'delete_event': {
            const gate = checkConfirmation('delete_event', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deleteEvent(requireArg(args.id, 'id'));
            return textResponse(`Event ${args.id} deleted.`);
          }
          case 'list_bookings':
            return pageResponse(
              await api.listBookings({
                ...paging(args),
                start_date: args.start_date,
                end_date: args.end_date,
                service_id: args.service_id,
                sort_field: args.sort_field,
                sort_order: args.sort_order,
              }),
              'booking'
            );
          case 'get_booking':
            return jsonResponse(await api.getBooking(requireArg(args.id, 'id')));
          case 'create_booking':
            return jsonResponse(
              await api.createBooking(data(inputs.BookingInput, args.data, 'create booking')),
              'Booking created.'
            );
          case 'update_booking': {
            const gate = checkConfirmation('update_booking', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            return jsonResponse(
              await api.updateBooking(
                requireArg(args.id, 'id'),
                data(inputs.BookingUpdateInput, args.data, 'update booking')
              ),
              'Booking updated.'
            );
          }
          case 'cancel_booking': {
            const gate = checkConfirmation('cancel_booking', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.cancelBooking(requireArg(args.id, 'id'));
            return textResponse(`Booking ${args.id} cancelled.`);
          }
          case 'list_locations':
            return pageResponse(await api.listBookingLocations(), 'location');
          case 'slots': {
            const query = Object.fromEntries(
              Object.entries(args.data ?? {}).map(([k, v]) => [
                k,
                v === undefined ? undefined : String(v),
              ])
            );
            return jsonResponse(await api.getBookingSlots(requireArg(args.id, 'id'), query));
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

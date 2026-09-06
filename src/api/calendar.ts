import { deleteOne, put, seg } from '../http-client.js';
import { AnyRecord, Booking, BookingLocation, CalendarEvent, inputs } from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listEvents(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/events', CalendarEvent, { ...params });
}

export function getEvent(id: string) {
  return fetchOne(`/events/${seg(id)}`, CalendarEvent);
}

export async function createEvent(input: z.infer<typeof inputs.EventInput>) {
  const id = await createAndReturnId('/events', input);
  return getEvent(id);
}

export async function updateEvent(id: string, input: z.infer<typeof inputs.EventUpdateInput>) {
  await put(`/events/${seg(id)}`, input);
  return getEvent(id);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteOne(`/events/${seg(id)}`);
}

export interface ListBookingsParams {
  limit?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
  service_id?: string;
  sort_field?: 'start_time' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export function listBookings(params: ListBookingsParams = {}) {
  return fetchPage('/bookings', Booking, { ...params });
}

export function getBooking(id: string) {
  return fetchOne(`/bookings/${seg(id)}`, Booking);
}

export async function createBooking(input: z.infer<typeof inputs.BookingInput>) {
  const id = await createAndReturnId('/bookings', input);
  return getBooking(id);
}

export async function updateBooking(id: string, input: z.infer<typeof inputs.BookingUpdateInput>) {
  await put(`/bookings/${seg(id)}`, input);
  return getBooking(id);
}

/** DELETE /bookings/{id} cancels the booking. */
export async function cancelBooking(id: string): Promise<void> {
  await deleteOne(`/bookings/${seg(id)}`);
}

export function listBookingLocations() {
  return fetchPage('/booking-locations', BookingLocation);
}

export function getBookingSlots(locationId: string, params: Record<string, string | undefined>) {
  return fetchOne(`/booking-locations/${seg(locationId)}/slots`, AnyRecord, params);
}

import { deleteOne, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import { Funnel, Lead, inputs } from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listFunnels(
  params: { limit?: number; cursor?: string } = {}
): Promise<Page<Funnel>> {
  return fetchPage('/funnels', Funnel, { ...params });
}

export function getFunnel(id: string): Promise<Funnel> {
  return fetchOne(`/funnels/${seg(id)}`, Funnel);
}

export async function createFunnel(input: z.infer<typeof inputs.FunnelInput>): Promise<Funnel> {
  const id = await createAndReturnId('/funnels', input);
  return getFunnel(id);
}

export async function updateFunnel(id: string, input: z.infer<typeof inputs.FunnelInput>) {
  await put(`/funnels/${seg(id)}`, input);
  return getFunnel(id);
}

export async function deleteFunnel(id: string): Promise<void> {
  await deleteOne(`/funnels/${seg(id)}`);
}

export function listLeads(params: { limit?: number; cursor?: string } = {}): Promise<Page<Lead>> {
  return fetchPage('/leads', Lead, { ...params });
}

export function getLead(id: string): Promise<Lead> {
  return fetchOne(`/leads/${seg(id)}`, Lead);
}

export async function createLead(input: z.infer<typeof inputs.LeadInput>): Promise<Lead> {
  const id = await createAndReturnId('/leads', input);
  return getLead(id);
}

export async function updateLead(id: string, input: z.infer<typeof inputs.LeadUpdateInput>) {
  await put(`/leads/${seg(id)}`, input);
  return getLead(id);
}

export async function deleteLead(id: string): Promise<void> {
  await deleteOne(`/leads/${seg(id)}`);
}

export function moveLeadStage(id: string, stageId: string) {
  return put(`/leads/${seg(id)}/stage`, { stage_id: stageId });
}

export function updateLeadDates(id: string, dueDate: string) {
  return put(`/leads/${seg(id)}/dates`, { due_date: dueDate });
}

export function createLeadNote(id: string, input: z.infer<typeof inputs.LeadNoteInput>) {
  return post(`/leads/${seg(id)}/notes`, input);
}

export function updateLeadNote(id: string, input: z.infer<typeof inputs.LeadNoteUpdateInput>) {
  return put(`/leads/${seg(id)}/notes`, input);
}

export function createLeadTask(id: string, input: z.infer<typeof inputs.LeadTaskInput>) {
  return post(`/leads/${seg(id)}/tasks`, input);
}

export function updateLeadTask(id: string, input: z.infer<typeof inputs.LeadTaskUpdateInput>) {
  return put(`/leads/${seg(id)}/tasks`, input);
}

export async function deleteLeadTask(id: string, taskId: string): Promise<void> {
  await deleteOne(`/leads/${seg(id)}/tasks`, { task_id: taskId });
}

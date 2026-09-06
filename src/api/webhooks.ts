import { deleteOne, post, put, seg } from '../http-client.js';
import { Usage, Webhook, WebhookEvents, inputs } from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listWebhooks(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/webhooks', Webhook, { ...params });
}

export function getWebhook(id: string) {
  return fetchOne(`/webhooks/${seg(id)}`, Webhook);
}

export function listWebhookEvents() {
  return fetchOne('/webhooks/events', WebhookEvents);
}

export async function createWebhook(input: z.infer<typeof inputs.WebhookInput>) {
  const id = await createAndReturnId('/webhooks', input);
  return getWebhook(id);
}

export async function updateWebhook(id: string, input: z.infer<typeof inputs.WebhookUpdateInput>) {
  await put(`/webhooks/${seg(id)}`, input);
  return getWebhook(id);
}

export function enableWebhook(id: string) {
  return post(`/webhooks/${seg(id)}/enable`);
}

export function disableWebhook(id: string) {
  return post(`/webhooks/${seg(id)}/disable`);
}

export async function deleteWebhook(id: string): Promise<void> {
  await deleteOne(`/webhooks/${seg(id)}`);
}

export function getUsage(type?: string) {
  return fetchOne(type ? `/usage/${seg(type)}` : '/usage', Usage);
}

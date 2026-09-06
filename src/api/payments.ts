import { deleteOne, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import { Payment, PaymentMethod, inputs } from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export interface ListPaymentsParams {
  limit?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
  document_id?: string;
  document_type?: string;
  banking_account_id?: string;
}

export function listPayments(params: ListPaymentsParams = {}): Promise<Page<Payment>> {
  return fetchPage('/payments', Payment, { ...params });
}

export function getPayment(id: string): Promise<Payment> {
  return fetchOne(`/payments/${seg(id)}`, Payment);
}

export async function createPayment(input: z.infer<typeof inputs.PaymentInput>): Promise<Payment> {
  const id = await createAndReturnId('/payments', input);
  return getPayment(id);
}

export async function updatePayment(
  id: string,
  input: z.infer<typeof inputs.PaymentUpdateInput>
): Promise<Payment> {
  await put(`/payments/${seg(id)}`, input);
  return getPayment(id);
}

export async function deletePayment(id: string): Promise<void> {
  await deleteOne(`/payments/${seg(id)}`);
}

export function listPaymentMethods(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/payment-methods', PaymentMethod, { ...params });
}

export function getPaymentMethod(id: string) {
  return fetchOne(`/payment-methods/${seg(id)}`, PaymentMethod);
}

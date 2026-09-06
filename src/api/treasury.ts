import { deleteOne, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import {
  BankMovement,
  InvoicingForecast,
  Remittance,
  TreasuryAccount,
  inputs,
} from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export interface ListTreasuryAccountsParams {
  limit?: number;
  cursor?: string;
  type?: 'bank' | 'card' | 'gateway' | 'cash';
  archived?: boolean;
}

export function listTreasuryAccounts(
  params: ListTreasuryAccountsParams = {}
): Promise<Page<TreasuryAccount>> {
  return fetchPage('/treasury/accounts', TreasuryAccount, { ...params });
}

export function getTreasuryAccount(id: string): Promise<TreasuryAccount> {
  return fetchOne(`/treasury/accounts/${seg(id)}`, TreasuryAccount);
}

export async function createTreasuryAccount(
  input: z.infer<typeof inputs.TreasuryAccountInput>
): Promise<TreasuryAccount> {
  const id = await createAndReturnId('/treasury/accounts', input);
  return getTreasuryAccount(id);
}

export async function updateTreasuryAccount(
  id: string,
  input: z.infer<typeof inputs.TreasuryAccountUpdateInput>
): Promise<TreasuryAccount> {
  await put(`/treasury/accounts/${seg(id)}`, input);
  return getTreasuryAccount(id);
}

export function archiveTreasuryAccount(id: string): Promise<unknown> {
  return post(`/treasury/accounts/${seg(id)}/archive`);
}

export async function deleteTreasuryAccount(id: string): Promise<void> {
  await deleteOne(`/treasury/accounts/${seg(id)}`);
}

export interface ListMovementsParams {
  limit?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
}

export function listBankMovements(
  accountId: string,
  params: ListMovementsParams = {}
): Promise<Page<BankMovement>> {
  return fetchPage(`/treasury/accounts/${seg(accountId)}/bank-movements`, BankMovement, {
    ...params,
  });
}

export function listCashMovements(accountId: string, params: ListMovementsParams = {}) {
  return fetchPage(`/treasury/accounts/${seg(accountId)}/cash-movements`, BankMovement, {
    ...params,
  });
}

export function createBankMovements(
  accountId: string,
  input: z.infer<typeof inputs.BankMovementsInput>
): Promise<unknown> {
  return post(`/treasury/accounts/${seg(accountId)}/bank-movements`, input);
}

/** Changes the accounting state of the movement and the documents it is matched with. */
export function reconcileBankMovement(
  accountId: string,
  movementId: string,
  input: z.infer<typeof inputs.ReconcileInput>
): Promise<unknown> {
  return post(
    `/treasury/accounts/${seg(accountId)}/bank-movements/${seg(movementId)}/reconcile`,
    input
  );
}

export interface ListRemittancesParams {
  limit?: number;
  cursor?: string;
  type?: 'inbound' | 'outbound';
  status?: 'pending' | 'completed' | 'processing';
  start_date?: string;
  end_date?: string;
  bank_id?: string;
}

export function listRemittances(params: ListRemittancesParams = {}): Promise<Page<Remittance>> {
  return fetchPage('/treasury/remittances', Remittance, { ...params });
}

export function getRemittance(id: string): Promise<Remittance> {
  return fetchOne(`/treasury/remittances/${seg(id)}`, Remittance);
}

export function listInvoicingForecasts(params: { limit?: number; cursor?: string } = {}) {
  return fetchPage('/treasury/cashflow/invoicing-forecasts', InvoicingForecast, { ...params });
}

export function getInvoicingForecast(id: string) {
  return fetchOne(`/treasury/cashflow/invoicing-forecasts/${seg(id)}`, InvoicingForecast);
}

export function createInvoicingForecast(input: Record<string, unknown>) {
  return post('/treasury/cashflow/invoicing-forecasts', input);
}

export function updateInvoicingForecast(id: string, input: Record<string, unknown>) {
  return put(`/treasury/cashflow/invoicing-forecasts/${seg(id)}`, input);
}

export async function deleteInvoicingForecast(id: string): Promise<void> {
  await deleteOne(`/treasury/cashflow/invoicing-forecasts/${seg(id)}`);
}

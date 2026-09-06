import { deleteOne, post, put, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import {
  AccountingAccount,
  ExpensesAccount,
  LedgerEntry,
  NumberingSeries,
  SalesChannel,
  Tag,
  Tax,
  inputs,
} from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export interface ListAccountingAccountsParams {
  archived?: boolean;
  /** With start_date and end_date the response carries debit, credit and balance for that window. */
  start_date?: string;
  end_date?: string;
  include_empty?: boolean;
}

export function listAccountingAccounts(params: ListAccountingAccountsParams = {}) {
  return fetchPage('/accounting-accounts', AccountingAccount, { ...params });
}

export function createAccountingAccount(input: z.infer<typeof inputs.AccountingAccountInput>) {
  return post('/accounting-accounts', input);
}

export interface ListLedgerEntriesParams {
  start_date: string;
  end_date: string;
  limit?: number;
  cursor?: string;
  account?: number;
}

/** start_date and end_date are required by the API (400 otherwise). */
export function listLedgerEntries(params: ListLedgerEntriesParams): Promise<Page<LedgerEntry>> {
  return fetchPage('/ledger-entries', LedgerEntry, { ...params });
}

export function createLedgerEntry(input: z.infer<typeof inputs.LedgerEntryInput>) {
  return post('/ledger-entries', input);
}

export function listTaxes() {
  return fetchPage('/taxes', Tax);
}

export function listTaxKeysByCountry(country: string, section?: string) {
  return fetchPage('/taxes/keys-by-country', Tax.partial().loose(), { country, section });
}

export function listExpensesAccounts(): Promise<Page<ExpensesAccount>> {
  return fetchPage('/expenses-accounts', ExpensesAccount);
}

export function getExpensesAccount(id: string): Promise<ExpensesAccount> {
  return fetchOne(`/expenses-accounts/${seg(id)}`, ExpensesAccount);
}

export async function createExpensesAccount(input: z.infer<typeof inputs.ExpensesAccountInput>) {
  const id = await createAndReturnId('/expenses-accounts', input);
  return getExpensesAccount(id);
}

export async function updateExpensesAccount(
  id: string,
  input: z.infer<typeof inputs.ExpensesAccountUpdateInput>
) {
  await put(`/expenses-accounts/${seg(id)}`, input);
  return getExpensesAccount(id);
}

export async function deleteExpensesAccount(id: string): Promise<void> {
  await deleteOne(`/expenses-accounts/${seg(id)}`);
}

export function listSalesChannels(): Promise<Page<SalesChannel>> {
  return fetchPage('/sales-channels', SalesChannel);
}

export function getSalesChannel(id: string): Promise<SalesChannel> {
  return fetchOne(`/sales-channels/${seg(id)}`, SalesChannel);
}

export async function createSalesChannel(input: z.infer<typeof inputs.SalesChannelInput>) {
  const id = await createAndReturnId('/sales-channels', input);
  return getSalesChannel(id);
}

export async function updateSalesChannel(
  id: string,
  input: z.infer<typeof inputs.SalesChannelUpdateInput>
) {
  await put(`/sales-channels/${seg(id)}`, input);
  return getSalesChannel(id);
}

export async function deleteSalesChannel(id: string): Promise<void> {
  await deleteOne(`/sales-channels/${seg(id)}`);
}

export function listNumberingSeries(type: string): Promise<Page<NumberingSeries>> {
  return fetchPage(`/numbering-series/${seg(type)}`, NumberingSeries);
}

export function createNumberingSeries(
  type: string,
  input: z.infer<typeof inputs.NumberingSeriesInput>
) {
  return post(`/numbering-series/${seg(type)}`, input);
}

export function updateNumberingSeries(
  type: string,
  id: string,
  input: z.infer<typeof inputs.NumberingSeriesInput>
) {
  return put(`/numbering-series/${seg(type)}/${seg(id)}`, input);
}

export async function deleteNumberingSeries(type: string, id: string): Promise<void> {
  await deleteOne(`/numbering-series/${seg(type)}/${seg(id)}`);
}

export function listTags(): Promise<Page<Tag>> {
  return fetchPage('/tags', Tag);
}

export function createTag(name: string) {
  return post('/tags', { name });
}

export async function deleteTag(name: string): Promise<void> {
  await deleteOne(`/tags/${seg(name)}`);
}

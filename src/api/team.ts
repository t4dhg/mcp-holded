import { deleteOne, getBinary, post, seg } from '../http-client.js';
import type { Page } from '../pagination.js';
import {
  AnyRecord,
  Employee,
  EmployeeTime,
  Payslip,
  SalaryRecord,
  inputs,
} from '../schemas/index.js';
import { createAndReturnId, fetchOne, fetchPage } from './shared.js';
import type { z } from 'zod';

export function listEmployees(params: { limit?: number; cursor?: string; search?: string } = {}) {
  return fetchPage('/employees', Employee, { ...params });
}

export function getEmployee(id: string): Promise<Employee> {
  return fetchOne(`/employees/${seg(id)}`, Employee);
}

export function getEmployeeContract(id: string) {
  return fetchOne(`/employees/${seg(id)}/contract`, AnyRecord);
}

export async function createEmployee(input: z.infer<typeof inputs.EmployeeInput>) {
  const id = await createAndReturnId('/employees', input);
  return getEmployee(id);
}

export function listEmployeeTimes(
  employeeId?: string,
  params: { limit?: number; cursor?: string } = {}
): Promise<Page<z.infer<typeof EmployeeTime>>> {
  const endpoint = employeeId ? `/employees/${seg(employeeId)}/times` : '/employee-times';
  return fetchPage(endpoint, EmployeeTime, { ...params });
}

export interface ListSalaryRecordsParams {
  limit?: number;
  cursor?: string;
  employee_id?: string;
  start_date?: string;
  end_date?: string;
}

export function listSalaryRecords(
  params: ListSalaryRecordsParams = {}
): Promise<Page<SalaryRecord>> {
  return fetchPage('/salary-records', SalaryRecord, { ...params });
}

export function getSalaryRecord(id: string): Promise<SalaryRecord> {
  return fetchOne(`/salary-records/${seg(id)}`, SalaryRecord);
}

export function getSalaryRecordPdf(id: string): Promise<Uint8Array> {
  return getBinary(`/salary-records/${seg(id)}/pdf`);
}

export interface ListPayslipsParams extends ListSalaryRecordsParams {
  kind?: string;
  is_draft?: boolean;
}

export function listPayslips(params: ListPayslipsParams = {}) {
  return fetchPage('/payslips', Payslip, { ...params });
}

export function getPayslip(id: string) {
  return fetchOne(`/payslips/${seg(id)}`, Payslip);
}

export function getPayslipPdf(id: string): Promise<Uint8Array> {
  return getBinary(`/payslips/${seg(id)}/pdf`);
}

export function createPayslipPayment(
  payslipId: string,
  input: z.infer<typeof inputs.PayslipPaymentInput>
) {
  return post(`/payslips/${seg(payslipId)}/payments`, input);
}

export async function deletePayslipPayment(payslipId: string, paymentId: string): Promise<void> {
  await deleteOne(`/payslips/${seg(payslipId)}/payments/${seg(paymentId)}`);
}

import { z } from 'zod';
import { Address, Amount, Id, NullableId, NullableString, StringList } from './shared.js';

/** GET /employees and /{id} (identical). */
export const Employee = z.looseObject({
  id: Id,
  holded_user_id: NullableId.optional(),
  name: z.string(),
  last_name: NullableString.optional(),
  full_name: NullableString.optional(),
  date_of_birth: NullableString.optional(),
  nationality: NullableString.optional(),
  social_security_number: NullableString.optional(),
  code: NullableString.optional(),
  gender: NullableString.optional(),
  email: NullableString.optional(),
  secondary_email: NullableString.optional(),
  phone: NullableString.optional(),
  mobile: NullableString.optional(),
  address: Address.nullable().optional(),
  team_ids: StringList.optional(),
  workplace_id: NullableId.optional(),
  iban: NullableString.optional(),
  notes: NullableString.optional(),
  current_contract: z.unknown().optional(),
  reporting_to: NullableId.optional(),
  time_off_policy_id: NullableId.optional(),
  terminated: z.unknown().optional(),
  job_title: NullableString.optional(),
  tags: StringList.optional(),
  custom_fields: z.array(z.unknown()).optional(),
  payroll_accounts: z.unknown().optional(),
});
export type Employee = z.infer<typeof Employee>;

/** GET /salary-records. Comma decimals. */
export const SalaryRecord = z.looseObject({
  id: Id,
  employee_id: NullableId.optional(),
  employee_name: NullableString.optional(),
  date: z.string(),
  description: NullableString.optional(),
  tags: StringList.optional(),
  accounting_account_id: NullableId.optional(),
  is_draft: z.boolean().optional(),
  total_payable: Amount.optional(),
  payment_total: Amount.optional(),
  payment_pending: Amount.optional(),
  payment_status: z.string().optional(),
});
export type SalaryRecord = z.infer<typeof SalaryRecord>;

/** GET /payslips: account has none; shape from the OpenAPI response. */
export const Payslip = z.looseObject({
  id: Id,
  employee_id: NullableId.optional(),
  employee_name: NullableString.optional(),
  payslip_kind: NullableString.optional(),
  date: NullableString.optional(),
  period_start: NullableString.optional(),
  period_end: NullableString.optional(),
  total_days: z.number().optional(),
  description: NullableString.optional(),
  tags: StringList.optional(),
  accounting_account_id: NullableId.optional(),
  is_draft: z.boolean().optional(),
  net_salary: Amount.optional(),
  total_company_cost: Amount.optional(),
  payment_total: Amount.optional(),
  payment_pending: Amount.optional(),
  payment_status: NullableString.optional(),
});

/** GET /employee-times and /employees/{id}/times: account has none; shape from the OpenAPI response. */
export const EmployeeTime = z.looseObject({
  id: Id,
  employee_id: Id.optional(),
  employee_name: NullableString.optional(),
  date: NullableString.optional(),
  start_at: NullableString.optional(),
  end_at: NullableString.optional(),
  duration: z.number().optional(),
  status: NullableString.optional(),
  approved: z.boolean().optional(),
});

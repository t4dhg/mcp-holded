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
  savePdf,
} from './shared.js';

export function registerTeamTool(server: McpServer) {
  server.registerTool(
    'holded_team',
    {
      title: 'Holded team',
      description:
        'Employees and payroll records. Actions: list_employees (search), get_employee, employee_contract, create_employee, list_times (employee_id optional), list_salary_records (employee_id, start_date, end_date), get_salary_record, salary_record_pdf (output_path), list_payslips (employee_id, dates, kind, is_draft), get_payslip, payslip_pdf, create_payslip_payment, delete_payslip_payment (payment_id). Salary amounts use a comma decimal separator.',
      inputSchema: {
        action: z.enum([
          'list_employees',
          'get_employee',
          'employee_contract',
          'create_employee',
          'list_times',
          'list_salary_records',
          'get_salary_record',
          'salary_record_pdf',
          'list_payslips',
          'get_payslip',
          'payslip_pdf',
          'create_payslip_payment',
          'delete_payslip_payment',
        ]),
        id: idArg,
        employee_id: z.string().optional(),
        payment_id: z.string().optional(),
        search: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        kind: z.string().optional(),
        is_draft: z.boolean().optional(),
        output_path: z.string().optional().describe('New path to save the PDF without overwriting'),
        data: dataArg,
        confirm: confirmArg,
        ...listArgs,
      },
    },
    async args => {
      try {
        switch (args.action) {
          case 'list_employees':
            return pageResponse(
              await api.listEmployees({ ...paging(args), search: args.search }),
              'employee'
            );
          case 'get_employee':
            return jsonResponse(await api.getEmployee(requireArg(args.id, 'id')));
          case 'employee_contract':
            return jsonResponse(await api.getEmployeeContract(requireArg(args.id, 'id')));
          case 'create_employee':
            return jsonResponse(
              await api.createEmployee(data(inputs.EmployeeInput, args.data, 'create employee')),
              'Employee created.'
            );
          case 'list_times':
            return pageResponse(
              await api.listEmployeeTimes(args.employee_id, paging(args)),
              'time entry'
            );
          case 'list_salary_records':
            return pageResponse(
              await api.listSalaryRecords({
                ...paging(args),
                employee_id: args.employee_id,
                start_date: args.start_date,
                end_date: args.end_date,
              }),
              'salary record'
            );
          case 'get_salary_record':
            return jsonResponse(await api.getSalaryRecord(requireArg(args.id, 'id')));
          case 'salary_record_pdf':
            return await savePdf(
              await api.getSalaryRecordPdf(requireArg(args.id, 'id')),
              requireArg(args.output_path, 'output_path')
            );
          case 'list_payslips':
            return pageResponse(
              await api.listPayslips({
                ...paging(args),
                employee_id: args.employee_id,
                start_date: args.start_date,
                end_date: args.end_date,
                kind: args.kind,
                is_draft: args.is_draft,
              }),
              'payslip'
            );
          case 'get_payslip':
            return jsonResponse(await api.getPayslip(requireArg(args.id, 'id')));
          case 'payslip_pdf':
            return await savePdf(
              await api.getPayslipPdf(requireArg(args.id, 'id')),
              requireArg(args.output_path, 'output_path')
            );
          case 'create_payslip_payment':
            return jsonResponse(
              await api.createPayslipPayment(
                requireArg(args.id, 'id'),
                data(inputs.PayslipPaymentInput, args.data ?? {}, 'create payslip payment')
              ),
              'Payslip payment created.'
            );
          case 'delete_payslip_payment': {
            const gate = checkConfirmation('delete_payslip_payment', args.confirm);
            if (gate.needsConfirmation) return textResponse(gate.message);
            await api.deletePayslipPayment(
              requireArg(args.id, 'id'),
              requireArg(args.payment_id, 'payment_id')
            );
            return textResponse(`Payment ${args.payment_id} deleted from payslip ${args.id}.`);
          }
        }
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

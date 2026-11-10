/**
 * Write operation policies.
 *
 * Every operation that deletes, overwrites, or has an irreversible or
 * outward-facing effect has an entry here with `requiresConfirmation: true`.
 * `checkConfirmation` in tools/shared.ts reads this table, and the
 * confirmation-coverage test checks that every tool arm reaching a destructive
 * API call consults it, and that the README lists exactly these operations.
 */

export enum OperationRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface OperationPolicy {
  risk: OperationRisk;
  requiresConfirmation: boolean;
  impactDescription: string;
}

const gated = (risk: OperationRisk, impactDescription: string): OperationPolicy => ({
  risk,
  requiresConfirmation: true,
  impactDescription,
});
const open = (risk: OperationRisk, impactDescription: string): OperationPolicy => ({
  risk,
  requiresConfirmation: false,
  impactDescription,
});

const POLICIES = {
  // Contacts
  create_contact: open(OperationRisk.MEDIUM, 'Creates a contact'),
  update_contact: gated(OperationRisk.HIGH, 'PUT replaces the whole contact record'),
  delete_contact: gated(OperationRisk.HIGH, 'Permanently deletes the contact'),
  bulk_archive_contacts: gated(OperationRisk.HIGH, 'Archives several contacts at once'),
  bulk_delete_contacts: gated(
    OperationRisk.CRITICAL,
    'Permanently deletes several contacts at once'
  ),
  attach_contact_file: gated(OperationRisk.HIGH, 'Uploads a local file to a contact'),
  create_contact_group: open(OperationRisk.LOW, 'Creates a contact group'),
  update_contact_group: gated(OperationRisk.MEDIUM, 'Overwrites a contact group'),
  delete_contact_group: gated(OperationRisk.HIGH, 'Permanently deletes a contact group'),

  // Sales and purchase documents (invoices, credit notes, estimates, proformas, receipts, orders, waybills, purchases, refunds)
  create_document: open(OperationRisk.MEDIUM, 'Creates a document as a draft or numbered record'),
  update_document: gated(OperationRisk.HIGH, 'PUT overwrites the document'),
  delete_document: gated(OperationRisk.CRITICAL, 'Permanently deletes the document'),
  approve_document: gated(
    OperationRisk.HIGH,
    'Assigns the legal number and locks the document; cannot be undone under Verifactu'
  ),
  cancel_document: gated(OperationRisk.HIGH, 'Cancels the document'),
  send_document: gated(OperationRisk.HIGH, 'Emails the document to the recipients'),
  record_document_payment: open(OperationRisk.MEDIUM, 'Registers a payment against the document'),
  attach_document_file: gated(OperationRisk.HIGH, 'Uploads a local file to a document'),
  set_document_pipeline: gated(OperationRisk.MEDIUM, 'Overwrites the document pipeline stage'),
  convert_document: open(OperationRisk.MEDIUM, 'Creates a new document from an existing one'),
  accept_estimate: open(OperationRisk.MEDIUM, 'Marks an estimate as accepted'),
  reject_estimate: open(OperationRisk.MEDIUM, 'Marks an estimate as rejected'),
  receive_purchase_order: open(
    OperationRisk.MEDIUM,
    'Registers received units on a purchase order'
  ),
  bulk_approve_invoices: gated(OperationRisk.CRITICAL, 'Approves several invoices at once'),
  bulk_cancel_invoices: gated(OperationRisk.CRITICAL, 'Cancels several invoices at once'),
  bulk_delete_invoices: gated(
    OperationRisk.CRITICAL,
    'Permanently deletes several invoices at once'
  ),
  create_recurring_invoice: open(OperationRisk.MEDIUM, 'Creates a recurring invoice schedule'),
  update_recurring_invoice: gated(OperationRisk.HIGH, 'PUT overwrites the recurring invoice'),
  delete_recurring_invoice: gated(OperationRisk.HIGH, 'Permanently deletes the recurring invoice'),
  skip_recurring_invoice: gated(OperationRisk.MEDIUM, 'Skips a scheduled occurrence'),

  // Payments
  create_payment: open(OperationRisk.MEDIUM, 'Creates a payment or collection'),
  update_payment: gated(OperationRisk.HIGH, 'PUT overwrites the payment'),
  delete_payment: gated(OperationRisk.HIGH, 'Permanently deletes the payment'),

  // Treasury
  create_treasury_account: open(OperationRisk.MEDIUM, 'Creates a banking account'),
  update_treasury_account: gated(OperationRisk.HIGH, 'PUT overwrites the banking account'),
  archive_treasury_account: gated(OperationRisk.HIGH, 'Archives the banking account'),
  delete_treasury_account: gated(OperationRisk.CRITICAL, 'Permanently deletes the banking account'),
  create_bank_movements: open(OperationRisk.MEDIUM, 'Adds manual bank movements'),
  reconcile_bank_movement: gated(
    OperationRisk.HIGH,
    'Reconciles a movement against documents, changing their accounting state'
  ),
  create_invoicing_forecast: open(OperationRisk.LOW, 'Creates a cashflow forecast'),
  update_invoicing_forecast: gated(OperationRisk.MEDIUM, 'Overwrites a cashflow forecast'),
  delete_invoicing_forecast: gated(OperationRisk.MEDIUM, 'Deletes a cashflow forecast'),

  // Accounting
  create_ledger_entry: open(OperationRisk.MEDIUM, 'Posts a manual journal entry'),
  create_accounting_account: open(OperationRisk.MEDIUM, 'Adds an account to the chart of accounts'),
  create_expenses_account: open(OperationRisk.LOW, 'Creates an expenses account'),
  update_expenses_account: gated(OperationRisk.MEDIUM, 'Overwrites an expenses account'),
  delete_expenses_account: gated(OperationRisk.HIGH, 'Permanently deletes an expenses account'),
  create_sales_channel: open(OperationRisk.LOW, 'Creates a sales channel'),
  update_sales_channel: gated(OperationRisk.MEDIUM, 'Overwrites a sales channel'),
  delete_sales_channel: gated(OperationRisk.HIGH, 'Permanently deletes a sales channel'),
  create_numbering_series: open(OperationRisk.MEDIUM, 'Creates a numbering series'),
  update_numbering_series: gated(
    OperationRisk.HIGH,
    'Overwrites a numbering series, including its format and counter'
  ),
  delete_numbering_series: gated(OperationRisk.CRITICAL, 'Permanently deletes a numbering series'),
  create_tag: open(OperationRisk.LOW, 'Creates a tag'),
  delete_tag: gated(OperationRisk.MEDIUM, 'Deletes a tag from every record that carries it'),

  // Catalog
  create_product: open(OperationRisk.MEDIUM, 'Creates a product'),
  update_product: gated(OperationRisk.HIGH, 'PUT overwrites the product'),
  update_product_stock: gated(OperationRisk.HIGH, 'Changes stock levels'),
  delete_product: gated(OperationRisk.HIGH, 'Permanently deletes the product'),
  create_service: open(OperationRisk.MEDIUM, 'Creates a service'),
  update_service: gated(OperationRisk.HIGH, 'PUT overwrites the service'),
  delete_service: gated(OperationRisk.HIGH, 'Permanently deletes the service'),
  create_warehouse: open(OperationRisk.MEDIUM, 'Creates a warehouse'),
  update_warehouse: gated(OperationRisk.MEDIUM, 'Overwrites warehouse details'),
  delete_warehouse: gated(OperationRisk.CRITICAL, 'Permanently deletes the warehouse'),
  create_price_list: open(OperationRisk.LOW, 'Creates a price list'),
  update_price_list: gated(OperationRisk.MEDIUM, 'Overwrites a price list'),
  delete_price_list: gated(OperationRisk.HIGH, 'Permanently deletes a price list'),
  create_production_order: open(OperationRisk.MEDIUM, 'Creates a production order'),
  update_production_order: gated(OperationRisk.HIGH, 'PUT overwrites the production order'),
  delete_production_order: gated(OperationRisk.HIGH, 'Permanently deletes the production order'),

  // Team
  create_employee: open(OperationRisk.MEDIUM, 'Creates an employee record'),
  create_payslip_payment: open(OperationRisk.MEDIUM, 'Registers a payment against a payslip'),
  delete_payslip_payment: gated(OperationRisk.HIGH, 'Permanently deletes a payslip payment'),

  // CRM
  create_funnel: open(OperationRisk.LOW, 'Creates a sales funnel'),
  update_funnel: gated(OperationRisk.MEDIUM, 'Overwrites a funnel'),
  delete_funnel: gated(OperationRisk.HIGH, 'Permanently deletes a funnel and its stages'),
  create_lead: open(OperationRisk.MEDIUM, 'Creates a lead'),
  update_lead: gated(OperationRisk.HIGH, 'PUT overwrites the lead'),
  delete_lead: gated(OperationRisk.HIGH, 'Permanently deletes the lead'),
  move_lead_stage: gated(OperationRisk.MEDIUM, 'Overwrites the lead stage'),
  update_lead_dates: gated(OperationRisk.MEDIUM, 'Overwrites the lead due date'),
  create_lead_note: open(OperationRisk.LOW, 'Adds a note to a lead'),
  update_lead_note: gated(OperationRisk.MEDIUM, 'Overwrites a lead note'),
  create_lead_task: open(OperationRisk.LOW, 'Adds a task to a lead'),
  update_lead_task: gated(OperationRisk.MEDIUM, 'Overwrites a lead task'),
  delete_lead_task: gated(OperationRisk.MEDIUM, 'Deletes a lead task'),

  // Projects
  create_project: open(OperationRisk.MEDIUM, 'Creates a project'),
  update_project: gated(OperationRisk.HIGH, 'PUT overwrites the project'),
  delete_project: gated(OperationRisk.CRITICAL, 'Permanently deletes the project and its tasks'),
  create_task: open(OperationRisk.LOW, 'Creates a task'),
  update_task: gated(OperationRisk.MEDIUM, 'PUT overwrites the task'),
  delete_task: gated(OperationRisk.HIGH, 'Permanently deletes the task'),
  create_project_time: open(OperationRisk.LOW, 'Logs time on a project'),
  update_project_time: gated(OperationRisk.MEDIUM, 'Overwrites a time entry'),
  delete_project_time: gated(OperationRisk.HIGH, 'Permanently deletes a time entry'),

  // Calendar
  create_event: open(OperationRisk.LOW, 'Creates a calendar event'),
  update_event: gated(OperationRisk.MEDIUM, 'PUT overwrites the event'),
  delete_event: gated(OperationRisk.HIGH, 'Permanently deletes the event'),
  create_booking: open(OperationRisk.MEDIUM, 'Creates a booking'),
  update_booking: gated(OperationRisk.MEDIUM, 'Changes a booking'),
  cancel_booking: gated(OperationRisk.HIGH, 'Cancels the booking'),

  // Inbox
  upload_inbox_document: gated(
    OperationRisk.HIGH,
    'Uploads a local file to the inbox for scanning'
  ),
  update_inbox_document: gated(OperationRisk.MEDIUM, 'Overwrites the inbox document draft'),
  attach_inbox_document: gated(
    OperationRisk.MEDIUM,
    'Links the inbox document to an existing purchase or receipt'
  ),
  delete_inbox_document: gated(OperationRisk.HIGH, 'Permanently deletes the inbox document'),

  // Webhooks
  create_webhook: open(OperationRisk.MEDIUM, 'Registers a webhook'),
  update_webhook: gated(OperationRisk.HIGH, 'PUT overwrites the webhook URL and events'),
  enable_webhook: open(OperationRisk.LOW, 'Enables a webhook'),
  disable_webhook: gated(OperationRisk.MEDIUM, 'Stops deliveries to a webhook'),
  delete_webhook: gated(OperationRisk.HIGH, 'Permanently deletes the webhook'),

  // Raw escape hatch
  raw_destructive_request: gated(
    OperationRisk.CRITICAL,
    'Sends a raw POST, PUT, PATCH or DELETE request to the Holded API'
  ),
} satisfies Record<string, OperationPolicy>;

export type OperationName = keyof typeof POLICIES;

export const OPERATION_POLICIES: Record<OperationName, OperationPolicy> = POLICIES;

export function getOperationPolicy(name: OperationName): OperationPolicy {
  return OPERATION_POLICIES[name];
}

export function isGated(name: OperationName): boolean {
  return OPERATION_POLICIES[name].requiresConfirmation;
}

export function gatedOperations(): OperationName[] {
  return (Object.keys(OPERATION_POLICIES) as OperationName[]).filter(isGated);
}

export function getWarningMessage(name: OperationName): string {
  const policy = OPERATION_POLICIES[name];
  return `This operation (${name}, risk ${policy.risk}) ${policy.impactDescription.charAt(0).toLowerCase()}${policy.impactDescription.slice(1)}. Nothing has been sent.`;
}

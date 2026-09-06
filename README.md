# @t4dhg/mcp-holded

An [MCP](https://modelcontextprotocol.io) server for the **Holded API v2**: contacts, sales and purchase documents, payments, treasury, accounting, catalog, team, CRM, projects, calendar, inbox and webhooks. Fourteen hierarchical tools with an `action` parameter, Zod validation of every request and response, retries on reads, and a confirmation gate on every destructive operation.

Holded deprecated its classic API (`/api/invoicing/v1`, `key` header). New keys use the format `pat_<id>_<secret>` and only authenticate against **v2** (`https://api.holded.com/api/v2`, `Authorization: Bearer`). This server speaks v2 only.

## Install and configure

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@t4dhg/mcp-holded"],
      "env": {
        "HOLDED_API_KEY": "pat_xxxxxxxx_xxxxxxxx"
      }
    }
  }
}
```

Requires Node.js 18 or later. Create the token in Holded under Settings, Developers, API, and use the full `pat_..._...` value.

### Environment variables

| Variable             | Required | Default                         | Purpose                                                    |
| -------------------- | -------- | ------------------------------- | ---------------------------------------------------------- |
| `HOLDED_API_KEY`     | yes      | none                            | v2 Personal Access Token. A v1 key is rejected at startup. |
| `HOLDED_BASE_URL`    | no       | `https://api.holded.com/api/v2` | Override the API base, for testing.                        |
| `HOLDED_TIMEOUT_MS`  | no       | `30000`                         | Per-request timeout.                                       |
| `HOLDED_MAX_RETRIES` | no       | `3`                             | Attempts for GET requests. Writes are never retried.       |
| `DEBUG`              | no       | `false`                         | Log requests to stderr.                                    |

## Tools

Every tool takes an `action`. List actions accept `limit` (1 to 200) and `cursor`; the response says how to continue. Create and update actions take the payload in `data`, following the Holded v2 request contract, and return the record re-read from the API. Gated actions take `confirm: true`.

| Tool                | Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holded_discover`   | Lists the domains below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `holded_contacts`   | `list` (exact filters `email`, `code`, `phone`, `mobile`, `custom_id`), `search` (substring on `name`), `get`, `create`, `update`, `delete`, `bulk_archive`, `bulk_delete`, `list_attachments`, `attach` (`file_path`), `portal_link`, `list_groups`, `get_group`, `create_group`, `update_group`, `delete_group`                                                                                                                                                                                                                                                                                                                                          |
| `holded_sales`      | `type` in invoice, credit_note, estimate, proforma, sales_receipt, sales_order, waybill, receipt_note, recurring_invoice. `list` (`contact_id`, `status`, `start_date`, `end_date`, `due_date_start`, `due_date_end`, `sort`, `approval_status`), `get`, `find_by_number`, `pdf` (`output_path`), `list_attachments`, `attach`, `schedule`, `create`, `update`, `delete`, `approve`, `cancel`, `send`, `set_pipeline`, `record_payment`, `convert`, `accept`, `reject`, `skip`, `bulk_approve`, `bulk_cancel`, `bulk_delete`                                                                                                                               |
| `holded_purchases`  | `type` in purchase, purchase_refund, purchase_order, purchase_shipment. `list` (same filters), `get`, `pdf`, `list_attachments`, `attach`, `received_items`, `create`, `update`, `delete`, `approve`, `send`, `set_pipeline`, `record_payment`, `receive`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `holded_payments`   | `list` (`start_date`, `end_date`, `banking_account_id`, `document_id`), `get`, `create`, `update`, `delete`, `list_methods`, `get_method`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `holded_treasury`   | `list_accounts` (`type`, `archived`), `get_account`, `create_account`, `update_account`, `archive_account`, `delete_account`, `list_movements` (`start_date`, `end_date`), `list_cash_movements`, `create_movements`, `reconcile` (`movement_id`), `list_remittances`, `get_remittance`, `list_forecasts`, `get_forecast`, `create_forecast`, `update_forecast`, `delete_forecast`                                                                                                                                                                                                                                                                         |
| `holded_accounting` | `list_accounts` (`start_date` and `end_date` add debit, credit and balance; `include_empty`), `create_account`, `list_ledger` (`start_date` and `end_date` required, `account`), `create_ledger_entry`, `list_taxes`, `tax_keys`, `list_expenses_accounts`, `get_expenses_account`, `create_expenses_account`, `update_expenses_account`, `delete_expenses_account`, `list_sales_channels`, `get_sales_channel`, `create_sales_channel`, `update_sales_channel`, `delete_sales_channel`, `list_numbering_series` (`series_type`), `create_numbering_series`, `update_numbering_series`, `delete_numbering_series`, `list_tags`, `create_tag`, `delete_tag` |
| `holded_catalog`    | `list_products` (`name`), `get_product`, `product_stock`, `create_product`, `update_product`, `update_stock`, `delete_product`, `list_services`, `get_service`, `create_service`, `update_service`, `delete_service`, `list_warehouses`, `get_warehouse`, `warehouse_stock`, `create_warehouse`, `update_warehouse`, `delete_warehouse`, `list_price_lists`, `get_price_list`, `create_price_list`, `update_price_list`, `delete_price_list`, `list_production_orders`, `get_production_order`, `create_production_order`, `update_production_order`, `delete_production_order`                                                                            |
| `holded_team`       | `list_employees` (`search`), `get_employee`, `employee_contract`, `create_employee`, `list_times`, `list_salary_records` (`employee_id`, `start_date`, `end_date`), `get_salary_record`, `salary_record_pdf`, `list_payslips`, `get_payslip`, `payslip_pdf`, `create_payslip_payment`, `delete_payslip_payment`                                                                                                                                                                                                                                                                                                                                            |
| `holded_crm`        | `list_funnels`, `get_funnel`, `create_funnel`, `update_funnel`, `delete_funnel`, `list_leads`, `get_lead`, `create_lead`, `update_lead`, `delete_lead`, `move_stage`, `update_dates`, `add_note`, `update_note`, `add_task`, `update_task`, `delete_task`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `holded_projects`   | `list_projects` (`status`), `get_project`, `project_summary`, `create_project`, `update_project`, `delete_project`, `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`, `list_times`, `get_time`, `create_time`, `update_time`, `delete_time`                                                                                                                                                                                                                                                                                                                                                                                           |
| `holded_calendar`   | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `list_bookings`, `get_booking`, `create_booking`, `update_booking`, `cancel_booking`, `list_locations`, `slots`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `holded_inbox`      | `list` (`status`, `start_date`, `end_date`, `user_id`), `get`, `upload` (`file_path`), `download` (`filename`, `output_path`), `update`, `attach`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `holded_webhooks`   | `list`, `get`, `events`, `create`, `update`, `enable`, `disable`, `delete`, `usage`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `holded_request`    | Any v2 endpoint: `method`, `path`, `query`, `body`. See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Example

```json
{
  "action": "list",
  "type": "invoice",
  "status": "pending",
  "start_date": "2026-01-01",
  "sort": "-date",
  "limit": 50
}
```

```json
{
  "action": "create",
  "type": "invoice",
  "data": {
    "contact_id": "5ff44eb88ec0b10f326e3213",
    "date": "2026-09-06",
    "items": [{ "name": "Licence", "units": 1, "price": 1000, "taxes": ["s_iva_21"] }]
  }
}
```

## Safety

### Operations that require confirmation

These actions delete, overwrite, lock or email something. Without `confirm: true` the tool sends nothing and explains what would happen; the same call with `confirm: true` proceeds. A structural test keeps this list equal to the gated actions in the code.

- `holded_contacts({ action: 'update' })`, `holded_contacts({ action: 'delete' })`, `holded_contacts({ action: 'bulk_archive' })`, `holded_contacts({ action: 'bulk_delete' })`, `holded_contacts({ action: 'update_group' })`, `holded_contacts({ action: 'delete_group' })`
- `holded_sales({ action: 'update' })`, `holded_sales({ action: 'delete' })`, `holded_sales({ action: 'approve' })` (assigns the legal number; irreversible under Verifactu), `holded_sales({ action: 'cancel' })`, `holded_sales({ action: 'send' })` (emails the customer), `holded_sales({ action: 'set_pipeline' })`, `holded_sales({ action: 'skip' })`, `holded_sales({ action: 'bulk_approve' })`, `holded_sales({ action: 'bulk_cancel' })`, `holded_sales({ action: 'bulk_delete' })`
- `holded_purchases({ action: 'update' })`, `holded_purchases({ action: 'delete' })`, `holded_purchases({ action: 'approve' })`, `holded_purchases({ action: 'send' })`, `holded_purchases({ action: 'set_pipeline' })`
- `holded_payments({ action: 'update' })`, `holded_payments({ action: 'delete' })`
- `holded_treasury({ action: 'update_account' })`, `holded_treasury({ action: 'archive_account' })`, `holded_treasury({ action: 'delete_account' })`, `holded_treasury({ action: 'reconcile' })`, `holded_treasury({ action: 'update_forecast' })`, `holded_treasury({ action: 'delete_forecast' })`
- `holded_accounting({ action: 'update_expenses_account' })`, `holded_accounting({ action: 'delete_expenses_account' })`, `holded_accounting({ action: 'update_sales_channel' })`, `holded_accounting({ action: 'delete_sales_channel' })`, `holded_accounting({ action: 'update_numbering_series' })`, `holded_accounting({ action: 'delete_numbering_series' })`, `holded_accounting({ action: 'delete_tag' })`
- `holded_catalog({ action: 'update_product' })`, `holded_catalog({ action: 'update_stock' })`, `holded_catalog({ action: 'delete_product' })`, `holded_catalog({ action: 'update_service' })`, `holded_catalog({ action: 'delete_service' })`, `holded_catalog({ action: 'update_warehouse' })`, `holded_catalog({ action: 'delete_warehouse' })`, `holded_catalog({ action: 'update_price_list' })`, `holded_catalog({ action: 'delete_price_list' })`, `holded_catalog({ action: 'update_production_order' })`, `holded_catalog({ action: 'delete_production_order' })`
- `holded_team({ action: 'delete_payslip_payment' })`
- `holded_crm({ action: 'update_funnel' })`, `holded_crm({ action: 'delete_funnel' })`, `holded_crm({ action: 'update_lead' })`, `holded_crm({ action: 'delete_lead' })`, `holded_crm({ action: 'move_stage' })`, `holded_crm({ action: 'update_dates' })`, `holded_crm({ action: 'update_note' })`, `holded_crm({ action: 'update_task' })`, `holded_crm({ action: 'delete_task' })`
- `holded_projects({ action: 'update_project' })`, `holded_projects({ action: 'delete_project' })`, `holded_projects({ action: 'update_task' })`, `holded_projects({ action: 'delete_task' })`, `holded_projects({ action: 'update_time' })`, `holded_projects({ action: 'delete_time' })`
- `holded_calendar({ action: 'update_event' })`, `holded_calendar({ action: 'delete_event' })`, `holded_calendar({ action: 'update_booking' })`, `holded_calendar({ action: 'cancel_booking' })`
- `holded_inbox({ action: 'update' })`, `holded_inbox({ action: 'attach' })`, `holded_inbox({ action: 'delete' })`
- `holded_webhooks({ action: 'update' })`, `holded_webhooks({ action: 'disable' })`, `holded_webhooks({ action: 'delete' })`

Creates are not gated, including `record_payment`, `create_movements` and `create_ledger_entry`: they add records that can be deleted afterwards. The gate reduces accidents; it is not an authorization boundary, and the token grants whatever Holded grants it.

### The raw request tool

`holded_request` reaches every v2 endpoint with correct Bearer auth and returns the response unvalidated. `DELETE`, `PUT` and `PATCH` require `confirm: true`, and so does a `POST` to any path containing `bulk`, `cancel`, `archive`, `approve`, `send`, `reconcile`, `ship`, `skip`, `clock-in` or `clock-out`, because Holded hides destructive operations behind those. The refused call returns the exact method, URL and body it would have sent.

## How the API really behaves

Everything below was verified against live v2 responses on 2026-09-06 and is what the schemas are built from.

- **Pagination is cursor based.** Lists return `{ items, cursor, has_more }`; `cursor` is the last item id and goes back as `?cursor=`. `limit` defaults to 50 and is capped at 200; `page` and `offset` are ignored. Configuration lists (taxes, tags, warehouses, accounting accounts, expenses accounts, sales channels, numbering series, price lists, booking locations) return `{ items }` with no cursor.
- **Amounts are strings, with two decimal conventions.** Sales and purchase documents, their lines and salary records use a comma ("63500,00"). Payments, treasury accounts, bank movements, accounting accounts and ledger entries use a dot ("8.3", "0.00"). The server passes them through unchanged and never converts, so nothing is rounded.
- **Ledger dates are `DD/MM/YYYY`.** Everything else is ISO 8601.
- **Errors are RFC 7807** (`{ type, title, status, detail }`) for 400, 403 and 404. A bad or missing key gives 403 "Access denied", not 401. Unknown routes give 404 `{ message: "No route found..." }`. Some malformed paths return Holded's HTML app shell with a 200 or 405; the server turns that into an error instead of returning HTML.
- **Undocumented query parameters are silently ignored.** `query`, `q` and `search` on `/contacts` filter nothing; use `search` (which calls `/contacts/search?name=`) or the exact-match filters.
- **Get-by-id returns more than list** for documents: `accounting_date`, `approved_at`, `notes`, `language`, `payments_detail`, `payments_refunds`, `shipping`, `design_id`, `pipeline_id` and more.
- **Not every verb exists for every document type.** Purchase refunds are listed at `/purchase-refunds` but read and created under `/purchases/refund`, and offer nothing else (no update, delete, pdf, attachments or approve). Purchases have no pdf or send route. Recurring invoices have update, delete, skip and schedule only. Estimates, proformas, orders and waybills have no payments. The tools refuse an unsupported combination with a message listing what is available, before sending anything.
- **Numbering series types** are invoice, purchase, estimate, creditnote, salesorder, waybill, salesreceipt and purchaserefund.
- **Rate limit** is 100 requests per minute per key. GETs retry on 429 (honouring `Retry-After`), 5xx, timeouts and network errors with exponential backoff and jitter. Writes are sent exactly once because Holded has no idempotency key.
- **Creates return `{ id }`** with a 201. The server re-reads the record so the tool returns the validated object.
- **Schemas for CRM leads, projects, tasks, events, bookings, webhooks, payslips, price lists, production orders, sales orders, sales receipts, receipt notes, purchase shipments and remittances** come from the OpenAPI document rather than live records, because the account used for verification has none. They are loose objects, so extra fields pass through, and any mismatch surfaces as a clear schema error rather than a silent success.

## Development

```bash
npm install
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
HOLDED_API_KEY=pat_..._... npm run smoke   # spawns the built server over stdio and makes one read call
```

Tests run against anonymised fixtures in `src/__tests__/fixtures`, each a real v2 response with names, tax ids, addresses, bank details and amounts replaced. Add a fixture when you add an endpoint; the schema test fails on any fixture without a schema.

## Releasing

Releases are staged by CI and promoted by a human. Bump `package.json`, commit, tag `vX.Y.Z` and push the tag. The publish workflow authenticates to npm over OIDC as a trusted publisher (no token anywhere), runs tests and build, and runs `npm stage publish`. Nothing is installable until a maintainer runs `npm stage approve <stage-id>` locally, which is where 2FA is proved. See [CONTRIBUTING.md](CONTRIBUTING.md) for the exact steps.

## Security

Report vulnerabilities through [GitHub Security Advisories](https://github.com/t4dhg/mcp-holded/security/advisories/new); see [SECURITY.md](SECURITY.md).

## License

MIT

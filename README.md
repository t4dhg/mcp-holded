<p align="center">
  <img src="https://raw.githubusercontent.com/t4dhg/mcp-holded/main/assets/holded-logo.svg" alt="Holded" height="28">
</p>

# MCP Holded

> **Model Context Protocol server for [Holded](https://www.holded.com), on the v2 API**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/t4dhg/mcp-holded/actions/workflows/ci.yml/badge.svg)](https://github.com/t4dhg/mcp-holded/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/t4dhg/mcp-holded/branch/main/graph/badge.svg)](https://codecov.io/gh/t4dhg/mcp-holded)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/@t4dhg/mcp-holded.svg)](https://www.npmjs.com/package/@t4dhg/mcp-holded)
[![npm downloads](https://img.shields.io/npm/dm/@t4dhg/mcp-holded.svg)](https://www.npmjs.com/package/@t4dhg/mcp-holded)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)

_A community project. Not affiliated with, endorsed by, or supported by Holded. "Holded" and the Holded logo are trademarks of their owner, used here to identify the API this server speaks to._

An [MCP](https://modelcontextprotocol.io) server for the **Holded API v2**: contacts, sales and purchase documents, payments, treasury, accounting, catalog, team, CRM, projects, calendar, inbox and webhooks. Thirteen hierarchical tools with an `action` parameter, Zod validation of every request and response, retries on reads, and a confirmation gate on every destructive operation.

Holded deprecated its classic API (`/api/invoicing/v1`, `key` header). New keys use the format `pat_<id>_<secret>` and only authenticate against **v2** (`https://api.holded.com/api/v2`, `Authorization: Bearer`). This server speaks v2 only.

## Why this one

- **v2 only, which is the API that still works.** Holded deprecated the classic API (`/api/invoicing/v1`, `key` header). New tokens are `pat_<id>_<secret>` and authenticate only against v2. This server speaks v2 and nothing else.
- **Thirteen hierarchical tools with an `action` parameter**, not one tool per endpoint, so the tool list stays small in a model's context while covering contacts, sales, purchases, payments, treasury, accounting, catalog, team, CRM, projects, calendar, inbox and webhooks.
- **Seven MCP resources and six MCP prompts.** The resources carry the account's own tax keys, numbering series, payment methods and chart of accounts, plus the API behaviour a schema cannot express. The prompts run the real workflows: aged receivables, VAT summary, bank reconciliation, statements, month-end close.
- **A confirmation gate on every destructive operation**, with a structural test that keeps the documented list equal to the code. Nothing that deletes, overwrites, approves or emails goes through without `confirm: true`.
- **Zod validation of every request and every response.** A shape the server has not seen surfaces as a clear schema error rather than a silent success.
- **Over 200 tests against anonymised real v2 responses**, npm provenance via trusted publishing, and Node 18 or later.

## How it compares

Four MCP servers for Holded exist on npm. This compares the published code of each, not their descriptions, as at **2026-09-08**: `@t4dhg/mcp-holded` 2.1.1, `@nubiia/mcp-holded` 2.0.2, `@energio/holded-mcp` 1.5.1 and `holded-mcp` 1.0.0. It is a snapshot and will age; check the current versions yourself before relying on it.

|                              | `@t4dhg/mcp-holded`                                  | `@nubiia/mcp-holded`                                                             | `@energio/holded-mcp`                                       | `holded-mcp`                                                |
| ---------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| API version                  | **v2**                                               | **v2**                                                                           | v1 (deprecated)                                             | v1 (deprecated)                                             |
| Auth                         | Bearer `pat_`                                        | Bearer `pat_`                                                                    | `key` header                                                | `key` header                                                |
| Domains covered              | 13                                                   | 18 tool-module files (no calendar, bookings, inbox, webhooks or CRM)             | 5 API sections (accounting, CRM, invoicing, projects, team) | 5 API sections (accounting, CRM, invoicing, projects, team) |
| Tool shape                   | 13 hierarchical, `action` parameter (15 tools total) | 119 flat tools, one per operation                                                | 139 flat tools, one per operation                           | 136 flat tools, one per operation                           |
| MCP resources                | **7**                                                | 0                                                                                | 0                                                           | 0                                                           |
| MCP prompts                  | **6**                                                | 0                                                                                | 0                                                           | 0                                                           |
| Destructive operations gated | Every one, structurally tested                       | No confirmation gate; `destructiveHint` annotation and per-tool rate limits only | No confirmation gate; `destructiveHint` annotation only     | No confirmation gate; `destructiveHint` annotation only     |
| Response validation          | Zod, requests and responses                          | Zod, requests only                                                               | Zod, requests only                                          | Zod, requests only                                          |
| Minimum Node                 | **18**                                               | 22.14                                                                            | 20                                                          | **18**                                                      |
| Tests                        | 234                                                  | 389, across 23 files, shipped in the package and passing                         | None shipped                                                | None shipped                                                |
| npm provenance               | Yes                                                  | Yes                                                                              | No                                                          | No                                                          |
| Licence                      | MIT                                                  | MIT                                                                              | MIT                                                         | MIT                                                         |
| Last publish                 | 2026-09-08                                           | 2026-07-07                                                                       | 2026-07-01                                                  | 2026-02-25                                                  |

<!-- Re-verify every cell against the rivals' published tarballs before editing this section. Do not edit a single cell without re-running the whole pass; a half-updated table is worse than a stale one. -->

Where this differs most: the v1 servers are on an API Holded has deprecated, and new `pat_` tokens do not authenticate against it at all, so they cannot work with a newly issued key. Against `@nubiia/mcp-holded`, which is current, the differences are breadth (this server covers calendar and bookings, inbox, webhooks, and CRM leads and funnels, none of which appear in nubiia's tool list), the resource and prompt surface, the hierarchical tool shape, and a gated raw-request escape hatch. Nubiia's own Node floor is 22.14, genuinely higher than the 18 this server and `holded-mcp` both support.

## Quick start

Install nothing. Every client below runs the server through `npx`. Create the token in Holded under **Settings, Developers, API** and use the full `pat_..._...` value.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@t4dhg/mcp-holded"],
      "env": { "HOLDED_API_KEY": "pat_xxxxxxxx_xxxxxxxx" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add holded --env HOLDED_API_KEY=pat_xxxxxxxx_xxxxxxxx -- npx -y @t4dhg/mcp-holded
```

### Cursor

Edit `~/.cursor/mcp.json` for every project, or `.cursor/mcp.json` for one:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@t4dhg/mcp-holded"],
      "env": { "HOLDED_API_KEY": "pat_xxxxxxxx_xxxxxxxx" }
    }
  }
}
```

### VS Code

Edit `.vscode/mcp.json`. Note the key is `servers`, not `mcpServers`:

```json
{
  "servers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@t4dhg/mcp-holded"],
      "env": { "HOLDED_API_KEY": "pat_xxxxxxxx_xxxxxxxx" }
    }
  }
}
```

Requires Node.js 18 or later.

### Environment variables

| Variable             | Required | Default                         | Purpose                                                    |
| -------------------- | -------- | ------------------------------- | ---------------------------------------------------------- |
| `HOLDED_API_KEY`     | yes      | none                            | v2 Personal Access Token. A v1 key is rejected at startup. |
| `HOLDED_BASE_URL`    | no       | `https://api.holded.com/api/v2` | Override the API base, for testing.                        |
| `HOLDED_TIMEOUT_MS`  | no       | `30000`                         | Per-request timeout.                                       |
| `HOLDED_MAX_RETRIES` | no       | `3`                             | Attempts for GET requests. Writes are never retried.       |
| `DEBUG`              | no       | `false`                         | Log requests to stderr.                                    |

## What people use it for

**Chasing unpaid invoices.** Run the `holded_aged_receivables` prompt. You get every outstanding invoice bucketed by how late it is and grouped by customer, worst first, counting only the unpaid remainder of part-paid invoices. Then ask for a statement for the worst offender with `holded_contact_statement`, in a form you can send them.

**Reconciling a bank month.** Run `holded_bank_reconciliation` for the period. It matches bank movements against recorded payments on amount and date, then shows you the two lists that matter: movements with no payment recorded, and payments the bank has not shown. Reconciling stays behind a confirmation, so nothing is matched in your books until you approve it.

**Preparing the quarterly VAT figures.** Run `holded_vat_summary`. It groups sales and purchases by tax key for the quarter and gives base and quota for each, which is the shape Modelo 303 wants. It is a working aid, not a filing, and it says so.

**Closing a month.** Run `holded_month_end_close`. It tells you what is still in draft, what is past due, and what is sitting in the inbox, each with the exact call that clears it.

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

## Resources

Seven MCP resources give a model the context it needs before it can make a correct call. Attach them in your client, or read them by URI.

| URI                                      | What it holds                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holded://guide/api-behaviour`           | Verified v2 behaviour: Bearer auth and the 403-not-401 quirk, cursor pagination, the two decimal conventions, `DD/MM/YYYY` ledger dates, RFC 7807 errors, silently ignored query parameters, the 100 request per minute limit, and why writes are never retried. |
| `holded://guide/document-types`          | The nine sales and four purchase types with their Spanish names, and which verbs each supports. Recurring invoices, purchase refunds and estimates each lack verbs the others have.                                                                              |
| `holded://guide/irreversible-operations` | Every gated operation with its risk and effect, generated from the policy table so it cannot drift, plus why approving a sales document is irreversible under Verifactu.                                                                                         |
| `holded://reference/taxes`               | The account's tax keys, names and percentages. A document line needs the key verbatim, for example `s_iva_21`.                                                                                                                                                   |
| `holded://reference/numbering-series`    | The numbering series configured for each document type, with their formats and last-used numbers.                                                                                                                                                                |
| `holded://reference/payment-methods`     | Payment method ids, needed by `record_payment` and by a document's `payment_method_id`.                                                                                                                                                                          |
| `holded://reference/accounting-accounts` | The chart of accounts, needed for ledger entries. Spanish PGC numbering, which cannot be guessed.                                                                                                                                                                |

The three guides are static. The four references read the account's own configuration and are cached for fifteen minutes, because clients re-read resources at the start of every conversation. A reference whose read fails returns an explanation and the tool to fall back to; it never throws.

## Prompts

Six MCP prompts run the workflows this server exists for. Each one pre-reads the facts and hands back a report plus the exact tool calls to act on it. **None of them writes.** Where a change is needed, the prompt emits the gated call for you to approve.

| Prompt                       | Arguments                              | What it does                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holded_aged_receivables`    | `as_of`, `contact_id`                  | Outstanding sales invoices bucketed by days overdue and grouped by contact, worst first. Counts the unpaid remainder, not the document total.                                                                                      |
| `holded_vat_summary`         | `start_date`, `end_date`               | Output and input VAT by tax key for a period, with base and quota. A working aid for preparing Modelo 303, not a filing and not tax advice. Defaults to the previous calendar quarter.                                             |
| `holded_bank_reconciliation` | `start_date`, `end_date`, `account_id` | Proposes matches between bank movements and recorded payments, then lists what is unmatched on both sides. Defaults to the previous month.                                                                                         |
| `holded_contact_statement`   | `contact_id` or `name`                 | Invoiced, paid and outstanding for one contact, document by document, with the oldest unpaid item called out. When the API omits a document's pending figure, derives it as total less paid and discloses which rows were derived. |
| `holded_month_end_close`     | `start_date`, `end_date`               | What is still open at the end of a period: documents in draft, invoices past due, inbox documents, each with the call that resolves it.                                                                                            |
| `holded_draft_invoice`       | `contact`, `description`, `date`       | Resolves the contact, offers only the tax keys usable on a sales document, and assembles a create payload for you to review. Creates nothing, and never approves.                                                                  |

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

## Troubleshooting

### The server exits immediately with a message about the key

`HOLDED_API_KEY` must be a v2 Personal Access Token, in the form `pat_<id>_<secret>`. The server checks this at startup and refuses to run on anything else, rather than failing later on every call. A classic v1 key is 32 hex characters and does not authenticate against v2 at all.

### Everything returns 403 "Access denied"

That is what a bad, revoked or wrong-scope token looks like on v2. Holded returns **403, not 401**, so it reads like a permissions problem when it is usually an authentication one. Regenerate the token in Holded under Settings, Developers, API, and check you copied the whole `pat_..._...` value including both underscores.

### A tool says an action is not available for that document type

Not every verb exists for every type. Purchase refunds have no update, delete, pdf, attachment or approve. Purchases have no pdf or send. Recurring invoices have only update, delete, skip and schedule. Estimates, proformas, sales orders and waybills have no payments. The tool refuses before sending anything and lists what is available. The full matrix is in the `holded://guide/document-types` resource.

### A filter seems to be ignored

It probably is. Holded silently ignores undocumented query parameters: `query`, `q` and `search` on `/contacts` filter nothing and return everything. Use the `search` action, which calls `/contacts/search?name=`, or the exact-match filters `email`, `code`, `phone`, `mobile` and `custom_id`. `page` and `offset` are ignored everywhere; pagination is by `cursor`.

### A resource says it could not be read

The four `holded://reference/...` resources read live configuration, so they need a working token. They return an explanation rather than throwing, so the server keeps working. The three `holded://guide/...` resources are static and always readable.

### Set `DEBUG=true`

Every request is then logged to stderr. Never to stdout, which is the MCP transport.

## FAQ

**Does it work with the old v1 API key?** No, deliberately. v1 is deprecated and new keys do not authenticate against it. Supporting both would mean two code paths where one is a dead end.

**Can it delete things by accident?** Every operation that deletes, overwrites, approves, cancels or emails requires `confirm: true`. Without it the tool sends nothing and tells you what it would have done. The list is generated from the code into `holded://guide/irreversible-operations`, and a test fails if the documented list and the code disagree.

**What happens if a write times out?** It is not retried. Holded has no idempotency key, so a retried write could double-charge or double-issue. Reads retry with backoff; writes are sent exactly once. If a write times out, read the record before trying again.

**Why does approving an invoice need confirmation?** It assigns the legal invoice number. Under Verifactu that is part of an immutable chained record and cannot be undone: a mistake needs a credit note, not an edit.

**Are amounts safe to round-trip?** Yes. Amounts are strings and the server passes them through unchanged, so nothing is rounded. Be aware there are two conventions: documents and salary records use a comma, payments, treasury and accounting use a dot.

**Can I reach an endpoint that has no dedicated action?** Yes, `holded_request` reaches any v2 path with correct auth. Destructive methods and paths are gated there too.

**Is it affiliated with Holded?** No. It is a community project that speaks their public API.

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

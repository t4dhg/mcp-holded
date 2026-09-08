# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1] - 2026-09-08

No runtime code changed in this release. No tool, resource or prompt was added, removed or altered, so upgrading from 2.1.0 changes nothing about how the server behaves.

### Changed

- Republished so that the `latest` dist-tag carries a provenance attestation whose source commit is present in the repository. The attestation on 2.1.0 names a commit that the history rewrite below replaced: no branch or tag reaches it and it is absent from a fresh clone, so 2.1.0 cannot be verified against the repository as published. GitHub may keep serving that commit by its hash until it garbage-collects, so a verifier that fetches by hash alone can still succeed for now. The 2.1.1 attestation names the `v2.1.1` tag and verifies against any clone.
- The published git history was rewritten to correct editorial text in earlier commit messages and changelog entries. Existing clones will not fast-forward. Re-clone, or run `git fetch --force --prune --prune-tags --tags origin && git reset --hard origin/main`. `v2.0.0` and `v2.1.0` now point at different commits; `v1.0.1` is unchanged.
- The tracked ignore file no longer lists machine-local editor and assistant configuration. Those belong in a per-clone exclude, which does not travel with the repository.

### Added

- A pre-commit scan that refuses to stage credential-shaped values and internal planning artefacts. It is deterministic, runs ahead of the formatter so a rejected commit is never reformatted first, and carries its own unit tests. It has to name the filenames and token prefixes it detects; those literals are confined to one labelled table.

### Fixed

- `format:check` no longer matches Markdown outside the project, so a clean checkout and a working machine give the same result. It now names `README.md`, `CONTRIBUTING.md` and `SECURITY.md` explicitly.
- The registry description fits inside the 100 character limit the registry enforces, which was rejecting the submission with a 422. A test now guards that length directly instead of asserting surface counts that the length problem did not affect.

### Removed

- `smithery.yaml`. Smithery lists only remote HTTP servers. Verified against their registry API: every listed server reports `remote: true`, this package returned 404, and the stdio-only reference servers are absent while a server with a hosted endpoint is present. This server runs locally over stdio, so the configuration was inert and its presence implied a listing that never existed.

## [2.1.0] - 2026-09-08

### Added

- **Seven MCP resources.** Three guides and four live references. `holded://guide/api-behaviour` carries the verified v2 behaviour a tool schema cannot express: Bearer auth and the 403-not-401 response to a bad key, cursor pagination, the two decimal conventions, `DD/MM/YYYY` ledger dates, silently ignored query parameters, and why writes are never retried. `holded://guide/document-types` carries the per-type verb matrix. `holded://guide/irreversible-operations` is generated from the write-safety policy table so it cannot drift, and explains why approving a sales document is irreversible under Verifactu. `holded://reference/taxes`, `holded://reference/numbering-series`, `holded://reference/payment-methods` and `holded://reference/accounting-accounts` read the account's own configuration, are memoised for fifteen minutes, and never throw: a failed read returns an explanation and the tool to fall back to.
- **Six MCP prompts**, all read-only: `holded_aged_receivables`, `holded_vat_summary`, `holded_bank_reconciliation`, `holded_contact_statement`, `holded_month_end_close` and `holded_draft_invoice`. Each pre-reads the facts and returns a report plus the exact tool calls to act on it. `holded_draft_invoice` assembles a create payload for review and stops; it never proposes `approve` in the same turn as `create`, because `create` makes an editable draft while `approve` assigns the legal number and cannot be undone under Verifactu.
- A shared `unpaidRemainder` helper in `src/prompts/shared.ts` so every prompt answers "how much is still owed" the same way, through one implementation.
- Structural tests asserting that the tool, resource and prompt counts stated in `README.md` and `llms.txt` equal the counts registered on the server, and that every resource URI and prompt name is documented.
- Coverage and test-result uploads to Codecov, and a badge row on the README.
- `server.json`, `smithery.yaml` and `glama.json`, and a manual workflow that publishes to the official MCP registry once an npm release is live.
- Issue and pull request templates.
- npm keywords expanded from eleven to twenty-six, adding Spanish search terms and client names.
- A dated comparison table against the other Holded MCP servers on npm, and a rebuilt npm page with a header, badges and a why-this-one section.

### Fixed

- `unpaidRemainder` now derives an absent `payments_pending` as total less paid, instead of treating the absence as zero. A wholly unpaid invoice whose pending figure the API omitted could previously be reported as settled; the aged receivables, statement and month-end close prompts all went through this bug before the fix.
- `holded_vat_summary` reports a tax key with no rate in the account's own tax records as unknown, not as a genuine 0 per cent tax. The two look identical in a raw total; only one of them is safe to file.
- `README.md` and `llms.txt` both stated "Fourteen hierarchical tools with an `action` parameter". Thirteen tool modules take an `action`; `holded_discover` and `holded_request` do not. Both documents now say thirteen, and a surface test derives the number from the code so it cannot drift again.

## [2.0.0] - 2026-09-06

Rewrite in TypeScript to the standard of `@t4dhg/mcp-factorial`: hierarchical tools, Zod schemas built from real responses, validated writes, a structured HTTP client with retries, and a confirmation gate on every destructive operation, enforced by a structural test.

### Breaking changes

- The six `holded_list_*` tools and `holded_get_by_id` are gone. Use the domain tools: `holded_contacts`, `holded_sales`, `holded_purchases`, `holded_payments`, `holded_treasury`, `holded_accounting`, `holded_catalog`, `holded_team`, `holded_crm`, `holded_projects`, `holded_calendar`, `holded_inbox`, `holded_webhooks`, each with an `action` parameter. `holded_discover` lists them.
- The `page` and `query` arguments of the old list tools are gone. Holded v2 ignored both; `page` never paginated and `query` never filtered. Lists now take `cursor` and the real filters (`contact_id`, `status`, `start_date`, `end_date`, `sort`, exact `email` and `code` on contacts, `search` for name substring).
- `holded_request` now also gates `PATCH` and any `POST` to a path containing `bulk`, `cancel`, `archive`, `approve`, `send`, `reconcile`, `ship`, `skip`, `clock-in` or `clock-out`. Previously only `DELETE` and `PUT` needed `confirm: true`.
- A v1-format `HOLDED_API_KEY` (32 hex characters) is rejected at startup with an explanation, instead of failing every call with 403.
- Node.js 18 remains the minimum, but the package now ships compiled output in `dist/` and the binary is `dist/index.js`.

### Added

- 14 domain tools covering contacts, every sales and purchase document type, payments, treasury (accounts, bank movements, reconciliation, remittances, forecasts), accounting (chart of accounts with balances, ledger entries, taxes, expenses accounts, sales channels, numbering series, tags), catalog (products, stock, services, warehouses, price lists, production orders), team (employees, times, salary records, payslips and their payments), CRM, projects, calendar, inbox and webhooks. PDF downloads for documents, salary records and payslips; multipart file upload for attachments and the inbox.
- Zod response schemas built from anonymised real v2 responses (fixtures under `src/__tests__/fixtures`), with runtime validation of every response. Write payloads are validated against the OpenAPI request contracts before anything is sent; unknown keys are rejected.
- HTTP client with exponential backoff and jitter on GET, `Retry-After` handling, per-request timeouts, RFC 7807 error parsing, and detection of Holded's HTML app shell. Writes are never retried.
- `write-safety.ts` policies for every write operation; `checkConfirmation` gate; `confirmation-coverage.test.ts` verifies that every tool action reaching a destructive API call is gated and that the README list equals the code.
- CI runs lint, format check, typecheck, build and tests on Node 18, 20, 22 and 24. `llms.txt` and `CONTRIBUTING.md`.

### Fixed

- The old server described `query` as a free-text search on the list tools. Holded v2 ignores it, so those calls returned unfiltered results that looked like matches.

## [1.0.1] - 2026-09-06

### Changed

- `holded_request` now requires `confirm: true` for `DELETE` and `PUT`. Without it the tool sends nothing and returns the exact method, URL and body it would have sent. A model acting on a mistaken or injected instruction could previously delete or overwrite any Holded record in one step.

### Added

- `SECURITY.md` and GitHub private vulnerability reporting.
- CI on Node 18 to 24 (`node --test` plus a syntax check) and a publish workflow that stages releases to npm through trusted publishing for a human to approve; no npm token is stored anywhere.
- This changelog.

## [1.0.0] - 2026-07-21

- Initial release.

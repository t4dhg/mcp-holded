/**
 * Static guides exposed as MCP resources.
 *
 * Everything here is verified v2 behaviour, not documentation. A model holding
 * only the tool schemas cannot discover any of it without first making the
 * mistake, which is why it is a resource rather than a README section.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const API_BEHAVIOUR_URI = 'holded://guide/api-behaviour';
export const DOCUMENT_TYPES_URI = 'holded://guide/document-types';

export const API_BEHAVIOUR_GUIDE = `# How the Holded v2 API really behaves

Verified against live v2 responses. The schemas in this server are built from these facts.

## Authentication

Only v2 Personal Access Tokens work, in the form \`pat_<id>_<secret>\`, sent as \`Authorization: Bearer\`. Classic v1 keys are 32 hex characters and are rejected by v2. A bad or missing key returns **403 "Access denied", not 401**, so an auth failure looks like a permissions problem unless you know this.

## Pagination

Lists return \`{ items, cursor, has_more }\`. \`cursor\` is the id of the last item; pass it back as \`cursor\`. \`limit\` defaults to 50 and is capped at 200. \`page\` and \`offset\` are silently ignored.

Configuration lists return \`{ items }\` with no cursor at all: taxes, tags, warehouses, accounting accounts, expenses accounts, sales channels, numbering series, price lists and booking locations.

## Amounts have two decimal conventions

- **Comma**, for example \`"63500,00"\`: sales and purchase documents, their lines, and salary records.
- **Dot**, for example \`"8.3"\` or \`"0.00"\`: payments, treasury accounts, bank movements, accounting accounts and ledger entries.

Amounts are strings and this server passes them through unchanged, so nothing is ever rounded. Send back the same convention you received for that endpoint family.

## Dates

Ledger dates are \`DD/MM/YYYY\`. Everything else is ISO 8601.

## Errors

400, 403 and 404 are RFC 7807: \`{ type, title, status, detail }\`. An unknown route gives 404 \`{ message: "No route found..." }\`. Some malformed paths return Holded's HTML app shell with a 200 or 405; this server turns that into an error rather than returning HTML.

## Undocumented query parameters are silently ignored

\`query\`, \`q\` and \`search\` on \`/contacts\` filter nothing and return everything. Use the \`search\` action, which calls \`/contacts/search?name=\`, or the exact-match filters \`email\`, \`code\`, \`phone\`, \`mobile\` and \`custom_id\`.

## Get-by-id returns more than list

For documents, the single-record read adds \`accounting_date\`, \`approved_at\`, \`notes\`, \`language\`, \`payments_detail\`, \`payments_refunds\`, \`shipping\`, \`design_id\` and \`pipeline_id\`, among others. If a field is missing from a list result, read the record.

## Rate limit and retries

100 requests per minute per key. GETs retry on 429 (honouring \`Retry-After\`), 5xx, timeouts and network errors, with exponential backoff and jitter. **Writes are sent exactly once**, because Holded has no idempotency key. A write that times out may or may not have applied; read before retrying.

## Creates return only an id

A create returns \`{ id }\` with a 201. This server re-reads the record so the tool returns the validated object.
`;

export const DOCUMENT_TYPES_GUIDE = `# Holded document types, and which verbs each one supports

\`holded_sales\` and \`holded_purchases\` both take a \`type\`. Not every verb exists for every type. The tools refuse an unsupported combination before sending anything, but knowing the matrix saves the round trip.

## Sales types (\`holded_sales\`)

| \`type\` | Spanish name | Notes |
| --- | --- | --- |
| \`invoice\` | factura | Full support. \`approve\` assigns the legal number. |
| \`credit_note\` | abono / factura rectificativa | Full support. |
| \`estimate\` | presupuesto | Has \`accept\` and \`reject\`. **No payments.** |
| \`proforma\` | proforma | **No payments.** |
| \`sales_receipt\` | ticket | Full support. |
| \`sales_order\` | pedido de venta | **No payments.** |
| \`waybill\` | albarán | **No payments.** |
| \`receipt_note\` | nota de entrega | |
| \`recurring_invoice\` | factura recurrente | **Only** \`update\`, \`delete\`, \`skip\` and \`schedule\`. |

## Purchase types (\`holded_purchases\`)

| \`type\` | Spanish name | Notes |
| --- | --- | --- |
| \`purchase\` | factura de compra | **No pdf or send.** |
| \`purchase_refund\` | abono de compra | Listed at \`/purchase-refunds\` but read and created under \`/purchases/refund\`. **No update, delete, pdf, attachments or approve.** |
| \`purchase_order\` | pedido de compra | Has \`receive\` and \`received_items\`. |
| \`purchase_shipment\` | envío de compra | |

## Numbering series types

A numbering series is read per type, and the type names differ from the document type names above: \`invoice\`, \`purchase\`, \`estimate\`, \`creditnote\`, \`salesorder\`, \`waybill\`, \`salesreceipt\`, \`purchaserefund\`.

See \`holded://reference/numbering-series\` for the series configured in this account.
`;

export function registerGuideResources(server: McpServer): void {
  server.registerResource(
    'api_behaviour_guide',
    API_BEHAVIOUR_URI,
    {
      title: 'How the Holded v2 API really behaves',
      description:
        'Verified v2 behaviour: Bearer auth and the 403-not-401 quirk, cursor pagination, the two ' +
        'decimal conventions, DD/MM/YYYY ledger dates, RFC 7807 errors, ignored query parameters, ' +
        'the rate limit, and why writes are never retried. Read this before writing anything.',
      mimeType: 'text/markdown',
    },
    uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: API_BEHAVIOUR_GUIDE }],
    })
  );

  server.registerResource(
    'document_types_guide',
    DOCUMENT_TYPES_URI,
    {
      title: 'Holded document types and supported verbs',
      description:
        'The nine sales and four purchase document types with their Spanish names, and which ' +
        'verbs each one supports. Recurring invoices, purchase refunds and estimates each lack ' +
        'verbs the others have.',
      mimeType: 'text/markdown',
    },
    uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: DOCUMENT_TYPES_GUIDE }],
    })
  );
}

# @t4dhg/mcp-holded

An [MCP](https://modelcontextprotocol.io) server for the **Holded API v2**.

Holded deprecated its classic API (base `https://api.holded.com/api/invoicing/v1` with a `key: <apikey>` header). New Holded keys use the format `pat_<id>_<secret>` and only authenticate against the **v2 API** (`https://api.holded.com/api/v2`) with an `Authorization: Bearer <key>` header. Servers written for the old API reject new keys with `{"status":0,"info":"Invalid key"}`. This server speaks v2.

## Install and configure

Add it to your MCP client config (for example `.mcp.json` or Claude Desktop's config):

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

Requires Node.js >= 18.

### Getting a key

Create a Personal Access Token in Holded under Settings, Developers, API. Use the full `pat_..._...` value as `HOLDED_API_KEY`.

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `HOLDED_API_KEY` | yes | none | Holded v2 personal access token (`pat_..._...`). |
| `HOLDED_BASE_URL` | no | `https://api.holded.com/api/v2` | Override the API base, for testing. |

## Tools

| Tool | Description |
|------|-------------|
| `holded_list_contacts` | List contacts (customers and suppliers). |
| `holded_list_invoices` | List sales invoices. |
| `holded_list_purchases` | List purchase invoices / bills. |
| `holded_list_products` | List products. |
| `holded_list_services` | List services. |
| `holded_list_payments` | List payments. |
| `holded_get_by_id` | Fetch one record by id from any v2 resource. |
| `holded_request` | Low-level access to any v2 endpoint (`method`, `path`, `query`, `body`). |

The list tools accept optional `page`, `limit`, and `query` (free-text search). Holded's v2 API exposes far more than the resources with dedicated tools above; use `holded_request` to reach any of them, for example `{ "method": "GET", "path": "/numberingseries" }`.

### A note on unknown paths

`api.holded.com` serves its single-page web app (HTML) with an HTTP 200 status for paths that do not exist in v2. This server detects an HTML body and returns a clear error instead, so a wrong path fails loudly rather than looking like an empty success.

## Development

```bash
npm install
HOLDED_API_KEY=pat_..._... npm run smoke
```

`smoke-test.mjs` spawns the server over stdio, lists its tools, and makes one live call.

## License

MIT

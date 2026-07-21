#!/usr/bin/env node
// MCP server for the Holded API v2.
//
// Why this exists: Holded deprecated its classic API (base .../api/invoicing/v1
// with a "key: <apikey>" header). New keys use the format pat_<id>_<secret> and
// only work against the v2 API (base https://api.holded.com/api/v2) with an
// "Authorization: Bearer <key>" header. The published @iamsamuelfraga/mcp-holded
// server targets the old v1 API, so new keys fail there with {"status":0,"info":"Invalid key"}.
//
// This server speaks v2. It ships convenience list tools for the resources whose
// v2 paths are confirmed working, a generic get-by-id, and a low-level
// holded_request escape hatch so every one of the ~327 v2 operations is reachable
// even without a dedicated tool.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.HOLDED_API_KEY;
const BASE_URL = (process.env.HOLDED_BASE_URL || "https://api.holded.com/api/v2").replace(/\/$/, "");

if (!API_KEY) {
  console.error("[holded-v2] FATAL: HOLDED_API_KEY environment variable is not set.");
  process.exit(1);
}

// Single place that talks to Holded. Adds Bearer auth, builds the query string,
// parses JSON, and turns Holded's error shapes into thrown errors.
async function holded(method, path, { query, body } = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(BASE_URL + cleanPath);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!res.ok) {
    const detail = typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300);
    throw new Error(`Holded ${method} ${cleanPath} -> HTTP ${res.status}: ${detail}`);
  }

  // api.holded.com serves its single-page web app (HTML) for paths that do not
  // exist in v2, with a 200 status. Detect that so a wrong path is a clear error
  // instead of a wall of HTML.
  if (typeof data === "string" && /<(!doctype|html)\b/i.test(data)) {
    throw new Error(
      `Holded returned an HTML page for ${method} ${cleanPath} (HTTP ${res.status}). ` +
        `That path likely does not exist in the v2 API. Confirmed v2 list resources: ` +
        `contacts, invoices, purchases, products, services, payments.`
    );
  }
  // Holded's auth/validation errors come back as {"status":0,"info":"..."} with a 200.
  if (data && typeof data === "object" && data.status === 0 && "info" in data) {
    throw new Error(`Holded rejected ${method} ${cleanPath}: ${JSON.stringify(data)}`);
  }

  return data;
}

function ok(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}
function fail(err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
}

const server = new McpServer({ name: "holded-v2", version: "1.0.0" });

// Confirmed-working v2 list resources: GET /api/v2/<resource> -> { items: [...] }
const LISTABLES = [
  ["contacts", "contacts (customers and suppliers)"],
  ["invoices", "sales invoices"],
  ["purchases", "purchase invoices / bills"],
  ["products", "products"],
  ["services", "services"],
  ["payments", "payments"],
];

for (const [resource, label] of LISTABLES) {
  server.registerTool(
    `holded_list_${resource}`,
    {
      title: `List Holded ${resource}`,
      description: `List ${label} from Holded (GET /api/v2/${resource}). Supports pagination and free-text search.`,
      inputSchema: {
        page: z.number().int().positive().optional().describe("Page number, 1-based"),
        limit: z.number().int().positive().max(500).optional().describe("Items per page"),
        query: z.string().optional().describe("Free-text search filter"),
      },
    },
    async ({ page, limit, query }) => {
      try {
        return ok(await holded("GET", `/${resource}`, { query: { page, limit, query } }));
      } catch (err) {
        return fail(err);
      }
    }
  );
}

// Fetch a single record by id from any v2 resource.
server.registerTool(
  "holded_get_by_id",
  {
    title: "Get a Holded record by id",
    description:
      "Fetch one record by id from a v2 resource. Example: resource='contacts', id='5ff44eb88ec0b10f326e3213' -> GET /api/v2/contacts/{id}.",
    inputSchema: {
      resource: z.string().describe("v2 resource, e.g. contacts, invoices, products"),
      id: z.string().describe("Record id"),
    },
  },
  async ({ resource, id }) => {
    try {
      return ok(await holded("GET", `/${resource.replace(/^\//, "")}/${encodeURIComponent(id)}`));
    } catch (err) {
      return fail(err);
    }
  }
);

// Low-level escape hatch: reach any v2 endpoint with correct Bearer auth.
server.registerTool(
  "holded_request",
  {
    title: "Call any Holded v2 endpoint",
    description:
      "Low-level access to any Holded API v2 endpoint with Bearer auth. `path` is relative to " +
      "https://api.holded.com/api/v2 and must start with '/'. Use this for endpoints that have no " +
      "dedicated tool. Confirmed working list resources: contacts, invoices, purchases, products, services, payments.",
    inputSchema: {
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
      path: z.string().describe("Path under /api/v2, e.g. '/contacts' or '/invoices/{id}'"),
      query: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe("Query-string parameters"),
      body: z.record(z.string(), z.any()).optional().describe("JSON body for POST/PUT"),
    },
  },
  async ({ method, path, query, body }) => {
    try {
      return ok(await holded(method, path, { query, body }));
    } catch (err) {
      return fail(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[holded-v2] MCP server running on stdio. base=${BASE_URL}`);

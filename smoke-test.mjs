// Smoke test: spawn the server over stdio via the MCP SDK client, list tools,
// and make one live call against Holded v2. Run from this directory with
// HOLDED_API_KEY set in the environment.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["index.js"],
  env: { ...process.env },
});
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

const r = await client.callTool({ name: "holded_list_contacts", arguments: { limit: 1 } });
const text = r.content?.[0]?.text ?? "";
console.log("isError:", !!r.isError);
console.log("holded_list_contacts (first 220 chars):", text.slice(0, 220));

await client.close();
process.exit(0);

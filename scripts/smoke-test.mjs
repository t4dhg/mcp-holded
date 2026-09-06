// Smoke test: spawn the built server over stdio via the MCP SDK client, list
// tools, and make one live GET call against Holded v2. Run from the package
// root with HOLDED_API_KEY set, after `npm run build`.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  env: { ...process.env },
});
const client = new Client({ name: 'smoke', version: '2.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map(t => t.name).join(', '));

const result = await client.callTool({
  name: 'holded_contacts',
  arguments: { action: 'list', limit: 1 },
});
const text = result.content?.[0]?.text ?? '';
console.log('isError:', Boolean(result.isError));
console.log('holded_contacts list (first 300 chars):', text.slice(0, 300));

await client.close();
process.exit(0);

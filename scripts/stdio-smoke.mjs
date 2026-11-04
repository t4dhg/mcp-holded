import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const directory = mkdtempSync(join(tmpdir(), 'mcp-stdio-smoke-'));
const entry = resolve(process.argv[2] ?? 'dist/index.js');
const packageVersion = JSON.parse(
  readFileSync(resolve(dirname(realpathSync(entry)), '../package.json'), 'utf8')
).version;
const server = spawn(process.execPath, [entry], {
  cwd: directory,
  env: {
    PATH: process.env.PATH,
    HOLDED_API_KEY: 'pat_xxxxxxxx_xxxxxxxx',
    HOLDED_BASE_URL: 'http://127.0.0.1:1',
    HOLDED_MAX_RETRIES: '0',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});
const exited = new Promise((resolveExit, reject) => {
  server.once('exit', (code, signal) => resolveExit({ code, signal }));
  server.once('error', reject);
});
const pending = new Map();
let nextId = 0;
let stderr = '';
server.stderr.on('data', data => {
  stderr = (stderr + data.toString()).slice(-4000);
});
const lines = createInterface({ input: server.stdout });
lines.on('line', line => {
  try {
    const response = JSON.parse(line);
    pending.get(response.id)?.(response);
  } catch {
    stderr += 'Invalid JSON on server stdout';
    server.kill();
  }
});
function request(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolveResponse, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out: ${stderr}`));
    }, 10000);
    pending.set(id, response => {
      clearTimeout(timeout);
      pending.delete(id);
      resolveResponse(response);
    });
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}
try {
  const initialized = await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'package-smoke', version: '1.0.0' },
  });
  assert.equal(initialized.result?.serverInfo.name, 'holded');
  assert.equal(initialized.result?.serverInfo.version, packageVersion);
  server.stdin.write(
    `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`
  );
  const listed = await request('tools/list');
  assert.equal(listed.result?.tools.length, 15);
  assert.equal(
    listed.result.tools.find(tool => tool.name === 'holded_contacts').inputSchema.properties.ids
      .maxItems,
    1000
  );
  const rejected = await request('tools/call', {
    name: 'holded_contacts',
    arguments: { action: 'bulk_archive', ids: Array(1001).fill(0) },
  });
  assert(rejected.error || rejected.result?.isError, 'Oversized tool call was accepted');
  assert.match(JSON.stringify(rejected), /1000/);
  assert(JSON.stringify(rejected).length < 3000, 'Validation accumulated an issue per element');
  const budget = await request('tools/call', {
    name: 'holded_contacts',
    arguments: { action: 'update', id: 'placeholder', data: { extra: Array(10001).fill(null) } },
  });
  assert(budget.error || budget.result?.isError, 'Oversized arbitrary payload was accepted');
  assert.match(JSON.stringify(budget), /10000/);
  const discovered = await request('tools/call', { name: 'holded_discover', arguments: {} });
  assert.equal(discovered.result?.isError ?? false, false);
  assert.match(discovered.result?.content[0]?.text ?? '', /holded_contacts/);
  server.stdin.end();
  const shutdownTimeout = setTimeout(() => server.kill('SIGKILL'), 5000);
  const shutdown = await exited;
  clearTimeout(shutdownTimeout);
  assert.equal(shutdown.code, 0, `Server shutdown failed (${shutdown.signal}): ${stderr}`);
  console.log(
    `MCP smoke passed on ${process.version}: initialize, discovery, validation and shutdown`
  );
} finally {
  server.kill();
  lines.close();
  rmSync(directory, { recursive: true, force: true });
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';
import { setEnv } from './helpers.js';
import { gatedOperations } from '../../write-safety.js';

async function connectedClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

function textOf(result: { contents: { text?: string }[] }): string {
  return result.contents.map(c => c.text ?? '').join('\n');
}

describe('static guide resources', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('registers both guides with markdown mime types', async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();
    const uris = resources.map(r => r.uri);
    expect(uris).toContain('holded://guide/api-behaviour');
    expect(uris).toContain('holded://guide/document-types');
    for (const uri of ['holded://guide/api-behaviour', 'holded://guide/document-types']) {
      expect(resources.find(r => r.uri === uri)?.mimeType).toBe('text/markdown');
    }
  });

  it('states the two decimal conventions and the ledger date format', async () => {
    const client = await connectedClient();
    const body = textOf(await client.readResource({ uri: 'holded://guide/api-behaviour' }));
    expect(body).toContain('DD/MM/YYYY');
    expect(body).toMatch(/comma/i);
    expect(body).toMatch(/403/);
    expect(body).toMatch(/100 requests per minute/i);
  });

  it('states which verbs are missing per document type', async () => {
    const client = await connectedClient();
    const body = textOf(await client.readResource({ uri: 'holded://guide/document-types' }));
    expect(body).toContain('purchase_refund');
    expect(body).toMatch(/recurring_invoice/);
    expect(body).toMatch(/no pdf or send/i);
  });

  it('reads a guide without making any API call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = await connectedClient();
    await client.readResource({ uri: 'holded://guide/api-behaviour' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the generated irreversible-operations guide', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('lists exactly the gated operations from the policy table', async () => {
    const client = await connectedClient();
    const body = textOf(
      await client.readResource({ uri: 'holded://guide/irreversible-operations' })
    );
    const listed = [...body.matchAll(/^\| `([a-z_]+)` \|/gm)].map(m => m[1]!).sort();
    expect(listed).toEqual([...gatedOperations()].sort());
    expect(listed.length).toBeGreaterThan(60);
  });

  it('warns that approving a sales document is irreversible under Verifactu', async () => {
    const client = await connectedClient();
    const body = textOf(
      await client.readResource({ uri: 'holded://guide/irreversible-operations' })
    );
    expect(body).toMatch(/Verifactu/);
    expect(body).toMatch(/cannot be undone/i);
  });

  it('names an ungated write so the contrast is explicit', async () => {
    const client = await connectedClient();
    const body = textOf(
      await client.readResource({ uri: 'holded://guide/irreversible-operations' })
    );
    expect(body).toMatch(/create_contact/);
  });
});

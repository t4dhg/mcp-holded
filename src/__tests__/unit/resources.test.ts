import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';
import { setEnv, stubFetch } from './helpers.js';
import { gatedOperations } from '../../write-safety.js';
import { clearReferenceCache } from '../../resources/references.js';

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

describe('live reference resources', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
    clearReferenceCache();
  });

  it('registers all four references', async () => {
    const client = await connectedClient();
    const { resources } = await client.listResources();
    const uris = resources.map(r => r.uri);
    expect(uris).toContain('holded://reference/taxes');
    expect(uris).toContain('holded://reference/numbering-series');
    expect(uris).toContain('holded://reference/payment-methods');
    expect(uris).toContain('holded://reference/accounting-accounts');
  });

  it('renders tax keys so a model can copy them into an invoice line', async () => {
    stubFetch({
      body: { items: [{ id: '1', name: 'IVA 21%', amount: '21', key: 's_iva_21' }] },
    });
    const client = await connectedClient();
    const body = textOf(await client.readResource({ uri: 'holded://reference/taxes' }));
    expect(body).toContain('s_iva_21');
  });

  it('memoises a reference read so a second read makes no further call', async () => {
    const fetchMock = stubFetch(
      { body: { items: [{ id: '1', name: 'Transfer', type: 'bank' }] } },
      { body: { items: [{ id: '2', name: 'Should not be fetched', type: 'bank' }] } }
    );
    const client = await connectedClient();
    await client.readResource({ uri: 'holded://reference/payment-methods' });
    await client.readResource({ uri: 'holded://reference/payment-methods' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns readable markdown instead of throwing when the read fails', async () => {
    stubFetch({ status: 403, body: { title: 'Access denied', status: 403 } });
    const client = await connectedClient();
    const result = await client.readResource({ uri: 'holded://reference/taxes' });
    const body = textOf(result);
    expect(body).toMatch(/could not be read/i);
    expect(body).toContain('holded_accounting');
  });

  it('reads one numbering series per configured type', async () => {
    const fetchMock = stubFetch(...Array.from({ length: 8 }, () => ({ body: { items: [] } })));
    const client = await connectedClient();
    await client.readResource({ uri: 'holded://reference/numbering-series' });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('does not cache a failed read, so the next read retries', async () => {
    stubFetch(
      { status: 403, body: { title: 'Access denied', status: 403 } },
      { body: { items: [{ id: '1', name: 'IVA 21%', amount: '21', key: 's_iva_21' }] } }
    );
    const client = await connectedClient();
    const first = textOf(await client.readResource({ uri: 'holded://reference/taxes' }));
    expect(first).toMatch(/could not be read/i);
    const second = textOf(await client.readResource({ uri: 'holded://reference/taxes' }));
    expect(second).toContain('s_iva_21');
  });
});

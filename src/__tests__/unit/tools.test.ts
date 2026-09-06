import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';
import { fixture, setEnv, stubFetch } from './helpers.js';

async function connectedClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

function text(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as { type: string; text?: string }[];
  return content.map(c => c.text ?? '').join('\n');
}

describe('tools end to end over an in-memory transport', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('registers 16 tools with the expected names', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name).sort();
    expect(names).toEqual(
      [
        'holded_accounting',
        'holded_calendar',
        'holded_catalog',
        'holded_contacts',
        'holded_crm',
        'holded_discover',
        'holded_inbox',
        'holded_payments',
        'holded_projects',
        'holded_purchases',
        'holded_request',
        'holded_sales',
        'holded_team',
        'holded_treasury',
        'holded_webhooks',
      ].sort()
    );
  });

  it('lists invoices and reports pagination', async () => {
    stubFetch({ body: fixture('invoices') });
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_sales',
      arguments: { action: 'list', type: 'invoice', limit: 3 },
    });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toMatch(/^3 invoices, more available: call again with cursor "/);
  });

  it('refuses a delete without confirm and sends nothing', async () => {
    const fetchMock = stubFetch({ status: 204 });
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_contacts',
      arguments: { action: 'delete', id: 'abc' },
    });
    expect(text(result)).toContain('Nothing has been sent');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deletes with confirm: true', async () => {
    const fetchMock = stubFetch({ status: 204 });
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_contacts',
      arguments: { action: 'delete', id: 'abc', confirm: true },
    });
    expect(text(result)).toContain('deleted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('validates write payloads before sending', async () => {
    const fetchMock = stubFetch({ status: 201, body: { id: 'x' } });
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_sales',
      arguments: { action: 'create', type: 'invoice', data: { contact_id: 'c1', items: [] } },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('Invalid input for create invoice');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates an invoice and returns the validated record', async () => {
    const fetchMock = stubFetch(
      { status: 201, body: { id: 'inv1' } },
      { body: fixture('invoice') }
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_sales',
      arguments: {
        action: 'create',
        type: 'invoice',
        data: {
          contact_id: 'c1',
          items: [{ name: 'Licence', units: 1, price: 100, taxes: ['s_iva_21'] }],
        },
      },
    });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('invoice created');
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/invoices');
    expect(String(fetchMock.mock.calls[1]![0])).toContain('/invoices/inv1');
  });

  it('gates approve and send on sales documents', async () => {
    const fetchMock = stubFetch({ body: {} });
    const client = await connectedClient();
    for (const action of ['approve', 'send', 'update', 'cancel']) {
      const result = await client.callTool({
        name: 'holded_sales',
        arguments: { action, id: 'inv1', data: { emails: ['a@example.com'] } },
      });
      expect(text(result), action).toContain('confirm: true');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a missing required argument', async () => {
    stubFetch({ body: {} });
    const client = await connectedClient();
    const result = await client.callTool({ name: 'holded_contacts', arguments: { action: 'get' } });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('`id` is required');
  });

  it('gates holded_request on DELETE and lets GET through', async () => {
    const fetchMock = stubFetch({ body: { items: [] } });
    const client = await connectedClient();
    const blocked = await client.callTool({
      name: 'holded_request',
      arguments: { method: 'DELETE', path: '/contacts/abc' },
    });
    expect(text(blocked)).toContain('Nothing has been sent');
    expect(fetchMock).not.toHaveBeenCalled();
    const ok = await client.callTool({
      name: 'holded_request',
      arguments: { method: 'GET', path: '/contacts', query: { limit: 1 } },
    });
    expect(ok.isError).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces Holded API errors as tool errors', async () => {
    stubFetch({ status: 403, body: fixture('error-403') });
    const client = await connectedClient();
    const result = await client.callTool({
      name: 'holded_contacts',
      arguments: { action: 'list' },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain('Access denied');
  });

  it('discover lists every domain', async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: 'holded_discover', arguments: {} });
    expect(text(result)).toContain('holded_treasury');
    expect(text(result)).toContain('holded_request');
  });
});

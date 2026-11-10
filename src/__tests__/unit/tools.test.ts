import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('registers 15 tools with the expected names', async () => {
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

  it('previews a raw POST with its encoded query and sends the same request only with confirmation', async () => {
    const fetchMock = stubFetch({ body: {} });
    const client = await connectedClient();
    const args = {
      method: 'POST',
      path: '/invoices/abc/%73end',
      query: { note: 'test & review' },
      body: { emails: ['a@example.com'] },
    };
    const url = 'https://api.holded.test/api/v2/invoices/abc/%73end?note=test+%26+review';
    const preview = await client.callTool({ name: 'holded_request', arguments: args });
    expect(text(preview)).toContain(`POST ${url}`);
    expect(text(preview)).toContain('Body: {"emails":["a@example.com"]}');
    expect(fetchMock).not.toHaveBeenCalled();

    const sent = await client.callTool({
      name: 'holded_request',
      arguments: { ...args, confirm: true },
    });
    expect(sent.isError).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      url,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(args.body) })
    );
  });

  it('rejects ambiguous or escaping raw paths before fetch even with confirmation', async () => {
    const fetchMock = stubFetch({ body: {} });
    const client = await connectedClient();
    for (const path of [
      '/invoices/abc/send?x=1',
      '/invoices/abc/send#ignored',
      '/invoices/abc\\send',
      '/invoices/abc/%2Fsend',
      '/invoices/abc/%255csend',
      '/invoices/abc/%zz',
      '/../../not-v2',
      '/%2e%2e/%2e%2e/not-v2',
      '//other.example/send',
    ]) {
      const result = await client.callTool({
        name: 'holded_request',
        arguments: { method: 'POST', path, confirm: true },
      });
      expect(result.isError, path).toBe(true);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects dot segments from typed identifiers before fetch', async () => {
    const fetchMock = stubFetch({ body: {} });
    const client = await connectedClient();
    for (const id of ['.', '..']) {
      const result = await client.callTool({
        name: 'holded_contacts',
        arguments: { action: 'get', id },
      });
      expect(result.isError, id).toBe(true);
      expect(text(result), id).toMatch(/dot segments/i);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('previews all local file uploads before reading the named file or contacting Holded', async () => {
    const fetchMock = stubFetch({ status: 201, body: {} });
    const client = await connectedClient();
    const filePath = '/no-such-holded-test-directory/example.pdf';
    const uploads = [
      { name: 'holded_contacts', arguments: { action: 'attach', id: 'abc' } },
      { name: 'holded_sales', arguments: { action: 'attach', type: 'invoice', id: 'abc' } },
      { name: 'holded_purchases', arguments: { action: 'attach', type: 'purchase', id: 'abc' } },
      { name: 'holded_inbox', arguments: { action: 'upload' } },
    ];
    for (const call of uploads) {
      const preview = await client.callTool({
        name: call.name,
        arguments: { ...call.arguments, file_path: filePath },
      });
      expect(preview.isError, call.name).toBeFalsy();
      expect(text(preview), call.name).toContain(filePath);
      expect(text(preview), call.name).toContain('confirm: true');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads the named file to the contact on confirmation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'holded-upload-'));
    try {
      const filePath = join(directory, 'example.pdf');
      await writeFile(filePath, '%PDF synthetic attachment');
      const fetchMock = stubFetch({ status: 201, body: {} });
      const client = await connectedClient();
      const sent = await client.callTool({
        name: 'holded_contacts',
        arguments: { action: 'attach', id: 'abc', file_path: filePath, confirm: true },
      });
      expect(sent.isError).toBeFalsy();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, request] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://api.holded.test/api/v2/contacts/abc/attachments');
      const attached = ((request as RequestInit).body as FormData).get('file');
      expect(attached).toBeInstanceOf(File);
      expect((attached as File).name).toBe('example.pdf');
      await expect((attached as File).text()).resolves.toBe('%PDF synthetic attachment');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('saves downloaded bytes at a new path and refuses to overwrite files or symlinks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'holded-download-'));
    try {
      const existing = join(directory, 'existing.pdf');
      const linked = join(directory, 'linked.pdf');
      const fresh = join(directory, 'new.pdf');
      await writeFile(existing, 'keep this file');
      await symlink(existing, linked);
      const pdf = () =>
        new Response('%PDF synthetic download', { headers: { 'content-type': 'application/pdf' } });
      stubFetch(pdf, pdf, pdf);
      const client = await connectedClient();
      for (const outputPath of [existing, linked]) {
        const rejected = await client.callTool({
          name: 'holded_sales',
          arguments: { action: 'pdf', id: 'abc', output_path: outputPath },
        });
        expect(rejected.isError, outputPath).toBe(true);
        expect(text(rejected), outputPath).toMatch(/already exists|EEXIST/i);
      }
      expect(await readFile(existing, 'utf8')).toBe('keep this file');
      const saved = await client.callTool({
        name: 'holded_sales',
        arguments: { action: 'pdf', id: 'abc', output_path: fresh },
      });
      expect(saved.isError).toBeFalsy();
      expect(await readFile(fresh, 'utf8')).toBe('%PDF synthetic download');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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

  it('keeps a reflected Authorization value out of MCP errors and debug logs', async () => {
    const configuredKey = process.env.HOLDED_API_KEY!;
    vi.stubEnv('DEBUG', 'true');
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, request: RequestInit) => {
          const reflectedAuth = new Headers(request.headers).get('authorization');
          return Response.json({ detail: `Rejected ${reflectedAuth}` }, { status: 403 });
        })
      );
      const client = await connectedClient();
      const result = await client.callTool({
        name: 'holded_contacts',
        arguments: { action: 'list' },
      });
      expect(result.isError).toBe(true);
      expect(text(result)).toContain('Rejected Bearer [REDACTED]');
      expect(text(result)).not.toContain(configuredKey);
      expect(stderr.mock.calls.flat().join('\n')).not.toContain(configuredKey);
    } finally {
      stderr.mockRestore();
    }
  });

  it('discover lists every domain', async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: 'holded_discover', arguments: {} });
    expect(text(result)).toContain('holded_treasury');
    expect(text(result)).toContain('holded_request');
  });
});

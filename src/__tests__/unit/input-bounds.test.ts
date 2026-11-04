import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as inputs from '../../schemas/inputs.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';

describe('request collection bounds', () => {
  it('limits nested arbitrary payloads before a write handler can run', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: 'bounds-test', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const result = await client.callTool({
        name: 'holded_contacts',
        arguments: {
          action: 'update',
          id: 'placeholder',
          data: {
            name: 'Example',
            custom_fields: [{ field: 'example', value: Array(10001).fill(null) }],
          },
        },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).toMatch(/10000/);
      expect(JSON.stringify(result).length).toBeLessThan(3000);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('rejects oversized contact identifiers before inspecting their elements', () => {
    let visited = 0;
    const ids = Array(1001).fill(0);
    Object.defineProperty(ids, 0, {
      get: () => {
        visited++;
        return 0;
      },
    });
    const result = inputs.ContactIdsInput.safeParse({ contact_ids: ids });
    expect(visited).toBe(0);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: 'too_big', path: ['contact_ids'], maximum: 1000 }),
      ]);
  });

  it('rejects oversized nested document taxes before inspecting their elements', () => {
    let visited = 0;
    const taxes = Array(1001).fill(0);
    Object.defineProperty(taxes, 0, {
      get: () => {
        visited++;
        return 0;
      },
    });
    const result = inputs.DocumentInput.safeParse({
      contact_id: 'placeholder',
      items: [{ name: 'Item', taxes }],
    });
    expect(visited).toBe(0);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: 'too_big', path: ['items', 0, 'taxes'], maximum: 1000 }),
      ]);
  });

  it('bounds every typed array in the exported write contracts', () => {
    const unbounded: string[] = [];
    function visit(value: unknown, path: string) {
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      if (
        record.type === 'array' &&
        (typeof record.maxItems !== 'number' || record.maxItems > 1000)
      )
        unbounded.push(path);
      for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`);
    }
    for (const [name, schema] of Object.entries(inputs)) {
      if (schema instanceof z.ZodType) visit(z.toJSONSchema(schema), name);
    }
    expect(unbounded).toEqual([]);
  });

  it('preserves valid boundary values, empty optional lists and stricter bank limits', () => {
    expect(
      inputs.ContactIdsInput.safeParse({ contact_ids: Array(1000).fill('placeholder') }).success
    ).toBe(true);
    expect(
      inputs.ContactInput.safeParse({ name: 'Example', tags: [], contact_persons: [] }).success
    ).toBe(true);
    expect(inputs.BulkApproveInput.safeParse({ ids: [] }).success).toBe(true);
    const movement = { amount: '1.00', balance: '1.00', description: 'Example' };
    expect(inputs.BankMovementsInput.safeParse(Array(100).fill(movement)).success).toBe(true);
    expect(inputs.BankMovementsInput.safeParse(Array(101).fill(movement)).success).toBe(false);
  });
});

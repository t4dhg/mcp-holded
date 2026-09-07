import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../tools/index.js';
import { setEnv } from './helpers.js';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const toolsDir = path.join(srcDir, 'tools');
const readmePath = path.resolve(srcDir, '..', 'README.md');
const llmsPath = path.resolve(srcDir, '..', 'llms.txt');

export const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/** Tool modules that expose an `action` enum. The hierarchical surface. */
function actionToolCount(): number {
  return readdirSync(toolsDir).filter(
    f =>
      f.endsWith('.ts') && readFileSync(path.join(toolsDir, f), 'utf8').includes('action: z.enum')
  ).length;
}

async function connectedClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('documented counts match the registered surface', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    setEnv();
  });

  it('derives thirteen action-driven tool modules', () => {
    expect(actionToolCount()).toBe(13);
  });

  it('registers one tool per action-driven module plus discover and request', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(actionToolCount() + 2);
  });

  it('states the action-driven tool count correctly in README and llms.txt', () => {
    const phrase = new RegExp(
      `${WORDS[actionToolCount()]} hierarchical tools with an \`action\` parameter`,
      'i'
    );
    expect(readFileSync(readmePath, 'utf8')).toMatch(phrase);
    expect(readFileSync(llmsPath, 'utf8')).toMatch(phrase);
  });
});

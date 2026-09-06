import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_POLICIES, gatedOperations } from '../../write-safety.js';

/**
 * Structural guard over the tool handlers.
 *
 * The confirmation gate is opt-in: a handler that never calls checkConfirmation
 * deletes without asking, and nothing in the type system notices. What counts
 * as destructive is derived from the API layer, not from a list of action
 * names: any exported API function whose body calls deleteOne(), put() or
 * patch(), plus the POST helpers below that Holded uses for irreversible
 * or outward-facing effects.
 */

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apiDir = path.join(srcDir, 'api');
const toolsDir = path.join(srcDir, 'tools');
const readmePath = path.resolve(srcDir, '..', 'README.md');

/** Destructive API functions that do not reach deleteOne/put/patch. */
const DESTRUCTIVE_POST = [
  'approveDocument',
  'cancelInvoice',
  'sendDocument',
  'archiveTreasuryAccount',
  'reconcileBankMovement',
  'bulkArchiveContacts',
  'bulkDeleteContacts',
  'bulkApproveInvoices',
  'bulkCancelInvoices',
  'skipRecurringInvoice',
  'disableWebhook',
  'attachInboxDocument',
];

/**
 * Actions that reach a destructive API call but are deliberately not gated.
 * Every entry needs a reason. An empty registry is the desired state.
 */
const EXEMPT: Record<string, string> = {};

const TOOL_FILES = () =>
  readdirSync(toolsDir).filter(
    f => f.endsWith('.ts') && !['index.ts', 'shared.ts', 'request.ts'].includes(f)
  );

function destructiveApiFunctions(): string[] {
  const found = [...DESTRUCTIVE_POST];
  for (const file of readdirSync(apiDir).filter(f => f.endsWith('.ts') && f !== 'shared.ts')) {
    const source = readFileSync(path.join(apiDir, file), 'utf8');
    const pattern = /export (?:async )?function (\w+)\(/g;
    let match = pattern.exec(source);
    while (match !== null) {
      const next = /\nexport /g;
      next.lastIndex = match.index + 1;
      const following = next.exec(source);
      const body = source.slice(match.index, following ? following.index : source.length);
      if (/\b(deleteOne|put|patch)\(/.test(body)) found.push(match[1]!);
      match = pattern.exec(source);
    }
  }
  return [...new Set(found)];
}

function caseArms(source: string): { action: string; body: string }[] {
  const positions = [...source.matchAll(/case '([a-z_]+)':/g)].map(m => ({
    index: m.index!,
    action: m[1]!,
  }));
  const arms = positions.map((entry, i) => ({
    action: entry.action,
    body: source.slice(entry.index, positions[i + 1]?.index ?? source.length),
  }));
  for (let i = arms.length - 2; i >= 0; i--) {
    const own = arms[i]!.body.replace(/case '[a-z_]+':/, '').trim();
    if (own === '') arms[i]!.body = arms[i + 1]!.body;
  }
  return arms;
}

function destructiveActions(): { file: string; action: string; gated: boolean }[] {
  const destructive = destructiveApiFunctions();
  const results: { file: string; action: string; gated: boolean }[] = [];
  for (const file of TOOL_FILES()) {
    const source = readFileSync(path.join(toolsDir, file), 'utf8');
    for (const { action, body } of caseArms(source)) {
      const hits = destructive.some(fn => new RegExp(`\\bapi\\.${fn}\\s*\\(`).test(body));
      if (!hits) continue;
      results.push({ file, action, gated: body.includes('checkConfirmation(') });
    }
  }
  return results;
}

function gatedActions(): { file: string; action: string }[] {
  const pairs: { file: string; action: string }[] = [];
  for (const file of TOOL_FILES()) {
    const source = readFileSync(path.join(toolsDir, file), 'utf8');
    for (const { action, body } of caseArms(source)) {
      if (body.includes('checkConfirmation(')) pairs.push({ file, action });
    }
  }
  return pairs;
}

function documentedActions(): { file: string; action: string }[] {
  const readme = readFileSync(readmePath, 'utf8');
  const start = readme.indexOf('### Operations that require confirmation');
  const end = readme.indexOf('### The raw request tool');
  expect(start, 'README section "Operations that require confirmation" missing').toBeGreaterThan(
    -1
  );
  expect(end, 'README section "The raw request tool" missing').toBeGreaterThan(start);
  const section = readme.slice(start, end);
  return [...section.matchAll(/`holded_(\w+)\(\{ action: '(\w+)' \}\)`/g)].map(m => ({
    file: `${m[1]}.ts`,
    action: m[2]!,
  }));
}

function policiesUsedInTools(): string[] {
  const names = new Set<string>();
  for (const file of TOOL_FILES()) {
    const source = readFileSync(path.join(toolsDir, file), 'utf8');
    let index = source.indexOf('checkConfirmation(');
    while (index !== -1) {
      const end = source.indexOf('args.confirm', index);
      const call = source.slice(index, end === -1 ? index + 300 : end);
      for (const m of call.matchAll(/'(\w+)'/g)) names.add(m[1]!);
      index = source.indexOf('checkConfirmation(', index + 1);
    }
  }
  return [...names];
}

describe('Confirmation coverage across tool handlers', () => {
  it('derives a plausible destructive set from the API layer', () => {
    const fns = destructiveApiFunctions();
    expect(fns).toContain('deleteContact');
    expect(fns).toContain('updateDocument');
    expect(fns).toContain('updateWarehouse');
    expect(fns).toContain('bulkDeleteInvoices');
    expect(fns.length).toBeGreaterThan(50);
  });

  it('finds destructive arms in every tool that writes', () => {
    const arms = destructiveActions();
    expect(arms.length).toBeGreaterThan(60);
    expect(new Set(arms.map(a => a.file)).size).toBeGreaterThanOrEqual(12);
  });

  it('gates every destructive tool action', () => {
    const ungated = destructiveActions()
      .filter(a => !a.gated && !(`${a.file}:${a.action}` in EXEMPT))
      .map(a => `${a.file}: case '${a.action}'`);
    expect(ungated, `destructive actions with no gate:\n${ungated.join('\n')}`).toEqual([]);
  });

  it('keeps the README list of gated operations equal to the code', () => {
    const key = (e: { file: string; action: string }) => `${e.file}:${e.action}`;
    const inCode = [...new Set(gatedActions().map(key))].sort();
    const inReadme = [...new Set(documentedActions().map(key))].sort();
    expect(inCode.length).toBeGreaterThan(60);
    expect(inReadme).toEqual(inCode);
  });

  it('uses only gated policies in checkConfirmation calls, and every gated policy is used', () => {
    const gated = new Set<string>(gatedOperations());
    const used = policiesUsedInTools();
    const notGated = used.filter(u => u in OPERATION_POLICIES && !gated.has(u));
    expect(
      notGated,
      'checkConfirmation called with a policy that does not require confirmation'
    ).toEqual([]);
    const unused = [...gated].filter(g => g !== 'raw_destructive_request' && !used.includes(g));
    expect(unused, 'gated policies not referenced by any tool').toEqual([]);
  });
});

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

function check({ scripts = {}, extra = [], missing = [] } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'package-contract-'));
  try {
    const files = ['dist/index.js', 'dist/index.d.ts', ...extra].filter(
      file => !missing.includes(file)
    );
    for (const file of files) {
      const target = join(directory, 'package', file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, 'placeholder');
    }
    writeFileSync(
      join(directory, 'package/package.json'),
      JSON.stringify({
        name: '@example/package',
        version: '1.0.0',
        main: 'dist/index.js',
        bin: { example: 'dist/index.js' },
        exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
        files: ['dist/'],
        scripts,
      })
    );
    const tarball = join(directory, 'candidate.tgz');
    execFileSync('tar', ['-czf', tarball, '-C', directory, 'package']);
    return spawnSync(
      process.execPath,
      [resolve('scripts/check-package.mjs'), '--tarball', tarball],
      { encoding: 'utf8' }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('accepts a valid distribution with all declared entry points', () => {
  const result = check();
  assert.equal(result.status, 0, result.stderr);
});
for (const lifecycle of [
  'preinstall',
  'install',
  'postinstall',
  'preprepare',
  'prepare',
  'postprepare',
]) {
  test(`rejects mandatory manifest lifecycle declaration ${lifecycle}`, () => {
    const result = check({ scripts: { [lifecycle]: 'placeholder' } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lifecycle/);
  });
}
for (const missing of ['dist/index.js', 'dist/index.d.ts']) {
  test(`rejects missing entry point ${missing}`, () => {
    const result = check({ missing: [missing] });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing package entry/);
  });
}
for (const file of [
  'dist/__tests__/fixture.json',
  'dist/fixtures/response.json',
  'dist/unit.test.js',
  'nested.tgz',
  '.env',
  'credentials.json',
  'binding.gyp',
]) {
  test(`rejects unintended distribution file ${file}`, () => {
    const result = check({ extra: [file] });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unintended package file/);
  });
}

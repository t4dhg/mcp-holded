import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

function inspect(tarball) {
  const entries = execFileSync('tar', ['-tzf', tarball], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
    .trim()
    .split('\n');
  const types = execFileSync('tar', ['-tvzf', tarball], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  assert(!/^[lh]/m.test(types), 'Unintended package file: symbolic or hard link');
  const paths = new Set();
  for (const entry of entries) {
    assert(
      entry.startsWith('package/') && !entry.split('/').includes('..'),
      `Unintended package file: ${entry}`
    );
    if (entry.endsWith('/')) continue;
    const path = entry.slice('package/'.length);
    assert(
      !/(?:^|\/)(?:__tests__|__fixtures__|fixtures?|tests?|node_modules|\.git|\.aws)(?:\/|$)|\.(?:test|spec)\.[^/]+$|\.(?:tgz|tar(?:\.[a-z0-9]+)?|zip|pem|key|p12)$|(?:^|\/)(?:\.env(?:\.[^/]*)?|\.mcp\.json|credentials\.json|service-account[^/]*\.json|binding\.gyp)$|(?:^|\/)(?:\.codex|\.cursor|\.claude)\//i.test(
        path
      ),
      `Unintended package file: ${path}`
    );
    paths.add(path);
  }
  const manifest = JSON.parse(
    execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' })
  );
  for (const lifecycle of [
    'preinstall',
    'install',
    'postinstall',
    'preprepare',
    'prepare',
    'postprepare',
  ]) {
    assert.equal(
      manifest.scripts?.[lifecycle],
      undefined,
      `Published lifecycle script: ${lifecycle}`
    );
  }
  const required = [
    manifest.main,
    manifest.types,
    ...Object.values(
      typeof manifest.bin === 'string' ? { bin: manifest.bin } : (manifest.bin ?? {})
    ),
  ];
  function exported(value) {
    if (typeof value === 'string' && value.startsWith('./')) required.push(value);
    else if (value && typeof value === 'object')
      for (const child of Object.values(value)) exported(child);
  }
  exported(manifest.exports);
  for (const entry of required.filter(Boolean))
    assert(paths.has(entry.replace(/^\.\//, '')), `Missing package entry: ${entry}`);
  const data = readFileSync(tarball);
  return {
    name: manifest.name,
    version: manifest.version,
    filename: basename(tarball),
    shasum: createHash('sha1').update(data).digest('hex'),
    integrity: 'sha512-' + createHash('sha512').update(data).digest('base64'),
    files: paths.size,
  };
}

if (process.argv[2] === '--tarball') {
  console.log(JSON.stringify(inspect(resolve(process.argv[3]))));
} else {
  const directory = mkdtempSync(join(tmpdir(), 'mcp-package-check-'));
  try {
    const [packed] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--ignore-scripts',
          '--json',
          '--cache',
          join(directory, 'cache'),
          '--pack-destination',
          directory,
        ],
        { encoding: 'utf8' }
      )
    );
    const tarball = join(directory, packed.filename);
    const result = inspect(tarball);
    assert.equal(result.shasum, packed.shasum);
    assert.equal(result.integrity, packed.integrity);
    if (process.argv[2]) {
      const destination = resolve(process.argv[2]);
      mkdirSync(destination, { recursive: true });
      copyFileSync(tarball, join(destination, packed.filename));
      writeFileSync(
        join(destination, 'pack-manifest.json'),
        JSON.stringify(result, null, 2) + '\n'
      );
    }
    console.log(JSON.stringify(result));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

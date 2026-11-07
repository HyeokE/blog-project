import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { externalShadeDataPath } from './shade-data-paths.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));

test('data paths reject checkout destinations, including external symlinks into it', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'shade-path-check-'));
  try {
    const outside = join(temporary, 'catalog.json');
    assert.equal(await externalShadeDataPath(outside), join(await realpath(temporary), 'catalog.json'));
    await assert.rejects(externalShadeDataPath(join(repository, 'catalog.json')), /outside the repository/);
    await symlink(repository, join(temporary, 'checkout'));
    await assert.rejects(externalShadeDataPath(join(temporary, 'checkout', 'catalog.json')), /outside the repository/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('import CLIs require explicit external input/output instead of repository defaults', () => {
  for (const [script, args, message] of [
    ['import-shade-catalog.mjs', [], /external-raw.json/],
    ['import-shade-catalog.mjs', ['/external/raw.json'], /external-output.json/],
    ['import-shade-supabase.mjs', ['--dry-run'], /--catalog requires an external catalog/],
  ]) {
    const result = spawnSync(process.execPath, [join(repository, 'scripts', script), ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  }
});


test('import output cannot overwrite its source, including symlink aliases', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'shade-output-check-'));
  try {
    const source = join(temporary, 'input.json');
    const alias = join(temporary, 'alias.json');
    await writeFile(source, '{"sentinel":true}');
    await symlink(source, alias);
    for (const output of [source, alias]) {
      for (const [script, args] of [
        ['import-shade-catalog.mjs', [source, output]],
        ['import-shade-supabase.mjs', ['--catalog', source, '--output', output]],
      ]) {
        const result = spawnSync(process.execPath, [join(repository, 'scripts', script), ...args], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /must be different files/);
        assert.equal(await readFile(source, 'utf8'), '{"sentinel":true}');
      }
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

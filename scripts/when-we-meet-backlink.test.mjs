import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx', import.meta.url), 'utf8');
test('room back link targets owned meetings while main back link targets Craft', () => {
  assert.match(source, /href=\{roomId\s*\?\s*['"]\/craft\/when-we-meet['"]\s*:\s*['"]\/craft['"]\}/);
  assert.match(source, /roomId\s*\?\s*['"]Meetings['"]/ );
});

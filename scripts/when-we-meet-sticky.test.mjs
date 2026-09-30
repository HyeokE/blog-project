import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../src/features/when-we-meet/when-we-meet.css', import.meta.url), 'utf8');
function lastDeclaration(selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blocks = [...css.matchAll(new RegExp(`(?:^|})[^{}]*${escaped}[^{}]*\\{([^{}]*)\\}`, 'g'))];
  const declarations = blocks.flatMap(([, block]) => [...block.matchAll(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;}]*)`, 'g'))].map(match => match[1].trim()));
  return declarations.at(-1);
}

test('weekday and time sticky rails use opaque warm surfaces in both modes', () => {
  assert.equal(lastDeclaration('.wwm-gridhead,.wwm-time', 'background'), '#f1eee2');
  assert.equal(lastDeclaration(":root[data-mode='dark'] .wwm-gridhead,:root[data-mode='dark'] .wwm-time", 'background'), '#36372d');
});

test('top-left intersection layers above both sticky rails', () => {
  assert.equal(lastDeclaration('.wwm-corner', 'z-index'), '3');
  assert.equal(lastDeclaration('.wwm-gridhead', 'z-index'), '2');
  assert.equal(lastDeclaration('.wwm-time', 'z-index'), '1');
});

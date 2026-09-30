import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('homepage removes only previous and next buttons, retaining navigation and counter', () => {
  const home = source('src/container/light-wall/LightWall.tsx');
  assert.doesNotMatch(home, /POST_PREVIOUS|POST_NEXT|aria-label="이전 글"|aria-label="다음 글"/);
  assert.match(home, /<RollingNumber value=\{filtered.length \? active \+ 1 : 0\}/);
  assert.match(home, /list\.moveBy\(event\.key === 'ArrowDown'/);
  assert.match(home, /onAfterClose/);
});
test('wall pages and homepage share chrome, Craft owns one account slot', () => {
  const home = source('src/container/light-wall/LightWall.tsx');
  const shell = source('src/container/light-wall/WallPageShell.tsx');
  const craft = source('src/app/craft/CraftAccount.tsx');
  for (const page of [home, shell, craft]) assert.match(page, /WallChrome/);
  assert.match(craft, /account=\{/);
  assert.doesNotMatch(craft, /<WallMenu/);
});

test('Craft index has no back row; descendants retain their explicit destinations', () => {
  assert.doesNotMatch(source('src/app/craft/page.tsx'), /WallBackLink|craft-home/);
  const meeting = source('src/features/when-we-meet/WhenWeMeet.tsx');
  assert.match(meeting, /WallBackLink href=\{roomId\?'\/craft\/when-we-meet':'\/craft'\}/);
});

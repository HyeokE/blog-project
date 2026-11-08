import assert from 'node:assert/strict';
import test from 'node:test';

const origin = process.env.SHADE_FINDER_TEST_URL;
if (origin && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
  throw new Error('SHADE_FINDER_TEST_URL must point to a local test server');
}
const live = { skip: !origin };

test('product and photo routes load directly with distinct canonical metadata and shared preview artwork', live, async () => {
  const pages = await Promise.all([
    ['/craft/shade-finder', '비슷한 파운데이션 컬러 찾기'],
    ['/craft/shade-finder/photo', '피부 사진으로 파운데이션 컬러 찾기'],
  ].map(async ([path, title]) => {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.includes(title), `${path} needs its own title`);
    assert.ok(head.includes(`rel="canonical" href="https://hyeok.dev${path}"`), `${path} needs its own canonical URL`);
    assert.ok(head.includes(`property="og:url" content="https://hyeok.dev${path}"`), `${path} needs its own share URL`);
    const image = head.match(/property="og:image" content="([^"]+)"/)?.[1];
    assert.ok(image?.includes('/craft/shade-finder/opengraph-image'), 'Both modes share existing preview artwork');
    assert.ok(html.includes('class="craft-page shade-finder"'), 'Direct route must render the shared application shell');
    return new URL(image).pathname;
  }));
  assert.equal(pages[0], pages[1]);
});

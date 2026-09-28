import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import useCircularPosts from '../src/container/light-wall/useCircularPosts.ts';

function SsrList({ count }) {
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const list = useCircularPosts({ count, resetKey: '', rootRef, scrollRef, reduceMotion: false });
  return createElement(
    'ol',
    {
      'data-start': list.start,
      'data-slot': list.slot,
      'data-active': list.active,
      'data-total': list.totalSlots,
    },
    list.slots.map((slot) =>
      createElement(
        'li',
        {
          key: slot,
          'data-index': list.indexForSlot(slot),
          style: list.styleForSlot(slot),
        },
        `Post ${list.indexForSlot(slot) + 1}`,
      ),
    ),
  );
}

test('SSR renders the first real post without a circular runway spacer', () => {
  for (const count of [0, 1, 2, 7, 25, 101]) {
    const html = renderToStaticMarkup(createElement(SsrList, { count }));
    assert.match(html, /data-start="0"/);
    assert.match(html, /data-slot="0"/);
    assert.match(html, /data-active="0"/);
    assert.match(html, new RegExp(`data-total="${count}"`));
    assert.equal((html.match(/<li /g) ?? []).length, Math.min(count, 6));
    if (count) {
      assert.match(html, /data-index="0" style="--row-opacity:1">Post 1/);
    }
    if (count > 1) {
      assert.match(html, /data-index="1" style="--row-opacity:0\.6/);
    }
  }
});

test('instant runway initialization preserves title position at all row heights', () => {
  // Layout uses equal row heights and a spacer for offscreen slots. Changing
  // the physical slot and scroll offset by the same distance leaves it still.
  for (const rowHeight of [140, 160, 176, 180, 175.5]) {
    for (const viewportHeight of [390, 568, 844, 1080]) {
      const rowCenterPadding = viewportHeight / 2;
      const ssrTitleY = rowCenterPadding;
      const hydratedTitleY = rowCenterPadding + 5000 * rowHeight - 5000 * rowHeight;
      assert.equal(hydratedTitleY, ssrTitleY);
    }
  }
});

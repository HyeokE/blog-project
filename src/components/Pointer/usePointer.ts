import { useEffect, useState } from 'react';

export const usePointer = ({ x, y }: { x: any; y: any }) => {
  const [cursorVariant, setCursorVariant] = useState('default');
  const [textHeight, setTextHeight] = useState(24); // Default line height

  const textNodeCache = new WeakMap<Element, ClientRect[]>();

  const getTextRects = (element: Element): ClientRect[] => {
    if (textNodeCache.has(element)) {
      return textNodeCache.get(element)!;
    }

    const rects: ClientRect[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const range = document.createRange();
        range.selectNode(node);
        rects.push(...Array.from(range.getClientRects()));
      }
    }

    textNodeCache.set(element, rects);
    return rects;
  };

  const isOverText = (element: Element, x: number, y: number): boolean => {
    const rects = getTextRects(element);

    return rects.some(
      (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    );
  };

  useEffect(() => {
    const handleCursorState = () => {
      const mouseX = x.get();
      const mouseY = y.get();
      const hoveredElement = document.elementFromPoint(mouseX, mouseY);
      if (!hoveredElement) return;
      const computedStyle = window.getComputedStyle(hoveredElement);
      if (
        hoveredElement?.tagName === 'A' ||
        hoveredElement?.classList.contains('clickable') ||
        computedStyle.cursor === 'pointer'
      ) {
        return setCursorVariant('pointer');
      }
      if (isOverText(hoveredElement, mouseX, mouseY)) {
        setCursorVariant('text');
        setTextHeight(parseInt(computedStyle.lineHeight));
        return;
      }
      setCursorVariant('default');
    };

    window.addEventListener('mousemove', handleCursorState);
    return () => window.removeEventListener('mousemove', handleCursorState);
  }, [x, y]);

  return { cursorVariant, textHeight };
};

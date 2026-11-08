'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clampPhotoView, zoomPhotoAt, panPhotoBy, photoPointAt, photoPointInView, type PhotoView } from './photo-viewport.mjs';

type Point = { x: number; y: number };
export type PhotoMarker = Point & { id: string; label: string; kind: 'white' | 'skin'; active?: boolean };
type Pointer = Point & { startX: number; startY: number };
type Props = {
  source: HTMLCanvasElement;
  markers: PhotoMarker[];
  activePoint: Point | null;
  label: string;
  describedBy: string;
  disabled: boolean;
  onSelectPoint: (point: Point) => void;
  onSelectWithKeyboard: (event: KeyboardEvent<HTMLCanvasElement>) => Point | null;
};
const FIT: PhotoView = { scale: 1, x: 0, y: 0 };

export function PhotoViewport({ source, markers, activePoint, label, describedBy, disabled, onSelectPoint, onSelectWithKeyboard }: Props) {
  const instructionsId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<PhotoView>(FIT);
  const liveView = useRef<PhotoView>(FIT);
  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<{
    suppressed: boolean;
    dragged: boolean;
    pan: { view: PhotoView; point: Point } | null;
    pinch: { view: PhotoView; center: Point; distance: number } | null;
  }>({ suppressed: false, dragged: false, pan: null, pinch: null });

  useEffect(() => {
    const target = canvas.current;
    if (target) {
      target.width = source.width; target.height = source.height;
      target.getContext('2d')?.drawImage(source, 0, 0);
    }
  }, [source]);

  function updateView(next: PhotoView) {
    const bounded = clampPhotoView(next);
    liveView.current = bounded;
    setView(bounded);
  }

  function normalized(point: Point): Point | null {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) { return null; }
    return { x: (point.x - rect.left) / rect.width, y: (point.y - rect.top) / rect.height };
  }

  function rebaseGesture() {
    const current = [...pointers.current.values()];
    if (current.length >= 2) {
      const [first, second] = current;
      const center = normalized({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
      gesture.current.pinch = center ? { view: liveView.current, center, distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)) } : null;
      gesture.current.pan = null;
    } else {
      const point = current[0] ? normalized(current[0]) : null;
      gesture.current.pan = point ? { view: liveView.current, point } : null;
      gesture.current.pinch = null;
    }
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) { return; }
    if (pointers.current.size === 0) {
      gesture.current.suppressed = false; gesture.current.dragged = false;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
    if (pointers.current.size > 1) { gesture.current.suppressed = true; gesture.current.dragged = true; }
    rebaseGesture();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* A cancelled pointer may no longer be capturable. */ }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointers.current.get(event.pointerId);
    if (!pointer || disabled) { return; }
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 10) { gesture.current.dragged = true; }
    const current = [...pointers.current.values()];
    if (current.length >= 2 && gesture.current.pinch) {
      const [first, second] = current;
      const center = normalized({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
      const pinch = gesture.current.pinch;
      if (center) {
        const scale = pinch.view.scale * Math.hypot(second.x - first.x, second.y - first.y) / pinch.distance;
        updateView(zoomPhotoAt(pinch.view, scale, pinch.center, center));
      }
    } else if (current.length === 1 && gesture.current.dragged && gesture.current.pan && liveView.current.scale > 1) {
      const point = normalized(pointer);
      const pan = gesture.current.pan;
      if (point) { updateView(panPhotoBy(pan.view, point.x - pan.point.x, point.y - pan.point.y)); }
    }
  }

  function endPointer(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const pointer = pointers.current.get(event.pointerId);
    if (!pointer) { return; }
    const isTap = !cancelled && !disabled && pointers.current.size === 1 && !gesture.current.suppressed && !gesture.current.dragged &&
      Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) <= 10;
    pointers.current.delete(event.pointerId);
    if (cancelled) { gesture.current.suppressed = true; gesture.current.dragged = true; }
    rebaseGesture();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) { event.currentTarget.releasePointerCapture(event.pointerId); }
    if (!isTap) { return; }
    const point = normalized({ x: event.clientX, y: event.clientY });
    if (!point || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) { return; }
    const sourcePoint = photoPointAt(liveView.current, point);
    if (sourcePoint.x < 0 || sourcePoint.x > 1 || sourcePoint.y < 0 || sourcePoint.y > 1) { return; }
    onSelectPoint(sourcePoint);
  }

  function keepVisible(point: Point) {
    const position = photoPointInView(liveView.current, point);
    const dx = position.x < 0.08 ? 0.08 - position.x : position.x > 0.92 ? 0.92 - position.x : 0;
    const dy = position.y < 0.08 ? 0.08 - position.y : position.y > 0.92 ? 0.92 - position.y : 0;
    if (dx || dy) { updateView(panPhotoBy(liveView.current, dx, dy)); }
  }

  function zoom(scale: number) {
    gesture.current.suppressed = true;
    updateView(zoomPhotoAt(liveView.current, scale, { x: 0.5, y: 0.5 }));
    rebaseGesture();
  }

  return <>
    <div className="sf-photo-zoom" role="group" aria-label="사진 확대·축소">
      <Button type="button" variant="outline" size="icon-sm" aria-label="사진 축소" disabled={disabled || view.scale <= 1} onClick={() => zoom(view.scale - 0.5)}><Minus aria-hidden="true" /></Button>
      <span className="sf-photo-zoom-value" aria-label={`사진 확대 비율 ${Math.round(view.scale * 100)}%`}>{Math.round(view.scale * 100)}%</span>
      <Button type="button" variant="outline" size="icon-sm" aria-label="사진 확대" disabled={disabled || view.scale >= 4} onClick={() => zoom(view.scale + 0.5)}><Plus aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="sm" disabled={disabled || view.scale === 1} onClick={() => { gesture.current.suppressed = true; updateView(FIT); rebaseGesture(); }}>전체 보기</Button>
    </div>
    <div className="sf-photo-stage">
      <div ref={frame} className="sf-photo-frame" data-zoomed={view.scale > 1} style={{ maxWidth: `${source.width / source.height * 420}px`, aspectRatio: `${source.width} / ${source.height}` }}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => endPointer(event, false)} onPointerCancel={event => endPointer(event, true)} onLostPointerCapture={event => endPointer(event, true)}>
        <canvas ref={canvas} role="button" tabIndex={0} aria-label={label} aria-describedby={`${describedBy} ${instructionsId}`} aria-disabled={disabled}
          style={{ transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.scale})` }}
          onClick={event => {
            if (event.detail === 0 && !disabled) {
              const point = activePoint ?? photoPointAt(liveView.current, { x: 0.5, y: 0.5 });
              onSelectPoint(point); keepVisible(point);
            }
          }}
          onKeyDown={event => { if (!disabled) { const point = onSelectWithKeyboard(event); if (point) { keepVisible(point); } } }} />
        {markers.map(marker => {
          const point = photoPointInView(view, marker);
          return <span key={marker.id} className="sf-photo-marker" data-kind={marker.kind} data-active={marker.active} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} aria-hidden="true">{marker.label}</span>;
        })}
      </div>
    </div>
    <p id={instructionsId} className="sf-photo-hint">두 손가락으로 확대하거나 확대한 사진을 끌어 이동하세요.</p>
  </>;
}

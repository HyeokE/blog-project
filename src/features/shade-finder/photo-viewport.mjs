const bounded = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finite = values => {
  if (values.some(value => !Number.isFinite(value))) throw new RangeError('Invalid photo viewport coordinates');
};

export function clampPhotoView(view) {
  finite([view.scale, view.x, view.y]);
  const scale = bounded(view.scale, 1, 4);
  return { scale, x: bounded(view.x, 1 - scale, 0), y: bounded(view.y, 1 - scale, 0) };
}

export function photoPointAt(view, point) {
  finite([point.x, point.y]);
  const current = clampPhotoView(view);
  return { x: (point.x - current.x) / current.scale, y: (point.y - current.y) / current.scale };
}

export function photoPointInView(view, point) {
  finite([point.x, point.y]);
  const current = clampPhotoView(view);
  return { x: point.x * current.scale + current.x, y: point.y * current.scale + current.y };
}

export function zoomPhotoAt(view, scale, anchor, targetAnchor = anchor) {
  finite([scale, targetAnchor.x, targetAnchor.y]);
  const source = photoPointAt(view, anchor);
  const nextScale = bounded(scale, 1, 4);
  return clampPhotoView({ scale: nextScale, x: targetAnchor.x - source.x * nextScale, y: targetAnchor.y - source.y * nextScale });
}

export function panPhotoBy(view, dx, dy) {
  finite([dx, dy]);
  const current = clampPhotoView(view);
  return clampPhotoView({ scale: current.scale, x: current.x + dx, y: current.y + dy });
}

export type PhotoPoint = { x: number; y: number };
export type PhotoView = PhotoPoint & { scale: number };
export function clampPhotoView(view: PhotoView): PhotoView;
export function photoPointAt(view: PhotoView, point: PhotoPoint): PhotoPoint;
export function photoPointInView(view: PhotoView, point: PhotoPoint): PhotoPoint;
export function zoomPhotoAt(view: PhotoView, scale: number, anchor: PhotoPoint, targetAnchor?: PhotoPoint): PhotoView;
export function panPhotoBy(view: PhotoView, dx: number, dy: number): PhotoView;

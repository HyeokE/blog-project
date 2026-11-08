export type Rgb = [number, number, number];
export type SkinPatch = { hex: string; rgb: Rgb; sampleCount: number; clippedFraction: number };
export type WhiteBalance = { ok: true; gains: Rgb } | { ok: false; reason: 'clipped' | 'dark' | 'cast' };
export function averageSkinColors(colors: Rgb[]): { hex: string; rgb: Rgb };
export function sampleSkinPatch(image: { data: Uint8ClampedArray; width: number; height: number }, x: number, y: number, radius?: number): SkinPatch | null;
export function createWhiteBalance(reference: SkinPatch): WhiteBalance;
export function applyWhiteBalance(rgb: Rgb, balance: Extract<WhiteBalance, { ok: true }>): { hex: string; rgb: Rgb; clipped: boolean };

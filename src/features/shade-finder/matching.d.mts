import type { Lab, Rgb, ShadeCatalog, ShadeFilters, ShadeMatch } from './types';

export function hexToRgb(hex: string): Rgb;
export function rgbToLab(rgb: Rgb): Lab;
export function deltaE2000(first: Lab, second: Lab): number;
export function findSimilarShades(
  catalog: ShadeCatalog,
  sourceShadeId: string,
  filters?: ShadeFilters,
): ShadeMatch[];

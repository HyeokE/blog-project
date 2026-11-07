export type ColorComparisonKey = 'lightness' | 'chroma' | 'redness' | 'yellowness';

export interface ColorComparisonRow {
  key: ColorComparisonKey;
  label: string;
  description: string;
  direction: -1 | 0 | 1;
}

export function compareShadeColors(sourceHex: string, targetHex: string): ColorComparisonRow[];

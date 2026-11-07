export interface DifferenceStep {
  level: number;
  label: string;
  upperBound: number;
  rangeLabel: string;
}
export const DIFFERENCE_STEPS: DifferenceStep[];
export function describeDifference(deltaE: number): DifferenceStep & { value: string };

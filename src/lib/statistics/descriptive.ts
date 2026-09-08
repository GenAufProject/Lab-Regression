/**
 * Descriptive statistics utility functions.
 */

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function sumOfSquares(values: number[], meanVal?: number): number {
  const m = meanVal !== undefined ? meanVal : mean(values);
  return values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
}

export function variance(values: number[], isSample = true): number {
  if (values.length <= 1) return 0;
  const ss = sumOfSquares(values);
  return ss / (isSample ? values.length - 1 : values.length);
}

export function standardDeviation(values: number[], isSample = true): number {
  return Math.sqrt(variance(values, isSample));
}

export function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  return { min, max };
}

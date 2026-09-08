import { describe, expect, it } from 'vitest';
import {
  mean,
  minMax,
  standardDeviation,
  sum,
  sumOfSquares,
  variance,
} from '../descriptive';

describe('descriptive statistics', () => {
  describe('sum', () => {
    it('returns 0 for an empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('sums positive numbers exactly', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('sums negative and positive numbers', () => {
      expect(sum([-1, -2, 3, 4])).toBe(4);
    });

    it('handles single-element arrays', () => {
      expect(sum([42])).toBe(42);
    });
  });

  describe('mean', () => {
    it('returns 0 for an empty array (degenerate fallback)', () => {
      expect(mean([])).toBe(0);
    });

    it('computes the arithmetic mean exactly', () => {
      expect(mean([2, 4, 6, 8])).toBe(5);
    });

    it('preserves sign for negative values', () => {
      expect(mean([-3, -1, 2])).toBeCloseTo(-2 / 3, 10);
    });

    it('returns the single element for a one-element array', () => {
      expect(mean([7.5])).toBe(7.5);
    });
  });

  describe('sumOfSquares', () => {
    it('computes sum of squared deviations from the mean', () => {
      // values 1,2,3,4,5 → mean=3 → deviations -2,-1,0,1,2 → squares 4,1,0,1,4 → sum 10
      expect(sumOfSquares([1, 2, 3, 4, 5])).toBe(10);
    });

    it('accepts an explicit mean argument', () => {
      expect(sumOfSquares([1, 2, 3, 4, 5], 3)).toBe(10);
    });

    it('returns 0 when all values are identical', () => {
      expect(sumOfSquares([5, 5, 5, 5])).toBe(0);
    });

    it('returns 0 for an empty array', () => {
      expect(sumOfSquares([])).toBe(0);
    });
  });

  describe('variance', () => {
    it('computes sample variance with (n-1) denominator', () => {
      // Sample variance of 1,2,3,4,5 = 10/(5-1) = 2.5
      expect(variance([1, 2, 3, 4, 5], true)).toBe(2.5);
    });

    it('computes population variance with n denominator', () => {
      // Population variance of 1,2,3,4,5 = 10/5 = 2
      expect(variance([1, 2, 3, 4, 5], false)).toBe(2);
    });

    it('returns 0 for a single-element array (no degrees of freedom)', () => {
      expect(variance([42], true)).toBe(0);
    });

    it('returns 0 for an empty array', () => {
      expect(variance([], true)).toBe(0);
    });
  });

  describe('standardDeviation', () => {
    it('is the square root of variance', () => {
      const values = [1, 2, 3, 4, 5];
      expect(standardDeviation(values, true)).toBeCloseTo(Math.sqrt(2.5), 10);
      expect(standardDeviation(values, false)).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('is 0 for a constant array', () => {
      expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    });
  });

  describe('minMax', () => {
    it('returns the min and max of an array', () => {
      expect(minMax([3, 1, 4, 1, 5, 9, 2, 6])).toEqual({ min: 1, max: 9 });
    });

    it('handles negative values', () => {
      expect(minMax([-5, -1, -10, 0, 3])).toEqual({ min: -10, max: 3 });
    });

    it('returns {0,0} for an empty array', () => {
      expect(minMax([])).toEqual({ min: 0, max: 0 });
    });

    it('returns the same value for min and max when all elements are equal', () => {
      expect(minMax([7, 7, 7])).toEqual({ min: 7, max: 7 });
    });
  });
});

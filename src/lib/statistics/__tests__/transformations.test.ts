import { describe, expect, it } from 'vitest';
import {
  backTransformPrediction,
  transformDataset,
  transformDomainDescription,
  transformValue,
} from '../transformations';

describe('transformValue', () => {
  describe('none', () => {
    it('returns the value unchanged', () => {
      expect(transformValue(5, 'none').result).toBe(5);
      expect(transformValue(-3, 'none').result).toBe(-3);
      expect(transformValue(0, 'none').result).toBe(0);
    });

    it('always succeeds', () => {
      expect(transformValue(NaN, 'none').success).toBe(true);
    });
  });

  describe('ln (natural logarithm)', () => {
    it('computes ln(x) for positive x', () => {
      expect(transformValue(Math.E, 'ln').result).toBeCloseTo(1, 10);
      expect(transformValue(1, 'ln').result).toBeCloseTo(0, 10);
      expect(transformValue(10, 'ln').result).toBeCloseTo(Math.log(10), 10);
    });

    it('rejects zero', () => {
      const r = transformValue(0, 'ln');
      expect(r.success).toBe(false);
      expect(r.result).toBeNaN();
      expect(r.error).toMatch(/> 0/);
    });

    it('rejects negative values', () => {
      const r = transformValue(-2, 'ln');
      expect(r.success).toBe(false);
      expect(r.result).toBeNaN();
    });
  });

  describe('log10 (common logarithm)', () => {
    it('computes log10(x) for positive x', () => {
      expect(transformValue(10, 'log10').result).toBeCloseTo(1, 10);
      expect(transformValue(100, 'log10').result).toBeCloseTo(2, 10);
      expect(transformValue(1, 'log10').result).toBeCloseTo(0, 10);
    });

    it('rejects zero and negative values', () => {
      expect(transformValue(0, 'log10').success).toBe(false);
      expect(transformValue(-1, 'log10').success).toBe(false);
    });

    it('satisfies ln(x) = ln(10) · log10(x)', () => {
      // Invariant: change-of-base theorem
      const x = 42;
      const lnX = transformValue(x, 'ln').result;
      const log10X = transformValue(x, 'log10').result;
      expect(lnX).toBeCloseTo(Math.LN10 * log10X, 10);
    });
  });

  describe('sqrt (square root)', () => {
    it('computes sqrt(x) for non-negative x', () => {
      expect(transformValue(4, 'sqrt').result).toBeCloseTo(2, 10);
      expect(transformValue(0, 'sqrt').result).toBeCloseTo(0, 10);
      expect(transformValue(2, 'sqrt').result).toBeCloseTo(Math.SQRT2, 10);
    });

    it('rejects negative values', () => {
      const r = transformValue(-1, 'sqrt');
      expect(r.success).toBe(false);
      expect(r.result).toBeNaN();
    });

    it('accepts zero (sqrt domain is x ≥ 0, NOT x > 0)', () => {
      // This distinguishes sqrt from log transforms
      expect(transformValue(0, 'sqrt').success).toBe(true);
    });
  });
});

describe('transformDataset', () => {
  const sample = [
    { id: '1', x: 1, y: 2 },
    { id: '2', x: 2, y: 4 },
    { id: '3', x: 3, y: 8 },
  ];

  it('returns axis="none" when both transforms are "none" (Phase 2 fix)', () => {
    const r = transformDataset(sample, 'none', 'none');
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.axis).toBe('none');
    }
  });

  it('returns axis="y" when only Y is transformed', () => {
    const r = transformDataset(sample, 'none', 'ln');
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.axis).toBe('y');
    }
  });

  it('returns axis="x" when only X is transformed', () => {
    const r = transformDataset(sample, 'log10', 'none');
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.axis).toBe('x');
    }
  });

  it('returns axis="both" when both axes are transformed', () => {
    const r = transformDataset(sample, 'ln', 'ln');
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.axis).toBe('both');
    }
  });

  it('does NOT mutate the original points array (spec §22)', () => {
    const original = [...sample];
    transformDataset(sample, 'ln', 'ln');
    expect(sample).toEqual(original);
  });

  it('returns a defensive copy of originalPoints', () => {
    const r = transformDataset(sample, 'ln', 'none');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    // Mutating the returned originalPoints should not affect the input
    r.originalPoints[0].x = 999;
    expect(sample[0].x).toBe(1);
  });

  it('correctly computes ln(Y) for all positive Y values', () => {
    const r = transformDataset(sample, 'none', 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.transformedPoints[0].y).toBeCloseTo(Math.log(2), 10);
    expect(r.transformedPoints[1].y).toBeCloseTo(Math.log(4), 10);
    expect(r.transformedPoints[2].y).toBeCloseTo(Math.log(8), 10);
  });

  it('rejects ln transform when any Y ≤ 0 with a structured error (spec §21)', () => {
    const bad = [
      { id: '1', x: 1, y: 5 },
      { id: '2', x: 2, y: 0 },
      { id: '3', x: 3, y: -1 },
    ];
    const r = transformDataset(bad, 'none', 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.invalidCount).toBe(2);
      expect(r.invalidValues).toContain(0);
      expect(r.invalidValues).toContain(-1);
      expect(r.message).toMatch(/ln/i);
      expect(r.message).toMatch(/> 0/);
    }
  });

  it('rejects sqrt transform when any X < 0', () => {
    const bad = [
      { id: '1', x: 1, y: 1 },
      { id: '2', x: -2, y: 4 },
    ];
    const r = transformDataset(bad, 'sqrt', 'none');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.invalidValues).toContain(-2);
    }
  });

  it('accepts sqrt of 0 (sqrt domain is x ≥ 0)', () => {
    const r = transformDataset(
      [
        { id: '1', x: 0, y: 1 },
        { id: '2', x: 4, y: 4 },
      ],
      'sqrt',
      'sqrt'
    );
    expect(r.status).toBe('success');
  });

  it('truncates the invalid values list to 5 entries', () => {
    const allBad = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      x: 1,
      y: -i - 1,
    }));
    const r = transformDataset(allBad, 'none', 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.invalidValues.length).toBe(5);
      expect(r.invalidCount).toBe(10);
    }
  });
});

describe('backTransformPrediction', () => {
  it('ln: back-transforms via exp', () => {
    expect(backTransformPrediction(0, 'ln')).toBeCloseTo(1, 10);
    expect(backTransformPrediction(1, 'ln')).toBeCloseTo(Math.E, 10);
    expect(backTransformPrediction(Math.log(10), 'ln')).toBeCloseTo(10, 10);
  });

  it('log10: back-transforms via 10^x', () => {
    expect(backTransformPrediction(0, 'log10')).toBeCloseTo(1, 10);
    expect(backTransformPrediction(1, 'log10')).toBeCloseTo(10, 10);
    expect(backTransformPrediction(2, 'log10')).toBeCloseTo(100, 10);
  });

  it('sqrt: back-transforms via x² (note: returns median, not mean — Jensen bias)', () => {
    expect(backTransformPrediction(2, 'sqrt')).toBeCloseTo(4, 10);
    expect(backTransformPrediction(3, 'sqrt')).toBeCloseTo(9, 10);
  });

  it('none: returns the value unchanged', () => {
    expect(backTransformPrediction(42, 'none')).toBe(42);
  });

  it('ln and log10 are consistent: ln(x) = ln(10) * log10(x)', () => {
    // Round-trip invariant: backTransform(transform(v)) ≈ v for positive v
    const v = 7.3;
    const lnT = transformValue(v, 'ln').result;
    const log10T = transformValue(v, 'log10').result;
    expect(backTransformPrediction(lnT, 'ln')).toBeCloseTo(v, 10);
    expect(backTransformPrediction(log10T, 'log10')).toBeCloseTo(v, 10);
  });
});

describe('transformDomainDescription', () => {
  it('describes log domain as strictly positive', () => {
    expect(transformDomainDescription('ln')).toMatch(/> 0/);
    expect(transformDomainDescription('log10')).toMatch(/> 0/);
  });

  it('describes sqrt domain as non-negative', () => {
    expect(transformDomainDescription('sqrt')).toMatch(/≥ 0/);
  });

  it('returns empty string for "none"', () => {
    expect(transformDomainDescription('none')).toBe('');
  });
});

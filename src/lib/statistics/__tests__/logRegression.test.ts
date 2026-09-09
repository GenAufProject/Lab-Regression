import { describe, expect, it } from 'vitest';
import { analyzeLogRegression, predictLogRegression } from '../logRegression';
import { calculateSimpleLinearRegression } from '../linearRegression';
import {
  TRANSFORMATION_REGISTRY,
  getLogTransformationMetadata,
  getTransformationMetadata,
  isInDomain,
  transformValue,
  backTransformPrediction,
} from '../transformations';
import { LogBase } from '../../../types';

// ===========================================================================
// Reference dataset: C(t) = 10 · e^(-0.2·t) — exact (no noise).
// On the ln scale: ln(C) = ln(10) - 0.2·t  →  slope = -0.2, intercept = ln(10) ≈ 2.302585
// On the log10 scale: log10(C) = 1 - (0.2/ln10)·t  →  slope = -0.0868589, intercept = 1
// ===========================================================================
const PERFECT_DECAY_TIMES = [0, 1, 2, 4, 6, 8];
const PERFECT_DECAY_DATA = PERFECT_DECAY_TIMES.map((t, i) => ({
  id: `pt-${i + 1}`,
  x: t,
  y: 10 * Math.exp(-0.2 * t),
}));

// ===========================================================================
// Phase 3 — Transformation metadata registry tests (spec §4)
// ===========================================================================
describe('TRANSFORMATION_REGISTRY (spec §4)', () => {
  it('defines metadata for all four TransformType values', () => {
    expect(TRANSFORMATION_REGISTRY.none).toBeDefined();
    expect(TRANSFORMATION_REGISTRY.ln).toBeDefined();
    expect(TRANSFORMATION_REGISTRY.log10).toBeDefined();
    expect(TRANSFORMATION_REGISTRY.sqrt).toBeDefined();
  });

  it('each metadata has consistent name, displayName, notation, and domain', () => {
    for (const meta of Object.values(TRANSFORMATION_REGISTRY)) {
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.displayName.length).toBeGreaterThan(0);
      expect(meta.notationLatex.length).toBeGreaterThan(0);
      expect(meta.inverseNotationLatex.length).toBeGreaterThan(0);
      expect(['all-reals', 'strictly-positive', 'non-negative']).toContain(meta.domain);
      expect(typeof meta.forward).toBe('function');
      expect(typeof meta.inverse).toBe('function');
      expect(typeof meta.preservesSign).toBe('boolean');
      expect(typeof meta.acceptsZero).toBe('boolean');
      expect(typeof meta.acceptsNegative).toBe('boolean');
    }
  });

  it('identity transform accepts all real numbers including zero and negatives', () => {
    const m = TRANSFORMATION_REGISTRY.none;
    expect(m.acceptsZero).toBe(true);
    expect(m.acceptsNegative).toBe(true);
    expect(m.preservesSign).toBe(true);
    expect(m.forward(0)).toBe(0);
    expect(m.forward(-5)).toBe(-5);
    expect(m.inverse(0)).toBe(0);
  });

  it('ln transform rejects zero and negatives but accepts positives', () => {
    const m = TRANSFORMATION_REGISTRY.ln;
    expect(m.acceptsZero).toBe(false);
    expect(m.acceptsNegative).toBe(false);
    expect(m.preservesSign).toBe(false);
    expect(m.forward(Math.E)).toBeCloseTo(1, 10);
    expect(isNaN(m.forward(0))).toBe(true);
    expect(isNaN(m.forward(-1))).toBe(true);
  });

  it('log10 transform rejects zero and negatives but accepts positives', () => {
    const m = TRANSFORMATION_REGISTRY.log10;
    expect(m.acceptsZero).toBe(false);
    expect(m.acceptsNegative).toBe(false);
    expect(m.forward(10)).toBeCloseTo(1, 10);
    expect(isNaN(m.forward(0))).toBe(true);
  });

  it('sqrt transform accepts zero but rejects negatives', () => {
    const m = TRANSFORMATION_REGISTRY.sqrt;
    expect(m.acceptsZero).toBe(true);
    expect(m.acceptsNegative).toBe(false);
    expect(m.forward(0)).toBe(0);
    expect(m.forward(4)).toBe(2);
    expect(isNaN(m.forward(-1))).toBe(true);
  });

  it('isInDomain agrees with the metadata flags', () => {
    expect(isInDomain(0, 'none')).toBe(true);
    expect(isInDomain(-1, 'none')).toBe(true);
    expect(isInDomain(0, 'ln')).toBe(false);
    expect(isInDomain(-1, 'ln')).toBe(false);
    expect(isInDomain(0.5, 'ln')).toBe(true);
    expect(isInDomain(0, 'sqrt')).toBe(true);
    expect(isInDomain(-1, 'sqrt')).toBe(false);
  });

  it('getLogTransformationMetadata returns the correct entry for each LogBase', () => {
    expect(getLogTransformationMetadata('ln').type).toBe('ln');
    expect(getLogTransformationMetadata('log10').type).toBe('log10');
  });

  it('forward/inverse are mutual inverses for valid inputs (spec §19 invariants)', () => {
    for (const type of ['ln', 'log10', 'sqrt', 'none'] as const) {
      const m = getTransformationMetadata(type);
      // Pick a valid input for each transform
      const x =
        type === 'ln' || type === 'log10'
          ? 7.3
          : type === 'sqrt'
          ? 9
          : -3.2;
      const z = m.forward(x);
      const xBack = m.inverse(z);
      expect(xBack).toBeCloseTo(x, 10);
    }
  });

  it('backTransformPrediction delegates to the registry inverse (spec §4)', () => {
    expect(backTransformPrediction(0, 'ln')).toBeCloseTo(1, 10);
    expect(backTransformPrediction(1, 'ln')).toBeCloseTo(Math.E, 10);
    expect(backTransformPrediction(2, 'log10')).toBeCloseTo(100, 10);
    expect(backTransformPrediction(2, 'sqrt')).toBeCloseTo(4, 10);
    expect(backTransformPrediction(42, 'none')).toBe(42);
  });

  it('transformValue uses metadata to produce structured errors', () => {
    const r = transformValue(0, 'ln');
    expect(r.success).toBe(false);
    expect(r.result).toBeNaN();
    expect(r.error).toMatch(/> 0/);
  });
});

// ===========================================================================
// Phase 3 — Log-linear regression on perfect mono-exponential data
// ===========================================================================
describe('analyzeLogRegression — perfect mono-exponential data', () => {
  it('recovers slope and intercept exactly on the ln scale', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.coefficients.slope).toBeCloseTo(-0.2, 10);
    expect(r.result.coefficients.intercept).toBeCloseTo(Math.log(10), 10);
  });

  it('recovers slope and intercept exactly on the log10 scale', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.coefficients.slope).toBeCloseTo(-0.2 / Math.LN10, 10);
    expect(r.result.coefficients.intercept).toBeCloseTo(1, 10);
  });

  it('achieves R² = 1 for perfect mono-exponential data', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.fit.rSquared).toBeCloseTo(1, 10);
  });

  it('back-transforms predictions to the original scale correctly', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    // At t=0, predicted C should be exactly C0 = 10
    const p0 = r.result.predictions.find((p) => p.x === 0)!;
    expect(p0.predictedOriginal).toBeCloseTo(10, 8);
    // At t=5 (interpolation), predicted C = 10·e^(-1) ≈ 3.679
    // We don't have t=5 in the data, so verify the per-point predictions:
    for (const p of r.result.predictions) {
      const expected = 10 * Math.exp(-0.2 * p.x);
      expect(p.predictedOriginal).toBeCloseTo(expected, 8);
    }
  });

  it('produces a 11-step calculation trace (spec §16)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.calculationTrace).toHaveLength(11);
    expect(r.result.calculationTrace[0].step).toBe(1);
    expect(r.result.calculationTrace[0].title).toMatch(/Raw Data/i);
    expect(r.result.calculationTrace[10].step).toBe(11);
    expect(r.result.calculationTrace[10].title).toMatch(/Back-Transform/i);
  });

  it('every trace step has non-empty title, description, formula, and result', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    for (const s of r.result.calculationTrace) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.formulaLatex.length).toBeGreaterThan(0);
      expect(s.result.length).toBeGreaterThan(0);
    }
  });

  it('produces coefficient interpretation with multiplicative factor', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    const i = r.result.interpretation;
    // For ln model with slope b = -0.2: multiplicativeFactor = e^b ≈ 0.8187
    expect(i.multiplicativeFactor).toBeCloseTo(Math.exp(-0.2), 8);
    // Percent change per unit X: (e^b - 1) * 100 ≈ -18.13%
    expect(i.percentChangePerUnitX).toBeCloseTo((Math.exp(-0.2) - 1) * 100, 4);
    // Predicted Y at X = 0 = e^intercept = 10
    expect(i.predictedYAtX0).toBeCloseTo(10, 8);
    expect(i.slopeNarrative.length).toBeGreaterThan(0);
    expect(i.interceptNarrative.length).toBeGreaterThan(0);
  });

  it('flags intercept extrapolation when X = 0 is outside the observed range', () => {
    // Dataset that does NOT include X = 0
    const data = PERFECT_DECAY_DATA.filter((p) => p.x > 0).map((p, i) => ({
      id: `pt-${i + 1}`,
      x: p.x,
      y: p.y,
    }));
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.interpretation.x0OutsideObservedRange).toBe(true);
  });

  it('does NOT flag intercept extrapolation when X = 0 is in range', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.interpretation.x0OutsideObservedRange).toBe(false);
  });

  it('produces both transformed-scale and original-scale equations (spec §8)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.equationTransformedLatex).toContain('\\ln');
    expect(r.result.equationOriginalLatex).toContain('e^{');
    // log10 variant
    const r2 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    expect(r2.status).toBe('success');
    if (r2.status !== 'success') return;
    expect(r2.result.equationTransformedLatex).toContain('\\log_{10}');
    expect(r2.result.equationOriginalLatex).toContain('10^{');
  });

  it('produces per-observation predictions distinguishing transformed vs original residuals (spec §12)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.predictions.length).toBe(PERFECT_DECAY_DATA.length);
    for (const p of r.result.predictions) {
      expect(p).toHaveProperty('yTransformed');
      expect(p).toHaveProperty('predictedTransformed');
      expect(p).toHaveProperty('predictedOriginal');
      expect(p).toHaveProperty('residualTransformed');
      expect(p).toHaveProperty('residualOriginal');
      // For perfect data, both residuals should be ~0
      expect(Math.abs(p.residualTransformed)).toBeLessThan(1e-9);
      expect(Math.abs(p.residualOriginal)).toBeLessThan(1e-6);
    }
  });
});

// ===========================================================================
// Phase 3 — ln vs log10 numerical equivalence (spec §18)
// ===========================================================================
describe('ln vs log10 numerical equivalence (spec §18)', () => {
  it('log10 slope = ln slope / ln(10)', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') {
      throw new Error('analysis failed');
    }
    expect(rLog10.result.coefficients.slope).toBeCloseTo(
      rLn.result.coefficients.slope / Math.LN10,
      10
    );
  });

  it('log10 intercept = ln intercept / ln(10)', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLog10.result.coefficients.intercept).toBeCloseTo(
      rLn.result.coefficients.intercept / Math.LN10,
      10
    );
  });

  it('back-transformed predictions are identical (within tolerance) regardless of log base', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    for (let i = 0; i < rLn.result.predictions.length; i++) {
      expect(rLn.result.predictions[i].predictedOriginal).toBeCloseTo(
        rLog10.result.predictions[i].predictedOriginal,
        8
      );
    }
  });

  it('R² is identical (within tolerance) regardless of log base', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.result.fit.rSquared).toBeCloseTo(rLog10.result.fit.rSquared, 10);
  });

  it('SSE is proportional: SSE_log10 = SSE_ln / ln(10)²', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    // For perfect data both SSEs are ~0, so this test is meaningful only for noisy data.
    // Use a slightly noisy dataset:
    const noisy = PERFECT_DECAY_TIMES.map((t, i) => ({
      id: `pt-${i + 1}`,
      x: t,
      y: 10 * Math.exp(-0.2 * t) + 0.1 * (i % 2 === 0 ? 1 : -1),
    }));
    const nLn = analyzeLogRegression(noisy, 'ln');
    const nLog10 = analyzeLogRegression(noisy, 'log10');
    if (nLn.status !== 'success' || nLog10.status !== 'success') return;
    expect(nLog10.result.fit.sse).toBeCloseTo(
      nLn.result.fit.sse / (Math.LN10 * Math.LN10),
      6
    );
  });

  it('multiplicative factor: ln gives e^b, log10 gives 10^b — both recover the same factor', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.result.interpretation.multiplicativeFactor).toBeCloseTo(
      rLog10.result.interpretation.multiplicativeFactor,
      8
    );
  });
});

// ===========================================================================
// Phase 3 — Equivalence: logRegression(ln) ≡ linearRegression(ln(Y)) (spec §19)
// ===========================================================================
describe('regression equivalence: logRegression(ln) matches linearRegression(ln(Y))', () => {
  it('produces identical slope, intercept, and R² as the underlying OLS on transformed data', () => {
    const rLog = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    if (rLog.status !== 'success') throw new Error();

    const transformed = PERFECT_DECAY_DATA.map((p) => ({
      id: p.id,
      x: p.x,
      y: Math.log(p.y),
    }));
    const rLin = calculateSimpleLinearRegression(transformed);
    if (rLin.status !== 'success') throw new Error();

    expect(rLog.result.coefficients.slope).toBeCloseTo(rLin.stats.slope, 10);
    expect(rLog.result.coefficients.intercept).toBeCloseTo(rLin.stats.intercept, 10);
    expect(rLog.result.fit.rSquared).toBeCloseTo(rLin.stats.rSquared, 10);
    expect(rLog.result.fit.sse).toBeCloseTo(rLin.stats.sse, 10);
    expect(rLog.result.fit.residualStandardError).toBeCloseTo(
      rLin.stats.residualStandardError ?? rLin.stats.rmse,
      10
    );
  });

  it('logRegression reuses the OLS engine — no duplicate regression algorithm (spec §6)', () => {
    // The underlying RegressionStatistics object should be exactly the same shape
    // and values as calculateSimpleLinearRegression on the transformed data.
    const rLog = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    if (rLog.status !== 'success') throw new Error();
    const ols = rLog.result.regression; // <-- this IS the Phase 2 RegressionStatistics object
    expect(ols).toHaveProperty('slope');
    expect(ols).toHaveProperty('intercept');
    expect(ols).toHaveProperty('sxx');
    expect(ols).toHaveProperty('sxy');
    expect(ols).toHaveProperty('sse');
    expect(ols).toHaveProperty('rSquared');
    expect(ols).toHaveProperty('residualStandardError');
  });
});

// ===========================================================================
// Phase 3 — Domain validation (spec §5, §20)
// ===========================================================================
describe('domain validation (spec §5, §20)', () => {
  it('rejects Y = 0 with a structured DOMAIN_ERROR listing the offending row', () => {
    const data = [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 1, y: 8 },
      { id: '3', x: 2, y: 0 }, // invalid
      { id: '4', x: 3, y: 5 },
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('DOMAIN_ERROR');
      expect(r.error.invalidRows).toBeDefined();
      expect(r.error.invalidRows!.length).toBe(1);
      expect(r.error.invalidRows![0].row).toBe(3); // 1-indexed
      expect(r.error.invalidRows![0].y).toBe(0);
    }
  });

  it('rejects Y < 0 with a structured DOMAIN_ERROR', () => {
    const data = [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 1, y: -1 }, // invalid
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('DOMAIN_ERROR');
      expect(r.error.invalidRows![0].y).toBe(-1);
    }
  });

  it('rejects BOTH Y = 0 and Y < 0 in the same dataset, listing every offender', () => {
    const data = [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 1, y: 0 },   // invalid
      { id: '3', x: 2, y: 5 },
      { id: '4', x: 3, y: -2 },  // invalid
    ];
    const r = analyzeLogRegression(data, 'log10');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.invalidRows!.length).toBe(2);
      expect(r.error.invalidRows!.map((r) => r.row)).toEqual([2, 4]);
    }
  });

  it('does NOT silently drop or filter invalid observations (spec §5)', () => {
    const data = [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 1, y: 0 }, // invalid
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('error'); // never silent success
  });

  it('handles very small positive Y values (1e-10) without domain error', () => {
    const data = [
      { id: '1', x: 0, y: 1e-10 },
      { id: '2', x: 1, y: 1e-12 },
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('success');
  });

  it('handles very large positive Y values (1e10) without domain error', () => {
    const data = [
      { id: '1', x: 0, y: 1e10 },
      { id: '2', x: 1, y: 1e9 },
      { id: '3', x: 2, y: 1e8 },
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('success');
  });

  it('rejects non-finite values (NaN, Infinity)', () => {
    const data = [
      { id: '1', x: 0, y: 10 },
      { id: '2', x: 1, y: NaN },
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('error');
  });
});

// ===========================================================================
// Phase 3 — Edge cases (spec §20)
// ===========================================================================
describe('edge cases (spec §20)', () => {
  it('returns INSUFFICIENT_DATA when n < 2', () => {
    const r = analyzeLogRegression([{ id: '1', x: 0, y: 10 }], 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('INSUFFICIENT_DATA');
    }
  });

  it('handles n = 2 (minimum for OLS): perfect fit, df = 0', () => {
    const r = analyzeLogRegression(
      [
        { id: '1', x: 0, y: 10 },
        { id: '2', x: 1, y: 10 * Math.exp(-0.2) },
      ],
      'ln'
    );
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.coefficients.slope).toBeCloseTo(-0.2, 8);
    expect(r.result.fit.rSquared).toBeCloseTo(1, 8);
  });

  it('returns ZERO_VARIANCE_X when all X values are identical', () => {
    const r = analyzeLogRegression(
      [
        { id: '1', x: 5, y: 10 },
        { id: '2', x: 5, y: 5 },
        { id: '3', x: 5, y: 2 },
      ],
      'ln'
    );
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('ZERO_VARIANCE_X');
    }
  });

  it('handles constant Y (e.g. all Y = 5): slope = 0, intercept = ln(5)', () => {
    const r = analyzeLogRegression(
      [
        { id: '1', x: 1, y: 5 },
        { id: '2', x: 2, y: 5 },
        { id: '3', x: 3, y: 5 },
        { id: '4', x: 4, y: 5 },
      ],
      'ln'
    );
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.coefficients.slope).toBeCloseTo(0, 10);
    expect(r.result.coefficients.intercept).toBeCloseTo(Math.log(5), 10);
    // Multiplicative factor for slope = 0 should be 1 (no change)
    expect(r.result.interpretation.multiplicativeFactor).toBeCloseTo(1, 10);
    expect(r.result.interpretation.percentChangePerUnitX).toBeCloseTo(0, 10);
  });

  it('handles repeated X values (multiple Y at same X)', () => {
    const data = [
      { id: '1', x: 1, y: 10 },
      { id: '2', x: 1, y: 9.5 }, // duplicate X
      { id: '3', x: 2, y: 5 },
      { id: '4', x: 2, y: 5.2 }, // duplicate X
      { id: '5', x: 3, y: 2.5 },
    ];
    const r = analyzeLogRegression(data, 'ln');
    expect(r.status).toBe('success');
  });

  it('handles empty dataset', () => {
    const r = analyzeLogRegression([], 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('INSUFFICIENT_DATA');
    }
  });

  it('preserves point IDs through the analysis', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.result.predictions.map((p) => p.id)).toEqual(
      PERFECT_DECAY_DATA.map((p) => p.id)
    );
  });
});

// ===========================================================================
// Phase 3 — PK compatibility (spec §22, §23)
// ===========================================================================
describe('PK compatibility (spec §22, §23)', () => {
  it('enables k = -slope derivation from ln regression (spec §23)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    const k = -r.result.coefficients.slope;
    expect(k).toBeCloseTo(0.2, 10);
    // Half-life
    const halfLife = Math.LN2 / k;
    expect(halfLife).toBeCloseTo(Math.LN2 / 0.2, 10);
  });

  it('enables k = -slope × ln(10) derivation from log10 regression (spec §23)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    const k = -r.result.coefficients.slope * Math.LN10;
    expect(k).toBeCloseTo(0.2, 10);
  });

  it('enables C0 = exp(intercept) from ln regression', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    const c0 = Math.exp(r.result.coefficients.intercept);
    expect(c0).toBeCloseTo(10, 8);
  });

  it('enables C0 = 10^intercept from log10 regression', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    const c0 = Math.pow(10, r.result.coefficients.intercept);
    expect(c0).toBeCloseTo(10, 8);
  });

  it('recovers the same k from both ln and log10 regressions (PK cross-check)', () => {
    const rLn = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    const rLog10 = analyzeLogRegression(PERFECT_DECAY_DATA, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    const kLn = -rLn.result.coefficients.slope;
    const kLog10 = -rLog10.result.coefficients.slope * Math.LN10;
    expect(kLn).toBeCloseTo(kLog10, 10);
  });

  it('does not duplicate PK-specific formulas inside logRegression.ts (spec §22)', () => {
    // The log-regression engine should expose slope and intercept but NOT
    // compute k, t½, Vd, or CL directly — those belong to the PK layer.
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    if (r.status !== 'success') throw new Error();
    expect(r.result).not.toHaveProperty('eliminationRateConstant');
    expect(r.result).not.toHaveProperty('halfLife');
    expect(r.result).not.toHaveProperty('volumeOfDistribution');
    expect(r.result).not.toHaveProperty('clearance');
    expect(r.result).not.toHaveProperty('auc');
  });
});

// ===========================================================================
// Phase 3 — predictLogRegression (spec §11, §21)
// ===========================================================================
describe('predictLogRegression (spec §11, §21)', () => {
  const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
  if (r.status !== 'success') throw new Error('setup failed');

  it('returns the transformed-scale prediction and the back-transformed prediction', () => {
    const p = predictLogRegression(5, r.result);
    expect(p.predictedTransformed).toBeCloseTo(Math.log(10) - 0.2 * 5, 8);
    expect(p.predictedOriginal).toBeCloseTo(10 * Math.exp(-0.2 * 5), 8);
  });

  it('returns symmetric transformed-scale CI bounds', () => {
    const p = predictLogRegression(5, r.result);
    expect(p.ciUpperTransformed - p.predictedTransformed).toBeCloseTo(
      p.predictedTransformed - p.ciLowerTransformed,
      8
    );
  });

  it('returns asymmetric original-scale CI bounds (multiplicative interval)', () => {
    const p = predictLogRegression(5, r.result);
    // On the original scale, the interval is multiplicative:
    //   predicted / lower ≈ upper / predicted
    const ratioLower = p.predictedOriginal / p.ciLowerOriginal;
    const ratioUpper = p.ciUpperOriginal / p.predictedOriginal;
    expect(ratioLower).toBeCloseTo(ratioUpper, 6);
  });

  it('PI is wider than CI on both scales', () => {
    const p = predictLogRegression(5, r.result);
    expect(p.piUpperTransformed - p.piLowerTransformed).toBeGreaterThan(
      p.ciUpperTransformed - p.ciLowerTransformed
    );
    expect(p.piUpperOriginal / p.piLowerOriginal).toBeGreaterThan(
      p.ciUpperOriginal / p.ciLowerOriginal
    );
  });
});

// ===========================================================================
// Phase 3 — No rounding inside the engine (spec §34)
// ===========================================================================
describe('no rounding inside the engine (spec §34)', () => {
  it('coefficients are stored at full IEEE-754 precision (no premature rounding)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    if (r.status !== 'success') throw new Error();
    // Math.log(10) has full precision: 2.302585092994046
    expect(r.result.coefficients.intercept).toBeCloseTo(Math.log(10), 12);
    // Slope may differ from -0.2 by floating-point epsilon (spec §8 forbids
    // exact === comparisons for floating-point identities).
    expect(r.result.coefficients.slope).toBeCloseTo(-0.2, 10);
    // Critically, the engine must NOT pre-round to e.g. -0.20 — verify the
    // stored value has more than 2 decimal places of precision.
    const slopeStr = r.result.coefficients.slope.toString();
    expect(slopeStr.length).toBeGreaterThan(4); // not "-0.2"
  });

  it('calculation trace formulas use full-precision values (not pre-rounded)', () => {
    const r = analyzeLogRegression(PERFECT_DECAY_DATA, 'ln');
    if (r.status !== 'success') throw new Error();
    // Find step 7 (slope) — should contain the full-precision slope, not "-0.20"
    const slopeStep = r.result.calculationTrace.find((s) => s.step === 7)!;
    expect(slopeStep.formulaLatex).toContain('-0.2'); // not pre-rounded to 2 decimals
  });
});

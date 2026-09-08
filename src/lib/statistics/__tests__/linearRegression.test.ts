import { describe, expect, it } from 'vitest';
import {
  calculateSimpleLinearRegression,
  getStudentTCriticalValue,
  predictY,
  studentTPValue,
  zCritical,
} from '../linearRegression';

// ---------------------------------------------------------------------------
// Canonical reference dataset (spec §4): X=[1,2,3,4,5], Y=[2,4,5,4,5]
// Hand-computed: x̄=3, ȳ=4, Sxx=10, Syy=6, Sxy=6
//   slope b = 6/10 = 0.6, intercept a = 4 - 0.6*3 = 2.2
//   predictions: 2.8, 3.4, 4.0, 4.6, 5.2
//   residuals: -0.8, 0.6, 1.0, -0.6, -0.2
//   SSE = 0.64 + 0.36 + 1.0 + 0.36 + 0.04 = 2.4
//   SSR = 3.6, SST = 6.0
//   R² = 1 - 2.4/6 = 0.6
//   df = 3, MSE = 2.4/3 = 0.8, s = √0.8 ≈ 0.8944
//   SE(b) = s/√Sxx = √0.8/√10 = √(0.08) ≈ 0.2828
//   SE(a) = s·√(1/n + x̄²/Sxx) = √0.8·√(1/5 + 9/10) = √0.8·√1.1 = √0.88 ≈ 0.9381
//   t(b) = 0.6/0.2828 ≈ 2.1213, t(a) = 2.2/0.9381 ≈ 2.3452
// ---------------------------------------------------------------------------
const CANONICAL = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 5 },
];

describe('calculateSimpleLinearRegression — canonical dataset', () => {
  const res = calculateSimpleLinearRegression(CANONICAL);
  if (res.status !== 'success') throw new Error('setup failed');

  it('returns n=5', () => {
    expect(res.stats.n).toBe(5);
  });

  it('computes meanX = 3 and meanY = 4 exactly', () => {
    expect(res.stats.meanX).toBeCloseTo(3.0, 10);
    expect(res.stats.meanY).toBeCloseTo(4.0, 10);
  });

  it('computes sumX = 15 and sumY = 20 exactly', () => {
    expect(res.stats.sumX).toBe(15);
    expect(res.stats.sumY).toBe(20);
  });

  it('computes Sxx, Syy, Sxy with full precision', () => {
    expect(res.stats.sxx).toBeCloseTo(10.0, 10);
    expect(res.stats.syy).toBeCloseTo(6.0, 10);
    expect(res.stats.sxy).toBeCloseTo(6.0, 10);
  });

  it('computes slope b = 0.6 and intercept a = 2.2', () => {
    expect(res.stats.slope).toBeCloseTo(0.6, 10);
    expect(res.stats.intercept).toBeCloseTo(2.2, 10);
  });

  it('computes SSE = 2.4, SSR = 3.6, SST = 6.0', () => {
    expect(res.stats.sse).toBeCloseTo(2.4, 10);
    expect(res.stats.ssr).toBeCloseTo(3.6, 10);
    expect(res.stats.sst).toBeCloseTo(6.0, 10);
  });

  it('satisfies the OLS identity SST = SSR + SSE (spec §8)', () => {
    // Use tolerance relative to SST magnitude
    const tol = 1e-9 * Math.max(1, Math.abs(res.stats.sst));
    expect(Math.abs(res.stats.sst - (res.stats.ssr + res.stats.sse))).toBeLessThan(tol);
  });

  it('computes R² = 0.6', () => {
    expect(res.stats.rSquared).toBeCloseTo(0.6, 10);
  });

  it('computes Pearson r = √0.6 (positive since slope > 0)', () => {
    expect(res.stats.r).toBeCloseTo(Math.sqrt(0.6), 10);
    expect(res.stats.r).toBeGreaterThan(0);
  });

  it('computes MSE = 0.8 (df = n - 2 = 3)', () => {
    expect(res.stats.mse).toBeCloseTo(0.8, 10);
  });

  it('computes residualStandardError = √0.8 (NOT √(0.8/5))', () => {
    // Spec §11: residual standard error uses (n-2), not n
    expect(res.stats.residualStandardError).toBeCloseTo(Math.sqrt(0.8), 10);
    expect(res.stats.residualStandardError).not.toBeCloseTo(Math.sqrt(0.8 / 5), 5);
  });

  it('keeps the deprecated rmse alias equal to residualStandardError', () => {
    expect(res.stats.rmse).toBe(res.stats.residualStandardError);
  });

  it('computes predictionRMSE = √(SSE/n) — distinct from residualStandardError', () => {
    expect(res.stats.predictionRMSE).toBeCloseTo(Math.sqrt(2.4 / 5), 10);
    expect(res.stats.predictionRMSE).not.toBeCloseTo(res.stats.residualStandardError!, 5);
  });

  it('computes SE(b) = s / √Sxx', () => {
    expect(res.stats.seSlope).toBeCloseTo(Math.sqrt(0.08), 10);
  });

  it('computes SE(a) = s · √(1/n + x̄²/Sxx)', () => {
    expect(res.stats.seIntercept).toBeCloseTo(Math.sqrt(0.88), 10);
  });

  it('computes t-stats for slope and intercept', () => {
    expect(res.stats.tStatSlope).toBeCloseTo(0.6 / Math.sqrt(0.08), 10);
    expect(res.stats.tStatIntercept).toBeCloseTo(2.2 / Math.sqrt(0.88), 10);
  });

  it('computes predictions and residuals correctly per point', () => {
    const expected = [
      { predicted: 2.8, residual: -0.8 },
      { predicted: 3.4, residual: 0.6 },
      { predicted: 4.0, residual: 1.0 },
      { predicted: 4.6, residual: -0.6 },
      { predicted: 5.2, residual: -0.2 },
    ];
    res.stats.points.forEach((pt, i) => {
      expect(pt.predicted).toBeCloseTo(expected[i].predicted, 10);
      expect(pt.residual).toBeCloseTo(expected[i].residual, 10);
    });
  });

  it('satisfies the OLS invariant Σ residuals ≈ 0 (spec §27)', () => {
    const sumResiduals = res.stats.points.reduce((acc, p) => acc + p.residual, 0);
    // For OLS with intercept, sum of residuals must be zero to machine precision
    expect(Math.abs(sumResiduals)).toBeLessThan(1e-10);
  });

  it('satisfies Σ residualSquared = SSE (spec §27 invariant)', () => {
    const sumSq = res.stats.points.reduce((acc, p) => acc + p.residualSquared, 0);
    expect(sumSq).toBeCloseTo(res.stats.sse, 10);
  });

  it('exposes leverage h_ii for each point', () => {
    // For simple regression: h_ii = 1/n + (x_i - x̄)²/Sxx
    res.stats.points.forEach((pt) => {
      const expected = 1 / 5 + Math.pow(pt.x - 3, 2) / 10;
      expect(pt.leverage).toBeCloseTo(expected, 10);
      // Leverage is bounded in [1/n, 1]
      expect(pt.leverage).toBeGreaterThanOrEqual(1 / 5 - 1e-12);
      expect(pt.leverage).toBeLessThanOrEqual(1 + 1e-12);
    });
  });

  it('exposes internally studentized residuals r_i = e_i / (s·√(1-h_ii))', () => {
    const s = res.stats.residualStandardError!;
    res.stats.points.forEach((pt) => {
      const expected = pt.residual / (s * Math.sqrt(1 - pt.leverage!));
      expect(pt.studentizedResidual).toBeCloseTo(expected, 10);
    });
  });

  it('exposes Cook\'s distance D_i = (r_i²/2)·(h_ii/(1-h_ii))', () => {
    res.stats.points.forEach((pt) => {
      const r = pt.studentizedResidual!;
      const h = pt.leverage!;
      const expected = (r * r / 2) * (h / (1 - h));
      expect(pt.cooksDistance).toBeCloseTo(expected, 10);
      expect(pt.cooksDistance).toBeGreaterThanOrEqual(0);
    });
  });

  it('exposes two-tailed p-values for slope and intercept', () => {
    // For t = 2.1213, df = 3, two-tailed p ≈ 0.1247 (not significant at 0.05)
    expect(res.stats.pValueSlope).toBeDefined();
    expect(res.stats.pValueSlope).toBeGreaterThan(0.05);
    expect(res.stats.pValueSlope).toBeLessThan(0.2);
    expect(res.stats.pValueIntercept).toBeDefined();
  });

  it('exposes F-statistic = MSR/MSE = (SSR/1)/MSE', () => {
    const expectedF = res.stats.ssr / res.stats.mse;
    expect(res.stats.fStat).toBeCloseTo(expectedF, 10);
  });

  it('F = t² for simple regression (one slope parameter)', () => {
    // For simple regression with 1 slope, F(1, n-2) = t²(n-2)
    expect(res.stats.fStat!).toBeCloseTo(res.stats.tStatSlope ** 2, 8);
  });

  it('p-value of F equals p-value of slope t-test for simple regression', () => {
    expect(res.stats.pValueF).toBeCloseTo(res.stats.pValueSlope!, 8);
  });
});

// ---------------------------------------------------------------------------
// Invariant: perfect linear fit gives R² = 1, SSE = 0
// ---------------------------------------------------------------------------
describe('perfect linear fit (spec §25, §27)', () => {
  it('recovers exact slope, intercept, R²=1, SSE=0 for y = 2x + 1', () => {
    const perfect = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: 4, y: 9 },
      { x: 5, y: 11 },
    ];
    const res = calculateSimpleLinearRegression(perfect);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    expect(res.stats.slope).toBeCloseTo(2, 10);
    expect(res.stats.intercept).toBeCloseTo(1, 10);
    expect(res.stats.sse).toBeCloseTo(0, 10);
    expect(res.stats.rSquared).toBeCloseTo(1, 10);
    expect(res.stats.r).toBeCloseTo(1, 10);
  });

  it('recovers exact negative slope for y = -2x + 10', () => {
    const neg = [
      { x: 1, y: 8 },
      { x: 2, y: 6 },
      { x: 3, y: 4 },
      { x: 4, y: 2 },
      { x: 5, y: 0 },
    ];
    const res = calculateSimpleLinearRegression(neg);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    expect(res.stats.slope).toBeCloseTo(-2, 10);
    expect(res.stats.intercept).toBeCloseTo(10, 10);
    expect(res.stats.r).toBeCloseTo(-1, 10);
    expect(res.stats.rSquared).toBeCloseTo(1, 10);
  });

  it('computes a 0 residual standard error and undefined p-value when SSE=0', () => {
    const perfect = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ];
    const res = calculateSimpleLinearRegression(perfect);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    expect(res.stats.residualStandardError).toBeCloseTo(0, 10);
    // SE = 0 → tStat = 0 (since slope/0 guarded to 0) → p-value is NaN
    // Per spec §12: do not calculate inferential stats when degenerate
    expect(res.stats.pValueSlope).toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// Edge cases (spec §6, §25, §26)
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('returns INSUFFICIENT_DATA when n < 2', () => {
    const r1 = calculateSimpleLinearRegression([{ x: 1, y: 2 }]);
    expect(r1.status).toBe('error');
    if (r1.status === 'error') {
      expect(r1.error.type).toBe('INSUFFICIENT_DATA');
    }
    const r0 = calculateSimpleLinearRegression([]);
    expect(r0.status).toBe('error');
  });

  it('handles n = 2 (minimum for OLS): perfect fit, df=0', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1, y: 2 },
      { x: 3, y: 6 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.n).toBe(2);
    expect(r.stats.slope).toBeCloseTo(2, 10);
    expect(r.stats.intercept).toBeCloseTo(0, 10);
    expect(r.stats.sse).toBeCloseTo(0, 10);
    expect(r.stats.rSquared).toBeCloseTo(1, 10);
    // df = 0 → no inferential statistics (spec §12)
    expect(r.stats.mse).toBe(0); // degenerate
    expect(r.stats.residualStandardError).toBe(0);
    expect(r.stats.seSlope).toBe(0);
  });

  it('returns ZERO_VARIANCE_X when all X values are identical', () => {
    const r = calculateSimpleLinearRegression([
      { x: 3, y: 1 },
      { x: 3, y: 4 },
      { x: 3, y: 9 },
    ]);
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('ZERO_VARIANCE_X');
    }
  });

  it('handles constant Y (Syy = 0): slope = 0, R² = 1 by convention', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.slope).toBeCloseTo(0, 10);
    expect(r.stats.intercept).toBeCloseTo(5, 10);
    expect(r.stats.syy).toBeCloseTo(0, 10);
    expect(r.stats.sse).toBeCloseTo(0, 10);
    expect(r.stats.r).toBeCloseTo(0, 10);
    // R² = 1 - SSE/SST; both are 0 → convention: R² = 1 (perfect horizontal fit)
    expect(r.stats.rSquared).toBeCloseTo(1, 10);
  });

  it('filters out non-finite values (NaN, Infinity) before computing', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1, y: 2 },
      { x: 2, y: NaN },
      { x: 3, y: 5 },
      { x: 4, y: Infinity },
      { x: 5, y: 8 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.n).toBe(3); // only 3 valid pairs
  });

  it('handles large magnitude values without precision loss', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1e6, y: 2e6 },
      { x: 2e6, y: 4e6 },
      { x: 3e6, y: 6e6 },
      { x: 4e6, y: 8e6 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.slope).toBeCloseTo(2, 6);
    expect(r.stats.intercept).toBeCloseTo(0, -3); // close to zero
    expect(r.stats.rSquared).toBeCloseTo(1, 10);
  });

  it('handles very small magnitude values', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1e-6, y: 2e-6 },
      { x: 2e-6, y: 4e-6 },
      { x: 3e-6, y: 6e-6 },
      { x: 4e-6, y: 8e-6 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.slope).toBeCloseTo(2, 6);
    expect(r.stats.rSquared).toBeCloseTo(1, 6);
  });

  it('preserves point IDs through the calculation', () => {
    const r = calculateSimpleLinearRegression([
      { id: 'alpha', x: 1, y: 2 },
      { id: 'beta', x: 2, y: 4 },
      { id: 'gamma', x: 3, y: 6 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.points.map((p) => p.id)).toEqual(['alpha', 'beta', 'gamma']);
    expect(r.stats.rows.map((r) => r.id)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('auto-generates IDs when not provided', () => {
    const r = calculateSimpleLinearRegression([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ]);
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.stats.points[0].id).toBe('pt-1');
    expect(r.stats.points[1].id).toBe('pt-2');
  });
});

// ---------------------------------------------------------------------------
// Student-t critical value & p-value functions
// ---------------------------------------------------------------------------
describe('getStudentTCriticalValue', () => {
  it('matches exact table values at 95% for common df', () => {
    expect(getStudentTCriticalValue(1, 0.95)).toBeCloseTo(12.706, 3);
    expect(getStudentTCriticalValue(2, 0.95)).toBeCloseTo(4.303, 3);
    expect(getStudentTCriticalValue(5, 0.95)).toBeCloseTo(2.571, 3);
    expect(getStudentTCriticalValue(10, 0.95)).toBeCloseTo(2.228, 3);
    expect(getStudentTCriticalValue(30, 0.95)).toBeCloseTo(2.042, 3);
    expect(getStudentTCriticalValue(120, 0.95)).toBeCloseTo(1.98, 3);
  });

  it('matches exact table values at 90% and 99%', () => {
    expect(getStudentTCriticalValue(10, 0.9)).toBeCloseTo(1.812, 3);
    expect(getStudentTCriticalValue(10, 0.99)).toBeCloseTo(3.169, 3);
  });

  it('linearly interpolates between tabled df values', () => {
    // df=12: between 12 (2.179) and 13 (2.16) at 95%
    const t = getStudentTCriticalValue(12, 0.95);
    expect(t).toBeCloseTo(2.179, 3);
    // df=13: should be exactly 2.16
    expect(getStudentTCriticalValue(13, 0.95)).toBeCloseTo(2.16, 3);
  });

  it('returns z critical value for very large df (>120)', () => {
    // For df → ∞, t → z; at 95% z = 1.96
    expect(getStudentTCriticalValue(1000, 0.95)).toBeCloseTo(1.96, 3);
    expect(getStudentTCriticalValue(10000, 0.95)).toBeCloseTo(1.96, 3);
  });

  it('returns 2.0 as a safe fallback for df ≤ 0', () => {
    expect(getStudentTCriticalValue(0, 0.95)).toBe(2.0);
    expect(getStudentTCriticalValue(-1, 0.95)).toBe(2.0);
  });
});

describe('zCritical', () => {
  it('returns 1.96 at 95%', () => {
    expect(zCritical(0.95)).toBeCloseTo(1.96, 3);
  });
  it('returns 1.645 at 90%', () => {
    expect(zCritical(0.9)).toBeCloseTo(1.645, 3);
  });
  it('returns 2.576 at 99%', () => {
    expect(zCritical(0.99)).toBeCloseTo(2.576, 3);
  });
});

describe('studentTPValue', () => {
  it('returns 1.0 for t=0', () => {
    expect(studentTPValue(0, 10)).toBeCloseTo(1.0, 4);
  });

  it('returns a small p (< 0.05) for large |t|', () => {
    expect(studentTPValue(5, 10)).toBeLessThan(0.001);
    expect(studentTPValue(-5, 10)).toBeLessThan(0.001);
  });

  it('returns approximately 0.05 for the 95% critical t value', () => {
    // Two-tailed: if t = t_crit(0.975, df), then p ≈ 0.05
    const tCrit = getStudentTCriticalValue(10, 0.95);
    const p = studentTPValue(tCrit, 10);
    expect(p).toBeCloseTo(0.05, 3);
  });

  it('is symmetric: p(-t) = p(t)', () => {
    expect(studentTPValue(2.5, 8)).toBeCloseTo(studentTPValue(-2.5, 8), 6);
  });

  it('returns NaN for invalid df', () => {
    expect(studentTPValue(2, 0)).toBeNaN();
    expect(studentTPValue(2, -1)).toBeNaN();
  });

  it('approaches the normal CDF p-value for large df', () => {
    // For large df, t-dist → normal; p(t=1.96, df=10000) ≈ 0.05
    expect(studentTPValue(1.96, 10000)).toBeCloseTo(0.05, 3);
  });
});

// ---------------------------------------------------------------------------
// predictY: confidence interval (mean response) vs prediction interval
// ---------------------------------------------------------------------------
describe('predictY', () => {
  const res = calculateSimpleLinearRegression(CANONICAL);
  if (res.status !== 'success') throw new Error('setup failed');
  const stats = res.stats;

  it('returns the point prediction ŷ₀ = a + b·x₀', () => {
    const p = predictY(3, stats);
    expect(p.predicted).toBeCloseTo(4.0, 10); // 2.2 + 0.6*3
  });

  it('returns symmetric CI around the prediction at x = x̄', () => {
    const p = predictY(stats.meanX, stats);
    // At the mean, (x - x̄)² = 0, so SE_fit = s·√(1/n)
    const expectedSe = stats.residualStandardError! * Math.sqrt(1 / stats.n);
    const expectedT = getStudentTCriticalValue(stats.n - 2, 0.95);
    expect(p.seFit).toBeCloseTo(expectedSe, 10);
    expect(p.ciLower).toBeCloseTo(p.predicted - expectedT * expectedSe, 10);
    expect(p.ciUpper).toBeCloseTo(p.predicted + expectedT * expectedSe, 10);
  });

  it('PI is wider than CI (spec §17)', () => {
    const p = predictY(3, stats);
    const ciWidth = p.ciUpper - p.ciLower;
    const piWidth = p.piUpper - p.piLower;
    expect(piWidth).toBeGreaterThan(ciWidth);
  });

  it('CI is narrowest at x = x̄ and widens away from the mean', () => {
    const atMean = predictY(stats.meanX, stats);
    const farRight = predictY(stats.meanX + 10, stats);
    expect(farRight.ciUpper - farRight.ciLower).toBeGreaterThan(atMean.ciUpper - atMean.ciLower);
  });

  it('PI contains the CI (spec §17)', () => {
    const p = predictY(2.5, stats);
    expect(p.piLower).toBeLessThan(p.ciLower);
    expect(p.piUpper).toBeGreaterThan(p.ciUpper);
  });

  it('respects the chosen confidence level', () => {
    const p95 = predictY(3, stats, 0.95);
    const p99 = predictY(3, stats, 0.99);
    // 99% interval must be wider than 95%
    expect(p99.ciUpper - p99.ciLower).toBeGreaterThan(p95.ciUpper - p95.ciLower);
  });

  it('exposes seFit and sePred (Phase 2)', () => {
    const p = predictY(3, stats);
    expect(p.seFit).toBeGreaterThan(0);
    expect(p.sePred).toBeGreaterThan(p.seFit); // PI adds the σ² term
    // SE_pred² = SE_fit² + MSE  (Pythagorean decomposition)
    expect(p.sePred * p.sePred).toBeCloseTo(p.seFit * p.seFit + stats.mse, 8);
  });

  it('returns degenerate intervals when df ≤ 0', () => {
    const twoPointRes = calculateSimpleLinearRegression([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]);
    if (twoPointRes.status !== 'success') throw new Error();
    const p = predictY(1.5, twoPointRes.stats);
    expect(p.ciLower).toBe(p.predicted);
    expect(p.ciUpper).toBe(p.predicted);
  });
});

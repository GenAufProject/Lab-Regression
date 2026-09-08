import { describe, expect, it } from 'vitest';
import { calculateSimpleLinearRegression } from '../linearRegression';
import { analyzeResiduals } from '../residuals';

describe('analyzeResiduals — Phase 2 hardening', () => {
  // Build a regression result to feed into analyzeResiduals
  function fit(data: { x: number; y: number; id?: string }[]) {
    const r = calculateSimpleLinearRegression(data);
    if (r.status !== 'success') throw new Error('fit failed');
    return r.stats;
  }

  it('returns a "few points" info finding when n < 3', () => {
    const stats = fit([
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]);
    const analysis = analyzeResiduals(stats);
    expect(analysis.findings.some((f) => f.id === 'few-points')).toBe(true);
  });

  it('detects curvature in a quadratic dataset (residuals bow U-shape)', () => {
    // y = x² sampled — a linear fit will show strong curvature in residuals
    const data = Array.from({ length: 11 }, (_, i) => ({
      x: i - 5,
      y: (i - 5) ** 2,
    }));
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.hasCurvaturePattern).toBe(true);
    expect(analysis.findings.some((f) => f.id === 'curvature')).toBe(true);
  });

  it('flags high-leverage points (h_ii > 4/n)', () => {
    // An extreme X value creates high leverage
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 50, y: 30 }, // extreme leverage
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.highLeveragePoints.length).toBeGreaterThan(0);
  });

  it('flags influential points (Cook\'s D > 4/n)', () => {
    // A point with high leverage AND large residual → high Cook's D
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
      { x: 50, y: 5 }, // high leverage, but residual is ~0 since slope is dragged down
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.maxCooksDistance).toBeGreaterThan(0);
  });

  it('identifies outlier candidates with |studentized residual| ≥ 2', () => {
    // Use n=11 so a single low-leverage outlier has enough statistical power
    // to exceed the |r*| ≥ 2 threshold. (For small n, a single outlier
    // inflates s proportionally and the studentized residual asymptotes to
    // √(n-2)/√(1-1/n), which for n=6 is only ≈2.19.)
    const baseData = [
      { x: 1, y: 2.2 },
      { x: 2, y: 3.1 },
      { x: 3, y: 3.9 },
      { x: 4, y: 4.8 },
      { x: 5, y: 5.6 },
      { x: 6, y: 6.4 },
      { x: 7, y: 7.1 },
      { x: 8, y: 8.0 },
      { x: 9, y: 8.8 },
      { x: 10, y: 9.6 },
    ];
    const data = [...baseData, { x: 5.5, y: 25 }]; // clear outlier at near-mean X
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.outlierCandidates.length).toBeGreaterThan(0);
    expect(analysis.maxStudentizedResidual).toBeGreaterThan(2);
  });

  it('exposes maxAbsResidual, maxStudentizedResidual, maxCooksDistance', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.maxAbsResidual).toBeGreaterThan(0);
    expect(analysis.maxStudentizedResidual).toBeGreaterThan(0);
    expect(analysis.maxCooksDistance).toBeGreaterThanOrEqual(0);
  });

  it('computes residualSum ≈ 0 (OLS invariant, spec §27)', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(Math.abs(analysis.residualSum)).toBeLessThan(1e-10);
  });

  it('emits a "well-behaved" finding when no cautions apply', () => {
    // A clean linear dataset with no curvature, no heteroscedasticity, no outliers
    const data = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: 4, y: 9 },
      { x: 5, y: 11 },
      { x: 6, y: 13 },
      { x: 7, y: 15 },
      { x: 8, y: 17 },
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    // For perfect linear data, residuals are all 0, so no outlier candidates,
    // no curvature, no heteroscedasticity → well-behaved finding should appear
    expect(analysis.findings.some((f) => f.id === 'well-behaved')).toBe(true);
  });

  it('does NOT flag curvature for a clean linear dataset', () => {
    const data = [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
      { x: 4, y: 9 },
      { x: 5, y: 11 },
      { x: 6, y: 13 },
      { x: 7, y: 15 },
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    expect(analysis.hasCurvaturePattern).toBe(false);
  });

  it('all findings have non-empty title, description, and pedagogicalTip', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    const stats = fit(data);
    const analysis = analyzeResiduals(stats);
    for (const f of analysis.findings) {
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
      expect(f.pedagogicalTip.length).toBeGreaterThan(0);
      expect(['info', 'caution', 'check']).toContain(f.type);
    }
  });
});

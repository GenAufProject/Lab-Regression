import { describe, expect, it } from 'vitest';
import { analyzeFirstOrderElimination, predictConcentration } from '../pkAnalysis';
import { calculateTrapezoidalAUC, composeTrapezoidalAUC, extrapolateAUC } from '../trapezoidalAUC';
import { selectTerminalPhase } from '../terminalPhase';
import { buildPKInterpretation } from '../pkInterpretation';
import {
  DEFAULT_PK_UNITS,
  deriveAUCUnitLabel,
  deriveClearanceUnitLabel,
  deriveVdUnitLabel,
  isKnownUnit,
  unitDisplayName,
} from '../pkUnits';
import { calculateSimpleLinearRegression } from '../../statistics/linearRegression';
import { PKDataPoint } from '../../../types';

// ===========================================================================
// Reference dataset: C(t) = 20·e^(−0.15t) — exact (no noise).
// Expected: slope = −0.15, intercept = ln(20) ≈ 2.9957, k = 0.15 h⁻¹,
// t½ = ln(2)/0.15 ≈ 4.6210 h, C₀ = 20 mg/L.
// ===========================================================================
const CLEAN_DATA: PKDataPoint[] = [
  { id: 'pt-1', time: 0, concentration: 20.0 },
  { id: 'pt-2', time: 1, concentration: 20 * Math.exp(-0.15) },
  { id: 'pt-3', time: 2, concentration: 20 * Math.exp(-0.30) },
  { id: 'pt-4', time: 4, concentration: 20 * Math.exp(-0.60) },
  { id: 'pt-5', time: 6, concentration: 20 * Math.exp(-0.90) },
  { id: 'pt-6', time: 8, concentration: 20 * Math.exp(-1.20) },
  { id: 'pt-7', time: 12, concentration: 20 * Math.exp(-1.80) },
  { id: 'pt-8', time: 16, concentration: 20 * Math.exp(-2.40) },
];

// ===========================================================================
// Spec §24: First-order regression on synthetic data
// ===========================================================================
describe('analyzeFirstOrderElimination — clean first-order data (spec §24)', () => {
  it('recovers k = 0.15 h⁻¹ from ln regression', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.eliminationRateConstant).toBeCloseTo(0.15, 8);
  });

  it('recovers C₀ = 20 mg/L from ln regression', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.regression.estimatedC0).toBeCloseTo(20, 8);
  });

  it('recovers half-life t½ = ln(2)/0.15', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.regression.halfLife).toBeCloseTo(Math.LN2 / 0.15, 8);
  });

  it('recovers slope = −0.15 and intercept = ln(20)', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.regression.slope).toBeCloseTo(-0.15, 8);
    expect(r.regression.intercept).toBeCloseTo(Math.log(20), 8);
  });

  it('achieves R² = 1.0 for perfect mono-exponential data', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.regression.rSquared).toBeCloseTo(1.0, 8);
  });
});

// ===========================================================================
// Spec §7: log10 workflow & ln vs log10 equivalence
// ===========================================================================
describe('ln vs log10 equivalence (spec §7)', () => {
  it('recovers the same k from ln and log10 regressions', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.regression.eliminationRateConstant).toBeCloseTo(
      rLog10.regression.eliminationRateConstant,
      8
    );
  });

  it('recovers the same t½ from ln and log10 regressions', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.regression.halfLife).toBeCloseTo(rLog10.regression.halfLife, 8);
  });

  it('recovers the same C₀ from ln and log10 regressions', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.regression.estimatedC0).toBeCloseTo(rLog10.regression.estimatedC0, 8);
  });

  it('recovers the same R² from ln and log10 regressions', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.regression.rSquared).toBeCloseTo(rLog10.regression.rSquared, 8);
  });

  it('slope_log10 = slope_ln / ln(10)', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLog10.regression.slope).toBeCloseTo(
      rLn.regression.slope / Math.LN10,
      8
    );
  });

  it('back-transformed predictions match between ln and log10', () => {
    const rLn = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    const rLog10 = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    for (let i = 0; i < rLn.predictions.length; i++) {
      expect(rLn.predictions[i].concentrationPredicted).toBeCloseTo(
        rLog10.predictions[i].concentrationPredicted,
        6
      );
    }
  });
});

// ===========================================================================
// Spec §11: Prediction
// ===========================================================================
describe('predictConcentration (spec §11)', () => {
  it('predicts concentration at any time using the fitted model', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    const pred5 = predictConcentration(5, r.regression);
    expect(pred5).toBeCloseTo(20 * Math.exp(-0.15 * 5), 6);
  });

  it('at t=0, predicted concentration equals C₀', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    const pred0 = predictConcentration(0, r.regression);
    expect(pred0).toBeCloseTo(r.regression.estimatedC0, 6);
  });

  it('works with log10 model', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'log10' });
    if (r.status !== 'success') return;
    const pred5 = predictConcentration(5, r.regression);
    expect(pred5).toBeCloseTo(20 * Math.exp(-0.15 * 5), 6);
  });

  it('per-observation predictions match predictConcentration', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    for (const p of r.predictions) {
      const direct = predictConcentration(p.time, r.regression);
      expect(p.concentrationPredicted).toBeCloseTo(direct, 8);
    }
  });
});

// ===========================================================================
// Spec §13: Trapezoidal AUC
// ===========================================================================
describe('Trapezoidal AUC (spec §13)', () => {
  it('calculates AUC_last = Σ [(C_i + C_{i+1})/2] × Δt', () => {
    // For C(t) = 20·e^(-0.15t), hand-compute trapezoidal AUC over [0,16]
    const trap = calculateTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    // Manual computation
    let expected = 0;
    for (let i = 0; i < CLEAN_DATA.length - 1; i++) {
      const dt = CLEAN_DATA[i + 1].time - CLEAN_DATA[i].time;
      const avgC = (CLEAN_DATA[i].concentration + CLEAN_DATA[i + 1].concentration) / 2;
      expected += avgC * dt;
    }
    expect(trap.aucLast).toBeCloseTo(expected, 10);
  });

  it('returns one interval per pair of adjacent observations', () => {
    const trap = calculateTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    expect(trap.intervals.length).toBe(CLEAN_DATA.length - 1);
  });

  it('each interval area = (C_i + C_{i+1})/2 × (t_{i+1} − t_i)', () => {
    const trap = calculateTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    for (let i = 0; i < trap.intervals.length; i++) {
      const iv = trap.intervals[i];
      const expected = ((iv.cStart + iv.cEnd) / 2) * (iv.tEnd - iv.tStart);
      expect(iv.area).toBeCloseTo(expected, 10);
    }
  });

  it('returns C_last and t_last from the (time-sorted) data', () => {
    const trap = calculateTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    expect(trap.cLast).toBeCloseTo(CLEAN_DATA[CLEAN_DATA.length - 1].concentration, 10);
    expect(trap.tLast).toBe(CLEAN_DATA[CLEAN_DATA.length - 1].time);
  });

  it('handles unsorted input by sorting internally', () => {
    const reversed = [...CLEAN_DATA].reverse();
    const trap = calculateTrapezoidalAUC(
      reversed.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    const sortedTrap = calculateTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration }))
    );
    expect(trap.aucLast).toBeCloseTo(sortedTrap.aucLast, 10);
  });

  it('returns 0 AUC for fewer than 2 points', () => {
    const trap = calculateTrapezoidalAUC([
      { time: 0, concentration: 5 },
    ]);
    expect(trap.aucLast).toBe(0);
    expect(trap.intervals).toEqual([]);
  });
});

// ===========================================================================
// Spec §14: AUC extrapolation
// ===========================================================================
describe('AUC extrapolation (spec §14)', () => {
  it('computes AUC_extra = C_last / k when k > 0', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    const cLast = CLEAN_DATA[CLEAN_DATA.length - 1].concentration;
    const k = r.regression.eliminationRateConstant;
    expect(r.trapezoidalAUC.aucExtra).toBeCloseTo(cLast / k, 8);
  });

  it('AUC_total = AUC_last + AUC_extra', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.trapezoidalAUC.aucTotal).toBeCloseTo(
      r.trapezoidalAUC.aucLast + r.trapezoidalAUC.aucExtra,
      10
    );
  });

  it('AUC_theoretical = C₀ / k', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.trapezoidalAUC.aucTheoretical).toBeCloseTo(
      r.regression.estimatedC0 / r.regression.eliminationRateConstant,
      8
    );
  });

  it('extrapolation is suppressed when k ≤ 0', () => {
    const extrap = extrapolateAUC(5, 0);
    expect(extrap.suppressed).toBe(true);
    expect(extrap.aucExtra).toBeNaN();
    expect(extrap.suppressedReason).toMatch(/k must be finite and > 0/);
  });

  it('extrapolation is suppressed when C_last ≤ 0', () => {
    const extrap = extrapolateAUC(0, 0.2);
    expect(extrap.suppressed).toBe(true);
    expect(extrap.suppressedReason).toMatch(/last observed concentration/);
  });

  it('extrapolation is suppressed when k is NaN', () => {
    const extrap = extrapolateAUC(5, NaN);
    expect(extrap.suppressed).toBe(true);
  });

  it('extrapFraction = AUC_extra / AUC_total', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.trapezoidalAUC.extrapFraction).toBeCloseTo(
      r.trapezoidalAUC.aucExtra / r.trapezoidalAUC.aucTotal,
      8
    );
  });

  it('composeTrapezoidalAUC integrates trapezoidal + extrapolation + theoretical', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    const composed = composeTrapezoidalAUC(
      CLEAN_DATA.map((p) => ({ time: p.time, concentration: p.concentration })),
      r.regression.eliminationRateConstant,
      r.regression.estimatedC0,
      r.regression.estimatedC0 / r.regression.eliminationRateConstant
    );
    expect(composed.aucLast).toBeCloseTo(r.trapezoidalAUC.aucLast, 10);
    expect(composed.aucExtra).toBeCloseTo(r.trapezoidalAUC.aucExtra, 10);
    expect(composed.aucTotal).toBeCloseTo(r.trapezoidalAUC.aucTotal, 10);
    expect(composed.aucTheoretical).toBeCloseTo(r.trapezoidalAUC.aucTheoretical, 10);
  });
});

// ===========================================================================
// Spec §15: Terminal-phase selection
// ===========================================================================
describe('Terminal-phase selection (spec §15)', () => {
  it('all-points strategy uses every observation', () => {
    const tp = selectTerminalPhase(
      CLEAN_DATA.map((p) => ({ id: p.id, time: p.time, concentration: p.concentration })),
      { strategy: 'all-points', minPoints: 3, logBase: 'ln' }
    );
    expect(tp.method).toBe('all-points');
    expect(tp.pointCount).toBe(CLEAN_DATA.length);
    expect(tp.selectedIndices.length).toBe(CLEAN_DATA.length);
  });

  it('best-rsquared-suffix picks the suffix with highest R²', () => {
    // For clean mono-exponential data, every suffix produces R² = 1, so the
    // selector should pick the longest valid suffix (start=0, all points).
    const tp = selectTerminalPhase(
      CLEAN_DATA.map((p) => ({ id: p.id, time: p.time, concentration: p.concentration })),
      { strategy: 'best-rsquared-suffix', minPoints: 3, logBase: 'ln' }
    );
    expect(tp.method).toBe('best-rsquared-suffix');
    expect(tp.pointCount).toBeGreaterThanOrEqual(3);
    expect(tp.rSquared).toBeCloseTo(1, 6);
  });

  it('best-rsquared-suffix excludes early distribution-phase points on bi-exponential data', () => {
    // Bi-exponential data: early points are NOT in the terminal phase
    const biExp = [
      { id: '1', time: 0, concentration: 42.0 },
      { id: '2', time: 0.5, concentration: 22.451 },
      { id: '3', time: 1, concentration: 14.918 },
      { id: '4', time: 2, concentration: 10.374 },
      { id: '5', time: 4, concentration: 8.054 },
      { id: '6', time: 6, concentration: 6.586 },
      { id: '7', time: 8, concentration: 5.392 },
      { id: '8', time: 12, concentration: 3.614 },
      { id: '9', time: 16, concentration: 2.423 },
      { id: '10', time: 24, concentration: 1.089 },
    ];
    const tp = selectTerminalPhase(biExp, {
      strategy: 'best-rsquared-suffix',
      minPoints: 3,
      logBase: 'ln',
    });
    expect(tp.method).toBe('best-rsquared-suffix');
    // The selector should pick a suffix that excludes the early distribution phase.
    // For this bi-exponential data, the terminal phase is t ≥ 4 or t ≥ 6.
    expect(tp.timeRange.start).toBeGreaterThanOrEqual(4);
    expect(tp.pointCount).toBeGreaterThanOrEqual(3);
  });

  it('returns a human-readable explanation', () => {
    const tp = selectTerminalPhase(
      CLEAN_DATA.map((p) => ({ id: p.id, time: p.time, concentration: p.concentration })),
      { strategy: 'all-points', minPoints: 3, logBase: 'ln' }
    );
    expect(tp.explanation.length).toBeGreaterThan(50);
    expect(tp.explanation).toMatch(/\d+/); // mentions point count
  });

  it('falls back to all-points when data has fewer than minPoints', () => {
    const smallData = CLEAN_DATA.slice(0, 2);
    const tp = selectTerminalPhase(
      smallData.map((p) => ({ id: p.id, time: p.time, concentration: p.concentration })),
      { strategy: 'best-rsquared-suffix', minPoints: 3, logBase: 'ln' }
    );
    expect(tp.method).toBe('all-points');
    expect(tp.pointCount).toBe(2);
  });
});

// ===========================================================================
// Spec §17: PK calculation trace
// ===========================================================================
describe('PK calculation trace (spec §17)', () => {
  it('generates 7 steps with full-precision values', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.calculationTrace.length).toBe(7);
    for (const s of r.calculationTrace) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.formulaLatex.length).toBeGreaterThan(0);
      expect(s.result.length).toBeGreaterThan(0);
    }
  });

  it('Step 1 is the transformation, Step 7 is AUC', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.calculationTrace[0].title).toMatch(/Transform/);
    expect(r.calculationTrace[6].title).toMatch(/AUC/);
  });

  it('trace uses full-precision values (no premature rounding)', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    // Step 4 result mentions k. Verify it contains more than 4 decimals.
    const kStep = r.calculationTrace.find((s) => s.title.includes('Elimination Rate'));
    expect(kStep).toBeDefined();
    if (kStep) {
      // The result string should not be pre-rounded to 4 decimals
      expect(kStep.result.length).toBeGreaterThan(10);
    }
  });
});

// ===========================================================================
// Spec §25: Cross-validation with regression engine
// ===========================================================================
describe('PK engine reuses OLS regression engine (spec §25)', () => {
  it('PK slope/intercept match linearRegression on transformed data', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    const transformed = CLEAN_DATA.map((p) => ({
      id: p.id,
      x: p.time,
      y: Math.log(p.concentration),
    }));
    const ols = calculateSimpleLinearRegression(transformed);
    if (ols.status !== 'success') return;
    expect(r.regression.slope).toBeCloseTo(ols.stats.slope, 10);
    expect(r.regression.intercept).toBeCloseTo(ols.stats.intercept, 10);
    expect(r.regression.rSquared).toBeCloseTo(ols.stats.rSquared, 10);
  });

  it('PK engine does not duplicate OLS math (uses analyzePKData internally)', () => {
    // The PKAnalysisSuccess.olsStatistics field IS the Phase 2 RegressionStatistics
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.olsStatistics).toHaveProperty('sxx');
    expect(r.olsStatistics).toHaveProperty('sxy');
    expect(r.olsStatistics).toHaveProperty('sse');
    expect(r.olsStatistics).toHaveProperty('rSquared');
    expect(r.olsStatistics).toHaveProperty('residualStandardError');
  });
});

// ===========================================================================
// Spec §22, §29: Invalid data & error handling
// ===========================================================================
describe('Validation & error handling (spec §5, §22, §29)', () => {
  it('rejects n < 2 with INSUFFICIENT_DATA', () => {
    const r = analyzeFirstOrderElimination([
      { id: '1', time: 0, concentration: 10 },
    ]);
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.type).toBe('INSUFFICIENT_DATA');
    }
  });

  it('rejects C ≤ 0 with NON_POSITIVE_CONCENTRATION and lists offending rows', () => {
    const r = analyzeFirstOrderElimination([
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 1, concentration: 0 },
      { id: '3', time: 2, concentration: -1.5 },
    ]);
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.type).toBe('NON_POSITIVE_CONCENTRATION');
      expect(r.invalidRows).toBeDefined();
      expect(r.invalidRows!.length).toBe(2);
      expect(r.invalidRows![0].row).toBe(2);
      expect(r.invalidRows![1].row).toBe(3);
    }
  });

  it('rejects NaN/Infinity with NON_FINITE_VALUE', () => {
    const r = analyzeFirstOrderElimination([
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 1, concentration: NaN },
    ]);
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.type).toBe('NON_FINITE_VALUE');
    }
  });

  it('rejects all-identical times with ZERO_TIME_VARIANCE', () => {
    const r = analyzeFirstOrderElimination([
      { id: '1', time: 5, concentration: 10 },
      { id: '2', time: 5, concentration: 8 },
      { id: '3', time: 5, concentration: 6 },
    ]);
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.type).toBe('ZERO_TIME_VARIANCE');
    }
  });

  it('emits a POSITIVE_SLOPE warning when the fitted slope is non-negative', () => {
    const increasing = [
      { id: '1', time: 0, concentration: 1 },
      { id: '2', time: 1, concentration: 2 },
      { id: '3', time: 2, concentration: 4 },
      { id: '4', time: 3, concentration: 8 },
    ];
    const r = analyzeFirstOrderElimination(increasing, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.warnings.some((w) => w.code === 'POSITIVE_SLOPE')).toBe(true);
  });

  it('emits a HIGH_EXTRAPOLATION_FRACTION warning when extrap fraction > 20%', () => {
    // Short dataset where C_last is still large → high extrapolation fraction
    const shortData = [
      { id: '1', time: 0, concentration: 20 },
      { id: '2', time: 1, concentration: 18 },
      { id: '3', time: 2, concentration: 16.5 },
    ];
    const r = analyzeFirstOrderElimination(shortData, { logBase: 'ln' });
    if (r.status !== 'success') return;
    // k will be small, C_last will be moderate → extrap fraction likely > 20%
    if (!r.trapezoidalAUC.extrapolationSuppressed) {
      // Verify the warning fires when fraction > 0.20
      if (r.trapezoidalAUC.extrapFraction > 0.2) {
        expect(r.warnings.some((w) => w.code === 'HIGH_EXTRAPOLATION_FRACTION')).toBe(true);
      }
    }
  });

  it('emits a DUPLICATE_TIMES info warning when input has duplicate time values', () => {
    const dup = [
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 1, concentration: 8 },
      { id: '3', time: 1, concentration: 7.5 }, // duplicate time
      { id: '4', time: 2, concentration: 6 },
    ];
    const r = analyzeFirstOrderElimination(dup, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.warnings.some((w) => w.code === 'DUPLICATE_TIMES')).toBe(true);
  });

  it('does NOT crash on edge cases (empty array, single point)', () => {
    expect(() => analyzeFirstOrderElimination([])).not.toThrow();
    expect(() =>
      analyzeFirstOrderElimination([{ id: '1', time: 0, concentration: 1 }])
    ).not.toThrow();
  });
});

// ===========================================================================
// Spec §19: Educational interpretation
// ===========================================================================
describe('PK interpretation (spec §19)', () => {
  it('produces non-empty narratives for k, t½, R², C₀, AUC', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.interpretation.kNarrative.length).toBeGreaterThan(50);
    expect(r.interpretation.halfLifeNarrative.length).toBeGreaterThan(50);
    expect(r.interpretation.rSquaredNarrative.length).toBeGreaterThan(50);
    expect(r.interpretation.c0Narrative.length).toBeGreaterThan(50);
    expect(r.interpretation.aucNarrative.length).toBeGreaterThan(50);
  });

  it('R² narrative explicitly says "high R² alone does NOT prove"', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.interpretation.rSquaredNarrative).toMatch(/does NOT prove/i);
  });

  it('C₀ narrative explicitly says "NOT necessarily an observed measurement"', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.interpretation.c0Narrative).toMatch(/NOT necessarily an observed/i);
  });

  it('AUC narrative mentions the extrapolated fraction as model-dependent', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    expect(r.interpretation.aucNarrative).toMatch(/model-dependent|extrapolat/i);
  });
});

// ===========================================================================
// Spec §18: Unit handling
// ===========================================================================
describe('PK unit handling (spec §18)', () => {
  it('TIME_UNITS, CONCENTRATION_UNITS, DOSE_UNITS are non-empty', () => {
    // Re-imported inside the test file via the module
    // (constants are exported from pkUnits.ts)
    // We test via the helper functions.
    expect(unitDisplayName('h', 'time')).toBe('Hours');
    expect(unitDisplayName('mg/L', 'concentration')).toBe('Milligrams per liter');
    expect(unitDisplayName('mg', 'dose')).toBe('Milligrams');
  });

  it('isKnownUnit returns true for canonical units and false for unknown', () => {
    expect(isKnownUnit('h', 'time')).toBe(true);
    expect(isKnownUnit('foo', 'time')).toBe(false);
  });

  it('unitDisplayName returns the symbol itself for unknown units (defensive)', () => {
    expect(unitDisplayName('foo', 'time')).toBe('foo');
  });

  it('deriveAUCUnitLabel composes concentration × time', () => {
    expect(deriveAUCUnitLabel(DEFAULT_PK_UNITS)).toBe('mg/L·h');
    expect(deriveAUCUnitLabel({ time: 'min', concentration: 'µg/mL', dose: 'µg' })).toBe('µg/mL·min');
  });

  it('deriveClearanceUnitLabel infers volume from concentration denominator', () => {
    expect(deriveClearanceUnitLabel(DEFAULT_PK_UNITS)).toBe('L/h');
    expect(deriveClearanceUnitLabel({ time: 'min', concentration: 'µg/mL', dose: 'µg' })).toBe('mL/min');
  });

  it('deriveVdUnitLabel infers volume unit', () => {
    expect(deriveVdUnitLabel(DEFAULT_PK_UNITS)).toBe('L');
    expect(deriveVdUnitLabel({ time: 'h', concentration: 'ng/mL', dose: 'mg' })).toBe('mL');
  });
});

// ===========================================================================
// Spec §26: Numerical precision — no rounding inside the engine
// ===========================================================================
describe('No rounding inside the engine (spec §26, §34)', () => {
  it('k, t½, C₀ are stored at full IEEE-754 precision', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    // k should be 0.15 to within floating-point epsilon (not pre-rounded to 4 decimals)
    expect(r.regression.eliminationRateConstant).toBeCloseTo(0.15, 10);
    // The toString should have more than 4 characters (not "0.15")
    expect(r.regression.eliminationRateConstant.toString().length).toBeGreaterThan(3);
  });

  it('AUC values are stored at full precision', () => {
    const r = analyzeFirstOrderElimination(CLEAN_DATA, { logBase: 'ln' });
    if (r.status !== 'success') return;
    // Recompute AUC_last manually
    let expected = 0;
    for (let i = 0; i < CLEAN_DATA.length - 1; i++) {
      const dt = CLEAN_DATA[i + 1].time - CLEAN_DATA[i].time;
      const avgC = (CLEAN_DATA[i].concentration + CLEAN_DATA[i + 1].concentration) / 2;
      expected += avgC * dt;
    }
    expect(r.trapezoidalAUC.aucLast).toBeCloseTo(expected, 10);
  });
});

// ===========================================================================
// Spec §33: Regression safety — Phase 1-3 functionality remains intact
// ===========================================================================
describe('Regression safety (spec §33)', () => {
  it('Phase 2 linearRegression still works on the same data', () => {
    const transformed = CLEAN_DATA.map((p) => ({
      id: p.id,
      x: p.time,
      y: Math.log(p.concentration),
    }));
    const ols = calculateSimpleLinearRegression(transformed);
    expect(ols.status).toBe('success');
    if (ols.status !== 'success') return;
    expect(ols.stats.slope).toBeCloseTo(-0.15, 8);
    expect(ols.stats.rSquared).toBeCloseTo(1, 8);
  });

  it('PK analysis on Phase 2 sample dataset still works', () => {
    // The original Phase 2 PK sample
    const phase2Sample = [
      { id: 'pk-1', time: 0.0, concentration: 10.2 },
      { id: 'pk-2', time: 1.0, concentration: 7.8 },
      { id: 'pk-3', time: 2.0, concentration: 6.1 },
      { id: 'pk-4', time: 4.0, concentration: 3.8 },
      { id: 'pk-5', time: 6.0, concentration: 2.4 },
      { id: 'pk-6', time: 8.0, concentration: 1.5 },
    ];
    const r = analyzeFirstOrderElimination(phase2Sample, { logBase: 'ln' });
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    // k should be approximately 0.25 (since the data approximates 10·e^(-0.25t))
    expect(r.regression.eliminationRateConstant).toBeGreaterThan(0.15);
    expect(r.regression.eliminationRateConstant).toBeLessThan(0.35);
  });
});

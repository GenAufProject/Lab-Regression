import { describe, expect, it } from 'vitest';
import {
  calculateAUC,
  calculateC0FromIntercept,
  calculateClearance,
  calculateClearanceFromAUC,
  calculateConcentrationAtTime,
  calculateHalfLife,
  calculateKFromLnSlope,
  calculateKFromLog10Slope,
  calculateVd,
  LN_10,
  LN_2,
  predictConcentrationWithInterval,
} from '../elimination';
import { analyzePKData } from '../pkRegression';

describe('Pharmacokinetics elimination — fundamental formulas (spec §24)', () => {
  describe('LN_10 and LN_2 constants', () => {
    it('LN_10 = ln(10) = 2.302585092994046', () => {
      expect(LN_10).toBe(Math.LN10);
      expect(LN_10).toBeCloseTo(2.302585092994046, 12);
    });

    it('LN_2 = ln(2) = 0.6931471805599453', () => {
      expect(LN_2).toBe(Math.LN2);
      expect(LN_2).toBeCloseTo(0.6931471805599453, 12);
    });
  });

  describe('calculateConcentrationAtTime', () => {
    it('returns C0 at t=0', () => {
      expect(calculateConcentrationAtTime(10, 0.2, 0)).toBeCloseTo(10, 10);
    });

    it('follows the exponential decay law C(t) = C0 · e^(-kt)', () => {
      expect(calculateConcentrationAtTime(10, 0.2, 1)).toBeCloseTo(10 * Math.exp(-0.2), 10);
      expect(calculateConcentrationAtTime(10, 0.2, 5)).toBeCloseTo(10 * Math.exp(-1.0), 10);
      expect(calculateConcentrationAtTime(10, 0.2, 10)).toBeCloseTo(10 * Math.exp(-2.0), 10);
    });

    it('returns 0 for invalid inputs (k ≤ 0, c0 ≤ 0, t < 0)', () => {
      expect(calculateConcentrationAtTime(10, 0, 1)).toBe(0);
      expect(calculateConcentrationAtTime(0, 0.2, 1)).toBe(0);
      expect(calculateConcentrationAtTime(10, 0.2, -1)).toBe(0);
    });

    it('halves the concentration at t = t½ (spec §24)', () => {
      const c0 = 10;
      const k = 0.2;
      const halfLife = calculateHalfLife(k);
      const concentrationAtHalfLife = calculateConcentrationAtTime(c0, k, halfLife);
      expect(concentrationAtHalfLife).toBeCloseTo(c0 / 2, 8);
    });
  });

  describe('calculateKFromLnSlope', () => {
    it('returns -slope (k = -slope for ln transformation)', () => {
      expect(calculateKFromLnSlope(-0.2)).toBeCloseTo(0.2, 10);
      expect(calculateKFromLnSlope(0.15)).toBeCloseTo(-0.15, 10);
    });
  });

  describe('calculateKFromLog10Slope', () => {
    it('returns -slope · ln(10) (k = -slope · ln(10) for log10 transformation)', () => {
      // log10(C) = log10(C0) - (k/ln10)·t  ⇒  slope = -k/ln10  ⇒  k = -slope·ln10
      expect(calculateKFromLog10Slope(-0.08685889638)).toBeCloseTo(0.2, 8);
    });

    it('is consistent with ln-based k (both recover the same k)', () => {
      // For the same decay curve, slope_ln = -k, slope_log10 = -k/ln10
      const k = 0.2;
      const slopeLn = -k;
      const slopeLog10 = -k / LN_10;
      expect(calculateKFromLnSlope(slopeLn)).toBeCloseTo(
        calculateKFromLog10Slope(slopeLog10),
        10
      );
    });
  });

  describe('calculateHalfLife', () => {
    it('returns ln(2)/k = 0.69315/k', () => {
      expect(calculateHalfLife(0.2)).toBeCloseTo(Math.LN2 / 0.2, 10);
      expect(calculateHalfLife(0.1)).toBeCloseTo(Math.LN2 / 0.1, 10);
    });

    it('returns NaN for k ≤ 0 (spec §12 — no inferential stats for invalid params)', () => {
      expect(calculateHalfLife(0)).toBeNaN();
      expect(calculateHalfLife(-0.1)).toBeNaN();
    });
  });

  describe('calculateC0FromIntercept', () => {
    it('returns exp(intercept) for ln base', () => {
      expect(calculateC0FromIntercept(Math.log(10), 'ln')).toBeCloseTo(10, 10);
      expect(calculateC0FromIntercept(0, 'ln')).toBeCloseTo(1, 10);
    });

    it('returns 10^intercept for log10 base', () => {
      expect(calculateC0FromIntercept(1, 'log10')).toBeCloseTo(10, 10);
      expect(calculateC0FromIntercept(2, 'log10')).toBeCloseTo(100, 10);
      expect(calculateC0FromIntercept(0, 'log10')).toBeCloseTo(1, 10);
    });

    it('is consistent: ln(intercept) and log10(intercept) recover the same C0', () => {
      const c0 = 7.5;
      const interceptLn = Math.log(c0);
      const interceptLog10 = Math.log10(c0);
      expect(calculateC0FromIntercept(interceptLn, 'ln')).toBeCloseTo(
        calculateC0FromIntercept(interceptLog10, 'log10'),
        10
      );
    });
  });

  describe('calculateVd', () => {
    it('returns Dose / C0', () => {
      expect(calculateVd(500, 10)).toBeCloseTo(50, 10);
      expect(calculateVd(100, 2)).toBeCloseTo(50, 10);
    });

    it('returns NaN for invalid inputs', () => {
      expect(calculateVd(0, 10)).toBeNaN();
      expect(calculateVd(500, 0)).toBeNaN();
      expect(calculateVd(-1, 10)).toBeNaN();
    });
  });

  describe('calculateClearance', () => {
    it('returns k · Vd', () => {
      expect(calculateClearance(0.2, 50)).toBeCloseTo(10, 10);
    });

    it('returns NaN for invalid inputs', () => {
      expect(calculateClearance(0, 50)).toBeNaN();
      expect(calculateClearance(0.2, 0)).toBeNaN();
    });
  });

  describe('calculateAUC (Phase 2)', () => {
    it('returns C0/k for one-compartment IV bolus', () => {
      // AUC = ∫₀^∞ C0·e^(-kt) dt = C0/k
      expect(calculateAUC(10, 0.2)).toBeCloseTo(50, 10);
      expect(calculateAUC(5, 0.1)).toBeCloseTo(50, 10);
    });

    it('returns NaN for k ≤ 0 or C0 ≤ 0', () => {
      expect(calculateAUC(10, 0)).toBeNaN();
      expect(calculateAUC(0, 0.2)).toBeNaN();
      expect(calculateAUC(-1, 0.2)).toBeNaN();
    });

    it('satisfies the AUC identity: AUC = C0/k = Dose/CL (when Vd = Dose/C0)', () => {
      const c0 = 10;
      const k = 0.2;
      const dose = 500;
      const vd = calculateVd(dose, c0);
      const cl = calculateClearance(k, vd);
      const auc = calculateAUC(c0, k);
      // Dose / CL should equal AUC
      expect(dose / cl).toBeCloseTo(auc, 10);
    });
  });

  describe('calculateClearanceFromAUC (Phase 2)', () => {
    it('returns Dose / AUC', () => {
      expect(calculateClearanceFromAUC(500, 50)).toBeCloseTo(10, 10);
    });

    it('matches CL = k·Vd for the one-compartment model', () => {
      // CL_from_AUC = Dose/AUC = Dose/(C0/k) = k·Dose/C0 = k·Vd
      const c0 = 10;
      const k = 0.2;
      const dose = 500;
      const vd = calculateVd(dose, c0);
      const cl1 = calculateClearance(k, vd);
      const auc = calculateAUC(c0, k);
      const cl2 = calculateClearanceFromAUC(dose, auc);
      expect(cl1).toBeCloseTo(cl2, 10);
    });

    it('returns NaN for invalid inputs', () => {
      expect(calculateClearanceFromAUC(0, 50)).toBeNaN();
      expect(calculateClearanceFromAUC(500, 0)).toBeNaN();
    });
  });

  describe('predictConcentrationWithInterval (Phase 2)', () => {
    it('returns the back-transformed point prediction', () => {
      const r = predictConcentrationWithInterval({
        time: 0,
        intercept: Math.log(10), // ln(10)
        slope: -0.2,
        sePred: 0.05,
        tCrit: 2.0,
        logBase: 'ln',
      });
      expect(r.predicted).toBeCloseTo(10, 8);
      expect(r.predictedLog).toBeCloseTo(Math.log(10), 8);
    });

    it('returns an asymmetric interval on the original scale', () => {
      // Because back-transform is exp(), the interval is multiplicative and
      // asymmetric: log(lower) is farther from log(predicted) than log(upper)
      // is, in absolute terms — wait, actually they're symmetric on the log
      // scale, so on the original scale lower and upper are equidistant
      // multiplicatively: predicted/lower = upper/predicted.
      const r = predictConcentrationWithInterval({
        time: 0,
        intercept: Math.log(10),
        slope: -0.2,
        sePred: 0.1,
        tCrit: 1.96,
        logBase: 'ln',
      });
      const ratioUpper = r.upper / r.predicted;
      const ratioLower = r.predicted / r.lower;
      expect(ratioUpper).toBeCloseTo(ratioLower, 8);
    });

    it('decays exponentially with time', () => {
      const t0 = predictConcentrationWithInterval({
        time: 0,
        intercept: Math.log(10),
        slope: -0.2,
        sePred: 0.01,
        tCrit: 1.96,
        logBase: 'ln',
      });
      const t5 = predictConcentrationWithInterval({
        time: 5,
        intercept: Math.log(10),
        slope: -0.2,
        sePred: 0.01,
        tCrit: 1.96,
        logBase: 'ln',
      });
      expect(t5.predicted).toBeCloseTo(10 * Math.exp(-1.0), 8);
      expect(t5.predicted).toBeLessThan(t0.predicted);
    });

    it('works with log10 base', () => {
      const r = predictConcentrationWithInterval({
        time: 0,
        intercept: 1, // log10(10)
        slope: -0.2 / LN_10,
        sePred: 0.02,
        tCrit: 1.96,
        logBase: 'log10',
      });
      expect(r.predicted).toBeCloseTo(10, 8);
    });
  });
});

describe('analyzePKData — Phase 2 hardening', () => {
  // Synthetic ground-truth model: C0 = 10, k = 0.2
  const times = [0, 1, 2, 4, 6, 8];
  const syntheticData = times.map((t, idx) => ({
    id: `pt-${idx}`,
    time: t,
    concentration: 10 * Math.exp(-0.2 * t),
  }));

  it('recovers k = 0.2 from ln-transformed synthetic data', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.eliminationRateConstant).toBeCloseTo(0.2, 5);
  });

  it('recovers C0 = 10 from the intercept', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.estimatedC0).toBeCloseTo(10, 4);
  });

  it('recovers half-life = ln(2)/k', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.halfLife).toBeCloseTo(Math.LN2 / 0.2, 4);
  });

  it('recovers R² = 1.0 for perfect mono-exponential data', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.rSquared).toBeCloseTo(1.0, 5);
  });

  it('computes AUC = C0/k (Phase 2)', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.auc).toBeDefined();
    expect(r.regression.auc).toBeCloseTo(10 / 0.2, 4); // = 50
  });

  it('exposes residualStandardError (Phase 2)', () => {
    const r = analyzePKData(syntheticData, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.residualStandardError).toBeDefined();
    // For perfect mono-exponential data, residuals are ~0
    expect(r.regression.residualStandardError!).toBeCloseTo(0, 6);
  });

  it('recovers equivalent k from log10 transformation', () => {
    const r = analyzePKData(syntheticData, 'log10');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.eliminationRateConstant).toBeCloseTo(0.2, 4);
    expect(r.regression.estimatedC0).toBeCloseTo(10, 4);
    expect(r.regression.halfLife).toBeCloseTo(Math.LN2 / 0.2, 4);
  });

  it('computes AUC identically for ln and log10 transformations', () => {
    const rLn = analyzePKData(syntheticData, 'ln');
    const rLog10 = analyzePKData(syntheticData, 'log10');
    if (rLn.status !== 'success' || rLog10.status !== 'success') return;
    expect(rLn.regression.auc).toBeCloseTo(rLog10.regression.auc!, 8);
  });

  it('computes Vd = Dose/C0 when dose is provided', () => {
    const r = analyzePKData(
      syntheticData,
      'ln',
      { time: 'h', concentration: 'mg/L', dose: 'mg' },
      500
    );
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.volumeOfDistribution).toBeCloseTo(50, 2); // 500/10
  });

  it('computes CL = k·Vd = Dose/AUC (cross-check, Phase 2)', () => {
    const r = analyzePKData(
      syntheticData,
      'ln',
      { time: 'h', concentration: 'mg/L', dose: 'mg' },
      500
    );
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.regression.clearance).toBeCloseTo(10, 2); // 0.2 * 50
    // Cross-check: CL = Dose/AUC = 500/50 = 10
    expect(500 / r.regression.auc!).toBeCloseTo(r.regression.clearance!, 6);
  });

  it('rejects non-positive concentrations with a structured error', () => {
    const bad = [
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 1, concentration: 0 },
      { id: '3', time: 2, concentration: -1 },
    ];
    const r = analyzePKData(bad, 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('NON_POSITIVE_CONCENTRATION');
      expect(r.error.invalidValues).toContain(0);
      expect(r.error.invalidValues).toContain(-1);
    }
  });

  it('returns INSUFFICIENT_DATA for fewer than 2 points', () => {
    const r = analyzePKData([{ id: '1', time: 0, concentration: 10 }], 'ln');
    expect(r.status).toBe('error');
    if (r.status === 'error') {
      expect(r.error.type).toBe('INSUFFICIENT_DATA');
    }
  });

  it('emits a warning when the slope is non-negative (decay implies slope < 0)', () => {
    const increasing = [
      { id: '1', time: 0, concentration: 1 },
      { id: '2', time: 1, concentration: 2 },
      { id: '3', time: 2, concentration: 4 },
    ];
    const r = analyzePKData(increasing, 'ln');
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.warning).toBeDefined();
    expect(r.warning).toMatch(/positive.*slope|slope.*positive/i);
  });

  it('does NOT emit a CL cross-check warning for perfect mono-exponential data', () => {
    // For perfect data, CL(k·Vd) and CL(Dose/AUC) agree to floating-point precision
    const r = analyzePKData(
      syntheticData,
      'ln',
      { time: 'h', concentration: 'mg/L', dose: 'mg' },
      500
    );
    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    // No cross-check warning expected for perfect data
    expect(r.warning).toBeUndefined();
  });
});

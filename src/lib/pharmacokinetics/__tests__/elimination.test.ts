import { describe, expect, it } from 'vitest';
import { calculateConcentrationAtTime, calculateHalfLife } from '../elimination';
import { analyzePKData } from '../pkRegression';

describe('Pharmacokinetics Elimination & PK Regression', () => {
  it('correctly calculates theoretical C(t) for C0=10, k=0.2', () => {
    const c0 = 10;
    const k = 0.2;
    expect(calculateConcentrationAtTime(c0, k, 0)).toBeCloseTo(10, 6);
    expect(calculateConcentrationAtTime(c0, k, 1)).toBeCloseTo(10 * Math.exp(-0.2), 6);
    expect(calculateHalfLife(k)).toBeCloseTo(Math.LN2 / 0.2, 6); // ~3.4657
  });

  it('recovers PK parameters from synthetic data using ln transformation', () => {
    // Synthetic model: C0 = 10, k = 0.2
    const times = [0, 1, 2, 4, 6, 8];
    const data = times.map((t, idx) => ({
      id: `pt-${idx}`,
      time: t,
      concentration: 10 * Math.exp(-0.2 * t),
    }));

    const result = analyzePKData(data, 'ln');
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const pk = result.regression;
    expect(pk.slope).toBeCloseTo(-0.2, 5);
    expect(pk.intercept).toBeCloseTo(Math.log(10), 5);
    expect(pk.eliminationRateConstant).toBeCloseTo(0.2, 5);
    expect(pk.estimatedC0).toBeCloseTo(10, 4);
    expect(pk.halfLife).toBeCloseTo(Math.LN2 / 0.2, 4);
    expect(pk.rSquared).toBeCloseTo(1.0, 5);
  });

  it('recovers equivalent k and C0 using log10 transformation', () => {
    const times = [0, 1, 2, 4, 6, 8];
    const data = times.map((t, idx) => ({
      id: `pt-${idx}`,
      time: t,
      concentration: 10 * Math.exp(-0.2 * t),
    }));

    const result = analyzePKData(data, 'log10');
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const pk = result.regression;
    // For log10: slope = -k / ln(10) = -0.2 / 2.302585 = -0.086858896
    expect(pk.slope).toBeCloseTo(-0.2 / Math.LN10, 5);
    // intercept = log10(10) = 1
    expect(pk.intercept).toBeCloseTo(1.0, 5);
    // k = -2.302585 * slope = 0.2
    expect(pk.eliminationRateConstant).toBeCloseTo(0.2, 4);
    // C0 = 10^1 = 10
    expect(pk.estimatedC0).toBeCloseTo(10, 4);
    expect(pk.halfLife).toBeCloseTo(Math.LN2 / 0.2, 4);
  });

  it('rejects non-positive concentration data with domain warning', () => {
    const invalidData = [
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 1, concentration: 0 },
      { id: '3', time: 2, concentration: -2 },
    ];

    const result = analyzePKData(invalidData, 'ln');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.type).toBe('NON_POSITIVE_CONCENTRATION');
    }
  });

  it('calculates IV Bolus parameters when dose is provided', () => {
    const data = [
      { id: '1', time: 0, concentration: 10 },
      { id: '2', time: 2, concentration: 10 * Math.exp(-0.2 * 2) },
      { id: '3', time: 4, concentration: 10 * Math.exp(-0.2 * 4) },
    ];
    // Dose = 500 mg, C0 = 10 mg/L => Vd = 50 L. CL = 0.2 * 50 = 10 L/h
    const result = analyzePKData(data, 'ln', { time: 'h', concentration: 'mg/L', dose: 'mg' }, 500);
    expect(result.status).toBe('success');
    if (result.status !== 'success') return;

    const pk = result.regression;
    expect(pk.volumeOfDistribution).toBeCloseTo(50, 2);
    expect(pk.clearance).toBeCloseTo(10, 2);
  });
});

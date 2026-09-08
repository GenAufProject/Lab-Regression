import { describe, expect, it } from 'vitest';
import { calculateSimpleLinearRegression, predictY } from '../linearRegression';

describe('calculateSimpleLinearRegression', () => {
  it('correctly calculates classic test dataset: X=[1,2,3,4,5], Y=[2,4,5,4,5]', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];

    const res = calculateSimpleLinearRegression(data);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;

    const stats = res.stats;
    expect(stats.n).toBe(5);
    expect(stats.meanX).toBeCloseTo(3.0, 6);
    expect(stats.meanY).toBeCloseTo(4.0, 6);
    expect(stats.sxx).toBeCloseTo(10.0, 6);
    expect(stats.syy).toBeCloseTo(6.0, 6);
    expect(stats.sxy).toBeCloseTo(6.0, 6);

    // slope = 6 / 10 = 0.6
    expect(stats.slope).toBeCloseTo(0.6, 6);
    // intercept = 4 - 0.6 * 3 = 2.2
    expect(stats.intercept).toBeCloseTo(2.2, 6);

    // Sum of squared errors
    expect(stats.sse).toBeCloseTo(2.4, 6);
    expect(stats.ssr).toBeCloseTo(3.6, 6);
    expect(stats.sst).toBeCloseTo(6.0, 6);

    // R² and Pearson r
    expect(stats.rSquared).toBeCloseTo(0.6, 6);
    expect(stats.r).toBeCloseTo(Math.sqrt(0.6), 6);

    // MSE and RMSE
    expect(stats.mse).toBeCloseTo(0.8, 6);
    expect(stats.rmse).toBeCloseTo(Math.sqrt(0.8), 6);

    // Standard errors
    expect(stats.seSlope).toBeCloseTo(Math.sqrt(0.08), 6);
    expect(stats.seIntercept).toBeCloseTo(Math.sqrt(0.88), 6);

    // Predictions & residuals
    expect(stats.points[0].predicted).toBeCloseTo(2.8, 6);
    expect(stats.points[0].residual).toBeCloseTo(-0.8, 6);
    expect(stats.points[2].predicted).toBeCloseTo(4.0, 6);
    expect(stats.points[2].residual).toBeCloseTo(1.0, 6);
  });

  it('handles edge case: fewer than 2 points returns INSUFFICIENT_DATA error', () => {
    const res = calculateSimpleLinearRegression([{ x: 1, y: 2 }]);
    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.error.type).toBe('INSUFFICIENT_DATA');
    }
  });

  it('handles edge case: identical X values returns ZERO_VARIANCE_X error', () => {
    const res = calculateSimpleLinearRegression([
      { x: 3, y: 1 },
      { x: 3, y: 4 },
      { x: 3, y: 9 },
    ]);
    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.error.type).toBe('ZERO_VARIANCE_X');
    }
  });

  it('predicts new Y values with intervals correctly', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    const res = calculateSimpleLinearRegression(data);
    expect(res.status).toBe('success');
    if (res.status !== 'success') return;

    const pred = predictY(3, res.stats);
    // At mean x=3, predicted = 2.2 + 0.6 * 3 = 4.0
    expect(pred.predicted).toBeCloseTo(4.0, 6);
    expect(pred.ciLower).toBeLessThan(pred.predicted);
    expect(pred.ciUpper).toBeGreaterThan(pred.predicted);
    expect(pred.piLower).toBeLessThan(pred.ciLower);
    expect(pred.piUpper).toBeGreaterThan(pred.ciUpper);
  });
});

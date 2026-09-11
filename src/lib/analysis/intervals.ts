import { IntervalBand, RegressionStatistics } from '../../types';
import { predictY } from '../statistics/linearRegression';

/**
 * Phase 6 — Confidence/Prediction Interval Band Engine (spec §10).
 *
 * CRITICAL (spec §10): "Use the existing regression engine. Do NOT create
 * another regression implementation."
 *
 * This module CONSUMES the Phase 2 `predictY` function to generate a band
 * of (x, predicted, ciLower, ciUpper, piLower, piUpper) points across the
 * X range for visualization.
 *
 * Spec §10: CI = uncertainty around the mean response; PI = uncertainty
 * for an individual future observation. PI is always wider.
 * Spec §10: support configurable confidence level (90/95/99%).
 */

/**
 * Generates an interval band across the X range.
 *
 * @param stats  The Phase 2 RegressionStatistics.
 * @param confidenceLevel  e.g. 0.90, 0.95, 0.99.
 * @param steps  Number of points in the band (default 30).
 */
export function computeIntervalBand(
  stats: RegressionStatistics,
  confidenceLevel: number = 0.95,
  steps: number = 30
): IntervalBand {
  const { n, meanX, sxx } = stats;
  const df = n - 2;

  if (df <= 0 || sxx <= 0) {
    return {
      points: [],
      confidenceLevel,
      suppressed: true,
      suppressedReason:
        `Interval band could not be computed: degrees of freedom = ${df} ` +
        `(need n > 2) or Sxx = ${sxx} (need non-zero X variance).`,
    };
  }

  // X range: from min observed X to max observed X, with small padding
  const xVals = stats.points.map((p) => p.x);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const padding = (xMax - xMin) * 0.05 || 1;
  const start = xMin - padding;
  const end = xMax + padding;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const x = start + ((end - start) / steps) * i;
    const pred = predictY(x, stats, confidenceLevel);
    points.push({
      x,
      predicted: pred.predicted,
      ciLower: pred.ciLower,
      ciUpper: pred.ciUpper,
      piLower: pred.piLower,
      piUpper: pred.piUpper,
    });
  }

  return {
    points,
    confidenceLevel,
    suppressed: false,
  };
}

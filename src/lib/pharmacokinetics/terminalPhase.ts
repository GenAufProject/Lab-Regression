import { TerminalPhase } from '../../types';
import { calculateSimpleLinearRegression } from '../statistics/linearRegression';

/**
 * Phase 4 — Terminal-phase point selection (spec §15).
 *
 * The terminal elimination phase is the subset of observations used to fit
 * the log-linear regression. For a pure IV bolus one-compartment model,
 * ALL post-distribution observations belong to the terminal phase. For
 * real-world data with distribution/absorption phases, including early
 * non-terminal points biases the slope.
 *
 * Spec §15: "If automated terminal-point selection is implemented, make the
 * algorithm deterministic and document it. Do NOT create a black-box
 * selection algorithm that cannot be explained."
 *
 * This module provides TWO deterministic strategies:
 *
 * 1. 'all-points' — use every valid observation (default; appropriate for
 *    clean educational IV bolus data where the entire curve is terminal).
 *
 * 2. 'best-rsquared-suffix' — try every contiguous suffix of length ≥ 3
 *    from the end of the time-sorted data, and pick the one with the
 *    highest R² on the log-linear fit. This is the simplest deterministic
 *    "best suffix" approach and is fully explainable: "we tried every
 *    suffix from the end and picked the one with the best linear fit on
 *    the log scale."
 *
 * Both strategies are deterministic (no randomness, no iteration-dependent
 * state) and produce a TerminalPhase object with a human-readable
 * explanation that can be displayed directly in the UI.
 *
 * Spec §34: no rounding.
 */

export type TerminalPhaseStrategy = 'all-points' | 'best-rsquared-suffix';

export interface SelectTerminalPhaseOptions {
  strategy?: TerminalPhaseStrategy;
  /** Minimum number of points required for a terminal-phase regression. */
  minPoints?: number;
  /** Log base for the transformation (used in the explanation string). */
  logBase: 'ln' | 'log10';
}

/**
 * Selects the terminal-phase points for log-linear regression.
 *
 * The input `data` must already be filtered to valid (finite, positive C)
 * observations. The function does NOT re-validate; it assumes the caller
 * has already produced clean data.
 */
export function selectTerminalPhase(
  data: { id: string; time: number; concentration: number }[],
  options: SelectTerminalPhaseOptions
): TerminalPhase {
  const strategy = options.strategy ?? 'all-points';
  const minPoints = options.minPoints ?? 3;
  const { logBase } = options;

  if (data.length < minPoints) {
    // Fall back to all points if we don't have enough for the suffix strategy.
    // (The caller's validation should have caught n < 2, but we still need
    // to return a defensible TerminalPhase object here.)
    return buildAllPointsPhase(data, logBase, `Insufficient data for ${strategy} selection (n=${data.length} < min=${minPoints}); using all points.`);
  }

  if (strategy === 'all-points') {
    return buildAllPointsPhase(data, logBase);
  }

  // 'best-rsquared-suffix': try every suffix [i..n-1] for i in 0..n-minPoints
  // and pick the one with the highest R² on the log-linear fit.
  const n = data.length;
  let bestStart = 0;
  let bestRSquared = -Infinity;
  let bestRSquaredFallback = -Infinity; // for comparison if all regressions fail

  for (let start = 0; start <= n - minPoints; start++) {
    const subset = data.slice(start);
    const transformed = subset.map((p) => ({
      id: p.id,
      x: p.time,
      y: logBase === 'ln' ? Math.log(p.concentration) : Math.log10(p.concentration),
    }));
    const reg = calculateSimpleLinearRegression(transformed);
    if (reg.status === 'success') {
      if (reg.stats.rSquared > bestRSquared) {
        bestRSquared = reg.stats.rSquared;
        bestStart = start;
      }
      bestRSquaredFallback = Math.max(bestRSquaredFallback, reg.stats.rSquared);
    }
  }

  // If no suffix produced a successful regression (e.g. all subsets have zero
  // variance in X), fall back to all points.
  if (!isFinite(bestRSquared)) {
    return buildAllPointsPhase(data, logBase, 'best-rsquared-suffix selection failed (no valid regression on any suffix); using all points.');
  }

  const selectedIndices: number[] = [];
  for (let i = bestStart; i < n; i++) selectedIndices.push(i);

  // Recompute R² for the selected subset (it equals bestRSquared, but
  // recompute for clarity and to avoid floating-point drift).
  const selectedData = data.slice(bestStart);
  const transformed = selectedData.map((p) => ({
    id: p.id,
    x: p.time,
    y: logBase === 'ln' ? Math.log(p.concentration) : Math.log10(p.concentration),
  }));
  const reg = calculateSimpleLinearRegression(transformed);
  const rSquared = reg.status === 'success' ? reg.stats.rSquared : NaN;

  return {
    selectedIndices,
    pointCount: selectedIndices.length,
    timeRange: {
      start: selectedData[0].time,
      end: selectedData[selectedData.length - 1].time,
    },
    method: 'best-rsquared-suffix',
    explanation:
      `Selected the contiguous suffix of ${selectedIndices.length} point(s) ` +
      `(from t=${selectedData[0].time} to t=${selectedData[selectedData.length - 1].time}) ` +
      `that produces the highest R² on the ${logBase}(C) vs t regression. ` +
      `This deterministic approach tries every suffix from the end of the time-sorted data ` +
      `and picks the one with the best linear fit on the log scale, ensuring that early ` +
      `distribution/absorption-phase points do not bias the elimination slope.`,
    rSquared,
  };
}

function buildAllPointsPhase(
  data: { id: string; time: number; concentration: number }[],
  logBase: 'ln' | 'log10',
  note?: string
): TerminalPhase {
  const selectedIndices = data.map((_, i) => i);
  const transformed = data.map((p) => ({
    id: p.id,
    x: p.time,
    y: logBase === 'ln' ? Math.log(p.concentration) : Math.log10(p.concentration),
  }));
  const reg = calculateSimpleLinearRegression(transformed);
  const rSquared = reg.status === 'success' ? reg.stats.rSquared : NaN;
  return {
    selectedIndices,
    pointCount: selectedIndices.length,
    timeRange: {
      start: data[0]?.time ?? 0,
      end: data[data.length - 1]?.time ?? 0,
    },
    method: 'all-points',
    explanation:
      (note ? note + ' ' : '') +
      `Using all ${selectedIndices.length} valid observation(s) ` +
      `(from t=${data[0]?.time ?? 0} to t=${data[data.length - 1]?.time ?? 0}) ` +
      `for the terminal-phase regression. Appropriate for clean IV bolus data where ` +
      `the entire post-dose curve follows mono-exponential elimination.`,
    rSquared,
  };
}

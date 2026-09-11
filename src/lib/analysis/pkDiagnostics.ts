import { PKAnalysisSuccess, TerminalPhaseSensitivityResult, TerminalPhaseSensitivityEntry } from '../../types';
import { analyzeFirstOrderElimination } from '../pharmacokinetics/pkAnalysis';

/**
 * Phase 6 — PK Diagnostics Engine (spec §14-§18).
 *
 * CRITICAL (spec §14): "Reuse PK regression, transformation engine, AUC engine,
 * terminal-phase logic. Do NOT rebuild PK calculations."
 *
 * This module adds:
 *   - Terminal-phase sensitivity analysis (spec §16)
 *   - Enhanced AUC reporting (spec §17)
 *
 * Spec §16: "Do not automatically choose a terminal phase solely because it
 * maximizes R². High R² alone does not prove the true terminal phase."
 */

/**
 * Computes terminal-phase sensitivity: how k, t½, R², and intercept change
 * when different numbers of terminal points (last 3, 4, 5, ...) are used.
 *
 * This is an EDUCATIONAL diagnostic — it shows the user how sensitive the
 * PK parameters are to the terminal-phase selection. It does NOT auto-select.
 *
 * @param data  The full concentration-time dataset (time-sorted internally).
 * @param logBase  'ln' or 'log10'.
 * @param minPoints  Minimum terminal points (default 3).
 * @param maxPoints  Maximum terminal points to try (default = n).
 */
export function computeTerminalPhaseSensitivity(
  data: { id?: string; time: number; concentration: number }[],
  logBase: 'ln' | 'log10' = 'ln',
  minPoints: number = 3,
  maxPoints?: number
): TerminalPhaseSensitivityResult {
  // Sort by time ascending (defensive copy)
  const sorted = [...data]
    .map((d, i) => ({ id: d.id || `pt-${i + 1}`, time: d.time, concentration: d.concentration }))
    .sort((a, b) => a.time - b.time);

  const n = sorted.length;
  const maxPts = Math.min(maxPoints ?? n, n);
  const entries: TerminalPhaseSensitivityEntry[] = [];

  for (let count = minPoints; count <= maxPts; count++) {
    // Take the last `count` points
    const subset = sorted.slice(n - count);
    const result = analyzeFirstOrderElimination(subset, {
      logBase,
      terminalPhaseStrategy: 'all-points',
    });

    if (result.status === 'success') {
      entries.push({
        pointCount: count,
        timeRange: {
          start: subset[0].time,
          end: subset[subset.length - 1].time,
        },
        slope: result.regression.slope,
        intercept: result.regression.intercept,
        k: result.regression.eliminationRateConstant,
        halfLife: result.regression.halfLife,
        rSquared: result.regression.rSquared,
      });
    }
  }

  return {
    entries,
    caveat:
      'This sensitivity analysis shows how k, t½, and R² change with different terminal-phase ' +
      'point counts. HIGH R² ALONE DOES NOT PROVE that a set of points represents the true ' +
      'terminal elimination phase. Terminal-phase selection should consider pharmacokinetic ' +
      'context, residual patterns, and the biological plausibility of the elimination model. ' +
      'Do not automatically select the phase with the highest R².',
  };
}

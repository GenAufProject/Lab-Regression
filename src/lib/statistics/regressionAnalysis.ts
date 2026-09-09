import { DataPoint, LogBase, RegressionMode, RegressionResult } from '../../types';
import { calculateSimpleLinearRegression } from './linearRegression';
import { analyzeLogRegression } from './logRegression';
import type { LogRegressionAnalysis } from '../../types';

/**
 * Phase 3 — Unified regression analysis dispatcher (spec §3).
 *
 * This is the single entry point the UI should call when the user selects
 * a regression mode. It dispatches to either:
 *   - linear mode  → Phase 2 calculateSimpleLinearRegression (unchanged)
 *   - log-linear mode → Phase 3 analyzeLogRegression (reuses OLS internally)
 *
 * Spec §30: React components must NOT contain statistical formulas. This
 * dispatcher centralizes the choice so that UI components never branch on
 * the regression type themselves — they just call this function and render
 * the result.
 *
 * Spec §6: "Do NOT implement a separate alternative regression algorithm
 * unless mathematically necessary." The log-linear branch reuses the OLS
 * engine; no duplicate regression algorithm exists.
 */
export type UnifiedRegressionAnalysis =
  | {
      status: 'success';
      mode: RegressionMode;
      /** Present when mode = 'linear'. */
      linear?: RegressionResult;
      /** Present when mode = 'log-linear'. */
      log?: LogRegressionAnalysis;
    }
  | {
      status: 'error';
      mode: RegressionMode;
      message: string;
      /** Original structured error from the underlying engine. */
      cause?: unknown;
    };

export interface UnifiedAnalysisOptions {
  mode: RegressionMode;
  /** Required when mode = 'log-linear'. Ignored for linear mode. */
  logBase?: LogBase;
  confidenceLevel?: number;
  xLabel?: string;
  yLabel?: string;
}

/**
 * Runs the appropriate regression analysis based on the selected mode.
 *
 * For linear mode: returns the Phase 2 RegressionResult directly.
 * For log-linear mode: returns the Phase 3 LogRegressionAnalysis.
 *
 * Both success and error results are typed and structured; the UI never
 * has to catch exceptions or test for null/undefined (spec §33).
 */
export function analyzeRegression(
  data: { id?: string; x: number; y: number }[],
  options: UnifiedAnalysisOptions
): UnifiedRegressionAnalysis {
  const { mode, logBase, confidenceLevel = 0.95, xLabel = 'X', yLabel = 'Y' } = options;

  if (mode === 'linear') {
    const result = calculateSimpleLinearRegression(
      data as { x: number; y: number; id?: string }[],
      confidenceLevel
    );
    if (result.status === 'success') {
      return { status: 'success', mode: 'linear', linear: result };
    }
    return {
      status: 'error',
      mode: 'linear',
      message: result.error.message,
      cause: result.error,
    };
  }

  // log-linear mode
  if (logBase !== 'ln' && logBase !== 'log10') {
    return {
      status: 'error',
      mode: 'log-linear',
      message:
        'Log-linear mode requires a logBase of "ln" or "log10". ' +
        'Do not pass "sqrt" or "none" — those are not log-regression modes (spec §24).',
    };
  }

  const result = analyzeLogRegression(data, logBase, { confidenceLevel, xLabel, yLabel });
  if (result.status === 'success') {
    return { status: 'success', mode: 'log-linear', log: result };
  }
  return {
    status: 'error',
    mode: 'log-linear',
    message: result.error.message,
    cause: result.error,
  };
}

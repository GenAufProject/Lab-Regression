import { DataPoint, ModelComparisonEntry, ModelComparisonResult } from '../../types';
import { calculateSimpleLinearRegression } from '../statistics/linearRegression';
import { transformDataset } from '../statistics/transformations';
import { backTransformPrediction } from '../statistics/transformations';
import { formatNumber } from '../statistics/formatting';

/**
 * Phase 6 — Model Comparison Engine (spec §12, §13).
 *
 * CRITICAL (spec §12): "Do NOT compare R² values blindly across fundamentally
 * different response scales." Each model entry explicitly labels the scale
 * on which R² is computed.
 *
 * Compares:
 *   - Linear (identity): Y vs X
 *   - ln(Y) vs X (if all Y > 0)
 *   - log10(Y) vs X (if all Y > 0)
 *
 * Uses the existing Phase 2 OLS engine for each fit — no duplicate math.
 * Uses the existing Phase 3 transformation engine for ln/log10 — no duplicate
 * transformation logic.
 */

/**
 * Compares linear, ln, and log10 models on the same dataset.
 */
export function compareModels(
  data: { x: number; y: number; id?: string }[],
  xLabel: string = 'X',
  yLabel: string = 'Y'
): ModelComparisonResult {
  const models: ModelComparisonEntry[] = [];

  // ---- Model 1: Linear (identity) ----
  const linearResult = calculateSimpleLinearRegression(data);
  if (linearResult.status === 'success') {
    const s = linearResult.stats;
    models.push({
      modelId: 'linear',
      modelName: 'Linear (no transform)',
      transformation: 'none',
      rSquaredScale: 'original-Y',
      rSquared: s.rSquared,
      adjustedRSquared: s.adjustedRSquared ?? s.rSquared,
      residualStandardError: s.residualStandardError ?? s.rmse,
      rmse: s.predictionRMSE ?? Math.sqrt(s.sse / s.n),
      slope: s.slope,
      intercept: s.intercept,
      n: s.n,
      domainValid: true,
      equation: `${yLabel} = ${formatNumber(s.intercept, 4)} ${s.slope >= 0 ? '+' : '−'} ${formatNumber(Math.abs(s.slope), 4)}·${xLabel}`,
      interpretabilityNote:
        'Slope = additive change in Y per unit X. Intercept = predicted Y at X = 0. ' +
        'Most directly interpretable when the relationship is genuinely linear.',
    });
  }

  // ---- Model 2: ln(Y) ----
  const lnResult = transformDataset(
    data.map((d, i) => ({ id: d.id || `pt-${i + 1}`, x: d.x, y: d.y })),
    'none',
    'ln'
  );
  if (lnResult.status === 'success') {
    const reg = calculateSimpleLinearRegression(lnResult.transformedPoints);
    if (reg.status === 'success') {
      const s = reg.stats;
      // Back-transformed RMSE on original scale (approximate — median prediction)
      const rmseOriginal = computeOriginalScaleRMSE(data, s, 'ln');
      models.push({
        modelId: 'ln-linear',
        modelName: 'Log-Linear: ln(Y)',
        transformation: 'ln',
        rSquaredScale: 'ln(Y)',
        rSquared: s.rSquared,
        adjustedRSquared: s.adjustedRSquared ?? s.rSquared,
        residualStandardError: s.residualStandardError ?? s.rmse,
        rmse: s.predictionRMSE ?? Math.sqrt(s.sse / s.n),
        rmseOriginalScale: rmseOriginal,
        slope: s.slope,
        intercept: s.intercept,
        n: s.n,
        domainValid: true,
        equation: `ln(${yLabel}) = ${formatNumber(s.intercept, 4)} ${s.slope >= 0 ? '+' : '−'} ${formatNumber(Math.abs(s.slope), 4)}·${xLabel}`,
        backTransformedEquation: `${yLabel} = ${formatNumber(Math.exp(s.intercept), 4)} · e^(${formatNumber(s.slope, 4)}·${xLabel})`,
        interpretabilityNote:
          'Slope = multiplicative rate of change. exp(slope) = factor by which Y changes per unit X. ' +
          'Appropriate for exponential growth/decay. R² is on the ln(Y) scale — do NOT directly compare to linear R².',
      });
    }
  } else {
    models.push({
      modelId: 'ln-linear',
      modelName: 'Log-Linear: ln(Y)',
      transformation: 'ln',
      rSquaredScale: 'ln(Y)',
      rSquared: NaN,
      adjustedRSquared: NaN,
      residualStandardError: NaN,
      rmse: NaN,
      slope: NaN,
      intercept: NaN,
      n: data.length,
      domainValid: false,
      domainError: lnResult.message,
      equation: 'Cannot fit — domain violation',
      interpretabilityNote: 'Requires all Y > 0.',
    });
  }

  // ---- Model 3: log10(Y) ----
  const log10Result = transformDataset(
    data.map((d, i) => ({ id: d.id || `pt-${i + 1}`, x: d.x, y: d.y })),
    'none',
    'log10'
  );
  if (log10Result.status === 'success') {
    const reg = calculateSimpleLinearRegression(log10Result.transformedPoints);
    if (reg.status === 'success') {
      const s = reg.stats;
      const rmseOriginal = computeOriginalScaleRMSE(data, s, 'log10');
      models.push({
        modelId: 'log10-linear',
        modelName: 'Log-Linear: log₁₀(Y)',
        transformation: 'log10',
        rSquaredScale: 'log10(Y)',
        rSquared: s.rSquared,
        adjustedRSquared: s.adjustedRSquared ?? s.rSquared,
        residualStandardError: s.residualStandardError ?? s.rmse,
        rmse: s.predictionRMSE ?? Math.sqrt(s.sse / s.n),
        rmseOriginalScale: rmseOriginal,
        slope: s.slope,
        intercept: s.intercept,
        n: s.n,
        domainValid: true,
        equation: `log₁₀(${yLabel}) = ${formatNumber(s.intercept, 4)} ${s.slope >= 0 ? '+' : '−'} ${formatNumber(Math.abs(s.slope), 4)}·${xLabel}`,
        backTransformedEquation: `${yLabel} = ${formatNumber(Math.pow(10, s.intercept), 4)} · 10^(${formatNumber(s.slope, 4)}·${xLabel})`,
        interpretabilityNote:
          'Slope differs from ln model by factor 1/ln(10) ≈ 0.434. 10^slope = multiplicative factor. ' +
          'R² is identical to ln model (within float tolerance) but on the log10(Y) scale.',
      });
    }
  } else {
    models.push({
      modelId: 'log10-linear',
      modelName: 'Log-Linear: log₁₀(Y)',
      transformation: 'log10',
      rSquaredScale: 'log10(Y)',
      rSquared: NaN,
      adjustedRSquared: NaN,
      residualStandardError: NaN,
      rmse: NaN,
      slope: NaN,
      intercept: NaN,
      n: data.length,
      domainValid: false,
      domainError: log10Result.message,
      equation: 'Cannot fit — domain violation',
      interpretabilityNote: 'Requires all Y > 0.',
    });
  }

  return {
    models,
    comparisonCaveat:
      'IMPORTANT: R² values are computed on DIFFERENT response scales (original Y, ln(Y), log10(Y)). ' +
      'Do NOT directly compare R² across models with different transformations — a higher R² on the ln(Y) ' +
      'scale does NOT automatically mean the ln model is "better" on the original scale. ' +
      'Model selection should consider residual patterns, scientific meaning, transformation assumptions, ' +
      'error structure, and interpretability — not just R².',
  };
}

/**
 * Computes an approximate RMSE on the original Y scale by back-transforming
 * predictions and comparing to observed Y. This is for comparison only —
 * it is NOT the same as the transformed-scale RMSE.
 */
function computeOriginalScaleRMSE(
  data: { x: number; y: number }[],
  stats: { slope: number; intercept: number; n: number },
  logBase: 'ln' | 'log10'
): number {
  let sumSq = 0;
  for (const pt of data) {
    const zPred = stats.intercept + stats.slope * pt.x;
    const yPred = backTransformPrediction(zPred, logBase);
    sumSq += Math.pow(pt.y - yPred, 2);
  }
  return Math.sqrt(sumSq / stats.n);
}

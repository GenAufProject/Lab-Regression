import { RegressionStatistics, ResidualDiagnosticsResult, ResidualPattern } from '../../types';

/**
 * Phase 6 — Residual Diagnostics Engine (spec §8, §9).
 *
 * Consumes the Phase 2 RegressionStatistics (which already has residuals,
 * studentized residuals, and fitted values on every RegressionPoint).
 *
 * Produces:
 *   - Residual pattern classification (random / curvature / heteroscedasticity)
 *   - Q-Q plot data (theoretical normal quantiles vs ordered residuals)
 *   - Histogram bins
 *   - Scale-location plot data
 *   - Educational interpretation (cautious language — spec §9, §28)
 *
 * Spec §28: "A residual plot should be interpreted for patterns, not used as
 * absolute proof." The classification is educational, not definitive.
 * Spec §9: interpretations use "may indicate", "is consistent with", etc.
 */

/**
 * Classifies the residual pattern and generates diagnostic plot data.
 */
export function computeResidualDiagnostics(
  stats: RegressionStatistics
): ResidualDiagnosticsResult {
  const points = stats.points;
  const n = points.length;

  if (n < 5) {
    return {
      pattern: 'insufficient-data',
      patternDescription:
        'Too few observations to classify residual patterns. At least 5 points are needed for meaningful pattern detection.',
      residualSum: 0,
      residualMean: 0,
      maxAbsResidual: 0,
      maxAbsStudentizedResidual: 0,
      qqPlotData: [],
      histogramBins: [],
      scaleLocationData: [],
      interpretation:
        'Insufficient data for residual pattern analysis. Collect more observations.',
    };
  }

  // ---- Residual summaries ----
  let residualSum = 0;
  let maxAbsResidual = 0;
  let maxAbsStudentizedResidual = 0;
  for (const pt of points) {
    residualSum += pt.residual;
    maxAbsResidual = Math.max(maxAbsResidual, Math.abs(pt.residual));
    maxAbsStudentizedResidual = Math.max(
      maxAbsStudentizedResidual,
      Math.abs(pt.studentizedResidual ?? 0)
    );
  }
  const residualMean = residualSum / n;

  // ---- Pattern classification ----
  const pattern = classifyPattern(stats);
  const patternDescription = describePattern(pattern);
  const interpretation = buildInterpretation(pattern, stats);

  // ---- Q-Q plot data ----
  const qqPlotData = buildQQPlotData(points);

  // ---- Histogram bins ----
  const histogramBins = buildHistogramBins(points, 7);

  // ---- Scale-location data ----
  const scaleLocationData = points.map((pt) => ({
    fitted: pt.predicted,
    sqrtAbsStdResidual: Math.sqrt(Math.abs(pt.studentizedResidual ?? 0)),
  }));

  return {
    pattern,
    patternDescription,
    residualSum,
    residualMean,
    maxAbsResidual,
    maxAbsStudentizedResidual,
    qqPlotData,
    histogramBins,
    scaleLocationData,
    interpretation,
  };
}

// ===========================================================================
// Pattern classification (educational, cautious — spec §9, §28)
// ===========================================================================

function classifyPattern(stats: RegressionStatistics): ResidualPattern {
  const points = stats.points;
  const n = points.length;
  if (n < 5) return 'insufficient-data';

  // Curvature check: correlate residuals with (x - x̄)²
  let sumProd = 0;
  let sumDevSq = 0;
  for (const pt of points) {
    const xDev = pt.x - stats.meanX;
    const xDevSq = xDev * xDev;
    sumProd += pt.residual * xDevSq;
    sumDevSq += xDevSq * xDevSq;
  }
  const curvatureRatio =
    sumDevSq > 0 && stats.sse > 0
      ? Math.abs(sumProd) / Math.sqrt(sumDevSq * stats.sse)
      : 0;
  const hasCurvature = curvatureRatio > 0.45 && n >= 5;

  // Heteroscedasticity check: compare |residual| in first half vs second half of fitted
  const sorted = [...points].sort((a, b) => a.predicted - b.predicted);
  const mid = Math.floor(n / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const meanAbsFirst =
    firstHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) /
    Math.max(1, firstHalf.length);
  const meanAbsSecond =
    secondHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) /
    Math.max(1, secondHalf.length);
  const ratio =
    meanAbsFirst > 0 && meanAbsSecond > 0
      ? Math.max(meanAbsFirst / meanAbsSecond, meanAbsSecond / meanAbsFirst)
      : 1;
  const hasHeteroscedasticity = ratio > 2.2 && n >= 8;

  if (hasCurvature) return 'curvature';
  if (hasHeteroscedasticity) return 'heteroscedasticity';
  return 'random';
}

function describePattern(pattern: ResidualPattern): string {
  switch (pattern) {
    case 'random':
      return 'Random scatter around zero';
    case 'curvature':
      return 'Systematic curved pattern (possible non-linearity)';
    case 'heteroscedasticity':
      return 'Increasing or decreasing spread (possible non-constant variance)';
    case 'insufficient-data':
      return 'Insufficient data for pattern classification';
  }
}

function buildInterpretation(pattern: ResidualPattern, stats: RegressionStatistics): string {
  const r2Pct = (stats.rSquared * 100).toFixed(1);
  switch (pattern) {
    case 'random':
      return (
        `Residuals appear relatively pattern-free, which is generally consistent with ` +
        `an adequate linear functional form. R² = ${r2Pct}% of variance is explained by the linear model. ` +
        `Note: a random residual pattern does not PROVE the model is correct — it only means ` +
        `no obvious pattern was detected.`
      );
    case 'curvature':
      return (
        `A systematic curved pattern may indicate that a linear model does not adequately ` +
        `represent the relationship. Consider a log transformation of Y (for exponential curvature) ` +
        `or a polynomial term. R² = ${r2Pct}% — despite the curvature, the linear fit explains ` +
        `substantial variance, but this does not confirm linearity.`
      );
    case 'heteroscedasticity':
      return (
        `Increasing residual spread may indicate non-constant variance (heteroscedasticity). ` +
        `OLS standard errors may be biased. A log transformation often stabilizes variance that ` +
        `grows proportionally with the mean. R² = ${r2Pct}% — the fit is explanatory but ` +
        `inferential statistics should be interpreted cautiously.`
      );
    case 'insufficient-data':
      return `Insufficient data for meaningful residual pattern analysis.`;
  }
}

// ===========================================================================
// Q-Q plot data (normal quantiles vs ordered residuals)
// ===========================================================================

/**
 * Computes theoretical normal quantiles for the Q-Q plot.
 * Uses the Blom approximation: z_i = Φ⁻¹((i − 3/8) / (n + 1/4))
 */
function buildQQPlotData(
  points: { residual: number; studentizedResidual?: number }[]
): { theoretical: number; observed: number; index: number }[] {
  const n = points.length;
  if (n < 3) return [];

  // Sort studentized residuals ascending
  const sorted = [...points]
    .map((p, idx) => ({
      value: p.studentizedResidual ?? p.residual,
      originalIndex: idx,
    }))
    .sort((a, b) => a.value - b.value);

  return sorted.map((item, i) => {
    // Blom approximation for normal quantile
    const p = (i + 1 - 0.375) / (n + 0.25);
    const theoretical = inverseNormalCDF(p);
    return {
      theoretical,
      observed: item.value,
      index: item.originalIndex,
    };
  });
}

/**
 * Inverse normal CDF (Acklam's algorithm) — reused from Phase 2 invNorm.
 * Simplified copy for the analysis module (avoids cross-module import).
 */
function inverseNormalCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// ===========================================================================
// Histogram bins
// ===========================================================================

function buildHistogramBins(
  points: { residual: number }[],
  binCount: number
): { binStart: number; binEnd: number; count: number }[] {
  const residuals = points.map((p) => p.residual);
  const min = Math.min(...residuals);
  const max = Math.max(...residuals);
  if (min === max) {
    return [{ binStart: min - 0.5, binEnd: max + 0.5, count: residuals.length }];
  }
  const binWidth = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0,
  }));
  for (const r of residuals) {
    let idx = Math.floor((r - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

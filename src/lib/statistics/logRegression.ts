import {
  CalculationStep,
  CoefficientInterpretation,
  DataPoint,
  LogBase,
  LogRegressionAnalysis,
  LogRegressionError,
  LogRegressionPrediction,
  LogRegressionResult,
  RegressionStatistics,
} from '../../types';
import { calculateSimpleLinearRegression, predictY } from './linearRegression';
import {
  backTransformPrediction,
  getLogTransformationMetadata,
  isInDomain,
} from './transformations';

/**
 * Phase 3 — Log-Linear Regression Engine (spec §6).
 *
 * The log-regression engine reuses the existing Phase 2 OLS engine by
 * transforming Y and then fitting a linear regression on the transformed
 * scale. Per spec §6: "Do NOT implement a separate alternative regression
 * algorithm unless mathematically necessary."
 *
 * Flow:
 *   raw (x, y) pairs
 *       ↓ validate Y > 0 (spec §5)
 *       ↓ z = transform(y)  [ln or log10]
 *       ↓ OLS regression of z on x  (Phase 2 engine, unchanged)
 *       ↓ augment with back-transformed predictions, residuals, interpretation
 *       ↓ generate 11-step calculation trace (spec §16)
 *
 * All math runs at full IEEE-754 double precision (spec §34). Rounding is
 * the responsibility of formatting.ts at the presentation layer.
 */

/**
 * Fits a log-linear regression: transform(y) ~ x.
 *
 * Spec §5: domain violations are reported as a structured error listing
 * every offending row (1-indexed for human display), never silent NaNs.
 *
 * Spec §6: reuses calculateSimpleLinearRegression on the transformed scale.
 *
 * Spec §8: produces both transformed-scale and back-transformed equations.
 *
 * Spec §9, §10: produces coefficient interpretation (multiplicative factor,
 * percent change, intercept extrapolation warning).
 *
 * Spec §16: produces the 11-step calculation trace.
 */
export function analyzeLogRegression(
  data: { id?: string; x: number; y: number }[],
  logBase: LogBase,
  options: {
    confidenceLevel?: number;
    xLabel?: string;
    yLabel?: string;
  } = {}
): LogRegressionAnalysis {
  const { confidenceLevel = 0.95, xLabel = 'X', yLabel = 'Y' } = options;

  // ------------------------------------------------------------------
  // Step 1: Validate input — collect ALL domain violations (spec §5)
  // ------------------------------------------------------------------
  if (!data || data.length < 2) {
    return err({
      type: 'INSUFFICIENT_DATA',
      message: `Log-linear regression requires at least 2 valid paired data points. Received ${data?.length ?? 0}.`,
    });
  }

  const invalidRows: NonNullable<LogRegressionError['invalidRows']> = [];
  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    if (!isFinite(pt.x) || !isFinite(pt.y)) {
      invalidRows.push({
        row: i + 1,
        x: pt.x,
        y: pt.y,
        reason: 'Non-finite value (NaN or Infinity)',
      });
      continue;
    }
    if (!isInDomain(pt.y, logBase)) {
      const meta = getLogTransformationMetadata(logBase);
      invalidRows.push({
        row: i + 1,
        x: pt.x,
        y: pt.y,
        reason: `Y = ${pt.y} violates ${meta.displayName} domain (${meta.domainDescription})`,
      });
    }
  }

  if (invalidRows.length > 0) {
    const meta = getLogTransformationMetadata(logBase);
    return err({
      type: 'DOMAIN_ERROR',
      message:
        `Log-linear regression (${meta.displayName}) cannot be calculated.\n\n` +
        `The selected transformation requires Y > 0. ` +
        `${meta.displayName} is undefined for zero and negative values.\n\n` +
        `Invalid observations (${invalidRows.length} total):\n` +
        invalidRows
          .slice(0, 10)
          .map((r) => `  Row ${r.row}: ${r.reason}`)
          .join('\n') +
        (invalidRows.length > 10 ? `\n  … and ${invalidRows.length - 10} more` : ''),
      invalidRows,
    });
  }

  // ------------------------------------------------------------------
  // Step 2: Transform Y and build raw/transformed datasets
  // ------------------------------------------------------------------
  // Filter out only the genuinely non-finite points (domain violations
  // already returned above; here we just guard against NaN/Infinity in X).
  const validPairs: { id: string; x: number; y: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    if (!isFinite(pt.x) || !isFinite(pt.y)) continue; // already reported above
    validPairs.push({
      id: pt.id || `pt-${i + 1}`,
      x: pt.x,
      y: pt.y,
    });
  }

  if (validPairs.length < 2) {
    return err({
      type: 'INSUFFICIENT_DATA',
      message: `After filtering non-finite values, fewer than 2 valid pairs remain.`,
    });
  }

  const meta = getLogTransformationMetadata(logBase);

  // Transformed data: { x: x, y: z = transform(y) }
  const transformedData: DataPoint[] = validPairs.map((pt) => ({
    id: pt.id,
    x: pt.x,
    y: meta.forward(pt.y),
  }));

  // ------------------------------------------------------------------
  // Step 3: Reuse Phase 2 OLS engine on the transformed scale
  // ------------------------------------------------------------------
  const olsResult = calculateSimpleLinearRegression(transformedData, confidenceLevel);
  if (olsResult.status === 'error') {
    // Map OLS error to log-regression error type
    const olsType =
      olsResult.error.type === 'ZERO_VARIANCE_X' ? 'ZERO_VARIANCE_X' : 'INSUFFICIENT_DATA';
    return err({
      type: olsType,
      message: `Underlying OLS regression failed: ${olsResult.error.message}`,
    });
  }

  const regression = olsResult.stats;
  const slope = regression.slope;
  const intercept = regression.intercept;

  // ------------------------------------------------------------------
  // Step 4: Build per-observation prediction rows (spec §11)
  // ------------------------------------------------------------------
  const predictions: LogRegressionPrediction[] = validPairs.map((pt, i) => {
    const zObserved = transformedData[i].y;
    const zPredicted = intercept + slope * pt.x;
    const yPredicted = backTransformPrediction(zPredicted, logBase);
    return {
      id: pt.id,
      x: pt.x,
      yObserved: pt.y,
      yTransformed: zObserved,
      predictedTransformed: zPredicted,
      predictedOriginal: yPredicted,
      residualTransformed: zObserved - zPredicted,
      residualOriginal: pt.y - yPredicted,
    };
  });

  // ------------------------------------------------------------------
  // Step 5: Build equations (spec §8)
  // ------------------------------------------------------------------
  const sign = slope >= 0 ? '+' : '-';
  const absSlope = Math.abs(slope);
  const equationTransformedLatex =
    logBase === 'ln'
      ? `\\ln(${yLabel}) = ${intercept} ${sign} ${absSlope} \\cdot ${xLabel}`
      : `\\log_{10}(${yLabel}) = ${intercept} ${sign} ${absSlope} \\cdot ${xLabel}`;

  const equationOriginalLatex =
    logBase === 'ln'
      ? `${yLabel} = e^{${intercept}} \\cdot e^{${slope} \\cdot ${xLabel}}`
      : `${yLabel} = 10^{${intercept}} \\cdot 10^{${slope} \\cdot ${xLabel}}`;

  // ------------------------------------------------------------------
  // Step 6: Coefficient interpretation (spec §9, §10)
  // ------------------------------------------------------------------
  const interpretation = buildCoefficientInterpretation(
    logBase,
    slope,
    intercept,
    validPairs,
    xLabel,
    yLabel
  );

  // ------------------------------------------------------------------
  // Step 7: 11-step calculation trace (spec §16)
  // ------------------------------------------------------------------
  const calculationTrace = buildCalculationTrace(
    logBase,
    validPairs,
    transformedData,
    regression,
    predictions,
    xLabel,
    yLabel
  );

  // ------------------------------------------------------------------
  // Step 8: Assemble the final result
  // ------------------------------------------------------------------
  const result: LogRegressionResult = {
    logBase,
    rawData: validPairs.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    transformedData,
    regression,
    equationTransformedLatex,
    equationOriginalLatex,
    coefficients: { intercept, slope },
    fit: {
      rSquared: regression.rSquared,
      rSquaredRaw: regression.rSquaredRaw ?? regression.rSquared,
      correlation: regression.r,
      sse: regression.sse,
      rmse: regression.rmse, // deprecated alias
      residualStandardError: regression.residualStandardError ?? regression.rmse,
      predictionRMSE: regression.predictionRMSE ?? Math.sqrt(regression.sse / regression.n),
    },
    predictions,
    calculationTrace,
    interpretation,
    confidenceLevel,
    xLabel,
    yLabel,
  };

  return { status: 'success', result };
}

// ===========================================================================
// Helper: build coefficient interpretation
// ===========================================================================

function buildCoefficientInterpretation(
  logBase: LogBase,
  slope: number,
  intercept: number,
  data: { x: number; y: number }[],
  xLabel: string,
  yLabel: string
): CoefficientInterpretation {
  const meta = getLogTransformationMetadata(logBase);

  // Multiplicative factor per 1-unit increase in X
  //   ln model:  exp(b)
  //   log10 model: 10^b
  const multiplicativeFactor = meta.inverse(slope);
  const percentChangePerUnitX = (multiplicativeFactor - 1) * 100;

  // Predicted Y at X = 0 (back-transformed intercept)
  const predictedYAtX0 = meta.inverse(intercept);

  // Determine whether X = 0 lies outside the observed X range
  const xMin = Math.min(...data.map((p) => p.x));
  const xMax = Math.max(...data.map((p) => p.x));
  const x0OutsideObservedRange = 0 < xMin || 0 > xMax;

  // Build narratives (spec §9: must explicitly state slope is on transformed scale)
  const factorStr = formatFactor(multiplicativeFactor);
  const pctStr = formatPercent(percentChangePerUnitX);

  const slopeNarrative =
    `A slope of ${slope.toFixed(4)} in the ${meta.displayName} model ` +
    `${logBase === 'ln' ? '\\ln' : '\\log_{10}'}(${yLabel}) = a + b \\cdot ${xLabel} ` +
    `corresponds to a multiplicative factor of ${factorStr} per one-unit increase in ${xLabel}. ` +
    `That is, for every 1-unit increase in ${xLabel}, ${yLabel} is multiplied by ${factorStr} ` +
    `(approximately ${pctStr} change on the original scale). ` +
    `The slope itself is interpreted on the transformed (${logBase}) response scale, not directly on the original Y scale.`;

  const interceptNarrative = x0OutsideObservedRange
    ? `The model predicts ${yLabel} ≈ ${formatFactor(predictedYAtX0)} at ${xLabel} = 0 ` +
      `(via back-transformation: ${meta.inverseNotationLatex} with intercept a = ${intercept.toFixed(4)}). ` +
      `Interpretation should be cautious because ${xLabel} = 0 is outside the observed range [${xMin}, ${xMax}]. ` +
      `The intercept is an extrapolation, not an interpolation.`
    : `The model predicts ${yLabel} ≈ ${formatFactor(predictedYAtX0)} at ${xLabel} = 0 ` +
      `(via back-transformation: ${meta.inverseNotationLatex} with intercept a = ${intercept.toFixed(4)}). ` +
      `Since ${xLabel} = 0 lies within the observed range [${xMin}, ${xMax}], this is an interpolation and may be scientifically meaningful.`;

  return {
    logBase,
    multiplicativeFactor,
    percentChangePerUnitX,
    predictedYAtX0,
    x0OutsideObservedRange,
    slopeNarrative,
    interceptNarrative,
  };
}

/**
 * Format a multiplicative factor for human-readable narrative.
 * Uses up to 4 significant digits; falls back to exponential for extreme values.
 * NOTE: this is for narrative strings only; numeric fields preserve full precision.
 */
function formatFactor(v: number): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return v.toExponential(4);
  }
  return v.toFixed(4);
}

function formatPercent(v: number): string {
  if (!isFinite(v)) return v > 0 ? '+∞%' : '−∞%';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

// ===========================================================================
// Helper: build 11-step calculation trace (spec §16)
// ===========================================================================

function buildCalculationTrace(
  logBase: LogBase,
  rawData: { id: string; x: number; y: number }[],
  transformedData: DataPoint[],
  regression: RegressionStatistics,
  predictions: LogRegressionPrediction[],
  xLabel: string,
  yLabel: string
): CalculationStep[] {
  const n = regression.n;
  const meanX = regression.meanX;
  const meanZ = regression.meanY; // mean of transformed Y
  const sxx = regression.sxx;
  const sxz = regression.sxy;
  const slope = regression.slope;
  const intercept = regression.intercept;
  const sse = regression.sse;
  const r2 = regression.rSquared;
  const logNotation = logBase === 'ln' ? '\\ln' : '\\log_{10}';
  const backNotation = logBase === 'ln' ? 'e' : '10';

  const steps: CalculationStep[] = [];

  // Step 1 — Raw data
  steps.push({
    step: 1,
    title: 'Raw Data',
    description: `We start with n = ${n} paired observations (${xLabel}, ${yLabel}).`,
    formulaLatex: `\\{(x_1, y_1), (x_2, y_2), \\ldots, (x_n, y_n)\\}`,
    result: `n = ${n}`,
  });

  // Step 2 — Transformation
  steps.push({
    step: 2,
    title: `Transform Y: z = ${logNotation}(${yLabel})`,
    description:
      `Apply the ${logBase === 'ln' ? 'natural logarithm' : 'common logarithm (base 10)'} ` +
      `to each observed Y. The transformation requires Y > 0 (spec §5). ` +
      `After transformation, an exponential curve becomes linear: ` +
      (logBase === 'ln'
        ? `if ${yLabel} = ${yLabel}_0 e^{-k ${xLabel}}, then \\ln ${yLabel} = \\ln ${yLabel}_0 - k ${xLabel}.`
        : `if ${yLabel} = ${yLabel}_0 e^{-k ${xLabel}}, then \\log_{10} ${yLabel} = \\log_{10} ${yLabel}_0 - (k/\\ln 10) ${xLabel}.`),
    formulaLatex: `z_i = ${logNotation}(y_i)`,
    result: `Transformed ${n} values of ${yLabel} to ${logBase}(${yLabel}).`,
  });

  // Step 3 — Means
  steps.push({
    step: 3,
    title: 'Calculate Means',
    description:
      `Compute the mean of X and the mean of the transformed Y (z = ${logBase}(${yLabel})). ` +
      `The regression line on the transformed scale is guaranteed to pass through (x̄, z̄).`,
    formulaLatex:
      `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${regression.sumX}}{${n}} = ${meanX}, \\quad ` +
      `\\bar{z} = \\frac{\\sum z_i}{n} = ${meanZ}`,
    result: `x̄ = ${meanX}, z̄ = ${meanZ}`,
  });

  // Step 4 — Deviations
  steps.push({
    step: 4,
    title: 'Calculate Deviations from Means',
    description:
      `Subtract the mean from each X and each transformed Y. ` +
      `Σ(x_i − x̄) = 0 and Σ(z_i − z̄) = 0 are OLS invariants.`,
    formulaLatex: `d_{x_i} = x_i - \\bar{x}, \\quad d_{z_i} = z_i - \\bar{z}`,
    result: 'Deviations computed for every observation row.',
  });

  // Step 5 — Sxx
  steps.push({
    step: 5,
    title: 'Sum of Squared X Deviations (Sxx)',
    description: 'The denominator of the slope formula on the transformed scale.',
    formulaLatex: `S_{xx} = \\sum_{i=1}^{n} (x_i - \\bar{x})^2 = ${sxx}`,
    result: `Sxx = ${sxx}`,
  });

  // Step 6 — Sxz
  steps.push({
    step: 6,
    title: 'Sum of Cross-Products (Sxz)',
    description:
      `The numerator of the slope formula: covariance of X and z = ${logBase}(${yLabel}).`,
    formulaLatex: `S_{xz} = \\sum_{i=1}^{n} (x_i - \\bar{x})(z_i - \\bar{z}) = ${sxz}`,
    result: `Sxz = ${sxz}`,
  });

  // Step 7 — Slope
  steps.push({
    step: 7,
    title: `Slope on Transformed Scale (b)`,
    description:
      `b = Sxz / Sxx. This is the rate of change of ${logBase}(${yLabel}) per unit increase in ${xLabel}. ` +
      (logBase === 'ln'
        ? `For PK: k = −b.`
        : `For PK: k = −b × ln(10) ≈ −2.303 × b.`),
    formulaLatex: `b = \\frac{S_{xz}}{S_{xx}} = \\frac{${sxz}}{${sxx}} = ${slope}`,
    result: `b = ${slope}`,
  });

  // Step 8 — Intercept
  steps.push({
    step: 8,
    title: 'Intercept on Transformed Scale (a)',
    description:
      `a = z̄ − b·x̄. ` +
      (logBase === 'ln'
        ? `For PK: C₀ = e^a.`
        : `For PK: C₀ = 10^a.`),
    formulaLatex: `a = \\bar{z} - b \\bar{x} = ${meanZ} - (${slope})(${meanX}) = ${intercept}`,
    result: `a = ${intercept}`,
  });

  // Step 9 — Predictions (transformed scale)
  steps.push({
    step: 9,
    title: 'Predicted Transformed Values',
    description: `ẑ_i = a + b·x_i — the fitted regression line on the transformed scale.`,
    formulaLatex: `\\hat{z}_i = a + b x_i = ${intercept} + ${slope} \\cdot x_i`,
    result: `Predictions computed for all ${n} observations.`,
  });

  // Step 10 — Residuals (transformed scale)
  steps.push({
    step: 10,
    title: 'Transformed-Scale Residuals',
    description:
      `e_i = z_i − ẑ_i. These are the residuals OLS actually minimizes. ` +
      `Spec §12: do not confuse with original-scale prediction differences (y_i − ŷ_i).`,
    formulaLatex: `e_i = z_i - \\hat{z}_i, \\quad SSE = \\sum e_i^2 = ${sse}`,
    result: `SSE (transformed scale) = ${sse}`,
  });

  // Step 11 — Back-transformation
  steps.push({
    step: 11,
    title: 'Back-Transform to Original Scale',
    description:
      `ŷ_i = ${backNotation}^{ẑ_i} recovers the predicted Y on the original scale. ` +
      `Note: the back-transformed prediction is the *median* prediction on the original scale; ` +
      `the *mean* prediction differs due to Jensen's inequality (a bias-correction method such as ` +
      `Duan's smearing factor would be needed for an unbiased mean estimate).`,
    formulaLatex:
      logBase === 'ln'
        ? `\\hat{y}_i = e^{\\hat{z}_i} = e^{a + b x_i} = e^{a} \\cdot e^{b x_i}`
        : `\\hat{y}_i = 10^{\\hat{z}_i} = 10^{a + b x_i} = 10^{a} \\cdot 10^{b x_i}`,
    result:
      `R² (transformed scale) = ${r2}  |  ` +
      `Multiplicative factor per unit X = ${logBase === 'ln' ? 'e^b' : '10^b'} = ${backTransformPrediction(slope, logBase)}`,
  });

  return steps;
}

/**
 * Light type alias for the regression fields the trace builder needs.
 * Avoids importing the full RegressionStatistics type circularly.
 */
// (Removed in Phase 3 cleanup — we now import RegressionStatistics directly.
// This comment kept as a marker for future readers; no functional impact.)

// ===========================================================================
// Helper: construct error result
// ===========================================================================

function err(error: LogRegressionError): LogRegressionAnalysis {
  return { status: 'error', error };
}

// ===========================================================================
// Public utility: predict at a new X value (spec §11)
// ===========================================================================

/**
 * Predicts Y at a new X value, returning both the transformed-scale
 * prediction and the back-transformed (original-scale) prediction.
 *
 * The confidence and prediction intervals are computed on the transformed
 * scale via the Phase 2 predictY() function and then back-transformed.
 *
 * Spec §21: back-transformed intervals are labeled as "back-transformed
 * interval" in the UI — they are NOT exact original-scale intervals
 * (Jensen's inequality bias applies to the mean; the back-transformed
 * interval is a multiplicative interval on the median).
 */
export function predictLogRegression(
  x: number,
  result: LogRegressionResult,
  confidenceLevel: number = result.confidenceLevel
): {
  predictedTransformed: number;
  predictedOriginal: number;
  /** Back-transformed CI bounds (multiplicative interval on median). */
  ciLowerOriginal: number;
  ciUpperOriginal: number;
  /** Back-transformed PI bounds (multiplicative interval on individual obs). */
  piLowerOriginal: number;
  piUpperOriginal: number;
  /** Transformed-scale CI bounds (symmetric). */
  ciLowerTransformed: number;
  ciUpperTransformed: number;
  /** Transformed-scale PI bounds (symmetric). */
  piLowerTransformed: number;
  piUpperTransformed: number;
} {
  // Reuse Phase 2 predictY on the underlying OLS result (spec §21).
  const pred = predictY(x, result.regression, confidenceLevel);

  return {
    predictedTransformed: pred.predicted,
    predictedOriginal: backTransformPrediction(pred.predicted, result.logBase),
    ciLowerOriginal: backTransformPrediction(pred.ciLower, result.logBase),
    ciUpperOriginal: backTransformPrediction(pred.ciUpper, result.logBase),
    piLowerOriginal: backTransformPrediction(pred.piLower, result.logBase),
    piUpperOriginal: backTransformPrediction(pred.piUpper, result.logBase),
    ciLowerTransformed: pred.ciLower,
    ciUpperTransformed: pred.ciUpper,
    piLowerTransformed: pred.piLower,
    piUpperTransformed: pred.piUpper,
  };
}

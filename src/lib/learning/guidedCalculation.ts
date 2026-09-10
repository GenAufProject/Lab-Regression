import { DataPoint, GuidedCalculationTrace, GuidedStep, RegressionStatistics } from '../../types';
import { calculateSimpleLinearRegression } from '../statistics/linearRegression';

/**
 * Phase 5 — Guided Calculation Engine for OLS regression (spec §3, §4, §27).
 *
 * CRITICAL ARCHITECTURAL INVARIANT (spec §27):
 *   The guided calculation MUST agree with the existing statistical engine.
 *   This module CONSUMES the Phase 2 RegressionStatistics produced by
 *   calculateSimpleLinearRegression — it does NOT re-implement OLS math.
 *
 * Flow:
 *   user data → calculateSimpleLinearRegression (Phase 2) → RegressionStatistics
 *            → buildGuidedCalculationTrace (this module) → GuidedStep[]
 *            → GuidedCalculation UI renders steps with progressive disclosure
 *
 * Spec §3: shows the 10-step OLS derivation.
 * Spec §4: progressive disclosure (Next / Previous / Show all / Restart).
 * Spec §28: no rounding inside the engine — full IEEE-754 precision.
 *
 * The trace includes per-observation tables where appropriate (deviations,
 * cross-products, predictions, residuals) so the learner can see exactly
 * how each row contributes to the sums.
 */

/**
 * Generates a 10-step guided OLS calculation trace from the user's data.
 *
 * If the regression fails (e.g. insufficient data, zero variance in X),
 * returns undefined — the UI shows an educational error message.
 *
 * @param data  The user's paired (x, y) data points.
 * @param xLabel  Optional label for the X variable (display only).
 * @param yLabel  Optional label for the Y variable (display only).
 */
export function buildGuidedCalculationTrace(
  data: { x: number; y: number; id?: string }[],
  xLabel: string = 'X',
  yLabel: string = 'Y'
): GuidedCalculationTrace | undefined {
  // Step 1: delegate to the Phase 2 engine (spec §27 — no duplicate math)
  const result = calculateSimpleLinearRegression(data);
  if (result.status !== 'success') return undefined;
  const stats = result.stats;

  const steps = buildOLSSteps(stats, xLabel, yLabel);

  return {
    steps,
    totalSteps: steps.length,
    sourceDatasetLabel: `${xLabel} vs ${yLabel} (n=${stats.n})`,
    engineResultType: 'ols',
  };
}

/**
 * Builds the 10-step OLS derivation from the engine's RegressionStatistics.
 *
 * Each step includes:
 *   - title, description (educational prose)
 *   - formulaLatex (KaTeX with full-precision values)
 *   - result (short summary)
 *   - optional table (per-observation data)
 *
 * Spec §28: no rounding. The KaTeX strings embed full-precision values;
 * the UI may format them for display, but the engine preserves precision.
 */
function buildOLSSteps(
  stats: RegressionStatistics,
  xLabel: string,
  yLabel: string
): GuidedStep[] {
  const steps: GuidedStep[] = [];
  const { n, meanX, meanY, sumX, sumY, sxx, syy, sxy, slope, intercept, sse, ssr, sst, rSquared } = stats;

  // ---- Step 1: Calculate means ----
  steps.push({
    step: 1,
    title: 'Calculate the means (x̄ and ȳ)',
    description:
      `The mean of X (x̄) and the mean of Y (ȳ) are the arithmetic averages. ` +
      `Every OLS regression line is guaranteed to pass through the centroid point (x̄, ȳ). ` +
      `The means are the foundation for all subsequent deviation calculations.`,
    formulaLatex:
      `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${sumX}}{${n}} = ${meanX}, \\quad ` +
      `\\bar{y} = \\frac{\\sum y_i}{n} = \\frac{${sumY}}{${n}} = ${meanY}`,
    result: `x̄ = ${meanX}, ȳ = ${meanY}`,
  });

  // ---- Step 2: Calculate deviations ----
  steps.push({
    step: 2,
    title: 'Calculate deviations from the means',
    description:
      `For each observation, subtract the mean: d_{x_i} = x_i − x̄ and d_{y_i} = y_i − ȳ. ` +
      `Positive deviations mean above average; negative mean below. ` +
      `A key OLS invariant: Σ(x_i − x̄) = 0 and Σ(y_i − ȳ) = 0.`,
    formulaLatex: `d_{x_i} = x_i - \\bar{x}, \\quad d_{y_i} = y_i - \\bar{y}`,
    result: 'Deviations computed for every observation row.',
    table: buildDeviationTable(stats, xLabel, yLabel),
  });

  // ---- Step 3: Calculate Sxy and Sxx ----
  steps.push({
    step: 3,
    title: 'Calculate Sxy and Sxx',
    description:
      `Sxy = Σ(x_i − x̄)(y_i − ȳ) is the covariance sum (numerator of the slope). ` +
      `Sxx = Σ(x_i − x̄)² is the variance sum of X (denominator of the slope). ` +
      `Sxy is positive when X and Y tend to move together; negative when they move oppositely.`,
    formulaLatex:
      `S_{xy} = \\sum_{i=1}^{n} (x_i - \\bar{x})(y_i - \\bar{y}) = ${sxy} \\\\[6pt] ` +
      `S_{xx} = \\sum_{i=1}^{n} (x_i - \\bar{x})^2 = ${sxx}`,
    result: `Sxy = ${sxy}, Sxx = ${sxx}`,
  });

  // ---- Step 4: Calculate slope ----
  steps.push({
    step: 4,
    title: 'Calculate the slope (b₁)',
    description:
      `The slope b₁ = Sxy / Sxx describes the estimated change in Y associated with ` +
      `a one-unit increase in X. A positive slope means Y increases with X; ` +
      `a negative slope means Y decreases with X.`,
    formulaLatex: `b_1 = \\frac{S_{xy}}{S_{xx}} = \\frac{${sxy}}{${sxx}} = ${slope}`,
    result: `slope b₁ = ${slope}`,
  });

  // ---- Step 5: Calculate intercept ----
  steps.push({
    step: 5,
    title: 'Calculate the intercept (b₀)',
    description:
      `The intercept b₀ = ȳ − b₁·x̄ is the predicted Y value when X = 0. ` +
      `It is derived from the fact that the regression line passes through (x̄, ȳ). ` +
      `Caution: if X = 0 is outside the observed data range, the intercept is an extrapolation.`,
    formulaLatex:
      `b_0 = \\bar{y} - b_1 \\bar{x} = ${meanY} - (${slope})(${meanX}) = ${intercept}`,
    result: `intercept b₀ = ${intercept}`,
  });

  // ---- Step 6: Construct regression equation ----
  steps.push({
    step: 6,
    title: 'Construct the regression equation',
    description:
      `The fitted regression equation is ŷ = b₀ + b₁·x. ` +
      `Given any value of X, this equation predicts the expected (mean) value of Y. ` +
      `The equation is mathematically guaranteed to pass through the centroid (x̄, ȳ).`,
    formulaLatex:
      `\\hat{y} = b_0 + b_1 x = ${intercept} + ${slope} \\cdot x`,
    result: `ŷ = ${intercept} + ${slope}·x`,
  });

  // ---- Step 7: Calculate predictions ----
  steps.push({
    step: 7,
    title: 'Calculate predicted values (ŷᵢ)',
    description:
      `For each observation, plug its X value into the regression equation to get the ` +
      `predicted Y. The predicted values lie exactly on the regression line.`,
    formulaLatex: `\\hat{y}_i = b_0 + b_1 x_i = ${intercept} + ${slope} \\cdot x_i`,
    result: 'Predicted values computed for every observation.',
    table: buildPredictionTable(stats, xLabel, yLabel),
  });

  // ---- Step 8: Calculate residuals ----
  steps.push({
    step: 8,
    title: 'Calculate residuals (eᵢ)',
    description:
      `The residual eᵢ = yᵢ − ŷᵢ is the difference between the observed and predicted Y. ` +
      `A POSITIVE residual means the model UNDER-predicted (observed > predicted). ` +
      `A NEGATIVE residual means the model OVER-predicted (observed < predicted). ` +
      `OLS minimizes the sum of squared residuals.`,
    formulaLatex: `e_i = y_i - \\hat{y}_i`,
    result: 'Residuals computed for every observation.',
    table: buildResidualTable(stats, xLabel, yLabel),
  });

  // ---- Step 9: Calculate SSE / SST / R² ----
  steps.push({
    step: 9,
    title: 'Calculate SSE, SST, and R²',
    description:
      `SSE = Σeᵢ² (sum of squared residuals — unexplained variation). ` +
      `SST = Σ(yᵢ − ȳ)² (total variation in Y). ` +
      `R² = 1 − SSE/SST (proportion of variance explained). ` +
      `IMPORTANT: a high R² alone does NOT prove the model is correct — always examine the residual plot.`,
    formulaLatex:
      `SSE = \\sum e_i^2 = ${sse} \\\\[4pt] ` +
      `SST = \\sum (y_i - \\bar{y})^2 = ${sst} \\\\[4pt] ` +
      `R^2 = 1 - \\frac{SSE}{SST} = 1 - \\frac{${sse}}{${sst}} = ${rSquared}`,
    result: `SSE = ${sse}, SST = ${sst}, R² = ${rSquared}`,
  });

  // ---- Step 10: Interpretation ----
  steps.push({
    step: 10,
    title: 'Interpret the result',
    description: buildInterpretation(stats, xLabel, yLabel),
    formulaLatex: `\\hat{y} = ${intercept} + ${slope} \\cdot x, \\quad R^2 = ${rSquared}`,
    result: `Equation: ŷ = ${intercept} ${slope >= 0 ? '+' : '−'} ${Math.abs(slope)}·x (R² = ${rSquared})`,
  });

  return steps;
}

// ===========================================================================
// Helper: build the per-observation deviation table (Step 2)
// ===========================================================================

function buildDeviationTable(
  stats: RegressionStatistics,
  xLabel: string,
  yLabel: string
): GuidedStep['table'] {
  const headers = ['#', xLabel, yLabel, 'X − x̄', 'Y − ȳ'];
  const rows = stats.rows.map((r, idx) => [
    idx + 1,
    r.x,
    r.y,
    r.xDev,
    r.yDev,
  ]);
  return { headers, rows };
}

// ===========================================================================
// Helper: build the prediction table (Step 7)
// ===========================================================================

function buildPredictionTable(
  stats: RegressionStatistics,
  xLabel: string,
  yLabel: string
): GuidedStep['table'] {
  const headers = ['#', xLabel, `${yLabel} (observed)`, `${yLabel} (predicted)`];
  const rows = stats.points.map((p, idx) => [
    idx + 1,
    p.x,
    p.y,
    p.predicted,
  ]);
  return { headers, rows };
}

// ===========================================================================
// Helper: build the residual table (Step 8)
// ===========================================================================

function buildResidualTable(
  stats: RegressionStatistics,
  xLabel: string,
  yLabel: string
): GuidedStep['table'] {
  const headers = ['#', xLabel, `${yLabel} (obs)`, `${yLabel} (pred)`, 'Residual', 'Residual²'];
  const rows = stats.points.map((p, idx) => [
    idx + 1,
    p.x,
    p.y,
    p.predicted,
    p.residual,
    p.residualSquared,
  ]);
  return { headers, rows };
}

// ===========================================================================
// Helper: build the educational interpretation (Step 10)
// ===========================================================================

function buildInterpretation(
  stats: RegressionStatistics,
  xLabel: string,
  yLabel: string
): string {
  const { slope, intercept, rSquared, n } = stats;
  const slopeDirection = slope > 0 ? 'increases' : slope < 0 ? 'decreases' : 'does not change';
  const r2Pct = (rSquared * 100).toFixed(1);
  const r2Verdict =
    rSquared >= 0.9 ? 'strong linear fit'
    : rSquared >= 0.7 ? 'moderate linear fit'
    : rSquared >= 0.5 ? 'weak linear fit'
    : 'very weak linear fit';

  return (
    `The fitted regression equation ŷ = ${intercept} + ${slope}·x describes the relationship ` +
    `between ${xLabel} and ${yLabel} based on ${n} observations. ` +
    `For every one-unit increase in ${xLabel}, ${yLabel} is expected to ${slopeDirection} ` +
    `by approximately ${Math.abs(slope)} units. ` +
    `R² = ${rSquared} (${r2Pct}% of variance explained) indicates a ${r2Verdict} on the linear scale. ` +
    `IMPORTANT: R² alone does not prove the relationship is truly linear or causal — always ` +
    `examine the residual plot for curvature, heteroscedasticity, or outliers before drawing conclusions.`
  );
}

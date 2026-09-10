import { GuidedCalculationTrace, GuidedStep, PKAnalysisSuccess } from '../../types';
import { analyzeFirstOrderElimination } from '../pharmacokinetics/pkAnalysis';

/**
 * Phase 5 — Guided Calculation Engine for PK analysis (spec §10, §11, §27).
 *
 * CRITICAL ARCHITECTURAL INVARIANT (spec §27):
 *   The PK guided calculation MUST agree with the Phase 4 PK engine.
 *   This module CONSUMES the PKAnalysisSuccess produced by
 *   analyzeFirstOrderElimination — it does NOT re-implement PK math.
 *
 * Flow:
 *   PK data → analyzeFirstOrderElimination (Phase 4) → PKAnalysisSuccess
 *           → buildGuidedPKCalculationTrace (this module) → GuidedStep[]
 *           → GuidedCalculation UI renders steps with progressive disclosure
 *
 * Spec §11: shows the 11-step PK derivation.
 * Spec §10: emphasizes "A high R² value alone does not prove that the drug
 *   follows first-order elimination kinetics."
 * Spec §28: no rounding inside the engine.
 */

/**
 * Generates an 11-step guided PK calculation trace from concentration-time data.
 *
 * If the analysis fails (e.g. insufficient data, non-positive concentrations),
 * returns undefined — the UI shows an educational error message.
 *
 * @param data  The user's concentration-time data.
 * @param logBase  'ln' or 'log10'.
 */
export function buildGuidedPKCalculationTrace(
  data: { id?: string; time: number; concentration: number }[],
  logBase: 'ln' | 'log10' = 'ln'
): GuidedCalculationTrace | undefined {
  const result = analyzeFirstOrderElimination(data, { logBase });
  if (result.status !== 'success') return undefined;
  return buildPKStepsFromResult(result);
}

/**
 * Builds the guided trace directly from a Phase 4 PKAnalysisSuccess.
 * Useful when the caller already has the analysis result (avoids recomputing).
 */
export function buildGuidedPKCalculationTraceFromResult(
  result: PKAnalysisSuccess
): GuidedCalculationTrace {
  return buildPKStepsFromResult(result);
}

function buildPKStepsFromResult(result: PKAnalysisSuccess): GuidedCalculationTrace {
  const steps: GuidedStep[] = [];
  const { regression, trapezoidalAUC, terminalPhase, predictions, units, logBase } = result;
  const { slope, intercept, eliminationRateConstant: k, halfLife, estimatedC0: c0, rSquared } = regression;
  const logNotation = logBase === 'ln' ? '\\ln' : '\\log_{10}';
  const backNotation = logBase === 'ln' ? 'e' : '10';

  // ---- Step 1: Validate concentration data ----
  steps.push({
    step: 1,
    title: 'Validate the concentration-time data',
    description:
      `Each observation must have finite time > 0 and finite concentration > 0. ` +
      `Logarithmic transformation requires strictly positive concentrations — ` +
      `zero or negative values cannot be log-transformed. ` +
      `${predictions.length} valid observation(s) entered the analysis.`,
    formulaLatex: `\\forall i: \\quad t_i > 0, \\quad C_i > 0, \\quad \\text{finite}`,
    result: `${predictions.length} valid observation(s).`,
  });

  // ---- Step 2: Calculate ln(C) ----
  steps.push({
    step: 2,
    title: `Transform: z = ${logNotation}(C)`,
    description:
      `Apply the ${logBase === 'ln' ? 'natural logarithm' : 'common logarithm (base 10)'} to each ` +
      `observed concentration. This linearizes the exponential decay: if C(t) = C₀·e^(−kt), ` +
      `then ${logNotation}(C) = ${logNotation}(C₀) − kt.`,
    formulaLatex: `z_i = ${logNotation}(C_i)`,
    result: `Transformed ${predictions.length} concentration values to the ${logBase} scale.`,
    table: buildTransformTable(predictions, logBase),
  });

  // ---- Step 3: Run linear regression ----
  steps.push({
    step: 3,
    title: `Fit OLS regression: z = a + b·t`,
    description:
      `Use ordinary least squares (Phase 2 engine) to fit a straight line to (t, z). ` +
      `The terminal-phase selection determined which points are used: ` +
      `${terminalPhase.pointCount} of ${predictions.length} point(s) from t=${terminalPhase.timeRange.start} ` +
      `to t=${terminalPhase.timeRange.end} ${units.time}.`,
    formulaLatex:
      `\\hat{z}_i = a + b \\cdot t_i, \\quad b = \\frac{S_{tz}}{S_{tt}}, \\quad a = \\bar{z} - b \\bar{t}`,
    result: `Slope b = ${slope}, intercept a = ${intercept}, R² = ${rSquared}.`,
  });

  // ---- Step 4: Identify slope and intercept ----
  steps.push({
    step: 4,
    title: 'Identify the slope and intercept',
    description:
      `The slope (b = ${slope}) is the rate of change of ${logNotation}(C) per unit time. ` +
      `For first-order elimination, this slope is NEGATIVE (concentration decays). ` +
      `The intercept (a = ${intercept}) is the predicted ${logNotation}(C) at t = 0.`,
    formulaLatex:
      `b = ${slope} \\text{ ${units.time}}^{-1}, \\quad a = ${intercept}`,
    result: `b = ${slope} ${units.time}⁻¹, a = ${intercept}`,
  });

  // ---- Step 5: Calculate k ----
  steps.push({
    step: 5,
    title: 'Derive the elimination rate constant (k)',
    description:
      logBase === 'ln'
        ? `On the ln scale, slope = −k, so k = −slope directly. ` +
          `k is defined as a POSITIVE quantity (elimination is a positive rate).`
        : `On the log10 scale, slope = −k/ln(10), so k = −slope × ln(10) ≈ −2.303 × slope. ` +
          `The ln(10) factor converts from base-10 to base-e.`,
    formulaLatex:
      logBase === 'ln'
        ? `k = -b = -(${slope}) = ${k} \\text{ ${units.time}}^{-1}`
        : `k = -b \\cdot \\ln(10) = -(${slope}) \\times \\ln(10) = ${k} \\text{ ${units.time}}^{-1}`,
    result: `k = ${k} ${units.time}⁻¹`,
  });

  // ---- Step 6: Calculate C0 ----
  steps.push({
    step: 6,
    title: 'Estimate the initial concentration (C₀)',
    description:
      `C₀ = ${backNotation}^intercept is the model's prediction at t = 0. ` +
      `This is an EXTRAPOLATION — it is NOT necessarily an observed measurement. ` +
      `For IV bolus, C₀ corresponds to the immediate post-injection concentration.`,
    formulaLatex:
      `C_0 = ${backNotation}^{a} = ${backNotation}^{${intercept}} = ${c0} \\text{ ${units.concentration}}`,
    result: `C₀ = ${c0} ${units.concentration}`,
  });

  // ---- Step 7: Calculate half-life ----
  steps.push({
    step: 7,
    title: 'Calculate the elimination half-life (t½)',
    description:
      `t½ = ln(2) / k is the time required for concentration to decrease by 50%. ` +
      `It is constant for first-order kinetics (independent of dose). ` +
      `After 5 half-lives, ~97% of the drug has been eliminated.`,
    formulaLatex:
      isFinite(halfLife) && halfLife > 0
        ? `t_{1/2} = \\frac{\\ln(2)}{k} = \\frac{0.69315}{${k}} = ${halfLife} \\text{ ${units.time}}`
        : `t_{1/2} = \\frac{\\ln(2)}{k} \\quad \\text{(undefined: k ≤ 0)}`,
    result:
      isFinite(halfLife) && halfLife > 0
        ? `t½ = ${halfLife} ${units.time}`
        : `t½ undefined (k = ${k} is not positive)`,
  });

  // ---- Step 8: Calculate predicted concentrations ----
  steps.push({
    step: 8,
    title: 'Calculate predicted concentrations',
    description:
      `For each observation, predict the concentration by back-transforming the regression ` +
      `prediction: ŷ = ${backNotation}^(a + b·t). ` +
      `The predicted values lie on the fitted exponential decay curve.`,
    formulaLatex:
      `\\hat{C}_i = ${backNotation}^{a + b t_i} = ${backNotation}^{${intercept} + ${slope} t_i}`,
    result: 'Predicted concentrations computed for every observation.',
    table: buildPKPredictionTable(predictions, units.concentration),
  });

  // ---- Step 9: Calculate residuals ----
  steps.push({
    step: 9,
    title: 'Calculate residuals',
    description:
      `The transformed residual eᵢ = zᵢ − ẑᵢ is what OLS actually minimizes. ` +
      `The original-scale residual Cᵢ − Ĉᵢ is informational only — it is NOT what OLS ` +
      `minimizes and should not be used for diagnostic plots. ` +
      `Random residual scatter supports the linear (log-linear) model; ` +
      `curved patterns suggest model mis-specification.`,
    formulaLatex: `e_i = z_i - \\hat{z}_i = ${logNotation}(C_i) - ${logNotation}(\\hat{C}_i)`,
    result: 'Residuals computed for every observation.',
  });

  // ---- Step 10: Calculate AUC ----
  steps.push({
    step: 10,
    title: 'Calculate AUC (trapezoidal + extrapolation)',
    description:
      `AUC_last = Σ[(Cᵢ + Cᵢ₊₁)/2]·Δt is the linear trapezoidal AUC over observed data. ` +
      `AUC_extra = C_last / k extrapolates to infinity (suppressed if k ≤ 0). ` +
      `AUC_total = AUC_last + AUC_extra. ` +
      `AUC_theoretical = C₀/k is the model-based AUC for comparison. ` +
      `If extrapFraction > 20%, the sampling window may be too short.`,
    formulaLatex:
      `\\text{AUC}_{last} = \\sum \\frac{C_i + C_{i+1}}{2} \\Delta t = ${trapezoidalAUC.aucLast} \\\\[4pt] ` +
      `\\text{AUC}_{extra} = \\frac{C_{last}}{k} = ${trapezoidalAUC.aucExtra} \\\\[4pt] ` +
      `\\text{AUC}_{total} = \\text{AUC}_{last} + \\text{AUC}_{extra} = ${trapezoidalAUC.aucTotal} \\\\[4pt] ` +
      `\\text{AUC}_{theoretical} = \\frac{C_0}{k} = ${trapezoidalAUC.aucTheoretical}`,
    result:
      `AUC_last = ${trapezoidalAUC.aucLast} ${units.concentration}·${units.time}` +
      (trapezoidalAUC.extrapolationSuppressed
        ? ' (extrapolation suppressed)'
        : `, AUC_total = ${trapezoidalAUC.aucTotal} ${units.concentration}·${units.time}`),
  });

  // ---- Step 11: Interpret ----
  steps.push({
    step: 11,
    title: 'Interpret the results',
    description: buildPKInterpretation(result),
    formulaLatex:
      `k = ${k} \\text{ ${units.time}}^{-1}, \\quad ` +
      `t_{1/2} = ${halfLife} \\text{ ${units.time}}, \\quad ` +
      `C_0 = ${c0} \\text{ ${units.concentration}}, \\quad ` +
      `R^2 = ${rSquared}`,
    result: `k=${k}, t½=${halfLife}, C₀=${c0}, R²=${rSquared}`,
  });

  return {
    steps,
    totalSteps: steps.length,
    sourceDatasetLabel: `Concentration vs Time (n=${predictions.length}, ${logBase})`,
    engineResultType: 'pk',
  };
}

// ===========================================================================
// Helpers: per-observation tables
// ===========================================================================

function buildTransformTable(
  predictions: PKAnalysisSuccess['predictions'],
  logBase: 'ln' | 'log10'
): GuidedStep['table'] {
  const colName = logBase === 'ln' ? 'ln(C)' : 'log₁₀(C)';
  const headers = ['#', 'Time', 'C (observed)', colName];
  const rows = predictions.map((p, idx) => [
    idx + 1,
    p.time,
    p.concentrationObserved,
    p.concentrationTransformed,
  ]);
  return { headers, rows };
}

function buildPKPredictionTable(
  predictions: PKAnalysisSuccess['predictions'],
  concUnit: string
): GuidedStep['table'] {
  const headers = ['#', 'Time', 'C (observed)', 'C (predicted)', 'Residual'];
  const rows = predictions.map((p, idx) => [
    idx + 1,
    p.time,
    p.concentrationObserved,
    p.concentrationPredicted,
    p.residualOriginal,
  ]);
  return { headers, rows };
}

// ===========================================================================
// Helper: PK interpretation narrative (spec §10)
// ===========================================================================

function buildPKInterpretation(result: PKAnalysisSuccess): string {
  const { regression, trapezoidalAUC, terminalPhase, units } = result;
  const { eliminationRateConstant: k, halfLife, estimatedC0: c0, rSquared, slope } = regression;
  const r2Pct = (rSquared * 100).toFixed(1);

  const kValid = isFinite(k) && k > 0;
  const tHalfValid = isFinite(halfLife) && halfLife > 0;

  return (
    `The fitted first-order elimination model suggests an elimination rate constant ` +
    `k = ${k} ${units.time}⁻¹${kValid ? '' : ' (INVALID — slope is non-negative, which contradicts elimination)'}. ` +
    `${tHalfValid ? `The half-life t½ = ${halfLife} ${units.time} means concentration drops by 50% every ${halfLife} ${units.time}. ` : ''}` +
    `The extrapolated initial concentration C₀ = ${c0} ${units.concentration}. ` +
    `R² = ${rSquared} (${r2Pct}% of variance in ln(C) explained by the linear time trend) indicates ` +
    `${rSquared >= 0.95 ? 'a strong' : rSquared >= 0.85 ? 'a good' : rSquared >= 0.7 ? 'a moderate' : 'a weak'} log-linear fit. ` +
    `IMPORTANT: a high R² alone does NOT prove that the drug follows first-order elimination kinetics — ` +
    `model selection requires pharmacokinetic context and inspection of the residual plot. ` +
    `${terminalPhase.pointCount < predictions_length(result) ? `Only ${terminalPhase.pointCount} of ${predictions_length(result)} points were used in the terminal phase; early points may reflect distribution or absorption. ` : ''}` +
    (trapezoidalAUC.extrapolationSuppressed
      ? 'AUC extrapolation was suppressed (k ≤ 0 or C_last ≤ 0).'
      : `AUC_total = ${trapezoidalAUC.aucTotal} ${units.concentration}·${units.time} ` +
        `(${(trapezoidalAUC.extrapFraction * 100).toFixed(1)}% extrapolated).`)
  );
}

function predictions_length(result: PKAnalysisSuccess): number {
  return result.predictions.length;
}

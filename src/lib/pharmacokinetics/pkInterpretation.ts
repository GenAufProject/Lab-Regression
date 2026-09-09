import { PKInterpretation, PKRegressionResult, TrapezoidalAUC } from '../../types';

/**
 * Phase 4 — Educational interpretation layer (spec §19).
 *
 * Generates human-readable narratives for each PK parameter, suitable for
 * direct display in the UI. The narratives explicitly avoid overclaiming
 * (spec §19: "Do not state that a high R² automatically proves first-order
 * kinetics") and clearly label extrapolated values as model-dependent.
 *
 * Spec §34: no rounding of numeric values inside the engine. The narratives
 * use full-precision values formatted with toExponential / toPrecision for
 * human readability; the canonical numeric fields remain on the result object.
 */
export function buildPKInterpretation(
  regression: PKRegressionResult,
  trapezoidalAUC: TrapezoidalAUC,
  units: { time: string; concentration: string }
): PKInterpretation {
  const { eliminationRateConstant: k, halfLife, estimatedC0: c0, rSquared, slope } = regression;
  const { time, concentration } = units;

  // ---- k narrative (spec §19) ----
  const kNarrative =
    `The elimination rate constant k = ${formatVal(k)} ${time}⁻¹ describes the fractional rate ` +
    `at which concentration decreases under the first-order elimination model. ` +
    `A value of k = 0.20 ${time}⁻¹, for example, means that 20% of the remaining drug ` +
    `is eliminated per unit time. The slope of the log-linear regression is the negative ` +
    `of k on the ln scale (slope = ${formatVal(slope)}), or slope × ln(10) on the log10 scale. ` +
    `Under first-order kinetics, k is constant — it does not depend on dose or concentration.`;

  // ---- Half-life narrative (spec §19) ----
  const halfLifeNarrative = !isFinite(halfLife) || halfLife <= 0
    ? `Half-life could not be computed because the elimination rate constant k is not ` +
      `positive (k = ${formatVal(k)}). A non-positive k suggests the fitted slope is not ` +
      `negative, which contradicts first-order elimination. Verify the data or the model.`
    : `The half-life t½ = ${formatVal(halfLife)} ${time} is the time required for concentration ` +
      `to decrease by approximately 50% under the first-order elimination model. ` +
      `After 1 half-life, ~50% remains; after 5 half-lives, only ~3% remains. ` +
      `Half-life is constant for first-order kinetics — it does not depend on dose. ` +
      `It is derived as t½ = ln(2) / k = 0.69315 / ${formatVal(k)} = ${formatVal(halfLife)} ${time}.`;

  // ---- R² narrative (spec §19) ----
  const rSquaredNarrative =
    `R² = ${formatVal(rSquared)} describes how well the linearized concentration-time data ` +
    `(log scale) fit the regression model. Approximately ${(rSquared * 100).toFixed(1)}% of ` +
    `the variance in ${regression.logBase}(C) is explained by the linear relationship with time. ` +
    `IMPORTANT: a high R² alone does NOT prove that the first-order elimination model is ` +
    `appropriate — it only confirms that the log-transformed data are approximately linear. ` +
    `Always examine the residual plot and the original-scale curve fit before drawing ` +
    `pharmacokinetic conclusions.`;

  // ---- C₀ narrative (spec §10, §19) ----
  const c0Narrative =
    `C₀ = ${formatVal(c0)} ${concentration} is the concentration estimated by extrapolating ` +
    `the fitted elimination model to time zero. This is NOT necessarily an observed measurement — ` +
    `it is the model's prediction at t = 0. For IV bolus, C₀ corresponds to the immediate ` +
    `post-injection concentration before elimination begins. For other routes (oral, infusion), ` +
    `the extrapolated C₀ is a mathematical abstraction and may not have a direct physical meaning. ` +
    `On the ${regression.logBase} scale, C₀ is recovered as ` +
    `${regression.logBase === 'ln' ? 'e^intercept' : '10^intercept'} = ` +
    `${regression.logBase === 'ln' ? 'e' : '10'}^${formatVal(regression.intercept)}.`;

  // ---- AUC narrative (spec §13, §14, §19) ----
  const extrapPct = isFinite(trapezoidalAUC.extrapFraction)
    ? (trapezoidalAUC.extrapFraction * 100).toFixed(1)
    : '—';
  const aucNarrative = trapezoidalAUC.extrapolationSuppressed
    ? `AUC_last = ${formatVal(trapezoidalAUC.aucLast)} ${concentration}·${time} was computed ` +
      `by the linear trapezoidal rule over the observed data. AUC extrapolation to infinity ` +
      `was suppressed (${trapezoidalAUC.extrapolationSuppressedReason ?? 'reason unknown'}). ` +
      `The theoretical model-based AUC = C₀/k = ${formatVal(trapezoidalAUC.aucTheoretical)} ` +
      `${concentration}·${time}; compare this against AUC_last as a model-fit diagnostic ` +
      `(large discrepancies indicate that the data deviate from pure mono-exponential decay).`
    : `AUC_last = ${formatVal(trapezoidalAUC.aucLast)} ${concentration}·${time} was computed ` +
      `by the linear trapezoidal rule over the observed data. ` +
      `AUC_extra = C_last / k = ${formatVal(trapezoidalAUC.aucExtra)} ${concentration}·${time} ` +
      `is the model-based extrapolation from the last observed time to infinity. ` +
      `AUC_total = AUC_last + AUC_extra = ${formatVal(trapezoidalAUC.aucTotal)} ${concentration}·${time}. ` +
      `The extrapolated fraction is ${extrapPct}% — values above 20% suggest the sampling ` +
      `window may be too short and the AUC_total estimate becomes model-dependent. ` +
      `Theoretical AUC = C₀/k = ${formatVal(trapezoidalAUC.aucTheoretical)} ${concentration}·${time}.`;

  return {
    kNarrative,
    halfLifeNarrative,
    rSquaredNarrative,
    c0Narrative,
    aucNarrative,
  };
}

/**
 * Format a numeric value for inclusion in a narrative string.
 * Uses exponential notation for very small / very large values, otherwise
 * 4 significant digits. NaN/Infinity are rendered as "—" or "∞".
 *
 * NOTE (spec §34): this is for narrative text only; the canonical numeric
 * fields on the result object remain at full IEEE-754 precision.
 */
function formatVal(v: number): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return v.toExponential(4);
  }
  return v.toPrecision(6).replace(/\.?0+$/, '');
}

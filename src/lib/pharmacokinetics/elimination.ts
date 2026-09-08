/**
 * Pharmacokinetics First-Order Elimination formulas and constants.
 */

// ln(10) exact value: 2.302585092994046
export const LN_10 = Math.LN10;
// ln(2) exact value: 0.6931471805599453
export const LN_2 = Math.LN2;

/**
 * Predicts concentration at time t using the first-order elimination equation:
 * C(t) = C0 * e^(-k * t)
 */
export function calculateConcentrationAtTime(c0: number, k: number, time: number): number {
  if (k <= 0 || c0 <= 0 || time < 0) return 0;
  return c0 * Math.exp(-k * time);
}

/**
 * Calculates elimination rate constant k from slope of ln(C) vs time.
 * ln(C) = ln(C0) - k*t
 * slope = -k  =>  k = -slope
 */
export function calculateKFromLnSlope(slope: number): number {
  return -slope;
}

/**
 * Calculates elimination rate constant k from slope of log10(C) vs time.
 * log10(C) = log10(C0) - (k / 2.302585)*t
 * slope = -k / ln(10)  =>  k = -slope * ln(10)
 */
export function calculateKFromLog10Slope(slope: number): number {
  return -slope * LN_10;
}

/**
 * Calculates half-life t_1/2 = ln(2) / k = 0.69315 / k
 */
export function calculateHalfLife(k: number): number {
  if (k <= 0) return NaN;
  return LN_2 / k;
}

/**
 * Calculates initial estimated concentration C0 from intercept.
 */
export function calculateC0FromIntercept(intercept: number, logBase: 'ln' | 'log10'): number {
  if (logBase === 'ln') {
    return Math.exp(intercept);
  }
  return Math.pow(10, intercept);
}

/**
 * Calculates apparent Volume of Distribution (Vd) for IV Bolus single compartment:
 * Vd = Dose / C0
 */
export function calculateVd(dose: number, c0: number): number {
  if (c0 <= 0 || dose <= 0) return NaN;
  return dose / c0;
}

/**
 * Calculates total Body Clearance (CL) for IV Bolus single compartment:
 * CL = k * Vd
 *
 * Spec §24: returns NaN (not 0) for invalid inputs so callers can distinguish
 * "no clearance computed" from "computed to be zero".
 */
export function calculateClearance(k: number, vd: number): number {
  if (k <= 0 || vd <= 0) return NaN;
  return k * vd;
}

/**
 * Phase 2: Calculates the area under the concentration-time curve from
 * time zero to infinity for a one-compartment IV bolus with first-order
 * elimination.
 *
 *   AUC₀→∞ = ∫₀^∞ C₀ · e^(-k·t) dt = C₀ / k
 *
 * This is the *theoretical* AUC derived from the fitted mono-exponential
 * model, NOT the trapezoidal AUC from observed data points. The two will
 * differ slightly when the model is imperfect (which is itself a useful
 * diagnostic — large discrepancies indicate model mis-specification).
 *
 * Returns NaN when k ≤ 0 or C₀ ≤ 0.
 */
export function calculateAUC(c0: number, k: number): number {
  if (k <= 0 || c0 <= 0) return NaN;
  return c0 / k;
}

/**
 * Phase 2: Calculates total body clearance from Dose and AUC.
 *
 *   CL = Dose / AUC
 *
 * This is mathematically equivalent to CL = k · Vd for the one-compartment
 * IV bolus model (since Vd = Dose/C₀ and AUC = C₀/k ⇒ Dose/AUC = k·Vd).
 * Computing it independently provides a useful cross-check.
 *
 * Returns NaN when AUC ≤ 0 or Dose ≤ 0.
 */
export function calculateClearanceFromAUC(dose: number, auc: number): number {
  if (auc <= 0 || dose <= 0) return NaN;
  return dose / auc;
}

/**
 * Phase 2: Predicts concentration at time t with a prediction interval
 * on the log scale, then back-transforms to the original scale.
 *
 * The interval is asymmetric on the original scale because the back-transform
 * (exp or 10^x) is non-linear. The interval returned is therefore a
 * multiplicative interval [lower, upper] where:
 *   lower = backTransform(predicted - t·SE_pred)
 *   upper = backTransform(predicted + t·SE_pred)
 *
 * This is the standard pharmacokinetic convention for log-linear fits.
 */
export function predictConcentrationWithInterval(params: {
  time: number;
  intercept: number;
  slope: number;
  sePred: number; // standard error of prediction on the log scale
  tCrit: number; // critical t value for the desired confidence level
  logBase: 'ln' | 'log10';
}): {
  predicted: number;
  lower: number;
  upper: number;
  predictedLog: number;
} {
  const { time, intercept, slope, sePred, tCrit, logBase } = params;
  const predictedLog = intercept + slope * time;
  const lowerLog = predictedLog - tCrit * sePred;
  const upperLog = predictedLog + tCrit * sePred;
  const backTransform = logBase === 'ln' ? Math.exp : (x: number) => Math.pow(10, x);
  return {
    predicted: backTransform(predictedLog),
    lower: backTransform(lowerLog),
    upper: backTransform(upperLog),
    predictedLog,
  };
}

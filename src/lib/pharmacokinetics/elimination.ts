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
 */
export function calculateClearance(k: number, vd: number): number {
  if (k <= 0 || vd <= 0) return NaN;
  return k * vd;
}

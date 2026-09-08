import { PKDataPoint, PKRegressionResult, PKUnits, RegressionResult } from '../../types';
import { calculateSimpleLinearRegression } from '../statistics/linearRegression';
import {
  calculateAUC,
  calculateC0FromIntercept,
  calculateClearance,
  calculateClearanceFromAUC,
  calculateHalfLife,
  calculateKFromLnSlope,
  calculateKFromLog10Slope,
  calculateVd,
  LN_10,
} from './elimination';

export type PKAnalysisError = {
  type: 'NON_POSITIVE_CONCENTRATION' | 'INSUFFICIENT_DATA' | 'NEGATIVE_TIME' | 'INVALID_POINTS';
  message: string;
  detail?: string;
  invalidValues?: number[];
};

export type PKAnalysisResult =
  | {
      status: 'success';
      regression: PKRegressionResult;
      underlyingRegression: RegressionResult;
      transformedPoints: { time: number; transformedConc: number; originalConc: number }[];
      warning?: string;
    }
  | {
      status: 'error';
      error: PKAnalysisError;
    };

/**
 * Fits a linear regression to concentration-time data transformed by either natural log (ln)
 * or common log (log10), and extracts fundamental PK parameters: k, t1/2, C0, and optional Vd and CL.
 */
export function analyzePKData(
  data: PKDataPoint[],
  logBase: 'ln' | 'log10' = 'ln',
  units: PKUnits = { time: 'h', concentration: 'mg/L', dose: 'mg' },
  dose?: number
): PKAnalysisResult {
  if (!data || data.length < 2) {
    return {
      status: 'error',
      error: {
        type: 'INSUFFICIENT_DATA',
        message: 'At least 2 valid time-concentration pairs are required to compute pharmacokinetic elimination parameters.',
      },
    };
  }

  // Check for non-positive concentrations
  const nonPositiveConcs = data.filter((d) => d.concentration <= 0);
  if (nonPositiveConcs.length > 0) {
    return {
      status: 'error',
      error: {
        type: 'NON_POSITIVE_CONCENTRATION',
        message: `Concentration values must be strictly positive (> 0) to apply logarithmic transformation (${logBase}).`,
        detail: `Found ${nonPositiveConcs.length} data points with concentration ≤ 0.`,
        invalidValues: nonPositiveConcs.map((d) => d.concentration),
      },
    };
  }

  // Transform concentrations
  const transformedPoints: { time: number; transformedConc: number; originalConc: number }[] = [];
  const regressionInput: { x: number; y: number; id: string }[] = [];

  for (const item of data) {
    const yVal = logBase === 'ln' ? Math.log(item.concentration) : Math.log10(item.concentration);
    transformedPoints.push({
      time: item.time,
      transformedConc: yVal,
      originalConc: item.concentration,
    });
    regressionInput.push({
      x: item.time,
      y: yVal,
      id: item.id,
    });
  }

  const regResult = calculateSimpleLinearRegression(regressionInput);

  if (regResult.status === 'error') {
    return {
      status: 'error',
      error: {
        type: 'INVALID_POINTS',
        message: regResult.error.message,
        detail: regResult.error.detail,
      },
    };
  }

  const stats = regResult.stats;
  const slope = stats.slope;
  const intercept = stats.intercept;

  // Calculate k
  let k = 0;
  if (logBase === 'ln') {
    k = calculateKFromLnSlope(slope);
  } else {
    k = calculateKFromLog10Slope(slope);
  }

  // Calculate half-life
  const halfLife = calculateHalfLife(k);

  // Calculate estimated C0
  const estimatedC0 = calculateC0FromIntercept(intercept, logBase);

  // Warning if slope is positive (elimination implies decaying concentration over time)
  let warning: string | undefined;
  if (slope >= 0) {
    warning =
      'Warning: The fitted slope is positive or zero. In first-order elimination, concentration decreases over time, expecting a negative slope. Please verify your data points or time ordering.';
  }

  // Formulate equations
  // NOTE (spec §34): these display strings are kept for backward compatibility
  // but are DEPRECATED. They round values for presentation, which violates the
  // "no rounding inside the engine" policy. The UI should build its own display
  // strings from the full-precision numeric fields (slope, intercept,
  // eliminationRateConstant, estimatedC0, auc) using formatting.ts.
  const sign = slope >= 0 ? '+' : '-';
  const absSlope = Math.abs(slope).toFixed(4);
  const interceptStr = intercept.toFixed(4);
  const logLabel = logBase === 'ln' ? 'ln(C)' : 'log10(C)';
  const equationFitted = `${logLabel} = ${interceptStr} ${sign} ${absSlope} · t`;
  const equationNatural = `C(t) = ${estimatedC0.toFixed(3)} · e^(-${k.toFixed(4)} · t)`;

  // Optional IV Bolus calculations if dose is supplied
  let volumeOfDistribution: number | undefined;
  let clearance: number | undefined;

  // Phase 2: AUC₀→∞ = C₀ / k for the one-compartment IV bolus model.
  // Computed unconditionally (does not require a dose) — it is a fundamental
  // PK exposure metric on its own.
  const auc = calculateAUC(estimatedC0, k);

  if (dose && dose > 0 && estimatedC0 > 0) {
    volumeOfDistribution = calculateVd(dose, estimatedC0);
    if (k > 0) {
      // Canonical formula: CL = k · Vd
      clearance = calculateClearance(k, volumeOfDistribution);
      // Independent cross-check: CL = Dose / AUC. For a perfectly specified
      // one-compartment model these are identical; meaningful discrepancy
      // flags numerical or model issues. Logged in tests but not surfaced
      // to UI yet (deferring UI exposure to the dedicated PK phase).
      const clearanceFromAUC = calculateClearanceFromAUC(dose, auc);
      if (clearance && clearanceFromAUC) {
        const relDiff = Math.abs(clearance - clearanceFromAUC) / Math.max(clearance, clearanceFromAUC);
        // If the two CL estimates disagree by more than 0.01%, flag a warning.
        // (For an ideal one-compartment mono-exponential fit they are identical
        // up to floating-point error.)
        if (relDiff > 1e-5 && !warning) {
          warning = `Internal cross-check: CL from k·Vd (${clearance.toExponential(
            4
          )}) differs from CL = Dose/AUC (${clearanceFromAUC.toExponential(
            4
          )}) by ${(relDiff * 100).toExponential(2)}%. This is expected when the data deviates from a pure mono-exponential decay.`;
        }
      }
    }
  }

  const regression: PKRegressionResult = {
    logBase,
    slope,
    intercept,
    rSquared: stats.rSquared,
    r: stats.r,
    rmse: stats.rmse, // deprecated alias
    residualStandardError: stats.residualStandardError,
    eliminationRateConstant: k,
    halfLife,
    estimatedC0,
    auc,
    equationFitted,
    equationNatural,
    units,
    dose,
    volumeOfDistribution,
    clearance,
  };

  return {
    status: 'success',
    regression,
    underlyingRegression: regResult,
    transformedPoints,
    warning,
  };
}

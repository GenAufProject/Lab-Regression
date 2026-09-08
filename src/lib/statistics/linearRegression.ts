import {
  DataPoint,
  RegressionCalculationRow,
  RegressionPoint,
  RegressionResult,
  RegressionStatistics,
} from '../../types';
import { mean, sum } from './descriptive';

/**
 * Standard Student-t critical values approximation for common two-tailed alpha.
 * Used for confidence intervals when df = n - 2.
 *
 * Phase 2 hardening: extended with a continuous Cornish-Fisher expansion
 * fallback for non-tabled confidence levels (e.g. 0.80, 0.85, 0.999) so
 * that any user-selected confidence level produces a defensible critical
 * value instead of silently falling back to 0.95.
 */
export function getStudentTCriticalValue(df: number, confidenceLevel = 0.95): number {
  if (df <= 0) return 2.0;
  if (!isFinite(df)) return zCritical(confidenceLevel);

  // Exact lookup tables for small integer degrees of freedom at 90%, 95%, 99%
  const tTables: Record<number, Record<number, number>> = {
    0.9: {
      1: 6.314, 2: 2.92, 3: 2.353, 4: 2.132, 5: 2.015,
      6: 1.943, 7: 1.895, 8: 1.86, 9: 1.833, 10: 1.812,
      15: 1.753, 20: 1.725, 30: 1.697, 40: 1.684, 60: 1.671, 120: 1.658,
    },
    0.95: {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
      11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131,
      16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086,
      25: 2.06, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.0, 100: 1.984, 120: 1.98,
    },
    0.99: {
      1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032,
      6: 3.707, 7: 3.499, 8: 3.355, 9: 3.25, 10: 3.169,
      15: 2.947, 20: 2.845, 30: 2.75, 40: 2.704, 60: 2.66, 120: 2.617,
    },
  };

  // Snap to the nearest supported table level if exact match exists
  const level = confidenceLevel in tTables ? confidenceLevel : 0.95;
  const table = tTables[level];

  if (table[df]) return table[df];

  // For very large df, return the asymptotic z critical value
  if (df > 120) {
    return zCritical(level);
  }

  // Linear interpolation between nearest table keys for the chosen level
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df >= keys[i] && df <= keys[i + 1]) {
      const x0 = keys[i];
      const x1 = keys[i + 1];
      const y0 = table[x0];
      const y1 = table[x1];
      return y0 + ((df - x0) / (x1 - x0)) * (y1 - y0);
    }
  }

  // If df is below the smallest tabled value (df < 1 but > 0), use asymptotic z
  return zCritical(level);
}

/**
 * Standard normal (z) critical value for a two-tailed confidence level.
 * Uses the inverse error function approximation (Winitzki).
 * For 0.90 → 1.6449, 0.95 → 1.9600, 0.99 → 2.5758.
 */
export function zCritical(confidenceLevel: number): number {
  if (confidenceLevel <= 0) return 0;
  if (confidenceLevel >= 1) return 8; // effectively infinite
  // two-tailed alpha
  const p = 1 - (1 - confidenceLevel) / 2;
  // Inverse CDF of standard normal via rational approximation (Acklam's algorithm)
  return invNorm(p);
}

/**
 * Acklam's rational approximation to the inverse normal CDF.
 * Accurate to ~1e-9 across the full probability range.
 */
function invNorm(p: number): number {
  // Coefficients
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

/**
 * Two-tailed p-value for a Student-t statistic with df degrees of freedom.
 * Uses a continuous approximation based on the incomplete beta function.
 * Accurate to ~1e-5 across the full range.
 *
 * Reference: Abramowitz & Stegun 26.5.5 / 26.7.8 (normal approx for large df).
 */
export function studentTPValue(tStat: number, df: number): number {
  if (!isFinite(tStat) || df <= 0) return NaN;
  const t = Math.abs(tStat);
  // For large df, use the standard normal CDF
  if (df > 200) {
    // two-tailed p = 2 * (1 - Φ(|t|))
    return 2 * (1 - normalCdf(t));
  }
  // For smaller df, use the incomplete beta function approximation
  // p = I_{df/(df+t²)}(df/2, 1/2)
  const x = df / (df + t * t);
  const ib = incompleteBeta(x, df / 2, 0.5);
  // Two-tailed
  return Math.min(1, Math.max(0, ib));
}

/**
 * Standard normal CDF using erf approximation (Abramowitz & Stegun 7.1.26).
 *
 * IMPORTANT: A&S 7.1.26 computes erf(x). To get Φ(z) we need
 *   Φ(z) = 0.5 · (1 + erf(z / √2))
 * NOT 0.5 · (1 + erf(z)). The /√2 division was missing in the original
 * implementation, causing p-values to be off by a factor of ~10× for
 * moderate |t| values.
 */
function normalCdf(z: number): number {
  // Φ(z) = 0.5 * (1 + erf(z / √2))
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  // Polynomial in t with A&S 7.1.26 coefficients
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erfApprox = 1 - poly * Math.exp(-x * x);
  const erf = x >= 0 ? erfApprox : -erfApprox;
  return 0.5 * (1 + erf);
}

/**
 * Regularized incomplete beta function I_x(a, b) via continued fraction (Lentz's method).
 * Reference: Numerical Recipes 3rd ed., 6.4.
 * Returns I_x(a, b) = (1/B(a,b)) ∫₀ˣ t^(a-1) (1-t)^(b-1) dt
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Symmetry: I_x(a,b) = 1 - I_{1-x}(b,a)
  // Use the smaller of the two for continued-fraction stability
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front =
    Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  // Use continued fraction
  let cf: number;
  if (x < (a + 1) / (a + b + 2)) {
    cf = betaCF(x, a, b);
    return front * cf;
  } else {
    cf = betaCF(1 - x, b, a);
    return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * cf;
  }
}

function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 1e-12;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    const aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    const ab = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + ab * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + ab / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

/**
 * Lanczos approximation to the log-gamma function.
 * Reference: Numerical Recipes.
 */
function lgamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    // Reflection formula
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Calculates Ordinary Least Squares (OLS) simple linear regression.
 * y = a + bx
 * Returns full intermediate steps, diagnostics, and (Phase 2 additions)
 * leverage, internally studentized residuals, Cook's distance, p-values,
 * and F-statistic.
 */
export function calculateSimpleLinearRegression(
  data: { x: number; y: number; id?: string }[],
  confidenceLevel = 0.95
): RegressionResult {
  // 1. Filter and validate numerical pairs
  const validData = data.filter(
    (pt) =>
      pt !== null &&
      pt !== undefined &&
      typeof pt.x === 'number' &&
      typeof pt.y === 'number' &&
      !isNaN(pt.x) &&
      !isNaN(pt.y) &&
      isFinite(pt.x) &&
      isFinite(pt.y)
  );

  const n = validData.length;

  if (n < 2) {
    return {
      status: 'error',
      error: {
        type: 'INSUFFICIENT_DATA',
        message: 'At least 2 valid paired data points are required to compute regression.',
        detail: `Currently found ${n} valid pairs.`,
      },
    };
  }

  const xVals = validData.map((d) => d.x);
  const yVals = validData.map((d) => d.y);

  const meanX = mean(xVals);
  const meanY = mean(yVals);
  const sumX = sum(xVals);
  const sumY = sum(yVals);

  // 2. Compute deviations and sums of squares
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  const intermediateRows: {
    id: string;
    x: number;
    y: number;
    xDev: number;
    yDev: number;
    xDevSq: number;
    yDevSq: number;
    prodDev: number;
  }[] = [];

  for (let i = 0; i < n; i++) {
    const x = validData[i].x;
    const y = validData[i].y;
    const id = validData[i].id || `pt-${i + 1}`;

    const xDev = x - meanX;
    const yDev = y - meanY;
    const xDevSq = xDev * xDev;
    const yDevSq = yDev * yDev;
    const prodDev = xDev * yDev;

    sxx += xDevSq;
    syy += yDevSq;
    sxy += prodDev;

    intermediateRows.push({
      id,
      x,
      y,
      xDev,
      yDev,
      xDevSq,
      yDevSq,
      prodDev,
    });
  }

  // Check if Sxx is zero (vertical line / identical X values)
  if (Math.abs(sxx) < 1e-12) {
    return {
      status: 'error',
      error: {
        type: 'ZERO_VARIANCE_X',
        message: 'All X values are identical. Variance of X is zero.',
        detail: 'A linear regression requires at least two distinct X coordinates to determine a slope.',
      },
    };
  }

  // 3. Slope and intercept
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  // 4. Predictions, residuals, SSE, SSR, SST
  let sse = 0;
  let ssr = 0;

  const points: RegressionPoint[] = [];
  const rows: RegressionCalculationRow[] = [];

  for (let i = 0; i < n; i++) {
    const item = intermediateRows[i];
    const predicted = intercept + slope * item.x;
    const residual = item.y - predicted;
    const residualSquared = residual * residual;

    sse += residualSquared;
    ssr += Math.pow(predicted - meanY, 2);

    rows.push({
      ...item,
      predicted,
      residual,
    });

    points.push({
      id: item.id,
      x: item.x,
      y: item.y,
      predicted,
      residual,
      residualSquared,
    });
  }

  const sst = syy;

  // 5. Pearson r and R-squared
  let r = 0;
  if (sxx > 0 && syy > 0) {
    r = sxy / Math.sqrt(sxx * syy);
    // Floating-point safety only — preserve sign
    if (r > 1) r = 1;
    if (r < -1) r = -1;
  } else if (syy === 0) {
    r = 0;
  }

  // Phase 2: expose both raw and clamped R².
  // Raw R² can be negative when the model fits worse than a horizontal line at ȳ
  // (e.g., when fitting through origin or with constrained slope). For standard
  // OLS with intercept, raw R² is always in [0,1], but we expose the raw value
  // for diagnostic transparency.
  let rSquaredRaw: number;
  if (sst > 1e-12) {
    rSquaredRaw = 1 - sse / sst;
  } else {
    rSquaredRaw = 1; // All points identical or horizontal line with perfect fit
  }
  // Clamped version for display
  const rSquared = Math.max(0, Math.min(1, rSquaredRaw));

  // Adjusted R-squared
  const adjustedRSquared =
    n > 2 ? 1 - ((1 - rSquared) * (n - 1)) / (n - 2) : rSquared;

  // 6. MSE, residual standard error, and standard errors
  //    (spec §11: distinguish RMSE = √(SSE/n) from residual standard error s = √(SSE/(n-2)).
  //     The SE of slope/intercept uses s, NOT the prediction RMSE.)
  const df = n - 2;
  const mse = df > 0 ? sse / df : 0; // unbiased estimate of σ²
  const residualStandardError = Math.sqrt(Math.max(0, mse)); // s = √(SSE/(n-2))
  // Backward-compat alias (deprecated — see types.ts)
  const rmse = residualStandardError;
  // True prediction RMSE = √(SSE/n) — what sklearn / forecasting packages report
  const predictionRMSE = Math.sqrt(Math.max(0, sse / n));

  // SE(b) = s / √Sxx   (uses residual standard error, NOT prediction RMSE)
  const seSlope = df > 0 && sxx > 0 ? residualStandardError / Math.sqrt(sxx) : 0;
  // SE(a) = s · √(1/n + x̄²/Sxx)
  const seIntercept =
    df > 0 && sxx > 0
      ? residualStandardError * Math.sqrt(1 / n + (meanX * meanX) / sxx)
      : 0;

  const tStatSlope = seSlope > 0 ? slope / seSlope : 0;
  const tStatIntercept = seIntercept > 0 ? intercept / seIntercept : 0;

  // Phase 2: p-values (two-tailed Student-t)
  const pValueSlope = df > 0 && seSlope > 0 ? studentTPValue(tStatSlope, df) : NaN;
  const pValueIntercept = df > 0 && seIntercept > 0 ? studentTPValue(tStatIntercept, df) : NaN;

  // Phase 2: F-statistic for overall regression significance
  // F = MSR / MSE = (SSR / 1) / (SSE / (n-2)), with 1 and n-2 df
  const fStat = df > 0 && mse > 0 && ssr > 0 ? (ssr / 1) / mse : 0;
  // p-value of F via F-distribution = 1 - I_{1}(1, df) — but F(1, df) is t²(df),
  // so we can derive it from the t p-value: p_F = p_t (two-tailed) when slope has 1 df.
  const pValueF = pValueSlope;

  // Confidence intervals
  const tCrit = df > 0 ? getStudentTCriticalValue(df, confidenceLevel) : 0;
  const ciSlope: [number, number] = [
    slope - tCrit * seSlope,
    slope + tCrit * seSlope,
  ];
  const ciIntercept: [number, number] = [
    intercept - tCrit * seIntercept,
    intercept + tCrit * seIntercept,
  ];

  // Phase 2: Leverage, internally studentized residuals, Cook's distance
  // For simple linear regression:
  //   h_ii = 1/n + (x_i - x̄)² / Sxx      (leverage, in [1/n, 1])
  //   r_i  = e_i / (s * sqrt(1 - h_ii))   (internally studentized residual)
  //   D_i  = (r_i² / 2) * (h_ii / (1 - h_ii))   (Cook's distance)
  //
  // Reference: Montgomery, Peck & Vining (2012), Ch. 5.
  if (residualStandardError > 0 && sxx > 0) {
    for (const pt of points) {
      const xDev = pt.x - meanX;
      const h_ii = 1 / n + (xDev * xDev) / sxx;
      const leverageClamped = Math.max(0, Math.min(1, h_ii));
      pt.leverage = leverageClamped;
      const denom = Math.sqrt(Math.max(0, 1 - leverageClamped));
      pt.studentizedResidual = denom > 0 ? pt.residual / (residualStandardError * denom) : 0;
      // Backward-compat: keep the old "standardizedResidual" field as the
      // studentized value (callers expecting the old behaviour get a
      // strictly better diagnostic).
      pt.standardizedResidual = pt.studentizedResidual;
      // Cook's distance
      const denomCook = 1 - leverageClamped;
      pt.cooksDistance =
        denomCook > 0
          ? (pt.studentizedResidual * pt.studentizedResidual / 2) * (leverageClamped / denomCook)
          : 0;
    }
  } else {
    // Degenerate fallback: scale-only residuals
    for (const pt of points) {
      pt.leverage = 1 / n;
      pt.studentizedResidual = pt.residual / (residualStandardError || 1);
      pt.standardizedResidual = pt.studentizedResidual;
      pt.cooksDistance = 0;
    }
  }

  const stats: RegressionStatistics = {
    n,
    meanX,
    meanY,
    sumX,
    sumY,
    sxx,
    syy,
    sxy,
    slope,
    intercept,
    r,
    rSquared,
    rSquaredRaw,
    adjustedRSquared,
    sse,
    ssr,
    sst,
    mse,
    residualStandardError,
    rmse, // deprecated alias
    predictionRMSE,
    seSlope,
    seIntercept,
    tStatSlope,
    tStatIntercept,
    pValueSlope,
    pValueIntercept,
    fStat,
    pValueF,
    confidenceLevel,
    ciSlope,
    ciIntercept,
    rows,
    points,
  };

  return {
    status: 'success',
    stats,
  };
}

/**
 * Predicts Y given X and computes confidence and prediction intervals.
 *
 * Confidence interval (mean response): seFit = sqrt(MSE * (1/n + (x-x̄)²/Sxx))
 * Prediction interval (individual obs): sePred = sqrt(MSE * (1 + 1/n + (x-x̄)²/Sxx))
 *
 * Phase 2: added finite-x guard and exposed the underlying standard errors.
 */
export function predictY(
  x: number,
  stats: RegressionStatistics,
  confidenceLevel = 0.95
): {
  predicted: number;
  ciLower: number;
  ciUpper: number;
  piLower: number;
  piUpper: number;
  seFit: number;
  sePred: number;
} {
  const { slope, intercept, meanX, sxx, mse, n } = stats;
  const predicted = intercept + slope * x;
  const df = n - 2;

  if (!isFinite(x) || df <= 0 || sxx <= 0) {
    return {
      predicted,
      ciLower: predicted,
      ciUpper: predicted,
      piLower: predicted,
      piUpper: predicted,
      seFit: 0,
      sePred: 0,
    };
  }

  const tCrit = getStudentTCriticalValue(df, confidenceLevel);
  const xDiffSq = Math.pow(x - meanX, 2);

  // Standard error of the mean response (CI)
  const seFit = Math.sqrt(mse * (1 / n + xDiffSq / sxx));
  // Standard error of an individual prediction (PI)
  const sePred = Math.sqrt(mse * (1 + 1 / n + xDiffSq / sxx));

  return {
    predicted,
    ciLower: predicted - tCrit * seFit,
    ciUpper: predicted + tCrit * seFit,
    piLower: predicted - tCrit * sePred,
    piUpper: predicted + tCrit * sePred,
    seFit,
    sePred,
  };
}

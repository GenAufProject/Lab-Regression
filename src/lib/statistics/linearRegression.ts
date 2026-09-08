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
 */
export function getStudentTCriticalValue(df: number, confidenceLevel = 0.95): number {
  if (df <= 0) return 2.0;

  // Exact lookup tables for small degrees of freedom at 90%, 95%, 99%
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

  const level = confidenceLevel in tTables ? confidenceLevel : 0.95;
  const table = tTables[level];

  if (table[df]) return table[df];

  // For large df or between table values, use Hill's approximation formula
  // Based on normal quantile z + correction
  const z = level === 0.99 ? 2.576 : level === 0.9 ? 1.645 : 1.96;
  if (df > 120) {
    return z;
  }

  // Linear interpolation between nearest table keys
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

  return z;
}

/**
 * Calculates Ordinary Least Squares (OLS) simple linear regression.
 * y = a + bx
 * Returns full intermediate steps and diagnostics.
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
    // Guard potential floating precision bounds
    if (r > 1) r = 1;
    if (r < -1) r = -1;
  } else if (syy === 0) {
    // If all Y are identical, variance in Y is zero
    r = 0;
  }

  let rSquared = 0;
  if (sst > 1e-12) {
    rSquared = 1 - sse / sst;
    if (rSquared < 0) rSquared = 0;
    if (rSquared > 1) rSquared = 1;
  } else {
    rSquared = 1; // All points identical or horizontal line with perfect fit
  }

  // Adjusted R-squared
  const adjustedRSquared =
    n > 2 ? 1 - ((1 - rSquared) * (n - 1)) / (n - 2) : rSquared;

  // 6. MSE, RMSE, Standard Errors
  const df = n - 2;
  const mse = df > 0 ? sse / df : 0;
  const rmse = Math.sqrt(Math.max(0, mse));

  const seSlope = df > 0 && sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const seIntercept =
    df > 0 && sxx > 0
      ? Math.sqrt(mse * (1 / n + (meanX * meanX) / sxx))
      : 0;

  const tStatSlope = seSlope > 0 ? slope / seSlope : 0;
  const tStatIntercept = seIntercept > 0 ? intercept / seIntercept : 0;

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

  // Standardized residuals
  if (rmse > 0) {
    points.forEach((pt) => {
      pt.standardizedResidual = pt.residual / rmse;
    });
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
    adjustedRSquared,
    sse,
    ssr,
    sst,
    mse,
    rmse,
    seSlope,
    seIntercept,
    tStatSlope,
    tStatIntercept,
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
} {
  const { slope, intercept, meanX, sxx, mse, n } = stats;
  const predicted = intercept + slope * x;
  const df = n - 2;

  if (df <= 0 || sxx <= 0) {
    return {
      predicted,
      ciLower: predicted,
      ciUpper: predicted,
      piLower: predicted,
      piUpper: predicted,
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
  };
}

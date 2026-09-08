export type DataPoint = {
  id: string;
  x: number;
  y: number;
};

export type RegressionPoint = DataPoint & {
  predicted: number;
  residual: number;
  residualSquared: number;
  /**
   * Backward-compatible field. Phase 2 hardening: this now holds the
   * *internally studentized* residual r_i = e_i / (s * sqrt(1 - h_ii))
   * rather than the naive e_i / s. The naive version is still available
   * implicitly via `residual / sqrt(MSE)` if needed.
   */
  standardizedResidual?: number;
  /** Phase 2: internally studentized residual (same as standardizedResidual). */
  studentizedResidual?: number;
  /** Phase 2: hat diagonal h_ii = 1/n + (x_i - x̄)² / Sxx ∈ [1/n, 1]. */
  leverage?: number;
  /** Phase 2: Cook's distance D_i = (r_i² / 2) * (h_ii / (1 - h_ii)). */
  cooksDistance?: number;
};

export type RegressionCalculationRow = {
  id: string;
  x: number;
  y: number;
  xDev: number; // x - meanX
  yDev: number; // y - meanY
  xDevSq: number; // (x - meanX)^2
  yDevSq: number; // (y - meanY)^2
  prodDev: number; // (x - meanX)*(y - meanY)
  predicted: number;
  residual: number;
};

export type RegressionStatistics = {
  n: number;
  meanX: number;
  meanY: number;
  sumX: number;
  sumY: number;
  sxx: number; // sum((x - meanX)^2)
  syy: number; // sum((y - meanY)^2)
  sxy: number; // sum((x - meanX)*(y - meanY))
  slope: number; // b = sxy / sxx
  intercept: number; // a = meanY - b * meanX
  r: number; // Pearson correlation coefficient
  /** Coefficient of determination, clamped to [0, 1] for display. */
  rSquared: number;
  /**
   * Phase 2: raw (unclamped) R² = 1 - SSE/SST.
   * For standard OLS with intercept this is always in [0,1], but exposing
   * the raw value keeps the diagnostic transparent for edge cases.
   */
  rSquaredRaw?: number;
  adjustedRSquared?: number;
  sse: number; // Sum of squared errors (residuals)
  ssr: number; // Sum of squares regression
  sst: number; // Total sum of squares = sse + ssr
  /**
   * Mean squared error = SSE / (n - 2). Used internally for SE calculations.
   * Note: this is the *unbiased* MSE with df = n - 2, not SSE / n.
   */
  mse: number;
  /**
   * Phase 2 — canonical name. The residual standard error
   *   s = sqrt(SSE / (n - 2))
   * is the quantity used to compute SE(b), SE(a), CIs, PIs.
   *
   * IMPORTANT (spec §11): the historical `rmse` field on this type actually
   * computes √(SSE/(n-2)), i.e. it is the *residual standard error*, not the
   * prediction RMSE. To remove the ambiguity:
   *   - `residualStandardError` is the canonical name going forward.
   *   - `rmse` is kept as a deprecated alias with the SAME value, so existing
   *     callers and tests continue to work. New code should prefer
   *     `residualStandardError`.
   *   - The actual prediction RMSE = √(SSE/n) is exposed separately as
   *     `predictionRMSE` for callers that need it.
   */
  residualStandardError?: number;
  /** @deprecated Use residualStandardError. Same value (sqrt(SSE/(n-2))). */
  rmse: number;
  /** Phase 2: prediction RMSE = sqrt(SSE/n). Distinct from residualStandardError. */
  predictionRMSE?: number;
  seSlope: number; // Standard error of slope: s / sqrt(Sxx)
  seIntercept: number; // Standard error of intercept: s * sqrt(1/n + x̄²/Sxx)
  tStatSlope: number;
  tStatIntercept: number;
  /** Phase 2: two-tailed p-value for slope t-test, df = n - 2. */
  pValueSlope?: number;
  /** Phase 2: two-tailed p-value for intercept t-test, df = n - 2. */
  pValueIntercept?: number;
  /** Phase 2: overall F-statistic for regression significance, F(1, n-2). */
  fStat?: number;
  /** Phase 2: p-value for the overall F-test (equals pValueSlope for simple regression). */
  pValueF?: number;
  confidenceLevel: number; // e.g. 0.95
  ciSlope: [number, number]; // [lower, upper]
  ciIntercept: [number, number]; // [lower, upper]
  rows: RegressionCalculationRow[];
  points: RegressionPoint[];
};

export type RegressionErrorType =
  | 'INSUFFICIENT_DATA'
  | 'ZERO_VARIANCE_X'
  | 'ZERO_VARIANCE_Y'
  | 'INVALID_NUMBERS'
  | 'NON_FINITE_VALUE'
  | 'LENGTH_MISMATCH'
  | 'DOMAIN_ERROR';

export type RegressionError = {
  type: RegressionErrorType;
  message: string;
  detail?: string;
};

export type RegressionResult =
  | {
      status: 'success';
      stats: RegressionStatistics;
    }
  | {
      status: 'error';
      error: RegressionError;
    };

export type TransformType = 'none' | 'ln' | 'log10' | 'sqrt';

export type PKUnits = {
  time: string; // e.g., "h", "min", "day"
  concentration: string; // e.g., "mg/L", "µg/mL", "ng/mL"
  dose: string; // e.g., "mg", "g", "µg"
};

export type PKDataPoint = {
  id: string;
  time: number;
  concentration: number;
};

export type PKRegressionResult = {
  logBase: 'ln' | 'log10';
  slope: number;
  intercept: number;
  rSquared: number;
  r: number;
  /**
   * @deprecated Use residualStandardError. Same value.
   * Kept for backward compatibility with existing callers.
   */
  rmse: number;
  /** Phase 2: canonical name for sqrt(SSE/(n-2)) on the log-transformed scale. */
  residualStandardError?: number;
  eliminationRateConstant: number; // k
  halfLife: number; // t_1/2
  estimatedC0: number; // C0
  /**
   * Phase 2: AUC₀→∞ for one-compartment IV bolus first-order elimination.
   * AUC = C₀ / k  (since ∫₀^∞ C₀ e^(-kt) dt = C₀ / k).
   * NaN when k ≤ 0 or C₀ ≤ 0.
   */
  auc?: number;
  /**
   * @deprecated Display-only string with hardcoded rounding. Violates the
   * "no rounding inside the engine" policy (spec §34). Kept for backward
   * compat; UI should build its own display from full-precision fields.
   */
  equationFitted: string;
  /**
   * @deprecated Display-only string with hardcoded rounding. Violates the
   * "no rounding inside the engine" policy (spec §34). Kept for backward
   * compat; UI should build its own display from full-precision fields.
   */
  equationNatural: string;
  units: PKUnits;
  // Optional IV Bolus derived parameters
  dose?: number;
  volumeOfDistribution?: number; // Vd = Dose / C0
  /**
   * Phase 2: total body clearance.
   * Computed two equivalent ways for cross-validation:
   *   CL = k · Vd         (when dose provided)
   *   CL = Dose / AUC     (independent check, should match above)
   */
  clearance?: number;
};

export type DatasetPreset = {
  id: string;
  name: string;
  category: 'statistics' | 'pharmacokinetics' | 'diagnostics';
  description: string;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  data: { x: number; y: number }[];
  educationalNotes?: string;
};

export type QuizQuestion = {
  id: string;
  category: 'linear-regression' | 'r-squared' | 'residuals' | 'transformations' | 'pk';
  title: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
  formulaNote?: string;
};

export type UserPreferences = {
  decimals: number;
  confidenceLevel: number;
  showEquation: boolean;
  showConfidenceBand: boolean;
  showPredictionBand: boolean;
  showResidualLines: boolean;
  presentationMode: boolean;
};

export type AppNavSection =
  | 'dashboard'
  | 'learn'
  | 'regression'
  | 'transformations'
  | 'simulator'
  | 'pk'
  | 'practice'
  | 'reference'
  | 'settings';

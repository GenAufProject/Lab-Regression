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

/**
 * Phase 3: Logarithm-base-specific type used by the log-regression engine.
 * The generic `TransformType` includes 'sqrt' and 'none' which are not valid
 * log-regression modes (spec §24: "Do not expose sqrt as a log-regression mode").
 */
export type LogBase = 'ln' | 'log10';

/**
 * Phase 3: Strongly-typed metadata describing a transformation.
 *
 * Centralizes everything the UI and the log-regression engine need to know
 * about a transformation: mathematical notation, domain constraints, the
 * forward and inverse functions, and human-readable explanations.
 *
 * Spec §4: "A transformation should have explicit metadata."
 */
export type TransformationMetadata = {
  type: TransformType;
  /** Short identifier used in code, e.g. "ln". */
  name: string;
  /** Human-readable label, e.g. "Natural Logarithm". */
  displayName: string;
  /** KaTeX notation for the forward transform, e.g. "\\ln(x)". */
  notationLatex: string;
  /** KaTeX notation for the inverse transform, e.g. "e^z". */
  inverseNotationLatex: string;
  /** Plain-language domain description, e.g. "x > 0". */
  domain: 'all-reals' | 'strictly-positive' | 'non-negative';
  /** Human-readable domain description, e.g. "Strictly positive (x > 0)". */
  domainDescription: string;
  /** Forward transform: x → z. Returns NaN for out-of-domain inputs. */
  forward: (x: number) => number;
  /** Inverse transform: z → x. Returns NaN for invalid inputs. */
  inverse: (z: number) => number;
  /** Educational explanation of when/why to use this transform. */
  explanation: string;
  /** Whether the transform preserves sign (true for identity, false for ln/log10/sqrt). */
  preservesSign: boolean;
  /** Whether the transform accepts zero as input. */
  acceptsZero: boolean;
  /** Whether the transform accepts negative values as input. */
  acceptsNegative: boolean;
};

// ---------------------------------------------------------------------------
// Phase 3: Log-linear regression result model (spec §7)
// ---------------------------------------------------------------------------

/**
 * Phase 3: A single prediction row in the log-regression results table.
 * Spec §11: distinguishes transformed-space prediction from original-scale.
 */
export type LogRegressionPrediction = {
  id: string;
  x: number;
  yObserved: number;
  /** z = transform(yObserved), e.g. ln(y) or log10(y). */
  yTransformed: number;
  /** ẑ = a + b·x (predicted on transformed scale). */
  predictedTransformed: number;
  /**ŷ = backTransform(ẑ) — predicted on original scale (median prediction). */
  predictedOriginal: number;
  /** Transformed-space residual: eᵢ = zᵢ − ẑᵢ (spec §13). */
  residualTransformed: number;
  /**
   * Original-scale prediction difference: yᵢ − ŷᵢ.
   *
   * NOTE (spec §12): This is NOT the same as the transformed residual and
   * the two must not be conflated. The transformed residual is what OLS
   * actually minimizes; the original-scale difference is informational.
   */
  residualOriginal: number;
};

/**
 * Phase 3: A single step in the calculation trace (spec §16).
 *
 * The trace is generated by the domain layer (logRegression.ts), never
 * reconstructed manually inside React components (spec §30).
 */
export type CalculationStep = {
  step: number;
  title: string;
  description: string;
  /** KaTeX math string. Built from full-precision values; no rounding. */
  formulaLatex: string;
  /** Short human-readable result summary. */
  result: string;
};

/**
 * Phase 3: Coefficient interpretation for log-linear regression (spec §9, §10).
 *
 * For ln model with slope b:
 *   multiplicativeFactor = exp(b)
 *   percentChangePerUnitX = (exp(b) - 1) × 100%
 *
 * For log10 model with slope b:
 *   multiplicativeFactor = 10^b
 *   percentChangePerUnitX = (10^b - 1) × 100%
 */
export type CoefficientInterpretation = {
  /** Which log base the interpretation is based on. */
  logBase: LogBase;
  /** Original-scale multiplicative factor per 1-unit increase in X. */
  multiplicativeFactor: number;
  /** Percentage change in Y per 1-unit increase in X. */
  percentChangePerUnitX: number;
  /** Predicted Y on original scale at X = 0 (= backTransform(intercept)). */
  predictedYAtX0: number;
  /** True if X = 0 lies outside [min(X), max(X)] — intercept extrapolation risk. */
  x0OutsideObservedRange: boolean;
  /** Human-readable interpretation paragraph for the slope. */
  slopeNarrative: string;
  /** Human-readable interpretation paragraph for the intercept. */
  interceptNarrative: string;
};

/**
 * Phase 3: Result of a log-linear regression analysis (spec §7).
 *
 * The log-regression engine reuses the existing Phase 2 OLS engine by
 * transforming Y and then fitting a linear regression on the transformed
 * scale (spec §6: "Do NOT implement a separate alternative regression
 * algorithm").
 */
export type LogRegressionResult = {
  /** Which logarithm base was used. */
  logBase: LogBase;
  /** The original (untransformed) data points. */
  rawData: DataPoint[];
  /** The transformed data points: { x: x, y: transform(y) }. */
  transformedData: DataPoint[];
  /** The underlying OLS regression on the transformed scale. */
  regression: RegressionStatistics;
  /** Equation on the transformed scale, e.g. "ln(Y) = a + bX". */
  equationTransformedLatex: string;
  /** Back-transformed equation on the original scale, e.g. "Y = e^a · e^(bX)". */
  equationOriginalLatex: string;
  /** Coefficients { intercept: a, slope: b } on the transformed scale. */
  coefficients: { intercept: number; slope: number };
  /** Fit metrics — all on the transformed scale (spec §12). */
  fit: {
    rSquared: number;
    rSquaredRaw: number;
    correlation: number;
    sse: number;
    /** @deprecated Use residualStandardError. Same value. */
    rmse: number;
    residualStandardError: number;
    predictionRMSE: number;
  };
  /** Per-observation prediction and residual rows (spec §11). */
  predictions: LogRegressionPrediction[];
  /** The 11-step calculation trace (spec §16). */
  calculationTrace: CalculationStep[];
  /** Coefficient interpretation (spec §9, §10). */
  interpretation: CoefficientInterpretation;
  /** Confidence level used for interval calculations. */
  confidenceLevel: number;
  /** Optional labels for the variables (used for display strings). */
  xLabel?: string;
  yLabel?: string;
};

export type LogRegressionErrorType =
  | 'INSUFFICIENT_DATA'
  | 'ZERO_VARIANCE_X'
  | 'DOMAIN_ERROR'
  | 'NON_FINITE_VALUE';

export type LogRegressionError = {
  type: LogRegressionErrorType;
  message: string;
  /** Offending rows (1-indexed for human display). */
  invalidRows?: { row: number; x?: number; y?: number; reason: string }[];
};

export type LogRegressionAnalysis =
  | { status: 'success'; result: LogRegressionResult }
  | { status: 'error'; error: LogRegressionError };

/**
 * Phase 3: Regression mode selector (spec §24).
 * - 'linear'   → standard OLS on raw Y
 * - 'log-linear' → OLS on transformed Y (ln or log10)
 */
export type RegressionMode = 'linear' | 'log-linear';

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
  category: 'linear-regression' | 'r-squared' | 'residuals' | 'transformations' | 'pk' | 'log-linear';
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

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

// ===========================================================================
// Phase 4 — Pharmacokinetics Analysis Engine types (spec §4, §8, §12-§15)
// ===========================================================================

/**
 * Phase 4: Route of administration. Currently only IV bolus is supported
 * for derived-parameter calculation (Vd, CL); other routes are accepted
 * but skip those derivations. Future phases may add oral, infusion, etc.
 */
export type PKRoute = 'iv-bolus' | 'iv-infusion' | 'oral' | 'im' | 'unknown';

/**
 * Phase 4: A single observation in a concentration-time dataset.
 * Extends the existing PKDataPoint with optional dose/route/F metadata
 * for forward-compatibility with future PK phases (spec §4).
 */
export type PKObservation = {
  id: string;
  time: number;
  concentration: number;
};

/**
 * Phase 4: Linear trapezoidal AUC components (spec §13, §14).
 *
 *   AUC_last  = Σ [(C_i + C_{i+1}) / 2] × (t_{i+1} − t_i)    (observed data only)
 *   AUC_extra = C_last / k                                     (model-based extrapolation)
 *   AUC_total = AUC_last + AUC_extra
 *
 * AUC_theoretical = C₀ / k is the model-based AUC from Phase 2 (kept separate
 * so users can compare observed trapezoidal AUC against the theoretical
 * mono-exponential AUC as a model-fit diagnostic).
 */
export type TrapezoidalAUC = {
  /** Trapezoidal AUC over observed data points: AUC_last = Σ trapezoid areas. */
  aucLast: number;
  /** Per-interval trapezoid areas (length = n−1). */
  intervals: { tStart: number; tEnd: number; cStart: number; cEnd: number; area: number }[];
  /**
   * Extrapolated AUC from C_last to infinity: AUC_extra = C_last / k.
   * NaN when k ≤ 0 or C_last ≤ 0.
   */
  aucExtra: number;
  /** AUC_total = AUC_last + AUC_extra. NaN when AUC_extra is NaN. */
  aucTotal: number;
  /**
   * Theoretical AUC from the fitted model: AUC_theoretical = C₀ / k.
   * (Same as Phase 2 `auc` field, repeated here for comparison.)
   */
  aucTheoretical: number;
  /** Fraction of total AUC that is extrapolated: AUC_extra / AUC_total. */
  extrapFraction: number;
  /** True if extrapolation could not be computed (k invalid). */
  extrapolationSuppressed: boolean;
  /** Reason extrapolation was suppressed, if applicable. */
  extrapolationSuppressedReason?: string;
};

/**
 * Phase 4: Terminal-phase point selection (spec §15).
 *
 * The terminal elimination phase is the subset of observations used to fit
 * the log-linear regression. Selecting too few points gives unstable slopes;
 * selecting too many (including distribution/absorption phase points) biases
 * the slope. The selected approach is deterministic and documented.
 */
export type TerminalPhase = {
  /** Indices (0-based) of the selected points in the original data array. */
  selectedIndices: number[];
  /** Number of points used in the terminal regression. */
  pointCount: number;
  /** Time range of selected points. */
  timeRange: { start: number; end: number };
  /** Selection method identifier (e.g. 'all-points', 'best-rsquared-suffix'). */
  method: string;
  /** Human-readable explanation of how points were selected. */
  explanation: string;
  /** R² achieved by the regression on the selected points (educational). */
  rSquared: number;
};

/**
 * Phase 4: Per-observation prediction and residual row (spec §11, §12).
 *
 * Distinguishes:
 *   - observed concentration (raw measurement)
 *   - transformed concentration (ln(C) or log10(C))
 *   - predicted transformed value (ẑ = a + b·t)
 *   - predicted concentration (back-transformed: ŷ = exp(ẑ) or 10^ẑ)
 *   - transformed residual (e_i = z_i − ẑ_i) — what OLS minimizes
 *   - original-scale residual (y_i − ŷ_i) — informational only
 */
export type PKPredictionRow = {
  id: string;
  time: number;
  concentrationObserved: number;
  concentrationTransformed: number;
  concentrationPredictedTransformed: number;
  concentrationPredicted: number;
  residualTransformed: number;
  residualOriginal: number;
  /** True if this point is in the selected terminal phase. */
  inTerminalPhase: boolean;
};

/**
 * Phase 4: PK calculation step (spec §17). Same shape as Phase 3 CalculationStep
 * but kept as a separate type to allow PK-specific extensions in the future.
 */
export type PKCalculationStep = {
  step: number;
  title: string;
  description: string;
  /** KaTeX math string with full-precision values (no rounding). */
  formulaLatex: string;
  /** Short human-readable result summary. */
  result: string;
};

/**
 * Phase 4: Structured PK warning (spec §22, §29). Non-fatal issues that
 * the user should be aware of but that do not prevent analysis.
 */
export type PKWarning = {
  code:
    | 'POSITIVE_SLOPE'
    | 'POOR_TERMINAL_FIT'
    | 'HIGH_EXTRAPOLATION_FRACTION'
    | 'FEW_TERMINAL_POINTS'
    | 'NON_MONOTONIC_TIME'
    | 'DUPLICATE_TIMES'
    | 'INSUFFICIENT_VARIATION';
  message: string;
  severity: 'info' | 'caution' | 'warning';
};

/**
 * Phase 4: Educational interpretation narratives (spec §19).
 */
export type PKInterpretation = {
  /** Narrative for the elimination rate constant k. */
  kNarrative: string;
  /** Narrative for the half-life t½. */
  halfLifeNarrative: string;
  /** Narrative for R² (with the caveat that high R² ≠ model validity). */
  rSquaredNarrative: string;
  /** Narrative for the extrapolated C₀. */
  c0Narrative: string;
  /** Narrative for AUC (if computed). */
  aucNarrative: string;
};

/**
 * Phase 4: Comprehensive PK analysis result (spec §8).
 *
 * This is the canonical result type returned by the Phase 4 PK analysis
 * engine. It composes:
 *   - the Phase 2 PKRegressionResult (slope, intercept, k, t½, C₀, AUC_theoretical)
 *   - the Phase 3 LogRegressionResult's underlying OLS statistics
 *   - Phase 4 additions: trapezoidal AUC, terminal phase, predictions,
 *     calculation trace, interpretation, warnings
 */
export type PKAnalysisSuccess = {
  status: 'success';
  /** Log base used for the transformation. */
  logBase: LogBase;
  /** Original observations. */
  rawData: PKObservation[];
  /** Phase 2 compatible regression result (slope, intercept, k, t½, C₀, AUC=C₀/k). */
  regression: PKRegressionResult;
  /** Underlying OLS statistics on the transformed scale. */
  olsStatistics: RegressionStatistics;
  /** Trapezoidal AUC components (spec §13, §14). */
  trapezoidalAUC: TrapezoidalAUC;
  /** Terminal-phase selection metadata (spec §15). */
  terminalPhase: TerminalPhase;
  /** Per-observation predictions and residuals (spec §11, §12). */
  predictions: PKPredictionRow[];
  /** PK calculation trace (spec §17). */
  calculationTrace: PKCalculationStep[];
  /** Educational interpretation narratives (spec §19). */
  interpretation: PKInterpretation;
  /** Non-fatal warnings (spec §22, §29). */
  warnings: PKWarning[];
  /** Confidence level used for any interval calculations. */
  confidenceLevel: number;
  /** Units used for display. */
  units: PKUnits;
  /** Optional dose for Vd/CL derivation. */
  dose?: number;
};

/**
 * Phase 4: PK analysis error.
 * Fatal validation errors that prevent analysis.
 */
export type PKAnalysisError = {
  status: 'error';
  type:
    | 'INSUFFICIENT_DATA'
    | 'LENGTH_MISMATCH'
    | 'NON_FINITE_VALUE'
    | 'NON_POSITIVE_CONCENTRATION'
    | 'DUPLICATE_TIMES'
    | 'ZERO_TIME_VARIANCE'
    | 'INVALID_REGRESSION';
  message: string;
  /** Offending rows (1-indexed for human display). */
  invalidRows?: { row: number; time?: number; concentration?: number; reason: string }[];
};

export type PKAnalysisOutcome = PKAnalysisSuccess | PKAnalysisError;

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

// Phase 6: AppNavSection now includes 'analysis'. The full definition is at
// the bottom of this file (after Phase 6 types) to keep all nav options
// in one place. The duplicate is intentionally removed here.

// ===========================================================================
// Phase 5 — Learning & Interactive Education Engine types (spec §2, §14, §18)
// ===========================================================================

/**
 * Phase 5: Structured lesson category (spec §1).
 * Maps to the five learning modules A-E.
 */
export type LessonCategory = 'regression-fundamentals' | 'ols' | 'diagnostics' | 'transformations' | 'pk';

/**
 * Phase 5: Difficulty levels for lessons and practice questions.
 */
export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Phase 5: A single section within a structured lesson (spec §2).
 *
 * Lessons are data-driven — each section is one of:
 *   - 'text'       : prose explanation
 *   - 'formula'    : KaTeX formula + explanation
 *   - 'example'    : worked example (optionally tied to a sample dataset)
 *   - 'interactive': embedded interactive component (by componentId)
 *   - 'question'   : inline practice question
 *
 * This discriminated union enables type-safe rendering in LessonViewer.
 */
export type LessonSection =
  | { type: 'text'; title: string; content: string }
  | { type: 'formula'; title: string; formula: string; explanation: string }
  | { type: 'example'; title: string; datasetId?: string; explanation: string }
  | { type: 'interactive'; title: string; componentId: string }
  | {
      type: 'question';
      title: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      mistakeCategory?: LearningMistake;
    };

/**
 * Phase 5: A structured lesson (spec §2).
 *
 * Lessons are composed of sections and can be navigated sequentially.
 * The LessonViewer renders each section type with appropriate formatting.
 */
export type StructuredLesson = {
  id: string;
  title: string;
  description: string;
  category: LessonCategory;
  module: 'A' | 'B' | 'C' | 'D' | 'E';
  difficulty: LessonDifficulty;
  estimatedMinutes?: number;
  objectives: string[];
  sections: LessonSection[];
  keyTakeaways: string[];
};

/**
 * Phase 5: A learning module (spec §1) — a collection of lessons.
 */
export type LearningModule = {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  title: string;
  description: string;
  category: LessonCategory;
  lessonIds: string[];
};

/**
 * Phase 5: Structured mistake categories (spec §14).
 *
 * Used by the mistake engine to provide context-sensitive explanations
 * when a learner submits an incorrect answer.
 */
export type LearningMistake =
  | 'wrong-sign'
  | 'wrong-transformation'
  | 'wrong-formula'
  | 'wrong-interpretation'
  | 'rounding-too-early'
  | 'domain-error'
  | 'unit-error'
  | 'r2-misinterpretation'
  | 'pk-slope-sign'
  | 'conceptual'
  | 'calculation';

/**
 * Phase 5: An expanded practice question (spec §12, §13, §14).
 *
 * Extends the existing QuizQuestion with:
 *   - mistakeCategory (for mistake-engine explanation)
 *   - hint (optional, shown after first incorrect attempt)
 *   - difficulty
 *   - estimatedMinutes
 *
 * The existing QuizQuestion type is kept for backward compatibility;
 * new Phase 5 questions use this richer type.
 */
export type PracticeQuestionV2 = {
  id: string;
  category: LessonCategory | 'general';
  type: 'conceptual' | 'calculation' | 'interpretation' | 'pk' | 'error-identification';
  difficulty: LessonDifficulty;
  title: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
  /** Mistake category for the most-common wrong answer (spec §14). */
  mistakeCategory?: LearningMistake;
  /** Optional hint shown after the first incorrect attempt. */
  hint?: string;
  formulaNote?: string;
  estimatedMinutes?: number;
};

/**
 * Phase 5: Result of validating a practice answer (spec §13, §14).
 *
 * The practice engine returns a structured result so the UI can show
 * "Not quite" + the conceptual explanation + the mistake category,
 * rather than just "Wrong".
 */
export type PracticeAnswerResult = {
  isCorrect: boolean;
  /** Index of the selected option. */
  selectedIndex: number;
  /** Index of the correct option. */
  correctIndex: number;
  /** The explanation string (from the question). */
  explanation: string;
  /** The mistake category (if the question has one and the answer is wrong). */
  mistakeCategory?: LearningMistake;
  /** Context-sensitive mistake explanation (from the mistake engine). */
  mistakeExplanation?: string;
  /** Whether to show the hint on retry. */
  showHint: boolean;
  /** The hint text (if any). */
  hint?: string;
};

/**
 * Phase 5: Learning progress persisted to localStorage (spec §18).
 *
 * Tracking is lightweight and transparent — it is NOT a scientifically
 * validated competency measure (spec §19).
 */
export type LearningProgress = {
  /** IDs of completed lessons. */
  completedLessons: string[];
  /** IDs of completed practice questions (answered correctly at least once). */
  completedQuestions: string[];
  /** Per-topic scores: { 'regression-fundamentals': 0.8, ... } in [0, 1]. */
  topicScores: Partial<Record<LessonCategory, number>>;
  /** Total questions answered correctly. */
  totalCorrect: number;
  /** Total questions attempted. */
  totalAttempted: number;
  /** ISO timestamp of last activity. */
  lastActivityAt?: string;
};

/**
 * Phase 5: A single step in a guided calculation (spec §3, §4).
 *
 * The guided calculation engine (lib/learning/guidedCalculation.ts) produces
 * a sequence of GuidedStep objects by consuming the existing Phase 2
 * regression engine's RegressionStatistics. The UI reveals them one at a
 * time with progressive disclosure.
 */
export type GuidedStep = {
  step: number;
  title: string;
  description: string;
  /** KaTeX formula string with full-precision values (no rounding). */
  formulaLatex: string;
  /** Short human-readable result summary. */
  result: string;
  /** Optional per-observation table data for this step. */
  table?: {
    headers: string[];
    rows: (string | number)[][];
  };
};

/**
 * Phase 5: A guided calculation trace (spec §3, §4, §11).
 *
 * Produced by consuming the existing Phase 2 RegressionStatistics
 * (for OLS guided calculation) or Phase 4 PKAnalysisSuccess (for PK
 * guided calculation). No duplicate math.
 */
export type GuidedCalculationTrace = {
  steps: GuidedStep[];
  totalSteps: number;
  /** The dataset the trace was generated from (for display). */
  sourceDatasetLabel?: string;
  /** The regression engine result that produced this trace. */
  engineResultType: 'ols' | 'pk';
};

// ===========================================================================
// Phase 6 — Advanced Analysis, Diagnostics & Scientific Reporting (spec §3-§21)
// ===========================================================================

/**
 * Phase 6: Diagnostic flags for a single observation (spec §6).
 *
 * Flags are educational indicators — they do NOT mean an observation is
 * "wrong" or should be deleted (spec §29). The UI uses cautious wording:
 * "Potential outlier", "High leverage", "Potentially influential".
 */
export type DiagnosticFlag =
  | 'large-residual'
  | 'high-leverage'
  | 'potentially-influential'
  | 'potential-outlier'
  | 'review-observation';

/**
 * Phase 6: Per-observation diagnostic summary (spec §6).
 *
 * Consumes the Phase 2 RegressionPoint (which already has leverage,
 * Cook's distance, and studentized residuals) and adds structured flags.
 */
export type ObservationDiagnostic = {
  index: number;
  id: string;
  x: number;
  y: number;
  fitted: number;
  residual: number;
  standardizedResidual: number;
  studentizedResidual: number;
  leverage: number;
  cooksDistance: number;
  flags: DiagnosticFlag[];
};

/**
 * Phase 6: Summary of all observation diagnostics (spec §7).
 */
export type DiagnosticsSummary = {
  observations: ObservationDiagnostic[];
  n: number;
  maxLeverage: number;
  maxCooksDistance: number;
  meanLeverage: number;
  flaggedCount: number;
  flags: DiagnosticFlag[];
  /** Documented thresholds used for flagging (spec §6). */
  thresholds: {
    leverageThreshold: number;
    cooksThreshold: number;
    studentizedResidualThreshold: number;
  };
};

/**
 * Phase 6: Residual pattern classification (spec §9).
 *
 * The classification is educational and cautious — it does not make
 * definitive statistical claims (spec §28).
 */
export type ResidualPattern =
  | 'random'
  | 'curvature'
  | 'heteroscedasticity'
  | 'insufficient-data';

export type ResidualDiagnosticsResult = {
  pattern: ResidualPattern;
  patternDescription: string;
  residualSum: number;
  residualMean: number;
  maxAbsResidual: number;
  maxAbsStudentizedResidual: number;
  /** Data for Q-Q plot (theoretical quantiles vs ordered residuals). */
  qqPlotData: { theoretical: number; observed: number; index: number }[];
  /** Data for residual histogram. */
  histogramBins: { binStart: number; binEnd: number; count: number }[];
  /** Data for scale-location plot (fitted vs √|standardized residual|). */
  scaleLocationData: { fitted: number; sqrtAbsStdResidual: number }[];
  interpretation: string;
};

/**
 * Phase 6: Confidence/prediction interval band data (spec §10).
 *
 * Reuses the Phase 2 `predictY` function. The band is a set of (x, y, ciLower,
 * ciUpper, piLower, piUpper) points across the X range for visualization.
 */
export type IntervalBandPoint = {
  x: number;
  predicted: number;
  ciLower: number;
  ciUpper: number;
  piLower: number;
  piUpper: number;
};

export type IntervalBand = {
  points: IntervalBandPoint[];
  confidenceLevel: number;
  /** True if the band could not be computed (df ≤ 0 or sxx ≤ 0). */
  suppressed: boolean;
  suppressedReason?: string;
};

/**
 * Phase 6: Model comparison entry (spec §12, §13).
 *
 * CRITICAL (spec §12): R² values across different response scales are NOT
 * directly comparable. The comparison entry explicitly labels the scale.
 */
export type ModelComparisonEntry = {
  modelId: string;
  modelName: string;
  transformation: 'none' | 'ln' | 'log10';
  /** The scale on which R² is computed (spec §12). */
  rSquaredScale: 'original-Y' | 'ln(Y)' | 'log10(Y)';
  rSquared: number;
  adjustedRSquared: number;
  residualStandardError: number;
  rmse: number;
  /** RMSE back-transformed to original Y scale (for ln/log10 models). */
  rmseOriginalScale?: number;
  slope: number;
  intercept: number;
  n: number;
  /** Whether the transformation domain is valid (all Y > 0 for log). */
  domainValid: boolean;
  domainError?: string;
  equation: string;
  backTransformedEquation?: string;
  /** Educational note about this model's interpretability. */
  interpretabilityNote: string;
};

export type ModelComparisonResult = {
  models: ModelComparisonEntry[];
  /** Educational warning about cross-scale R² comparison (spec §12). */
  comparisonCaveat: string;
};

/**
 * Phase 6: Structured scientific finding (spec §19).
 *
 * The interpretation engine generates findings with conservative language.
 * Never "Model is proven correct." Instead: "Results are consistent with..."
 */
export type ScientificFinding = {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  title: string;
  explanation: string;
  recommendation?: string;
};

/**
 * Phase 6: PK terminal-phase sensitivity entry (spec §16).
 *
 * Shows how k, t½, R², and intercept change when different numbers of
 * terminal points are used. This is an educational diagnostic — it does
 * NOT automatically select the "best" phase (spec §16).
 */
export type TerminalPhaseSensitivityEntry = {
  pointCount: number;
  timeRange: { start: number; end: number };
  slope: number;
  intercept: number;
  k: number;
  halfLife: number;
  rSquared: number;
};

export type TerminalPhaseSensitivityResult = {
  entries: TerminalPhaseSensitivityEntry[];
  /** Educational caveat (spec §16). */
  caveat: string;
};

/**
 * Phase 6: PK AUC report (spec §17).
 */
export type PKAUCReport = {
  aucLast: number;
  aucExtra: number;
  aucTotal: number;
  aucTheoretical: number;
  cLast: number;
  tLast: number;
  k: number;
  extrapPercentage: number;
  extrapolationSuppressed: boolean;
  suppressedReason?: string;
};

/**
 * Phase 6: Machine-readable analysis report (spec §21).
 */
export type AnalysisReport = {
  metadata: {
    generatedAt: string;
    applicationVersion: string;
    analysisType: 'ols' | 'log-linear' | 'pk';
  };
  dataset: {
    n: number;
    xLabel: string;
    yLabel: string;
    xUnit?: string;
    yUnit?: string;
    xRange: { min: number; max: number };
    yRange: { min: number; max: number };
    points: { x: number; y: number }[];
  };
  regression?: {
    model: string;
    transformation: string;
    slope: number;
    intercept: number;
    rSquared: number;
    adjustedRSquared: number;
    residualStandardError: number;
    rmse: number;
    sse: number;
    sst: number;
    ssr: number;
    n: number;
    degreesOfFreedom: number;
    pValueSlope?: number;
    fStat?: number;
    equation: string;
  };
  diagnostics?: {
    maxLeverage: number;
    maxCooksDistance: number;
    meanLeverage: number;
    flaggedObservations: number;
    flags: DiagnosticFlag[];
    residualPattern: ResidualPattern;
  };
  transformation?: {
    type: string;
    domainValid: boolean;
    backTransformedEquation?: string;
  };
  pharmacokinetics?: {
    logBase: string;
    k: number;
    halfLife: number;
    c0: number;
    aucLast: number;
    aucExtra: number;
    aucTotal: number;
    extrapPercentage: number;
    terminalPhasePoints: number;
    terminalPhaseRange: { start: number; end: number };
    rSquared: number;
  };
  findings: ScientificFinding[];
  warnings: string[];
};

/**
 * Phase 6: Analysis history entry (spec §22).
 */
export type AnalysisHistoryEntry = {
  id: string;
  timestamp: string;
  analysisType: 'ols' | 'log-linear' | 'pk';
  datasetName: string;
  transformation: string;
  keyResults: {
    slope?: number;
    intercept?: number;
    rSquared?: number;
    k?: number;
    halfLife?: number;
    c0?: number;
    aucTotal?: number;
  };
  /** Full report snapshot for reproducibility (spec §23). */
  reportSnapshot: AnalysisReport;
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
  | 'settings'
  | 'analysis';

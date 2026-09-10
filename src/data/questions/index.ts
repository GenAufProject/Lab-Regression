import { PracticeQuestionV2 } from '../../types';

/**
 * Phase 5 — Expanded Practice Questions (spec §12, §13, §14).
 *
 * Each question includes:
 *   - mistakeCategory: for context-sensitive mistake explanations (spec §14)
 *   - hint: shown after the first incorrect attempt (spec §13)
 *   - difficulty + type: for filtering and progress tracking
 *
 * Spec §12 question types:
 *   - conceptual (A)
 *   - calculation (B)
 *   - interpretation (C)
 *   - pk (D)
 *   - error-identification (E)
 *
 * Existing quizQuestions.ts (16 questions, Phase 1-4) is preserved.
 * These new questions use the richer PracticeQuestionV2 type.
 */

export const PRACTICE_QUESTIONS_V2: PracticeQuestionV2[] = [
  // ========================================================================
  // Type A — Conceptual
  // ========================================================================
  {
    id: 'p01-slope-meaning',
    category: 'regression-fundamentals',
    type: 'conceptual',
    difficulty: 'beginner',
    title: 'Meaning of the slope',
    prompt:
      'In a simple linear regression ŷ = a + bX, what does the slope b represent?',
    options: [
      { id: 'a', text: 'The predicted Y when X = 0.', isCorrect: false },
      { id: 'b', text: 'The estimated change in Y for a one-unit increase in X.', isCorrect: true },
      { id: 'c', text: 'The proportion of variance in Y explained by X.', isCorrect: false },
      { id: 'd', text: 'The correlation between X and Y.', isCorrect: false },
    ],
    explanation:
      'The slope b is the rate of change: for every 1-unit increase in X, Y is expected to change by b units. ' +
      'The intercept (not slope) is the predicted Y at X = 0. R² (not slope) is the variance explained. ' +
      'Correlation is a separate symmetric measure.',
    mistakeCategory: 'conceptual',
    hint: 'Think about what "rate of change" means — ΔY / ΔX.',
    estimatedMinutes: 2,
  },
  {
    id: 'p02-r2-interpretation',
    category: 'regression-fundamentals',
    type: 'interpretation',
    difficulty: 'intermediate',
    title: 'R² = 0.92 — what can we conclude?',
    prompt:
      'A regression produces R² = 0.92. Which conclusion is justified?',
    options: [
      { id: 'a', text: 'The model is definitely correct and X causes Y.', isCorrect: false },
      { id: 'b', text: '92% of the variance in Y is explained by the linear relationship with X, but the model may still be inappropriate.', isCorrect: true },
      { id: 'c', text: 'The residual plot must show random scatter.', isCorrect: false },
      { id: 'd', text: 'R² = 0.92 proves the relationship is linear.', isCorrect: false },
    ],
    explanation:
      'R² = 0.92 means 92% of variance is explained by the LINEAR fit. It does NOT prove correctness, causation, or linearity — ' +
      'a curved relationship can have high R² when forced into a line. Always examine the residual plot.',
    mistakeCategory: 'r2-misinterpretation',
    hint: 'R² measures variance explained by the LINEAR fit, not model correctness.',
    estimatedMinutes: 3,
  },
  {
    id: 'p03-correlation-vs-regression',
    category: 'regression-fundamentals',
    type: 'conceptual',
    difficulty: 'beginner',
    title: 'Correlation vs regression',
    prompt: 'Which statement best distinguishes regression from correlation?',
    options: [
      { id: 'a', text: 'Regression is symmetric; correlation is directional.', isCorrect: false },
      { id: 'b', text: 'Regression provides a prediction equation; correlation only summarizes strength of association.', isCorrect: true },
      { id: 'c', text: 'Regression requires categorical data; correlation requires numeric data.', isCorrect: false },
      { id: 'd', text: 'Regression proves causation; correlation does not.', isCorrect: false },
    ],
    explanation:
      'Regression is directional — it produces an equation that predicts Y from X. Correlation is symmetric and only measures strength. ' +
      'Neither proves causation.',
    mistakeCategory: 'wrong-interpretation',
    hint: 'Regression gives you an equation; correlation gives you a single number.',
    estimatedMinutes: 2,
  },

  // ========================================================================
  // Type B — Calculation
  // ========================================================================
  {
    id: 'p04-slope-from-sxy-sxx',
    category: 'ols',
    type: 'calculation',
    difficulty: 'intermediate',
    title: 'Calculate slope from Sxy and Sxx',
    prompt: 'Given Sxy = 8 and Sxx = 4, what is the slope b?',
    options: [
      { id: 'a', text: 'b = 0.5', isCorrect: false },
      { id: 'b', text: 'b = 2', isCorrect: true },
      { id: 'c', text: 'b = 4', isCorrect: false },
      { id: 'd', text: 'b = 32', isCorrect: false },
    ],
    explanation:
      'b = Sxy / Sxx = 8 / 4 = 2. The slope is the ratio of the covariance sum to the variance sum of X.',
    mistakeCategory: 'calculation',
    hint: 'b = Sxy / Sxx.',
    estimatedMinutes: 2,
  },
  {
    id: 'p05-predict-y',
    category: 'ols',
    type: 'calculation',
    difficulty: 'intermediate',
    title: 'Predict Y from the regression equation',
    prompt: 'Given ŷ = 10 + 2X, what is the predicted Y at X = 5?',
    options: [
      { id: 'a', text: 'Ŷ = 15', isCorrect: false },
      { id: 'b', text: 'Ŷ = 20', isCorrect: true },
      { id: 'c', text: 'Ŷ = 25', isCorrect: false },
      { id: 'd', text: 'Ŷ = 50', isCorrect: false },
    ],
    explanation:
      'Ŷ = 10 + 2(5) = 10 + 10 = 20. Plug the X value into the equation: intercept + slope × X.',
    mistakeCategory: 'calculation',
    hint: 'Ŷ = intercept + slope × X = 10 + 2 × 5.',
    estimatedMinutes: 1,
  },
  {
    id: 'p06-residual-calculation',
    category: 'diagnostics',
    type: 'calculation',
    difficulty: 'intermediate',
    title: 'Calculate a residual',
    prompt: 'An observation has Y = 8 and the regression predicts Ŷ = 10. What is the residual?',
    options: [
      { id: 'a', text: 'e = +2 (model under-predicted)', isCorrect: false },
      { id: 'b', text: 'e = −2 (model over-predicted)', isCorrect: true },
      { id: 'c', text: 'e = +8', isCorrect: false },
      { id: 'd', text: 'e = 10', isCorrect: false },
    ],
    explanation:
      'e = Y − Ŷ = 8 − 10 = −2. A NEGATIVE residual means the model OVER-predicted (predicted 10, observed 8). ' +
      'A positive residual means under-prediction.',
    mistakeCategory: 'wrong-sign',
    hint: 'Residual = observed − predicted. Negative means over-prediction.',
    estimatedMinutes: 2,
  },

  // ========================================================================
  // Type C — Interpretation
  // ========================================================================
  {
    id: 'p07-residual-pattern-curve',
    category: 'diagnostics',
    type: 'interpretation',
    difficulty: 'intermediate',
    title: 'Interpret a curved residual pattern',
    prompt: 'A residual plot shows a clear U-shape. What is the most likely issue?',
    options: [
      { id: 'a', text: 'The residuals are heteroscedastic (non-constant variance).', isCorrect: false },
      { id: 'b', text: 'The relationship is non-linear and a straight line is inappropriate.', isCorrect: true },
      { id: 'c', text: 'There are too many outliers.', isCorrect: false },
      { id: 'd', text: 'R² is too high.', isCorrect: false },
    ],
    explanation:
      'A U-shaped residual pattern indicates curvature — the linear model misses the true (curved) relationship. ' +
      'Consider a log transformation (for exponential curvature) or a polynomial term. ' +
      'Fanning (not U-shape) indicates heteroscedasticity.',
    mistakeCategory: 'wrong-interpretation',
    hint: 'U-shape = curvature; fanning = heteroscedasticity.',
    estimatedMinutes: 3,
  },
  {
    id: 'p08-intercept-extrapolation',
    category: 'regression-fundamentals',
    type: 'interpretation',
    difficulty: 'intermediate',
    title: 'Intercept as extrapolation',
    prompt:
      'A regression of blood pressure on age (ages 40-80) has intercept 80. What does the intercept mean?',
    options: [
      { id: 'a', text: 'The predicted blood pressure at age 0 is 80, but this is an extrapolation outside the observed age range.', isCorrect: true },
      { id: 'b', text: 'The average blood pressure in the sample is 80.', isCorrect: false },
      { id: 'c', text: 'Blood pressure increases by 80 per year of age.', isCorrect: false },
      { id: 'd', text: 'The intercept is meaningless and should be ignored.', isCorrect: false },
    ],
    explanation:
      'The intercept is the predicted Y at X = 0. Since the data only covers ages 40-80, predicting at age 0 is an extrapolation ' +
      'outside the observed range — it may not be physically meaningful.',
    mistakeCategory: 'wrong-interpretation',
    hint: 'The intercept is the prediction at X = 0. Is X = 0 in the data range?',
    estimatedMinutes: 3,
  },

  // ========================================================================
  // Type D — PK
  // ========================================================================
  {
    id: 'p09-pk-k-from-ln-slope',
    category: 'pk',
    type: 'pk',
    difficulty: 'intermediate',
    title: 'k from ln slope',
    prompt:
      'An ln(C) vs time regression has slope = −0.2 h⁻¹. What is the elimination rate constant k?',
    options: [
      { id: 'a', text: 'k = 0.2 h⁻¹', isCorrect: true },
      { id: 'b', text: 'k = −0.2 h⁻¹', isCorrect: false },
      { id: 'c', text: 'k = 0.2 × ln(10) ≈ 0.46 h⁻¹', isCorrect: false },
      { id: 'd', text: 'k = 0.2 / ln(2) ≈ 0.29 h⁻¹', isCorrect: false },
    ],
    explanation:
      'For ln model: slope = −k, so k = −slope = −(−0.2) = 0.2 h⁻¹. k is always positive for elimination. ' +
      'Option c uses the log10 formula; option d confuses with the half-life formula.',
    mistakeCategory: 'pk-slope-sign',
    hint: 'For ln: k = −slope. k must be positive.',
    formulaNote: 'k = -\\text{slope} = -(-0.2) = 0.2 \\text{ h}^{-1}',
    estimatedMinutes: 2,
  },
  {
    id: 'p10-pk-half-life',
    category: 'pk',
    type: 'pk',
    difficulty: 'intermediate',
    title: 'Half-life from k',
    prompt: 'Given k = 0.2 h⁻¹, what is the elimination half-life t½?',
    options: [
      { id: 'a', text: 't½ ≈ 3.47 h', isCorrect: true },
      { id: 'b', text: 't½ ≈ 0.35 h', isCorrect: false },
      { id: 'c', text: 't½ = 0.2 h', isCorrect: false },
      { id: 'd', text: 't½ = 5 h', isCorrect: false },
    ],
    explanation:
      't½ = ln(2)/k ≈ 0.69315/0.2 ≈ 3.47 h. Half-life is inversely proportional to k. ' +
      'After one half-life, concentration drops to 50%; after 5 half-lives, ~97% is eliminated.',
    mistakeCategory: 'wrong-formula',
    hint: 't½ = ln(2)/k ≈ 0.693/k.',
    formulaNote: 't_{1/2} = \\frac{\\ln(2)}{k} = \\frac{0.69315}{0.2} \\approx 3.47 \\text{ h}',
    estimatedMinutes: 2,
  },
  {
    id: 'p11-pk-log10-conversion',
    category: 'pk',
    type: 'pk',
    difficulty: 'advanced',
    title: 'k from log10 slope',
    prompt:
      'A log10(C) vs time regression has slope = −0.0869 h⁻¹. What is k?',
    options: [
      { id: 'a', text: 'k = 0.0869 h⁻¹', isCorrect: false },
      { id: 'b', text: 'k = −0.0869 h⁻¹', isCorrect: false },
      { id: 'c', text: 'k = 0.0869 × ln(10) ≈ 0.2 h⁻¹', isCorrect: true },
      { id: 'd', text: 'k = 0.0869 / ln(10) ≈ 0.0377 h⁻¹', isCorrect: false },
    ],
    explanation:
      'For log10 model: slope = −k/ln(10), so k = −slope × ln(10) = −(−0.0869) × 2.303 ≈ 0.2 h⁻¹. ' +
      'Using k = −slope (the ln formula) with a log10 slope is a classic error — the factor ln(10) ≈ 2.303 is required.',
    mistakeCategory: 'wrong-transformation',
    hint: 'For log10: k = −slope × ln(10) ≈ −2.303 × slope.',
    formulaNote: 'k = -\\text{slope} \\cdot \\ln(10) = -(-0.0869) \\times 2.303 \\approx 0.2 \\text{ h}^{-1}',
    estimatedMinutes: 3,
  },
  {
    id: 'p12-pk-c0-recovery',
    category: 'pk',
    type: 'pk',
    difficulty: 'intermediate',
    title: 'C₀ from intercept',
    prompt:
      'In an ln(C) vs time regression, the intercept is 2.3026. What is C₀?',
    options: [
      { id: 'a', text: 'C₀ = e^2.3026 ≈ 10 mg/L', isCorrect: true },
      { id: 'b', text: 'C₀ = 2.3026 mg/L', isCorrect: false },
      { id: 'c', text: 'C₀ = 10^2.3026 ≈ 201 mg/L', isCorrect: false },
      { id: 'd', text: 'C₀ = ln(2.3026) ≈ 0.834 mg/L', isCorrect: false },
    ],
    explanation:
      'For ln model, intercept = ln(C₀), so C₀ = e^intercept = e^2.3026 ≈ 10 mg/L. ' +
      'Option c uses the log10 back-transform (10^x); option b forgets to back-transform.',
    mistakeCategory: 'wrong-transformation',
    hint: 'For ln model, back-transform via exp. For log10, via 10^x.',
    formulaNote: 'C_0 = e^{\\text{intercept}} = e^{2.3026} \\approx 10 \\text{ mg/L}',
    estimatedMinutes: 2,
  },

  // ========================================================================
  // Type E — Error identification
  // ========================================================================
  {
    id: 'p13-error-k-equals-slope',
    category: 'pk',
    type: 'error-identification',
    difficulty: 'intermediate',
    title: 'Find the error: k = slope',
    prompt:
      'A student computes k = slope = −0.15 h⁻¹ from an ln(C) regression. What is wrong?',
    options: [
      { id: 'a', text: 'Nothing — k = slope is correct for ln regression.', isCorrect: false },
      { id: 'b', text: 'The student forgot the negative sign: k = −slope, so k = 0.15 h⁻¹ (positive).', isCorrect: true },
      { id: 'c', text: 'The student should have used log10 instead of ln.', isCorrect: false },
      { id: 'd', text: 'The student should have multiplied by ln(2).', isCorrect: false },
    ],
    explanation:
      'For ln model, slope = −k, so k = −slope = −(−0.15) = +0.15 h⁻¹. The elimination rate constant must be POSITIVE. ' +
      'A negative k would mean concentration is increasing, which contradicts elimination.',
    mistakeCategory: 'pk-slope-sign',
    hint: 'k must be positive. The slope is negative. What is the relationship?',
    estimatedMinutes: 2,
  },
  {
    id: 'p14-error-ln-zero',
    category: 'transformations',
    type: 'error-identification',
    difficulty: 'intermediate',
    title: 'Find the error: ln(0)',
    prompt:
      'A dataset contains C = 0 at one time point. A student includes it in an ln(C) regression by setting ln(0) = 0. What is wrong?',
    options: [
      { id: 'a', text: 'Nothing — ln(0) = 0 is a reasonable approximation.', isCorrect: false },
      { id: 'b', text: 'ln(0) is undefined (−∞). The point must be rejected; it cannot be log-transformed.', isCorrect: true },
      { id: 'c', text: 'The student should have used log10 instead, since log10(0) = 0.', isCorrect: false },
      { id: 'd', text: 'The student should have set ln(0) = 1.', isCorrect: false },
    ],
    explanation:
      'ln(0) is undefined — as x → 0⁺, ln(x) → −∞. The logarithm is only defined for x > 0. ' +
      'A correct engine rejects the point with a structured error rather than substituting a value.',
    mistakeCategory: 'domain-error',
    hint: 'What is the domain of ln(x)?',
    estimatedMinutes: 2,
  },
  {
    id: 'p15-error-rounding',
    category: 'ols',
    type: 'error-identification',
    difficulty: 'advanced',
    title: 'Find the error: premature rounding',
    prompt:
      'A student rounds the slope to 2 decimals (b = 0.62) before computing k = −b. The original slope was 0.6197. What is wrong?',
    options: [
      { id: 'a', text: 'Nothing — rounding to 2 decimals is standard.', isCorrect: false },
      { id: 'b', text: 'Rounding before the final step propagates error. Use full precision (0.6197) and round only the displayed result.', isCorrect: true },
      { id: 'c', text: 'The student should have rounded to 1 decimal instead.', isCorrect: false },
      { id: 'd', text: 'The student should have used the intercept, not the slope.', isCorrect: false },
    ],
    explanation:
      'Premature rounding propagates error through subsequent calculations. The engine should keep full IEEE-754 precision ' +
      'and round only at the presentation layer. Rounding 0.6197 to 0.62 introduces a 0.05% error in k.',
    mistakeCategory: 'rounding-too-early',
    hint: 'When should rounding happen — during calculation or at display?',
    estimatedMinutes: 3,
  },

  // ========================================================================
  // Additional conceptual and transformation questions
  // ========================================================================
  {
    id: 'p16-ln-vs-log10-equivalence',
    category: 'transformations',
    type: 'conceptual',
    difficulty: 'advanced',
    title: 'ln vs log10 equivalence',
    prompt:
      'For the same dataset, you fit ln(C) and log10(C) regressions. Which PK parameters will be (approximately) identical?',
    options: [
      { id: 'a', text: 'The slope and intercept.', isCorrect: false },
      { id: 'b', text: 'k, t½, C₀, and back-transformed predictions.', isCorrect: true },
      { id: 'c', text: 'Only R².', isCorrect: false },
      { id: 'd', text: 'None — ln and log10 give completely different results.', isCorrect: false },
    ],
    explanation:
      'Slopes and intercepts differ by a factor of ln(10), but after applying the correct back-transform ' +
      '(k = −slope for ln vs k = −slope × ln(10) for log10), the physically meaningful PK parameters are identical. ' +
      'R² is also identical because it is scale-invariant for linear transforms.',
    mistakeCategory: 'wrong-transformation',
    hint: 'Slopes differ, but k and t½ should be the same after correct conversion.',
    estimatedMinutes: 3,
  },
  {
    id: 'p17-auc-extrapolation',
    category: 'pk',
    type: 'interpretation',
    difficulty: 'advanced',
    title: 'AUC extrapolation fraction',
    prompt:
      'A PK analysis reports extrapFraction = 35%. What does this indicate?',
    options: [
      { id: 'a', text: 'The analysis is invalid and must be discarded.', isCorrect: false },
      { id: 'b', text: '35% of AUC_total comes from extrapolation; the sampling window may be too short and AUC_total is highly model-dependent.', isCorrect: true },
      { id: 'c', text: 'The drug follows first-order elimination perfectly.', isCorrect: false },
      { id: 'd', text: 'k is too large.', isCorrect: false },
    ],
    explanation:
      'extrapFraction = AUC_extra / AUC_total. Values above 20% suggest the sampling window is too short — ' +
      'the AUC_total estimate depends heavily on the model (k) rather than observed data. ' +
      'This is a caution, not an invalidation.',
    mistakeCategory: 'wrong-interpretation',
    hint: 'extrapFraction > 20% is a regulatory flag for insufficient sampling.',
    estimatedMinutes: 3,
  },
  {
    id: 'p18-back-transform-ln',
    category: 'transformations',
    type: 'calculation',
    difficulty: 'intermediate',
    title: 'Back-transform ln prediction',
    prompt: 'If ln(Y) = 1.5, what is Y on the original scale?',
    options: [
      { id: 'a', text: 'Y = 1.5', isCorrect: false },
      { id: 'b', text: 'Y = e^1.5 ≈ 4.48', isCorrect: true },
      { id: 'c', text: 'Y = 10^1.5 ≈ 31.6', isCorrect: false },
      { id: 'd', text: 'Y = ln(1.5) ≈ 0.405', isCorrect: false },
    ],
    explanation:
      'For ln model, back-transform via exp: Y = e^ln(Y) = e^1.5 ≈ 4.48. ' +
      'Option c uses 10^x (the log10 back-transform) — a classic error when mixing bases.',
    mistakeCategory: 'wrong-transformation',
    hint: 'ln uses base e. Back-transform with exp.',
    estimatedMinutes: 1,
  },
  {
    id: 'p19-terminal-phase-purpose',
    category: 'pk',
    type: 'conceptual',
    difficulty: 'advanced',
    title: 'Why terminal-phase selection matters',
    prompt:
      'For a two-compartment drug, why does including early (distribution-phase) points bias the estimated k?',
    options: [
      { id: 'a', text: 'Early points have higher concentration, which inflates k.', isCorrect: false },
      { id: 'b', text: 'Early points reflect distribution (steep slope), which overestimates k when mixed with elimination.', isCorrect: true },
      { id: 'c', text: 'Early points always have lower R².', isCorrect: false },
      { id: 'd', text: 'Early points cause the regression to fail.', isCorrect: false },
    ],
    explanation:
      'In a two-compartment model, early points reflect rapid distribution (steep slope) plus slower elimination. ' +
      'Fitting all points gives a slope that mixes distribution and elimination, overestimating k. ' +
      'Terminal-phase selection isolates the elimination-only points for an accurate k.',
    mistakeCategory: 'conceptual',
    hint: 'Think about what biological process dominates early vs late.',
    estimatedMinutes: 3,
  },
  {
    id: 'p20-sse-sst-r2',
    category: 'ols',
    type: 'calculation',
    difficulty: 'intermediate',
    title: 'Calculate R² from SSE and SST',
    prompt: 'Given SSE = 2.4 and SST = 6.0, what is R²?',
    options: [
      { id: 'a', text: 'R² = 0.4', isCorrect: false },
      { id: 'b', text: 'R² = 0.6', isCorrect: true },
      { id: 'c', text: 'R² = 2.5', isCorrect: false },
      { id: 'd', text: 'R² = 0.6%', isCorrect: false },
    ],
    explanation:
      'R² = 1 − SSE/SST = 1 − 2.4/6.0 = 1 − 0.4 = 0.6. 60% of the variance in Y is explained by the linear model.',
    mistakeCategory: 'calculation',
    hint: 'R² = 1 − SSE/SST.',
    estimatedMinutes: 2,
  },
];

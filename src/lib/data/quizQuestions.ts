import { QuizQuestion } from '../../types';

export const PRACTICE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1-slope-interpretation',
    category: 'linear-regression',
    title: 'Interpreting the Slope',
    prompt:
      'A simple linear regression model is fitted to predict patient Systolic Blood Pressure (mmHg) from Age (years): Y = 84.5 + 0.72X. Which statement is the correct interpretation of the slope 0.72?',
    options: [
      {
        id: 'a',
        text: 'For every 1-year increase in age, blood pressure is expected to increase by approximately 0.72 mmHg.',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'A person aged 0 years has an expected blood pressure of 0.72 mmHg.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: '72% of the variation in blood pressure is explained by age.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'Aging increases blood pressure by 72% every year.',
        isCorrect: false,
      },
    ],
    explanation:
      'The slope b = 0.72 represents the rate of change: ΔY / ΔX. For every 1-unit increase in X (age in years), the expected value of Y (blood pressure in mmHg) increases by 0.72 units. Note that 84.5 is the intercept, and R² is needed to evaluate percentage of variation.',
    formulaNote: 'b = \\frac{\\Delta Y}{\\Delta X} = 0.72 \\text{ mmHg/year}',
  },
  {
    id: 'q2-intercept-meaning',
    category: 'linear-regression',
    title: 'Meaning of the Intercept',
    prompt:
      'In a study measuring Adult Height (cm) vs. Weight (kg), the regression equation is Height = 112 + 0.85(Weight). Why should we be cautious about interpreting the intercept 112 cm as "height when weight is zero"?',
    options: [
      {
        id: 'a',
        text: 'Because zero weight is physically impossible for living adults and lies far outside the observed range of data (extrapolation).',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'Because the intercept in simple linear regression is always an error.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'Because the slope must always be subtracted from the intercept first.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'Because height cannot be measured in centimeters.',
        isCorrect: false,
      },
    ],
    explanation:
      'The intercept is the mathematical value of Y when X = 0. If X = 0 is non-physical or far removed from the actual sample points (extrapolation), the intercept acts merely as a mathematical positioning anchor for the line and has no scientific biological meaning.',
    formulaNote: '\\text{Intercept } a = \\bar{Y} - b\\bar{X}',
  },
  {
    id: 'q3-predict-y',
    category: 'linear-regression',
    title: 'Predicted Value Calculation',
    prompt:
      'Given the regression line Ŷ = 3.5 + 2.0X, what is the predicted value of Y when X = 4.5?',
    options: [
      { id: 'a', text: 'Ŷ = 12.5', isCorrect: true },
      { id: 'b', text: 'Ŷ = 9.0', isCorrect: false },
      { id: 'c', text: 'Ŷ = 14.5', isCorrect: false },
      { id: 'd', text: 'Ŷ = 10.0', isCorrect: false },
    ],
    explanation:
      'Substitute X = 4.5 into the equation: Ŷ = 3.5 + 2.0(4.5) = 3.5 + 9.0 = 12.5.',
    formulaNote: '\\hat{Y} = 3.5 + 2.0(4.5) = 12.5',
  },
  {
    id: 'q4-residual-calc',
    category: 'residuals',
    title: 'Calculating a Residual',
    prompt:
      'For an observation with X = 5, the actual measured outcome was Y = 18.0. The fitted regression model predicted Ŷ = 15.4. What is the residual for this data point?',
    options: [
      { id: 'a', text: '+2.6', isCorrect: true },
      { id: 'b', text: '-2.6', isCorrect: false },
      { id: 'c', text: '+33.4', isCorrect: false },
      { id: 'd', text: '+0.85', isCorrect: false },
    ],
    explanation:
      'A residual is defined as Observed Y minus Predicted Y: e = Y - Ŷ = 18.0 - 15.4 = +2.6. Because the observed point sits above the regression line, the residual is positive.',
    formulaNote: 'e_i = Y_i - \\hat{Y}_i = 18.0 - 15.4 = +2.6',
  },
  {
    id: 'q5-r-squared-myth',
    category: 'r-squared',
    title: 'The Truth About High R²',
    prompt:
      'A researcher fits a simple linear regression line to 20 data points and obtains R² = 0.94. Which of the following conclusions is statistically valid?',
    options: [
      {
        id: 'a',
        text: 'Approximately 94% of the variation in Y is accounted for by the linear model, but we still need to inspect the residual plot to check for non-linearity.',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'The relationship is definitely linear and proves that X causes Y.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'All residuals must be zero.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: '94% of future clinical patients will experience a positive outcome.',
        isCorrect: false,
      },
    ],
    explanation:
      'R² describes the proportion of total variance explained. However, a high R² alone does NOT prove that a straight line is the correct model (Anscombe’s quartet demonstrates this vividly). Strong non-linear curves can yield high R² when forced into a straight line. Always examine the residual plot!',
    formulaNote: 'R^2 = 1 - \\frac{SSE}{SST} = 0.94',
  },
  {
    id: 'q6-log-domain',
    category: 'transformations',
    title: 'Logarithm Domain Restriction',
    prompt:
      'A laboratory dataset contains plasma drug concentrations: [12.4, 8.1, 4.2, 1.1, 0.0, -0.5] mg/L. Why will taking the natural log ln(C) fail on the last two observations?',
    options: [
      {
        id: 'a',
        text: 'Because the logarithm function is only mathematically defined for strictly positive real numbers (x > 0); ln(0) is undefined (-∞) and ln(negative) is undefined in real numbers.',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'Because negative numbers turn into imaginary numbers that reverse the slope.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'Because drug concentrations can never be below 10 mg/L.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'Because only base-10 logarithms work with zero.',
        isCorrect: false,
      },
    ],
    explanation:
      'In real analysis, ln(x) and log10(x) require x > 0. As x approaches 0 from the right, ln(x) approaches negative infinity. Neither 0 nor negative numbers have real-valued logarithms. Any software that silently transforms 0 or negatives is committing an error.',
  },
  {
    id: 'q7-pk-k-from-ln-slope',
    category: 'pk',
    title: 'Elimination Rate Constant from ln Slope',
    prompt:
      'A pharmacy student plots ln(Concentration) in mg/L versus Time in hours. The fitted regression equation is: ln(C) = 2.450 - 0.175 t. What is the elimination rate constant (k)?',
    options: [
      { id: 'a', text: 'k = 0.175 h⁻¹', isCorrect: true },
      { id: 'b', text: 'k = -0.175 h⁻¹', isCorrect: false },
      { id: 'c', text: 'k = 2.450 h⁻¹', isCorrect: false },
      { id: 'd', text: 'k = 0.403 h⁻¹', isCorrect: false },
    ],
    explanation:
      'The linear form of first-order elimination using natural logarithm is: ln(C) = ln(C0) - kt. Comparing this with Y = a + bx, the slope is b = -k. Therefore, k = -slope = -(-0.175) = +0.175 h⁻¹.',
    formulaNote: 'k = -\\text{slope} = -(-0.175) = 0.175 \\text{ h}^{-1}',
  },
  {
    id: 'q8-pk-half-life',
    category: 'pk',
    title: 'Calculating Half-Life from k',
    prompt:
      'A drug exhibits first-order elimination with an elimination rate constant k = 0.231 h⁻¹. What is its elimination half-life (t½)?',
    options: [
      { id: 'a', text: 't½ ≈ 3.00 hours', isCorrect: true },
      { id: 'b', text: 't½ ≈ 0.33 hours', isCorrect: false },
      { id: 'c', text: 't½ ≈ 4.33 hours', isCorrect: false },
      { id: 'd', text: 't½ ≈ 2.31 hours', isCorrect: false },
    ],
    explanation:
      'The half-life formula for first-order elimination is: t½ = ln(2) / k ≈ 0.69315 / 0.231 = 3.0006 hours (~3.00 hours).',
    formulaNote: 't_{1/2} = \\frac{\\ln(2)}{k} = \\frac{0.69315}{0.231 \\text{ h}^{-1}} \\approx 3.00 \\text{ h}',
  },
  {
    id: 'q9-pk-log10-conversion',
    category: 'pk',
    title: 'Elimination Rate Constant from log10 Slope',
    prompt:
      'A researcher plots log10(Concentration) vs. Time and obtains a slope of -0.0651 h⁻¹. How is k calculated from this log10 slope?',
    options: [
      {
        id: 'a',
        text: 'k = -2.303 × slope = -2.303 × (-0.0651) ≈ 0.150 h⁻¹',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'k = -slope = 0.0651 h⁻¹',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'k = 10^(-0.0651) ≈ 0.861 h⁻¹',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'k = slope / 2.303 ≈ -0.028 h⁻¹',
        isCorrect: false,
      },
    ],
    explanation:
      'Because log10(x) = ln(x) / ln(10), the log10 slope equals -k / 2.303. Therefore, k = -2.303 × slope = -2.302585 × (-0.0651) = 0.1499 ≈ 0.150 h⁻¹.',
    formulaNote: 'k = -\\ln(10) \\times \\text{slope} = -2.3026 \\times (-0.0651) \\approx 0.150 \\text{ h}^{-1}',
  },
  {
    id: 'q10-pk-c0-recovery',
    category: 'pk',
    title: 'Initial Concentration (C0) Recovery',
    prompt:
      'In a natural log regression of concentration versus time, the fitted intercept is a = 2.3026. What is the estimated initial concentration C0?',
    options: [
      { id: 'a', text: 'C0 = e^2.3026 ≈ 10.0 mg/L', isCorrect: true },
      { id: 'b', text: 'C0 = 2.3026 mg/L', isCorrect: false },
      { id: 'c', text: 'C0 = 10^2.3026 ≈ 200.7 mg/L', isCorrect: false },
      { id: 'd', text: 'C0 = 1 / 2.3026 ≈ 0.434 mg/L', isCorrect: false },
    ],
    explanation:
      'In the natural logarithm model ln(C) = ln(C0) - kt, the intercept represents ln(C0). To recover C0, exponentiate the intercept with base e: C0 = exp(2.3026) = e^2.3026 ≈ 10.0.',
    formulaNote: 'C_0 = e^{\\text{intercept}} = e^{2.3026} = 10.0',
  },
  // -------------------------------------------------------------------------
  // Phase 3 (spec §29): six new practice questions specifically targeting
  // log-linear regression concepts: transformation effect, slope-as-PK-k,
  // half-life computation, back-transformation, log10 evaluation, and
  // multiplicative-vs-additive interpretation.
  // -------------------------------------------------------------------------
  {
    id: 'q11-transform-effect',
    category: 'log-linear',
    title: 'Effect of ln Transformation on Y',
    prompt:
      'A dataset follows an exponential decay curve C(t) = 50·e^(−0.25t). When we apply the natural log transformation ln(C) and plot ln(C) vs t, what happens to the relationship?',
    options: [
      {
        id: 'a',
        text: 'The curved exponential decay becomes a straight line with slope −0.25 and intercept ln(50) ≈ 3.912.',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'The transformation has no effect on the shape; ln(C) vs t remains curved.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'The transformation reverses the direction of the curve from decay to growth.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'The transformation removes all variation in the data, producing a horizontal line.',
        isCorrect: false,
      },
    ],
    explanation:
      'ln(C(t)) = ln(50·e^(−0.25t)) = ln(50) + ln(e^(−0.25t)) = ln(50) − 0.25t. This is the linear form Y = a + bX with a = ln(50) ≈ 3.912 and b = −0.25. The logarithm converts the multiplicative exponential relationship into an additive linear one.',
    formulaNote: '\\ln(C) = \\ln(C_0) - kt \\Rightarrow \\text{linear in } t',
  },
  {
    id: 'q12-slope-as-k',
    category: 'log-linear',
    title: 'Slope as Elimination Rate Constant',
    prompt:
      'A first-order PK model is fitted as ln(C) = 2.0 − 0.2·t. What is the elimination rate constant k?',
    options: [
      { id: 'a', text: 'k = 0.2 h⁻¹', isCorrect: true },
      { id: 'b', text: 'k = −0.2 h⁻¹', isCorrect: false },
      { id: 'c', text: 'k = 2.0 h⁻¹', isCorrect: false },
      { id: 'd', text: 'k = e^(−0.2) ≈ 0.819 h⁻¹', isCorrect: false },
    ],
    explanation:
      'The linear form of first-order elimination using ln is ln(C) = ln(C₀) − kt. Comparing with ln(C) = 2.0 − 0.2t, the slope b = −0.2 = −k, so k = 0.2 h⁻¹. The slope is the negative of the elimination rate constant when using natural log.',
    formulaNote: 'k = -\\text{slope} = -(-0.2) = 0.2 \\text{ h}^{-1}',
  },
  {
    id: 'q13-half-life-from-k',
    category: 'log-linear',
    title: 'Half-Life from k',
    prompt:
      'Given an elimination rate constant k = 0.2 h⁻¹, what is the elimination half-life t½?',
    options: [
      { id: 'a', text: 't½ ≈ 3.47 h', isCorrect: true },
      { id: 'b', text: 't½ ≈ 0.35 h', isCorrect: false },
      { id: 'c', text: 't½ = 0.2 h', isCorrect: false },
      { id: 'd', text: 't½ = 5 h', isCorrect: false },
    ],
    explanation:
      't½ = ln(2) / k ≈ 0.69315 / 0.2 = 3.466 h. Half-life is inversely proportional to k. After one half-life, concentration drops to 50% of its starting value; after 5 half-lives, ~97% has been eliminated.',
    formulaNote: 't_{1/2} = \\frac{\\ln(2)}{k} = \\frac{0.69315}{0.2} \\approx 3.47 \\text{ h}',
  },
  {
    id: 'q14-back-transform-ln',
    category: 'log-linear',
    title: 'Back-Transformation of ln',
    prompt:
      'If ln(Y) = 1.5, what is Y on the original scale?',
    options: [
      { id: 'a', text: 'Y = e^1.5 ≈ 4.48', isCorrect: true },
      { id: 'b', text: 'Y = 1.5', isCorrect: false },
      { id: 'c', text: 'Y = 10^1.5 ≈ 31.6', isCorrect: false },
      { id: 'd', text: 'Y = ln(1.5) ≈ 0.405', isCorrect: false },
    ],
    explanation:
      'The natural logarithm uses base e. To back-transform from ln(Y) = z to Y, exponentiate with base e: Y = e^z = e^1.5 ≈ 4.4817. Confusing ln with log10 (answer c) is a classic error — log10 would require Y = 10^1.5.',
    formulaNote: 'Y = e^{\\ln(Y)} = e^{1.5} \\approx 4.48',
  },
  {
    id: 'q15-log10-evaluation',
    category: 'log-linear',
    title: 'log10 Back-Transformation',
    prompt:
      'If log10(Y) = 2, what is Y on the original scale?',
    options: [
      { id: 'a', text: 'Y = 10^2 = 100', isCorrect: true },
      { id: 'b', text: 'Y = e^2 ≈ 7.389', isCorrect: false },
      { id: 'c', text: 'Y = 2', isCorrect: false },
      { id: 'd', text: 'Y = log10(2) ≈ 0.301', isCorrect: false },
    ],
    explanation:
      'The common logarithm uses base 10. To back-transform from log10(Y) = z to Y, raise 10 to that power: Y = 10^z = 10^2 = 100. Using e (answer b) would be the back-transform for ln, not log10.',
    formulaNote: 'Y = 10^{\\log_{10}(Y)} = 10^2 = 100',
  },
  {
    id: 'q16-slope-interpretation-multiplicative',
    category: 'log-linear',
    title: 'Slope Interpretation: Additive or Multiplicative?',
    prompt:
      'In a log-linear model ln(Y) = a + bX with slope b = −0.15, what is the correct interpretation of the slope on the original Y scale?',
    options: [
      {
        id: 'a',
        text: 'Y is multiplied by e^(−0.15) ≈ 0.86 per unit increase in X (approximately a 14% decrease).',
        isCorrect: true,
      },
      {
        id: 'b',
        text: 'Y decreases by exactly 0.15 units per unit increase in X.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: 'Y decreases by 15% per unit increase in X.',
        isCorrect: false,
      },
      {
        id: 'd',
        text: 'Y increases by 0.15 units per unit increase in X.',
        isCorrect: false,
      },
    ],
    explanation:
      'In a log-linear model, the slope acts on the logarithmic scale, not the original scale. The correct multiplicative factor is e^b = e^(−0.15) ≈ 0.8607, meaning Y is multiplied by ~0.86 per unit X. The exact percentage change is (e^b − 1) × 100% ≈ −13.93%, not exactly −15%. Treating the slope as an additive change in Y (answer b) or confusing it with a direct percentage (answer c) are both common student errors.',
    formulaNote: '\\text{Multiplicative factor} = e^b = e^{-0.15} \\approx 0.86 \\\\[4pt] \\text{Percent change} = (e^b - 1) \\times 100\\% \\approx -13.93\\%',
  },
];

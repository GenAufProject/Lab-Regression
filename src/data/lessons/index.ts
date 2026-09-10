import { StructuredLesson } from '../../types';

/**
 * Phase 5 — Structured Lessons (spec §2).
 *
 * Data-driven lessons composed of typed sections:
 *   - text        : prose
 *   - formula     : KaTeX formula + explanation
 *   - example     : worked example (optionally tied to a sample dataset)
 *   - interactive : embedded interactive component (by componentId)
 *   - question    : inline practice question
 *
 * Each lesson belongs to one of the five modules A-E (see modules.ts).
 *
 * Spec §28: numeric values in formula sections use full precision;
 * the UI may format them for display but the data preserves precision.
 *
 * The content is original educational prose written for this application.
 */

export const STRUCTURED_LESSONS: StructuredLesson[] = [
  // =========================================================================
  // MODULE A — Regression Fundamentals
  // =========================================================================
  {
    id: 'a1-what-is-regression',
    title: 'What is Regression?',
    description: 'Understand the goal of regression and how it differs from correlation.',
    category: 'regression-fundamentals',
    module: 'A',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    objectives: [
      'Define regression as a directional prediction method',
      'Distinguish regression from correlation',
      'Recognize that association is not causation',
    ],
    sections: [
      {
        type: 'text',
        title: 'The prediction problem',
        content:
          'In science we often want to know not just whether two variables move together, but HOW one predicts the other. ' +
          'Regression answers this by fitting a mathematical equation that predicts the expected value of Y given a specific value of X. ' +
          'Unlike correlation, which only summarizes the strength and direction of association symmetrically, regression is directional: X predicts Y.',
      },
      {
        type: 'formula',
        title: 'The regression equation',
        formula: '\\hat{Y} = a + bX',
        explanation:
          'Y-hat is the predicted mean value of Y for a chosen X. The intercept a is the predicted Y when X = 0. ' +
          'The slope b is the predicted change in Y for a one-unit increase in X.',
      },
      {
        type: 'text',
        title: 'Association is not causation',
        content:
          'Regression measures mathematical relationships. Neither regression nor correlation alone proves causation. ' +
          'Causal claims require experimental design, biological mechanism, or both. A high R² means the line fits the data — not that X causes Y.',
      },
      {
        type: 'question',
        title: 'Quick check',
        question: 'Which statement best distinguishes regression from correlation?',
        options: [
          'Regression is symmetric; correlation is directional.',
          'Regression provides a prediction equation; correlation only summarizes strength.',
          'Regression requires categorical data; correlation requires numeric data.',
          'Regression proves causation; correlation does not.',
        ],
        correctAnswer: 1,
        explanation:
          'Regression is directional — it produces an equation that predicts Y from X. Correlation is symmetric and only measures strength of linear association. Neither proves causation.',
        mistakeCategory: 'wrong-interpretation',
      },
    ],
    keyTakeaways: [
      'Regression predicts Y from X via an equation; correlation only summarizes association.',
      'X is the predictor (independent); Y is the outcome (dependent).',
      'Association does not equal causation without experimental or biological justification.',
    ],
  },
  {
    id: 'a2-variables-and-scatter-plots',
    title: 'Variables and Scatter Plots',
    description: 'Identify X and Y, and read relationships from a scatter plot.',
    category: 'regression-fundamentals',
    module: 'A',
    difficulty: 'beginner',
    estimatedMinutes: 7,
    objectives: [
      'Identify the independent (X) and dependent (Y) variables',
      'Read direction, strength, and form from a scatter plot',
      'Recognize non-linear patterns',
    ],
    sections: [
      {
        type: 'text',
        title: 'Which variable is X, which is Y?',
        content:
          'By scientific convention, the horizontal axis (X) is the independent variable — the one we manipulate or treat as a predictor ' +
          '(time, dose, temperature, study hours). The vertical axis (Y) is the dependent variable — the outcome we measure ' +
          '(concentration, score, response). In pharmacokinetics, Time is always X and Concentration is always Y.',
      },
      {
        type: 'text',
        title: 'Reading a scatter plot',
        content:
          'Before any calculation, PLOT the data. Look for: (1) DIRECTION — does Y increase, decrease, or stay flat as X increases? ' +
          '(2) STRENGTH — how tightly do points cluster around an imaginary line? (3) FORM — is the pattern linear, curved, or random? ' +
          '(4) OUTLIERS — are there unusual points far from the rest?',
      },
      {
        type: 'interactive',
        title: 'Explore scatter plots',
        componentId: 'interactive-scatter-explorer',
      },
      {
        type: 'question',
        title: 'Quick check',
        question: 'In a pharmacokinetic study, which variable goes on the X axis?',
        options: ['Concentration', 'Time', 'Dose', 'Half-life'],
        correctAnswer: 1,
        explanation:
          'Time is the independent variable (X axis); concentration is the dependent variable (Y axis) that we measure at each time point.',
        mistakeCategory: 'conceptual',
      },
    ],
    keyTakeaways: [
      'X = independent variable (predictor); Y = dependent variable (outcome).',
      'Always plot data before calculating — look for direction, strength, form, and outliers.',
      'In PK: Time on X, Concentration on Y.',
    ],
  },
  {
    id: 'a3-slope-and-intercept',
    title: 'Slope and Intercept',
    description: 'Interpret the slope and intercept of a regression line.',
    category: 'regression-fundamentals',
    module: 'A',
    difficulty: 'beginner',
    estimatedMinutes: 8,
    objectives: [
      'Interpret the slope as a rate of change',
      'Interpret the intercept as the predicted Y at X = 0',
      'Recognize when the intercept is an extrapolation',
    ],
    sections: [
      {
        type: 'formula',
        title: 'The slope',
        formula: 'b = \\frac{\\Delta Y}{\\Delta X}',
        explanation:
          'The slope is the estimated change in Y for a one-unit increase in X. A slope of 2 means Y increases by 2 for every 1-unit increase in X. ' +
          'A negative slope means Y decreases as X increases.',
      },
      {
        type: 'formula',
        title: 'The intercept',
        formula: 'a = \\bar{y} - b\\bar{x}',
        explanation:
          'The intercept is the predicted Y when X = 0. CAUTION: if X = 0 is outside the observed data range (e.g., predicting human weight at age 0), ' +
          'the intercept is an extrapolation and may not be physically meaningful.',
      },
      {
        type: 'example',
        title: 'Worked example: study hours and exam scores',
        datasetId: 'strong-positive',
        explanation:
          'If the fitted equation is Score = 45 + 7·Hours, then each additional study hour predicts a 7-point increase in score. ' +
          'The intercept 45 is the predicted score for someone who studies 0 hours — an extrapolation if no one in the sample studied 0 hours.',
      },
      {
        type: 'question',
        title: 'Quick check',
        question: 'A regression line has slope = −3. What does this mean?',
        options: [
          'Y increases by 3 for each unit increase in X.',
          'Y decreases by 3 for each unit increase in X.',
          'The intercept is −3.',
          'R² is −3.',
        ],
        correctAnswer: 1,
        explanation:
          'A negative slope means Y DECREASES as X increases. The magnitude (3) is the rate of change; the sign (−) is the direction.',
        mistakeCategory: 'wrong-sign',
      },
    ],
    keyTakeaways: [
      'Slope = rate of change of Y per unit X (positive = increase, negative = decrease).',
      'Intercept = predicted Y at X = 0 (may be an extrapolation).',
      'Always check whether X = 0 is within the observed data range.',
    ],
  },
  {
    id: 'a4-regression-equation',
    title: 'The Regression Equation',
    description: 'Assemble the regression equation and use it for prediction.',
    category: 'regression-fundamentals',
    module: 'A',
    difficulty: 'beginner',
    estimatedMinutes: 7,
    objectives: [
      'Assemble ŷ = a + b·x from fitted coefficients',
      'Use the equation to predict Y at a new X',
      'Distinguish prediction from observation',
    ],
    sections: [
      {
        type: 'formula',
        title: 'The fitted equation',
        formula: '\\hat{y} = a + bx',
        explanation:
          'Once the slope b and intercept a are computed, the equation ŷ = a + b·x predicts the expected (mean) Y for any X. ' +
          'The predicted value is NOT an observation — it is what the model expects.',
      },
      {
        type: 'interactive',
        title: 'Guided calculation: build the equation step by step',
        componentId: 'guided-ols-calculation',
      },
      {
        type: 'text',
        title: 'Prediction vs observation',
        content:
          'Given a new X, the equation gives a point prediction ŷ. This prediction has uncertainty — the true Y will scatter around ŷ. ' +
          'Confidence intervals (for the mean response) and prediction intervals (for an individual observation) quantify this uncertainty.',
      },
    ],
    keyTakeaways: [
      'ŷ = a + b·x is the fitted regression equation.',
      'Plug in any X to get a predicted Y (with uncertainty).',
      'Predictions are model expectations, not observations.',
    ],
  },

  // =========================================================================
  // MODULE B — Understanding OLS
  // =========================================================================
  {
    id: 'b1-means-and-deviations',
    title: 'Means and Deviations',
    description: 'Compute the means of X and Y, then deviations from the means.',
    category: 'ols',
    module: 'B',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Compute x̄ and ȳ',
      'Compute deviations (xᵢ − x̄) and (yᵢ − ȳ)',
      'Understand the OLS invariant Σ(xᵢ − x̄) = 0',
    ],
    sections: [
      {
        type: 'text',
        title: 'The centroid',
        content:
          'Every OLS regression line passes through the point (x̄, ȳ) — the centroid of the data. ' +
          'This is a mathematical guarantee, not a coincidence. The means are the first step in every OLS calculation.',
      },
      {
        type: 'formula',
        title: 'Deviations from the mean',
        formula: 'd_{x_i} = x_i - \\bar{x}, \\quad d_{y_i} = y_i - \\bar{y}',
        explanation:
          'Subtracting the mean centers the data. Positive deviations mean above average; negative mean below. ' +
          'A key invariant: the sum of deviations is always zero (Σ(xᵢ − x̄) = 0).',
      },
      {
        type: 'interactive',
        title: 'Guided calculation: means and deviations',
        componentId: 'guided-ols-calculation',
      },
    ],
    keyTakeaways: [
      'The centroid (x̄, ȳ) lies on the regression line.',
      'Deviations are (xᵢ − x̄) and (yᵢ − ȳ).',
      'Σ deviations = 0 (always, by construction).',
    ],
  },
  {
    id: 'b2-sxy-and-sxx',
    title: 'Sxy and Sxx',
    description: 'Compute the covariance sum and the X-variance sum.',
    category: 'ols',
    module: 'B',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Compute Sxx = Σ(xᵢ − x̄)²',
      'Compute Sxy = Σ(xᵢ − x̄)(yᵢ − ȳ)',
      'Interpret the sign of Sxy',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Sxx — variance sum of X',
        formula: 'S_{xx} = \\sum_{i=1}^{n} (x_i - \\bar{x})^2',
        explanation:
          'Sxx measures how spread out the X values are. If all X are identical, Sxx = 0 and regression is impossible (vertical line). ' +
          'Sxx is the denominator of the slope.',
      },
      {
        type: 'formula',
        title: 'Sxy — covariance sum',
        formula: 'S_{xy} = \\sum_{i=1}^{n} (x_i - \\bar{x})(y_i - \\bar{y})',
        explanation:
          'Sxy measures how X and Y move together. If both deviations have the same sign (both above or both below their means), the product is positive. ' +
          'Sxy > 0 indicates a positive relationship; Sxy < 0 indicates a negative relationship. Sxy is the numerator of the slope.',
      },
      {
        type: 'interactive',
        title: 'Guided calculation: Sxy and Sxx',
        componentId: 'guided-ols-calculation',
      },
    ],
    keyTakeaways: [
      'Sxx = Σ(xᵢ − x̄)² (spread of X; denominator of slope).',
      'Sxy = Σ(xᵢ − x̄)(yᵢ − ȳ) (covariance; numerator of slope).',
      'Sign of Sxy determines the sign of the slope.',
    ],
  },
  {
    id: 'b3-slope-and-intercept-derivation',
    title: 'Slope and Intercept Derivation',
    description: 'Derive b = Sxy/Sxx and a = ȳ − b·x̄.',
    category: 'ols',
    module: 'B',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Derive the slope formula b = Sxy/Sxx',
      'Derive the intercept formula a = ȳ − b·x̄',
      'Understand why OLS minimizes squared residuals',
    ],
    sections: [
      {
        type: 'formula',
        title: 'The slope',
        formula: 'b = \\frac{S_{xy}}{S_{xx}}',
        explanation:
          'The slope is the ratio of covariance to variance. OLS chooses b to minimize the sum of squared residuals — ' +
          'this is the unique value that makes the residuals uncorrelated with X.',
      },
      {
        type: 'formula',
        title: 'The intercept',
        formula: 'a = \\bar{y} - b\\bar{x}',
        explanation:
          'Because the line passes through (x̄, ȳ), we have ȳ = a + b·x̄. Solving for a gives a = ȳ − b·x̄. ' +
          'The intercept is determined once the slope is known.',
      },
      {
        type: 'interactive',
        title: 'Guided calculation: slope and intercept',
        componentId: 'guided-ols-calculation',
      },
    ],
    keyTakeaways: [
      'b = Sxy / Sxx (minimizes squared residuals).',
      'a = ȳ − b·x̄ (line passes through the centroid).',
      'OLS is the unique minimizer of Σ(yᵢ − ŷᵢ)².',
    ],
  },
  {
    id: 'b4-sse-sst-and-r-squared',
    title: 'SSE, SST, and R²',
    description: 'Compute the sums of squares and the coefficient of determination.',
    category: 'ols',
    module: 'B',
    difficulty: 'intermediate',
    estimatedMinutes: 12,
    objectives: [
      'Compute SSE = Σ(yᵢ − ŷᵢ)²',
      'Compute SST = Σ(yᵢ − ȳ)²',
      'Compute R² = 1 − SSE/SST and interpret it',
    ],
    sections: [
      {
        type: 'formula',
        title: 'SSE — sum of squared errors',
        formula: 'SSE = \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2',
        explanation:
          'SSE is the unexplained variation — the sum of squared vertical distances from points to the regression line. ' +
          'OLS minimizes this quantity.',
      },
      {
        type: 'formula',
        title: 'SST — total sum of squares',
        formula: 'SST = \\sum_{i=1}^{n} (y_i - \\bar{y})^2',
        explanation:
          'SST is the total variation in Y around its own mean. It does not depend on the regression — it is a property of Y alone.',
      },
      {
        type: 'formula',
        title: 'R² — coefficient of determination',
        formula: 'R^2 = 1 - \\frac{SSE}{SST}',
        explanation:
          'R² is the proportion of variance in Y explained by the linear model. R² = 1 means perfect fit; R² = 0 means the model is no better than just predicting ȳ. ' +
          'IMPORTANT: a high R² alone does NOT prove the model is correct — a curved relationship can have high R² when forced into a line.',
      },
      {
        type: 'question',
        title: 'Quick check: R² interpretation',
        question: 'A regression produces R² = 0.92. Which conclusion is justified?',
        options: [
          'The model is definitely correct and X causes Y.',
          '92% of the variance in Y is explained by the linear relationship with X, but the model may still be inappropriate.',
          'The residual plot must show random scatter.',
          'R² = 0.92 proves the relationship is linear.',
        ],
        correctAnswer: 1,
        explanation:
          'R² = 0.92 means 92% of variance is explained by the LINEAR fit. It does NOT prove the model is correct, linear, or causal. ' +
          'Always examine the residual plot before drawing conclusions.',
        mistakeCategory: 'r2-misinterpretation',
      },
    ],
    keyTakeaways: [
      'SSE = unexplained variation (minimized by OLS).',
      'SST = total variation in Y.',
      'R² = 1 − SSE/SST (proportion explained; high R² ≠ model correctness).',
    ],
  },

  // =========================================================================
  // MODULE C — Regression Diagnostics
  // =========================================================================
  {
    id: 'c1-residuals-and-residual-plots',
    title: 'Residuals and Residual Plots',
    description: 'Compute residuals and read residual plots for model diagnostics.',
    category: 'diagnostics',
    module: 'C',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Compute residuals eᵢ = yᵢ − ŷᵢ',
      'Read a residual plot (residuals vs fitted or vs X)',
      'Identify random scatter, curvature, and fanning',
    ],
    sections: [
      {
        type: 'text',
        title: 'What is a residual?',
        content:
          'The residual eᵢ = yᵢ − ŷᵢ is the difference between the observed and predicted Y. ' +
          'A POSITIVE residual means the model UNDER-predicted (observed > predicted). ' +
          'A NEGATIVE residual means the model OVER-predicted (observed < predicted). ' +
          'OLS minimizes the sum of squared residuals.',
      },
      {
        type: 'formula',
        title: 'The residual plot',
        formula: 'e_i \\text{ vs } \\hat{y}_i \\text{ (or vs } x_i\\text{)}',
        explanation:
          'A residual plot shows residuals on the Y axis and fitted values (or X) on the X axis. ' +
          'A good linear fit shows RANDOM scatter around zero with no pattern. ' +
          'A curved pattern suggests non-linearity. A fanning pattern suggests non-constant variance.',
      },
      {
        type: 'interactive',
        title: 'Explore residual patterns',
        componentId: 'residual-explorer',
      },
    ],
    keyTakeaways: [
      'Residual = observed − predicted (positive = under-predict).',
      'Random scatter in residuals supports the linear model.',
      'Curved or fanning patterns indicate model problems.',
    ],
  },
  {
    id: 'c2-outliers-and-leverage',
    title: 'Outliers and Leverage',
    description: 'Identify influential observations and understand leverage.',
    category: 'diagnostics',
    module: 'C',
    difficulty: 'advanced',
    estimatedMinutes: 12,
    objectives: [
      'Define leverage (h_ii)',
      'Define Cook\'s distance',
      'Distinguish outliers from influential points',
    ],
    sections: [
      {
        type: 'text',
        title: 'Outliers vs influential points',
        content:
          'An OUTLIER is a point with a large residual (unusual Y). A HIGH-LEVERAGE point is a point with unusual X (far from x̄). ' +
          'An INFLUENTIAL point is one that substantially changes the regression when removed — it has BOTH high leverage AND a large residual. ' +
          'Cook\'s distance measures influence: Dᵢ > 4/n is a conventional flag.',
      },
      {
        type: 'formula',
        title: 'Leverage',
        formula: 'h_{ii} = \\frac{1}{n} + \\frac{(x_i - \\bar{x})^2}{S_{xx}}',
        explanation:
          'Leverage h_ii measures how far an observation\'s X is from the mean. It ranges from 1/n (point at the mean) to 1 (point at an extreme). ' +
          'Points with h_ii > 2(k+1)/n = 4/n (for simple regression) are high-leverage.',
      },
      {
        type: 'interactive',
        title: 'Add an outlier and watch the line shift',
        componentId: 'outlier-playground',
      },
      {
        type: 'text',
        title: 'Never auto-delete outliers',
        content:
          'Outliers and influential points should be INVESTIGATED, not automatically deleted. ' +
          'They may reveal data-entry errors, biological extremes, or model mis-specification. ' +
          'Deleting an outlier without justification is scientific misconduct.',
      },
    ],
    keyTakeaways: [
      'Outlier = large residual; high-leverage = unusual X; influential = both.',
      'Cook\'s distance > 4/n flags influential points.',
      'Investigate outliers — never auto-delete.',
    ],
  },
  {
    id: 'c3-patterns-in-residuals',
    title: 'Patterns in Residuals',
    description: 'Recognize curvature, heteroscedasticity, and non-random patterns.',
    category: 'diagnostics',
    module: 'C',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Identify curved residual patterns (non-linearity)',
      'Identify fanning patterns (heteroscedasticity)',
      'Recommend appropriate remedies',
    ],
    sections: [
      {
        type: 'text',
        title: 'Random scatter (good)',
        content:
          'Random scatter around zero with no obvious pattern is consistent with the linear model and the OLS assumptions (linearity, independence, normality, equal variance). ' +
          'This does not PROVE the assumptions hold, but it does not contradict them.',
      },
      {
        type: 'text',
        title: 'Curved pattern (non-linearity)',
        content:
          'If residuals show a U-shape or inverted-U, the true relationship is likely curved. ' +
          'Consider a log transformation of Y (for exponential growth/decay) or a polynomial term (for a parabola). ' +
          'A log transformation often linearizes exponential relationships.',
      },
      {
        type: 'text',
        title: 'Fanning pattern (heteroscedasticity)',
        content:
          'If the residual spread increases (fans out) or decreases as fitted values grow, the variance is non-constant (heteroscedasticity). ' +
          'OLS standard errors become biased. A log transformation often stabilizes variance that grows proportionally with the mean.',
      },
      {
        type: 'question',
        title: 'Quick check: curved residuals',
        question: 'A residual plot shows a clear U-shape. What is the most likely issue?',
        options: [
          'The residuals are heteroscedastic.',
          'The relationship is non-linear and a straight line is inappropriate.',
          'There are too many outliers.',
          'R² is too high.',
        ],
        correctAnswer: 1,
        explanation:
          'A U-shaped residual pattern indicates curvature — the linear model misses the true (curved) relationship. ' +
          'Consider a transformation (e.g., ln(Y)) or a polynomial term.',
        mistakeCategory: 'wrong-interpretation',
      },
    ],
    keyTakeaways: [
      'Random scatter supports the linear model.',
      'U-shape → non-linearity (try log transform or polynomial).',
      'Fanning → heteroscedasticity (try log transform).',
    ],
  },
  {
    id: 'c4-why-r-squared-is-not-enough',
    title: 'Why R² Is Not Enough',
    description: 'Understand the limitations of R² as a model-quality metric.',
    category: 'diagnostics',
    module: 'C',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    objectives: [
      'List three reasons R² can be misleading',
      'Explain Anscombe\'s quartet',
      'Commit to always examining the residual plot',
    ],
    sections: [
      {
        type: 'text',
        title: 'R² does not prove correctness',
        content:
          'A high R² only confirms that the LINEAR fit explains a large proportion of variance in Y. It does NOT prove: (1) the relationship is truly linear; ' +
          '(2) the model is appropriate; (3) X causes Y; (4) the residuals are well-behaved. ' +
          'Anscombe\'s quartet famously shows four datasets with identical R², slope, intercept, and SSE — but completely different shapes.',
      },
      {
        type: 'text',
        title: 'Always plot the residuals',
        content:
          'The residual plot is the single most important diagnostic. It reveals curvature, heteroscedasticity, and outliers that R² hides. ' +
          'Never report a regression result without examining the residual plot first.',
      },
      {
        type: 'question',
        title: 'Quick check: R² limitations',
        question: 'Which of the following can a high R² alone NOT prove?',
        options: [
          'That the linear model is appropriate',
          'That X and Y are associated',
          'That the variance is explained',
          'Both A and B (model appropriateness and causation)',
        ],
        correctAnswer: 3,
        explanation:
          'R² measures variance explained by the LINEAR fit. It does not prove the model is appropriate (curved data can have high R²) and it does not prove causation. ' +
          'Always pair R² with residual diagnostics and domain context.',
        mistakeCategory: 'r2-misinterpretation',
      },
    ],
    keyTakeaways: [
      'High R² ≠ model correctness, linearity, or causation.',
      'Anscombe\'s quartet: same R², very different shapes.',
      'Always examine the residual plot before concluding.',
    ],
  },

  // =========================================================================
  // MODULE D — Transformations
  // =========================================================================
  {
    id: 'd1-why-transform',
    title: 'Why Transform Data?',
    description: 'Understand the motivation for data transformation.',
    category: 'transformations',
    module: 'D',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    objectives: [
      'List three reasons to transform data',
      'Recognize exponential relationships',
      'Understand linearization',
    ],
    sections: [
      {
        type: 'text',
        title: 'Three reasons to transform',
        content:
          'We transform data to: (1) LINEARIZE a curved relationship so OLS can fit it; (2) STABILIZE VARIANCE when residual spread grows with the mean; ' +
          '(3) make residuals more NORMAL for valid inference. The most common transformation in PK and biology is the logarithm, which linearizes exponential growth and decay.',
      },
      {
        type: 'text',
        title: 'Exponential relationships',
        content:
          'Many natural processes change multiplicatively: bacterial growth, radioactive decay, drug elimination. ' +
          'These follow Y = A·e^(bX). On a scatter plot, this looks curved. But ln(Y) = ln(A) + bX is LINEAR — the log transform turns the curve into a straight line.',
      },
      {
        type: 'example',
        title: 'Example: drug elimination',
        datasetId: 'pk-clean-first-order',
        explanation:
          'Concentration vs time is a curved exponential decay. But ln(Concentration) vs time is a straight line with slope = −k (the elimination rate constant).',
      },
    ],
    keyTakeaways: [
      'Transformations linearize, stabilize variance, and normalize.',
      'Logarithms linearize exponential relationships.',
      'ln(Y) = ln(A) + bX turns Y = A·e^(bX) into a line.',
    ],
  },
  {
    id: 'd2-ln-and-log10',
    title: 'ln and log10',
    description: 'Distinguish natural log from common log and use each correctly.',
    category: 'transformations',
    module: 'D',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Define ln (base e) and log10 (base 10)',
      'Convert between ln and log10',
      'Choose the appropriate base for a given problem',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Natural logarithm (ln)',
        formula: '\\ln(x) = \\log_e(x)',
        explanation:
          'ln uses base e (≈ 2.71828). It is the canonical log in calculus and pharmacokinetics because d/dx[e^x] = e^x. ' +
          'In PK: ln(C) = ln(C₀) − kt, so k = −slope and C₀ = e^intercept.',
      },
      {
        type: 'formula',
        title: 'Common logarithm (log10)',
        formula: '\\log_{10}(x) = \\frac{\\ln(x)}{\\ln(10)} \\approx \\frac{\\ln(x)}{2.303}',
        explanation:
          'log10 uses base 10. It is used on semi-log graph paper and in some clinical textbooks. ' +
          'In PK: log10(C) = log10(C₀) − (k/ln10)·t, so k = −slope × ln(10) ≈ −2.303 × slope and C₀ = 10^intercept.',
      },
      {
        type: 'text',
        title: 'Which base to use?',
        content:
          'Either base works — they recover the same k, t½, C₀, and predictions (within floating-point tolerance). ' +
          'ln is preferred in mathematical/theoretical contexts because derivatives are cleaner. ' +
          'log10 is preferred when displaying data on semi-log axes (each decade is a factor of 10). ' +
          'NEVER mix the two: if you fit with ln, use k = −slope; if you fit with log10, use k = −2.303 × slope.',
      },
      {
        type: 'question',
        title: 'Quick check: ln vs log10',
        question: 'If log10(C) vs time has slope = −0.05, what is k?',
        options: [
          'k = 0.05 h⁻¹',
          'k = −0.05 h⁻¹',
          'k = 0.05 × ln(10) ≈ 0.115 h⁻¹',
          'k = 0.05 / ln(10) ≈ 0.022 h⁻¹',
        ],
        correctAnswer: 2,
        explanation:
          'On the log10 scale, slope = −k/ln(10), so k = −slope × ln(10) = −(−0.05) × 2.303 ≈ 0.115 h⁻¹. ' +
          'Using k = −slope (the ln formula) with a log10 slope is a classic error.',
        mistakeCategory: 'wrong-transformation',
      },
    ],
    keyTakeaways: [
      'ln uses base e; log10 uses base 10.',
      'log10(x) = ln(x) / ln(10) ≈ ln(x) / 2.303.',
      'ln: k = −slope. log10: k = −slope × ln(10). Never mix.',
    ],
  },
  {
    id: 'd3-domain-restrictions',
    title: 'Domain Restrictions',
    description: 'Understand why logarithms require strictly positive values.',
    category: 'transformations',
    module: 'D',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    objectives: [
      'State the domain of ln and log10 (x > 0)',
      'State the domain of sqrt (x ≥ 0)',
      'Handle domain violations gracefully',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Logarithm domain',
        formula: '\\ln(x), \\log_{10}(x) \\text{ defined only for } x > 0',
        explanation:
          'Logarithms are undefined for x ≤ 0. As x → 0⁺, ln(x) → −∞. For x < 0, there is no real-valued logarithm. ' +
          'In PK, this means concentrations of 0 or negative values CANNOT be log-transformed and must be rejected by the analysis.',
      },
      {
        type: 'text',
        title: 'Handling violations',
        content:
          'When a dataset contains non-positive values that need log transformation, the engine must REJECT the analysis with a clear error — ' +
          'it must NOT silently drop the points or substitute NaN. The learner should see which rows are invalid and why.',
      },
      {
        type: 'question',
        title: 'Quick check: domain',
        question: 'A dataset has C = [10, 5, 0, −2]. What happens when you try ln(C) regression?',
        options: [
          'The engine fits the line using the valid points only.',
          'The engine substitutes NaN for the invalid points.',
          'The engine rejects the analysis because ln is undefined for C ≤ 0.',
          'The engine sets the invalid points to 1 and continues.',
        ],
        correctAnswer: 2,
        explanation:
          'ln(0) and ln(−2) are undefined. A correct engine rejects the analysis with a structured error listing the offending rows — ' +
          'it does NOT silently drop, substitute, or coerce values.',
        mistakeCategory: 'domain-error',
      },
    ],
    keyTakeaways: [
      'ln and log10 require x > 0.',
      'sqrt requires x ≥ 0.',
      'Domain violations must be rejected with clear errors — never silently handled.',
    ],
  },
  {
    id: 'd4-back-transformation',
    title: 'Back-Transformation',
    description: 'Convert predictions from the transformed scale back to the original scale.',
    category: 'transformations',
    module: 'D',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    objectives: [
      'Back-transform via exp (for ln) or 10^x (for log10)',
      'Recognize Jensen\'s inequality bias',
      'Interpret back-transformed predictions as medians',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Back-transformation',
        formula: '\\hat{y} = e^{\\hat{z}} \\text{ (ln)} \\quad \\text{or} \\quad \\hat{y} = 10^{\\hat{z}} \\text{ (log10)}',
        explanation:
          'Once the regression predicts ẑ on the transformed scale, back-transform to get ŷ on the original scale. ' +
          'For ln: ŷ = e^ẑ. For log10: ŷ = 10^ẑ.',
      },
      {
        type: 'text',
        title: 'Jensen\'s inequality bias',
        content:
          'The back-transformed prediction ŷ = e^ẑ is the MEDIAN prediction on the original scale, NOT the mean. ' +
          'Because exp() is convex, E[exp(ẑ)] > exp(E[ẑ]) — the mean of the back-transformed values is larger than the back-transform of the mean. ' +
          'A bias correction (Duan\'s smearing factor) is needed for an unbiased mean estimate. For educational purposes, the median prediction is sufficient.',
      },
      {
        type: 'question',
        title: 'Quick check: back-transformation',
        question: 'A log-linear model ln(Y) = 2 + 0.5X predicts ln(Y) = 3 at X = 2. What is the predicted Y on the original scale?',
        options: ['Y = 3', 'Y = e³ ≈ 20.09', 'Y = 10³ = 1000', 'Y = ln(3) ≈ 1.10'],
        correctAnswer: 1,
        explanation:
          'For an ln model, back-transform via exp: Y = e^ln(Y) = e³ ≈ 20.09. ' +
          'Using 10^3 (the log10 back-transform) would be wrong — that is a different base.',
        mistakeCategory: 'wrong-transformation',
      },
    ],
    keyTakeaways: [
      'ln: back-transform via exp. log10: back-transform via 10^x.',
      'Back-transformed predictions are medians, not means (Jensen\'s inequality).',
      'Use Duan\'s smearing factor for unbiased mean estimates (advanced).',
    ],
  },

  // =========================================================================
  // MODULE E — Pharmacokinetics
  // =========================================================================
  {
    id: 'e1-concentration-vs-time',
    title: 'Concentration vs Time',
    description: 'Understand the concentration-time profile.',
    category: 'pk',
    module: 'E',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    objectives: [
      'Describe a concentration-time curve',
      'Identify the sampling times',
      'Recognize exponential decay',
    ],
    sections: [
      {
        type: 'text',
        title: 'The concentration-time profile',
        content:
          'In a pharmacokinetic study, a drug is administered and blood samples are taken at specific times. ' +
          'Each sample is assayed for drug concentration. Plotting concentration (Y) vs time (X) gives the concentration-time profile. ' +
          'For most drugs given by IV bolus, this profile shows exponential decay — the concentration drops rapidly at first, then more slowly.',
      },
      {
        type: 'interactive',
        title: 'Explore the PK curve',
        componentId: 'pk-curve-explorer',
      },
    ],
    keyTakeaways: [
      'Time on X axis, concentration on Y axis.',
      'IV bolus profiles typically show exponential decay.',
      'Sampling times should span the elimination phase.',
    ],
  },
  {
    id: 'e2-first-order-elimination',
    title: 'First-Order Elimination',
    description: 'Understand the first-order elimination model.',
    category: 'pk',
    module: 'E',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    objectives: [
      'Define first-order elimination',
      'Write the differential equation dC/dt = −kC',
      'Integrate to get C(t) = C₀·e^(−kt)',
    ],
    sections: [
      {
        type: 'text',
        title: 'The first-order assumption',
        content:
          'In first-order elimination, the RATE of elimination is proportional to the current concentration: dC/dt = −kC. ' +
          'The constant k is the elimination rate constant (units: time⁻¹). ' +
          'A drug with k = 0.2 h⁻¹ loses 20% of its remaining concentration per hour.',
      },
      {
        type: 'formula',
        title: 'The exponential decay equation',
        formula: 'C(t) = C_0 \\cdot e^{-kt}',
        explanation:
          'Integrating dC/dt = −kC gives C(t) = C₀·e^(−kt). C₀ is the concentration at t = 0 (immediately after dosing). ' +
          'This is the fundamental equation of first-order PK.',
      },
      {
        type: 'interactive',
        title: 'Guided PK calculation',
        componentId: 'guided-pk-calculation',
      },
    ],
    keyTakeaways: [
      'First-order: rate of elimination ∝ current concentration.',
      'dC/dt = −kC → C(t) = C₀·e^(−kt).',
      'k has units of time⁻¹ (e.g., h⁻¹).',
    ],
  },
  {
    id: 'e3-linearization',
    title: 'Linearization',
    description: 'Linearize the exponential decay equation using logarithms.',
    category: 'pk',
    module: 'E',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    objectives: [
      'Apply ln to both sides of C(t) = C₀·e^(−kt)',
      'Obtain ln(C) = ln(C₀) − kt',
      'Map to the linear regression form Y = a + bX',
    ],
    sections: [
      {
        type: 'formula',
        title: 'The linearization step',
        formula: '\\ln(C(t)) = \\ln(C_0) - kt',
        explanation:
          'Taking ln of both sides of C(t) = C₀·e^(−kt) yields ln(C) = ln(C₀) − kt. ' +
          'This is the linear form Y = a + bX with Y = ln(C), X = t, intercept a = ln(C₀), and slope b = −k.',
      },
      {
        type: 'text',
        title: 'Why this matters',
        content:
          'The linearized form lets us use ordinary linear regression to estimate k and C₀ from observed (t, C) data. ' +
          'We transform Y, fit a straight line, then interpret the slope and intercept as PK parameters. ' +
          'This is the foundation of log-linear PK analysis.',
      },
    ],
    keyTakeaways: [
      'ln(C) = ln(C₀) − kt is the linearized PK equation.',
      'Slope = −k, intercept = ln(C₀).',
      'Linearization enables OLS regression on transformed data.',
    ],
  },
  {
    id: 'e4-k-and-half-life',
    title: 'k and Half-Life',
    description: 'Derive the elimination rate constant and half-life from the regression slope.',
    category: 'pk',
    module: 'E',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    objectives: [
      'Compute k = −slope (ln) or k = −slope × ln(10) (log10)',
      'Compute t½ = ln(2)/k',
      'Interpret k and t½ physically',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Deriving k from the slope',
        formula: 'k = -\\text{slope} \\text{ (ln)} \\quad \\text{or} \\quad k = -\\text{slope} \\cdot \\ln(10) \\text{ (log10)}',
        explanation:
          'From ln(C) = ln(C₀) − kt, the slope is −k, so k = −slope. ' +
          'From log10(C) = log10(C₀) − (k/ln10)·t, the slope is −k/ln10, so k = −slope × ln(10) ≈ −2.303 × slope. ' +
          'k is always positive for elimination (slope is negative).',
      },
      {
        type: 'formula',
        title: 'Half-life',
        formula: 't_{1/2} = \\frac{\\ln(2)}{k} \\approx \\frac{0.693}{k}',
        explanation:
          'Half-life is the time for concentration to drop by 50%. At t = t½, C = C₀/2. ' +
          'Substituting: C₀/2 = C₀·e^(−k·t½) → e^(−k·t½) = 1/2 → −k·t½ = −ln(2) → t½ = ln(2)/k. ' +
          'Half-life is constant for first-order kinetics (independent of dose).',
      },
      {
        type: 'question',
        title: 'Quick check: k sign',
        question: 'In an ln(C) vs time regression, the slope is −0.15. What is k?',
        options: [
          'k = −0.15 h⁻¹ (negative because slope is negative)',
          'k = 0.15 h⁻¹ (positive because k = −slope)',
          'k = 0.15 × ln(10) ≈ 0.345 h⁻¹',
          'k = 0.15 / ln(2) ≈ 0.216 h⁻¹',
        ],
        correctAnswer: 1,
        explanation:
          'For ln model, k = −slope = −(−0.15) = 0.15 h⁻¹. k is always positive for elimination. ' +
          'A negative k would mean the drug concentration is increasing, which contradicts elimination.',
        mistakeCategory: 'pk-slope-sign',
      },
    ],
    keyTakeaways: [
      'k = −slope (ln) or k = −slope × ln(10) (log10).',
      'k > 0 always for elimination (slope < 0).',
      't½ = ln(2)/k ≈ 0.693/k (constant for first-order).',
    ],
  },
  {
    id: 'e5-c0-and-auc',
    title: 'C₀ and AUC',
    description: 'Derive the initial concentration and area under the curve.',
    category: 'pk',
    module: 'E',
    difficulty: 'advanced',
    estimatedMinutes: 12,
    objectives: [
      'Compute C₀ = e^intercept (ln) or 10^intercept (log10)',
      'Compute trapezoidal AUC_last',
      'Compute AUC_extra = C_last/k and AUC_total',
    ],
    sections: [
      {
        type: 'formula',
        title: 'Initial concentration C₀',
        formula: 'C_0 = e^{\\text{intercept}} \\text{ (ln)} \\quad \\text{or} \\quad C_0 = 10^{\\text{intercept}} \\text{ (log10)}',
        explanation:
          'The intercept of the log-linear regression is ln(C₀) (or log10(C₀)). Back-transform to get C₀. ' +
          'C₀ is the model\'s prediction at t = 0 — an EXTRAPOLATION, not necessarily an observed measurement. ' +
          'For IV bolus, C₀ is the immediate post-injection concentration.',
      },
      {
        type: 'formula',
        title: 'Trapezoidal AUC',
        formula: '\\text{AUC}_{last} = \\sum_{i=1}^{n-1} \\frac{C_i + C_{i+1}}{2} (t_{i+1} - t_i)',
        explanation:
          'AUC_last is the area under the concentration-time curve over the observed data, computed by the linear trapezoidal rule. ' +
          'It approximates total drug exposure. Units: concentration × time (e.g., mg·h/L).',
      },
      {
        type: 'formula',
        title: 'AUC extrapolation',
        formula: '\\text{AUC}_{extra} = \\frac{C_{last}}{k}, \\quad \\text{AUC}_{total} = \\text{AUC}_{last} + \\text{AUC}_{extra}',
        explanation:
          'AUC_extra extrapolates the tail from the last observation to infinity, assuming first-order elimination continues. ' +
          'It is suppressed when k ≤ 0 or C_last ≤ 0. If extrapFraction > 20%, the sampling window may be too short. ' +
          'The theoretical model-based AUC = C₀/k is shown for comparison.',
      },
      {
        type: 'interactive',
        title: 'Guided PK calculation with AUC',
        componentId: 'guided-pk-calculation',
      },
    ],
    keyTakeaways: [
      'C₀ = e^intercept (ln) or 10^intercept (log10). Extrapolation, not observation.',
      'AUC_last = trapezoidal rule over observed data.',
      'AUC_extra = C_last/k; AUC_total = AUC_last + AUC_extra.',
    ],
  },
  {
    id: 'e6-terminal-phase',
    title: 'Terminal Phase',
    description: 'Understand why terminal-phase selection matters.',
    category: 'pk',
    module: 'E',
    difficulty: 'advanced',
    estimatedMinutes: 10,
    objectives: [
      'Define the terminal elimination phase',
      'Explain why early points may bias the slope',
      'Use the best-rsquared-suffix selector',
    ],
    sections: [
      {
        type: 'text',
        title: 'The terminal phase',
        content:
          'The terminal elimination phase is the subset of observations where only elimination is occurring — ' +
          'distribution and absorption are complete. For IV bolus one-compartment data, ALL points are terminal. ' +
          'For two-compartment or oral data, early points reflect distribution/absorption and bias the slope if included.',
      },
      {
        type: 'text',
        title: 'Selection strategies',
        content:
          'Two deterministic strategies: (1) ALL-POINTS — use every observation (appropriate for clean IV bolus data). ' +
          '(2) BEST-R²-SUFFIX — try every contiguous suffix from the end and pick the one with the highest R² on the log-linear fit. ' +
          'The suffix approach excludes early distribution-phase points automatically.',
      },
      {
        type: 'question',
        title: 'Quick check: terminal phase',
        question: 'Why might including early points from a two-compartment drug bias the estimated k?',
        options: [
          'Early points have higher concentration, which inflates k.',
          'Early points reflect distribution, not elimination, so the slope is steeper than the true elimination rate.',
          'Early points always have lower R².',
          'Early points cause the regression to fail.',
        ],
        correctAnswer: 1,
        explanation:
          'In a two-compartment model, early points reflect rapid distribution (steep slope) plus slower elimination. ' +
          'Fitting all points gives a slope that mixes distribution and elimination, overestimating k. ' +
          'Terminal-phase selection isolates the elimination-only points.',
        mistakeCategory: 'conceptual',
      },
    ],
    keyTakeaways: [
      'Terminal phase = elimination-only points (distribution/absorption complete).',
      'Including early distribution points biases k (overestimates).',
      'best-rsquared-suffix picks the suffix with the highest R² automatically.',
    ],
  },
  {
    id: 'e7-interpretation-and-limitations',
    title: 'Interpretation and Limitations',
    description: 'Interpret PK results responsibly and recognize limitations.',
    category: 'pk',
    module: 'E',
    difficulty: 'advanced',
    estimatedMinutes: 8,
    objectives: [
      'State that high R² does not prove first-order kinetics',
      'Recognize when extrapolation is risky',
      'Commit to educational (not clinical) use',
    ],
    sections: [
      {
        type: 'text',
        title: 'R² does not prove the model',
        content:
          'A high R² on the log-linear fit only confirms that ln(C) is approximately linear in time. ' +
          'It does NOT prove the drug follows first-order elimination — a bi-exponential or other model might fit equally well. ' +
          'Always examine the residual plot and the original-scale curve fit. Model selection requires pharmacokinetic context, not just a high R².',
      },
      {
        type: 'text',
        title: 'Extrapolation risk',
        content:
          'C₀ is an extrapolation to t = 0. AUC_extra extrapolates beyond the last observation. ' +
          'Both assume first-order elimination continues, which may not hold at very low concentrations (e.g., flip-flop kinetics, saturable elimination). ' +
          'If extrapFraction > 20%, the AUC_total estimate is highly model-dependent.',
      },
      {
        type: 'text',
        title: 'Educational use only',
        content:
          'This module is an educational tool for teaching how regression estimates PK parameters. ' +
          'It is NOT a substitute for validated clinical/pharmacometric software. ' +
          'Never use these outputs for patient-specific therapeutic drug monitoring or clinical dosing decisions.',
      },
      {
        type: 'question',
        title: 'Final check: limitations',
        question: 'Which statement about PK regression results is MOST accurate?',
        options: [
          'A high R² proves the drug follows first-order elimination.',
          'The estimated k can be used directly for clinical dosing.',
          'High R² supports the linear fit on the log scale, but model selection requires PK context and residual diagnostics.',
          'C₀ is always an observed measurement.',
        ],
        correctAnswer: 2,
        explanation:
          'R² measures linear fit on the log scale — it does not prove first-order kinetics. ' +
          'Model selection requires PK context, residual examination, and domain knowledge. ' +
          'C₀ is an extrapolation, and the tool is educational, not clinical.',
        mistakeCategory: 'r2-misinterpretation',
      },
    ],
    keyTakeaways: [
      'High R² ≠ proof of first-order kinetics.',
      'C₀ and AUC_extra are extrapolations (model-dependent).',
      'This tool is educational — not for clinical dosing.',
    ],
  },
];

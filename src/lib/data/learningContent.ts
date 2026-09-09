export type Lesson = {
  id: string;
  number: number;
  title: string;
  category: 'core' | 'diagnostics' | 'transformations' | 'pk';
  objective: string;
  summary: string;
  content: string[];
  formulaLatex?: string;
  formulaMeaning?: string;
  keyTakeaways: string[];
  interactiveTip?: string;
};

export const LESSONS: Lesson[] = [
  {
    id: 'what-is-regression',
    number: 1,
    title: 'What is Regression?',
    category: 'core',
    objective: 'Understand the primary goal of regression analysis and how it differs from simple correlation.',
    summary:
      'Regression is a statistical technique for modeling and analyzing the relationship between a dependent outcome variable and one or more independent predictor variables.',
    content: [
      'In scientific inquiry, we frequently want to know not only if two variables change together, but how one predicts the other. Regression constructs a mathematical equation that predicts the expected value of Y given a specific value of X.',
      'Unlike simple correlation—which only summarizes the strength and direction of linear association symmetrically—regression is directional: X predicts Y.',
      'Always remember: correlation and regression measure mathematical relationships; neither alone proves causation without experimental design or biological justification.',
    ],
    formulaLatex: '\\hat{Y} = a + bX',
    formulaMeaning:
      'Y-hat is the expected mean value of Y for a chosen value of X, governed by intercept a and slope b.',
    keyTakeaways: [
      'Regression provides an equation for prediction and rate of change.',
      'X is the independent (predictor) variable; Y is the dependent (outcome) variable.',
      'Statistical association does not equal physical or biological causation.',
    ],
    interactiveTip: 'Visit the Regression Lab to see how altering any point changes the fitted line in real-time.',
  },
  {
    id: 'independent-dependent-variables',
    number: 2,
    title: 'Independent vs. Dependent Variables',
    category: 'core',
    objective: 'Properly identify which variable belongs on the X axis and which belongs on the Y axis.',
    summary:
      'The independent variable (X) is manipulated or observed as a predictor, while the dependent variable (Y) is the measured response.',
    content: [
      'By scientific convention, the horizontal axis (X) represents the independent variable: time, drug dose, temperature, or study hours.',
      'The vertical axis (Y) represents the dependent outcome: plasma drug concentration, test score, gas consumption, or biological response.',
      'In pharmacokinetics, Time is universally plotted on the X axis, and Concentration is plotted on the Y axis.',
    ],
    keyTakeaways: [
      'X = Predictor / Explanatory / Independent variable.',
      'Y = Response / Outcome / Dependent variable.',
      'Swapping X and Y produces a different regression line because least squares minimizes vertical errors in Y.',
    ],
  },
  {
    id: 'scatter-plots-correlation',
    number: 3,
    title: 'Scatter Plots and Pearson Correlation (r)',
    category: 'core',
    objective: 'Learn how to visually assess bivariate data and interpret Pearson correlation coefficient r.',
    summary:
      'Pearson r ranges between -1 and +1, measuring the direction and linear strength of association.',
    content: [
      'Before running any statistical calculation, always plot your data on a scatter plot. Visual inspection reveals outliers, non-linearity, and clustering that numbers alone conceal.',
      'Pearson r is dimensionless. r = +1 denotes a perfect positive straight line; r = -1 denotes a perfect negative straight line; r = 0 indicates no linear relationship.',
      'Notice the word "linear": Pearson r can equal 0 for a strong relationship if that relationship is completely curved (like a symmetrical parabola).',
    ],
    formulaLatex: 'r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2 \\sum (y_i - \\bar{y})^2}}',
    formulaMeaning: 'Ratio of shared covariation to individual standard deviations.',
    keyTakeaways: [
      'r is bounded between -1.0 and +1.0.',
      'r measures linear strength only; curved patterns can have r near zero.',
      'Scatter plots are non-negotiable first steps in any analysis.',
    ],
  },
  {
    id: 'ordinary-least-squares',
    number: 4,
    title: 'Ordinary Least Squares (OLS) Principle',
    category: 'core',
    objective: 'Understand why the regression line is positioned where it is: minimizing squared vertical errors.',
    summary:
      'The OLS line is mathematically chosen so that the sum of squared vertical residuals (SSE) is smaller than for any other straight line.',
    content: [
      'Why not minimize the sum of simple residuals? Because positive and negative residuals would cancel each other out (their sum around the mean is always zero!).',
      'Why not minimize absolute residuals? Squaring residuals penalizes larger errors disproportionately and yields an elegant, unique calculus solution with smooth derivatives.',
      'The resulting line always passes through the "center of gravity" of the dataset: the point (mean X, mean Y).',
    ],
    formulaLatex: '\\min \\sum_{i=1}^n e_i^2 = \\min \\sum_{i=1}^n (y_i - \\hat{y}_i)^2',
    formulaMeaning: 'Sum of squared errors (SSE) is minimized.',
    keyTakeaways: [
      'OLS minimizes vertical distance in the Y direction.',
      'The regression line always passes through (x̄, ȳ).',
      'Squaring prevents positive and negative residuals from cancelling out.',
    ],
    interactiveTip: 'Check the "Show Calculation" walkthrough in Regression Lab to follow each squared deviation.',
  },
  {
    id: 'interpreting-slope',
    number: 5,
    title: 'Interpreting the Slope (b)',
    category: 'core',
    objective: 'Accurately articulate the physical or scientific meaning of the regression slope.',
    summary:
      'The slope represents the expected change in Y for every one-unit increase in X.',
    content: [
      'Slope has units: (units of Y) / (units of X). For example, if Y is exam score (%) and X is study time (hours), slope is in "% per hour".',
      'A positive slope indicates that as X increases, Y is expected to increase.',
      'A negative slope indicates an inverse relationship: as X increases, Y is expected to decrease.',
      'A slope of zero means that knowledge of X provides no linear predictive value for Y; the line is simply horizontal at ȳ.',
    ],
    formulaLatex: 'b = \\frac{S_{xy}}{S_{xx}} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}',
    formulaMeaning: 'Covariance of X and Y divided by variance of X.',
    keyTakeaways: [
      'Slope = rate of change = ΔY / ΔX.',
      'Always include the physical units when interpreting slope.',
      'Slope is the bridge between statistics and physical rate constants.',
    ],
  },
  {
    id: 'interpreting-intercept',
    number: 6,
    title: 'Interpreting the Intercept (a)',
    category: 'core',
    objective: 'Recognize when the y-intercept is scientifically meaningful and when it is merely a mathematical anchor.',
    summary:
      'The intercept (a) is the predicted value of Y when X is exactly zero.',
    content: [
      'To evaluate the intercept, ask two questions: 1) Can X physically equal zero? 2) Did our sample data include values near zero?',
      'If X = 0 is impossible (e.g. adult human height) or outside the observed data range (extrapolation), the intercept is a mathematical anchor with no direct physical interpretation.',
      'However, in pharmacokinetics, the intercept of ln(Concentration) vs. Time is crucially meaningful: it represents ln(C0), the hypothetical plasma concentration at the exact instant of intravenous injection!',
    ],
    formulaLatex: 'a = \\bar{y} - b\\bar{x}',
    formulaMeaning: 'Intercept adjusts so the line passes through the centroid (x̄, ȳ).',
    keyTakeaways: [
      'Intercept = predicted Y when X = 0.',
      'Beware of extrapolation if X = 0 is far outside your data range.',
      'In IV bolus PK, intercept gives the essential C0 baseline parameter.',
    ],
  },
  {
    id: 'understanding-r-squared',
    number: 7,
    title: 'Understanding R² (Coefficient of Determination)',
    category: 'core',
    objective: 'Interpret R² correctly without falling into common traps or assuming high R² equals model validity.',
    summary:
      'R² is the proportion of total variation in Y that is explained by the linear regression on X.',
    content: [
      'Total sum of squares (SST) measures how much Y values scatter around their mean ȳ. Regression partitions this into two parts: SST = SSR (explained by model) + SSE (unexplained error).',
      'R² = SSR / SST = 1 - (SSE / SST). It ranges from 0.0 (0%) to 1.0 (100%). In simple linear regression, R² is exactly equal to the square of Pearson r.',
      'CRITICAL WARNING: A high R² (e.g. 0.95) does NOT prove that the relationship is linear! Anscombe’s quartet famously showed that completely curved relationships can have high R² with a completely invalid straight line. Always examine residuals.',
    ],
    formulaLatex: 'R^2 = 1 - \\frac{SSE}{SST} = \\frac{SSR}{SST} = r^2',
    formulaMeaning: 'Fraction of variation in Y accounted for by the regression line.',
    keyTakeaways: [
      'R² measures proportion of variance explained.',
      'High R² does not prove linearity or model appropriateness.',
      'Low R² does not invalidate a model if the goal is estimating a subtle physical effect.',
    ],
  },
  {
    id: 'residuals-definition',
    number: 8,
    title: 'What is a Residual?',
    category: 'diagnostics',
    objective: 'Define residuals, understand their calculation, and see why they are the foundation of regression diagnostics.',
    summary:
      'A residual is the vertical difference between the observed value and the model’s predicted value: e = y - ŷ.',
    content: [
      'If a point lies above the fitted line, the observed Y was higher than predicted, giving a positive residual (e > 0).',
      'If a point lies below the line, the model over-predicted, giving a negative residual (e < 0).',
      'By definition of the OLS line, the sum of all raw residuals is mathematically zero: Σ e_i = 0.',
      'Residuals represent everything that our simple model could not explain: random biological noise, measurement imprecision, or missing variables.',
    ],
    formulaLatex: 'e_i = y_i - \\hat{y}_i = y_i - (a + bx_i)',
    formulaMeaning: 'Vertical deviation of point i from the fitted line.',
    keyTakeaways: [
      'Residual = Observed Y - Predicted Y.',
      'The sum of raw OLS residuals always equals 0.',
      'Residuals isolate the unexplained component of your data.',
    ],
  },
  {
    id: 'residual-diagnostics',
    number: 9,
    title: 'Residual Plots and Pattern Detection',
    category: 'diagnostics',
    objective: 'Learn how to inspect Residual vs. Fitted plots to verify model assumptions.',
    summary:
      'A good residual plot resembles a random "starry night" cloud centered along the zero line with no systematic shapes.',
    content: [
      'Plotting residuals on the vertical axis against fitted values (ŷ) or X removes the overall slope and magnifies the errors.',
      'Curved patterns (U-shapes or inverted-U): indicate that a straight line is the wrong mathematical form; data needs a polynomial term or non-linear transformation.',
      'Funnel shapes (fanning out or in): indicate heteroscedasticity (non-constant variance), where measurements become more variable at higher values.',
      'Isolated outliers: individual points that deviate drastically from the pack.',
    ],
    keyTakeaways: [
      'Ideal residual plot: random scatter around zero with uniform vertical thickness.',
      'Curvature = non-linear relationship detected.',
      'Funnel shape = non-constant variance (heteroscedasticity).',
    ],
    interactiveTip: 'Select Dataset #5 (Nonlinear Curve) in Regression Lab and click the Diagnostics tab to see residual curvature.',
  },
  {
    id: 'regression-assumptions',
    number: 10,
    title: 'The Core Assumptions of Linear Regression',
    category: 'diagnostics',
    objective: 'Review the classical assumptions required for reliable statistical inference in OLS regression.',
    summary:
      'The LINE acronym summarizes: Linearity, Independence, Normality of residuals, and Equal variance (homoscedasticity).',
    content: [
      '1. Linearity: The true relationship between the mean of Y and X is straight.',
      '2. Independence: Observations are independent of one another (not repeated serial measurements without modeling correlation).',
      '3. Normality: Residuals are approximately normally distributed (needed for p-values and confidence intervals, though OLS estimates remain unbiased by the Gauss-Markov theorem even without normality).',
      '4. Equal Variance (Homoscedasticity): The spread of residuals remains constant across all values of X.',
    ],
    keyTakeaways: [
      'Remember LINE: Linearity, Independence, Normality, Equal variance.',
      'Residual plots are the primary tool to verify these assumptions.',
      'Violations can often be solved through transformations.',
    ],
  },
  {
    id: 'outliers-and-leverage',
    number: 11,
    title: 'Outliers, Leverage, and Influence',
    category: 'diagnostics',
    objective: 'Distinguish between simple outliers, high-leverage points, and influential observations.',
    summary:
      'Not all outliers change the line; points with extreme X values (high leverage) have the greatest power to pull the slope.',
    content: [
      'An outlier is a point with an unusually large residual (far from the line in the Y direction).',
      'A high leverage point is an observation with an extreme X value, far from the mean of X.',
      'An influential point is one that drastically changes the slope or intercept if removed. Think of a see-saw: a child sitting at the very end (high leverage) has far more torque than a child sitting near the fulcrum.',
      'NEVER delete an outlier just because it makes R² look worse! Outliers must be investigated. In pharmacology, an outlier could be a patient with unexpected genetic polymorphism or drug interaction.',
    ],
    keyTakeaways: [
      'Leverage comes from distance in X.',
      'Influence = Leverage × Outlier magnitude.',
      'Investigate outliers scientifically; never discard them automatically.',
    ],
  },
  {
    id: 'log-transformations',
    number: 12,
    title: 'Logarithmic Transformations',
    category: 'transformations',
    objective: 'Understand why and when we take the logarithm of variables in data analysis.',
    summary:
      'Log transformations convert multiplicative/exponential relationships into additive/linear relationships.',
    content: [
      'Many natural and pharmacological processes do not change by adding a constant amount, but by multiplying by a constant ratio (e.g. half-life, compound interest, bacterial growth).',
      'Taking the logarithm of exponential data linearizes the curve into a straight line: ln(y) = ln(a) + bx.',
      'CRITICAL DOMAIN RESTRICTION: Logarithms are only mathematically defined for strictly positive numbers (> 0). Values equal to 0 or negative numbers cannot be logarithmically transformed.',
    ],
    formulaLatex: '\\ln(A \\cdot B) = \\ln(A) + \\ln(B), \\quad \\ln(e^{bx}) = bx',
    formulaMeaning: 'Logarithms turn multiplication into addition and exponents into linear coefficients.',
    keyTakeaways: [
      'Logs linearize exponential growth and decay.',
      'Logs compress skewed scales and stabilize variance.',
      'Values must be strictly > 0.',
    ],
  },
  {
    id: 'log-linear-models',
    number: 13,
    title: 'The Log-Linear Regression Model',
    category: 'transformations',
    objective: 'Fit and interpret regression models where the dependent variable is log-transformed: ln(Y) = a + bX.',
    summary:
      'In a log-linear model, a one-unit increase in X multiplies Y by approximately e^b (or a percentage change of ~ 100 × b%).',
    content: [
      'Model: ln(Y) = a + bX. When we fit regression to the transformed pairs (X, ln Y), the estimated slope b represents the proportional rate of change.',
      'To make predictions on the original scale of Y, we exponentiate (back-transform): Y = e^(a + bX) = e^a × (e^b)^X.',
      'Notice that e^a is the estimated baseline Y when X = 0, and e^b is the multiplicative growth or decay factor per unit X.',
    ],
    formulaLatex: '\\hat{Y} = e^a \\cdot e^{bX}',
    formulaMeaning: 'Back-transformed exponential prediction equation.',
    keyTakeaways: [
      'Fitted equation: ln(Y) = a + bX.',
      'Back-transformed equation: Y = exp(a) × exp(bX).',
      'Avoid directly comparing R² on the log scale with R² on the raw scale as if they were identical metrics.',
    ],
  },
  {
    id: 'intro-pk-regression',
    number: 14,
    title: 'Introduction to Pharmacokinetics (PK) Regression',
    category: 'pk',
    objective: 'Connect linear regression directly to one-compartment drug elimination modeling.',
    summary:
      'First-order drug elimination follows an exponential decay curve that linearizes when concentration is log-transformed.',
    content: [
      'In a one-compartment intravenous bolus model, a drug distributes instantly into the bloodstream and tissues, then is cleared by the liver or kidneys at a rate proportional to its concentration.',
      'This process is called first-order elimination: dC/dt = -k C.',
      'Integrating this differential equation yields the fundamental pharmacokinetics equation: C(t) = C0 × e^(-kt).',
    ],
    formulaLatex: 'C(t) = C_0 \\cdot e^{-kt}',
    formulaMeaning: 'Concentration at time t equals initial concentration C0 decaying at elimination rate k.',
    keyTakeaways: [
      'First-order elimination: clearance rate is proportional to concentration.',
      'Concentration-time profile forms an exponential decay curve.',
      'C0 is the theoretical initial concentration at t = 0.',
    ],
  },
  {
    id: 'elimination-rate-constant',
    number: 15,
    title: 'Deriving the Elimination Rate Constant (k)',
    category: 'pk',
    objective: 'Derive k = -slope from linear regression of ln(Concentration) vs. Time.',
    summary:
      'Taking the natural log of C(t) = C0 e^(-kt) yields ln C = ln C0 - kt, which perfectly maps to Y = a + bX.',
    content: [
      'Start with: C(t) = C0 × e^(-kt).',
      'Take natural log of both sides: ln(C) = ln(C0) + ln(e^(-kt)) = ln(C0) - kt.',
      'Compare this directly to standard linear regression: Y = a + bX.',
      'Here, Y = ln(C), X = t, intercept a = ln(C0), and slope b = -k.',
      'Therefore, the elimination rate constant is simply the negative of the slope: k = -slope! Its units are inverse time (e.g. h⁻¹ or min⁻¹).',
    ],
    formulaLatex: '\\ln C = \\ln C_0 - kt \\implies b = -k \\implies k = -b',
    formulaMeaning: 'The negative slope of the semi-log plot is the elimination rate constant k.',
    keyTakeaways: [
      'k = -slope from ln(C) vs Time regression.',
      'k represents the fraction of drug eliminated per unit time (e.g. 0.2 h⁻¹ = 20% per hour).',
      'C0 is recovered via C0 = exp(intercept).',
    ],
  },
  {
    id: 'half-life-calculation',
    number: 16,
    title: 'Calculating Elimination Half-Life (t½)',
    category: 'pk',
    objective: 'Derive and calculate half-life from the elimination rate constant: t½ = ln(2) / k.',
    summary:
      'Half-life is the time required for the plasma concentration of a drug to decrease by exactly 50%.',
    content: [
      'By definition, at t = t½, concentration C has dropped to C0 / 2.',
      'Substitute into the equation: C0 / 2 = C0 × e^(-k · t½) => 1/2 = e^(-k · t½).',
      'Take natural log: ln(1/2) = -k · t½ => -ln(2) = -k · t½.',
      'Divide by -k: t½ = ln(2) / k ≈ 0.69315 / k.',
      'Notice that for first-order kinetics, half-life is constant regardless of how much drug was administered!',
    ],
    formulaLatex: 't_{1/2} = \\frac{\\ln(2)}{k} \\approx \\frac{0.693}{k}',
    formulaMeaning: 'Time required for concentration to halve.',
    keyTakeaways: [
      't½ is inversely proportional to elimination rate constant k.',
      'For first-order elimination, t½ is concentration-independent.',
      'After 5 half-lives, ~97% of the drug has been eliminated.',
    ],
  },
  {
    id: 'ln-vs-log10-pk',
    number: 17,
    title: 'Natural Log (ln) vs. Common Log (log10) in PK',
    category: 'pk',
    objective: 'Avoid the classic pharmacy student pitfall: confusing ln and log10 transformations.',
    summary:
      'Natural log uses base e (2.718); common log uses base 10. In log10 regression, k = -2.303 × slope.',
    content: [
      'Semi-log graph paper historically used base-10 cycles. Many classic clinical textbooks therefore present formulas using log10.',
      'If you take log10 of C(t) = C0 e^(-kt), you get: log10(C) = log10(C0) - (k / ln 10) t.',
      'Since ln(10) ≈ 2.302585, the slope of log10(C) vs t is: slope = -k / 2.303.',
      'Therefore, to recover k from a log10 regression: k = -2.303 × slope, and C0 = 10^(intercept).',
      'Never mix the two! If you fit with ln, k = -slope. If you fit with log10, k = -2.303 × slope.',
    ],
    formulaLatex: '\\log_{10}(C) = \\log_{10}(C_0) - \\frac{k}{2.303}t \\implies k = -2.303 \\times \\text{slope}',
    formulaMeaning: 'The 2.303 factor is the conversion factor between base-e and base-10 logarithms.',
    keyTakeaways: [
      'ln model: k = -slope, C0 = e^(intercept).',
      'log10 model: k = -2.303 × slope, C0 = 10^(intercept).',
      'Always verify which log base your software or table is using.',
    ],
  },
  {
    id: 'iv-bolus-parameters',
    number: 18,
    title: 'IV Bolus: Volume of Distribution and Clearance',
    category: 'pk',
    objective: 'Calculate apparent Volume of Distribution (Vd) and Systemic Clearance (CL).',
    summary:
      'Given an intravenous dose and estimated C0, Vd = Dose / C0, and total body clearance CL = k × Vd.',
    content: [
      'The apparent Volume of Distribution (Vd) represents the hypothetical fluid volume required to contain the total drug dose at the measured initial plasma concentration: Vd = Dose / C0.',
      'If a drug binds extensively to peripheral tissues (e.g. digoxin or chloroquine), plasma concentration C0 will be very low, resulting in an apparent Vd far greater than the physiological body volume.',
      'Total body clearance (CL) is the volume of plasma completely cleared of drug per unit time: CL = k × Vd.',
      'CL determines the maintenance dose needed to maintain a therapeutic steady-state concentration.',
    ],
    formulaLatex: 'V_d = \\frac{\\text{Dose}}{C_0}, \\quad CL = k \\times V_d',
    formulaMeaning: 'Vd relates dose to plasma concentration; clearance relates elimination rate to distribution volume.',
    keyTakeaways: [
      'Vd = Dose / C0 (units: L or L/kg).',
      'CL = k × Vd (units: L/h or mL/min).',
      'Educational use only: clinical dosing requires patient-specific clinical protocols.',
    ],
  },
  // -------------------------------------------------------------------------
  // Phase 3 (spec §28): "Why take the logarithm?" — focused log-linear
  // regression lesson covering exponential relationships, linearization,
  // ln vs log10, slope interpretation, back-transformation, residuals,
  // and the PK elimination connection.
  // -------------------------------------------------------------------------
  {
    id: 'why-take-the-logarithm',
    number: 19,
    title: 'Why Take the Logarithm? Linearizing Exponential Relationships',
    category: 'transformations',
    objective:
      'Understand why logarithmic transformations convert exponential curves into straight lines, ' +
      'and how to interpret the resulting log-linear regression coefficients on the original scale.',
    summary:
      'Logarithms convert multiplicative exponential relationships into additive linear relationships, ' +
      'enabling ordinary least squares regression to fit exponential decay and growth models.',
    content: [
      'Many natural and pharmacological processes do not change by adding a constant amount per unit time — they change by multiplying by a constant ratio. Bacterial populations double every generation. Radioactive isotopes halve every half-life. Drug concentrations decay exponentially because the amount eliminated per hour is proportional to the amount currently in the body.',
      'These processes follow the general exponential form Y = A · e^(bX), where A is the initial value, b is the rate constant, and X is the independent variable (often time). On a scatter plot of Y vs X, this produces a curved shape — sometimes a steep rise, sometimes a long decay tail. Ordinary least squares regression assumes a linear relationship Y = a + bX, so fitting a straight line to exponential data yields a poor fit with systematic curvature in the residuals.',
      'The mathematical breakthrough is to take the logarithm of Y. Applying ln to both sides of Y = A · e^(bX) yields ln(Y) = ln(A) + bX. Suddenly the curved exponential relationship becomes a perfectly linear one, with intercept ln(A) and slope b. We can now apply ordinary least squares regression to the transformed pairs (X, ln Y) and recover the original exponential parameters.',
      'The same trick works for base-10 logarithms: log10(Y) = log10(A) + (b / ln 10) · X. The slope on the log10 scale differs from the slope on the ln scale by a factor of 1 / ln(10) ≈ 0.4343, but the underlying exponential relationship is identical. Always verify which log base your software or textbook is using — confusing ln and log10 is a classic pharmacy student error.',
      'Once we have the fitted equation ln(Y) = a + bX, we predict on the original scale by exponentiating: ŷ = e^(a + bX) = e^a · e^(bX). The intercept e^a is the predicted Y at X = 0, and e^b is the multiplicative factor by which Y changes for each one-unit increase in X. A slope of b = −0.15 in an ln model means Y is multiplied by e^(−0.15) ≈ 0.86 per unit X — roughly a 14% decrease per unit, not a 15% decrease.',
      'Residual diagnostics must be performed on the transformed scale, because that is the scale on which OLS minimizes squared errors. A residual of e_i = ln(y_i) − ẑ_i is what the regression actually optimizes; the original-scale difference y_i − ŷ_i is informational only and should not be used for diagnostic plots.',
      'In pharmacokinetics, this transformation is the foundation of first-order elimination modeling. The differential equation dC/dt = −kC integrates to C(t) = C₀ · e^(−kt). Taking ln of both sides gives ln(C) = ln(C₀) − kt, which is exactly the linear form ln(Y) = a + bX with slope b = −k and intercept a = ln(C₀). The elimination rate constant k = −slope, and the initial concentration C₀ = e^(intercept).',
    ],
    formulaLatex: 'Y = A e^{bX} \\;\\xrightarrow{\\ln}\\; \\ln(Y) = \\ln(A) + bX',
    formulaMeaning:
      'Logarithm of an exponential function produces a linear function — ' +
      'the foundation of log-linear regression and PK elimination analysis.',
    keyTakeaways: [
      'Logarithms linearize exponential curves: Y = A·e^(bX) ⇒ ln(Y) = ln(A) + bX.',
      'ln uses base e (slope = b); log10 uses base 10 (slope = b / ln(10) ≈ b / 2.303).',
      'Back-transform via exp (for ln) or 10^x (for log10) to recover original-scale predictions.',
      'Slope interpretation is multiplicative: a slope b in ln(Y) means Y is multiplied by e^b per unit X.',
      'R² and residuals are computed on the transformed scale; do not compare them to raw-Y R².',
      'PK connection: ln(C) = ln(C₀) − kt gives k = −slope and C₀ = e^(intercept).',
    ],
    interactiveTip:
      'Visit the Transformations tab and load the "Exponential Decay (Log-Linear Demo)" dataset. ' +
      'Toggle between Original Scale (curved) and Transformed Scale (linear) to see the linearization in action.',
  },
];

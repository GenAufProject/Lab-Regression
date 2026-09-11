import {
  DiagnosticsSummary,
  ResidualDiagnosticsResult,
  ResidualPattern,
  RegressionStatistics,
  ScientificFinding,
} from '../../types';

/**
 * Phase 6 — Scientific Interpretation Engine (spec §19).
 *
 * Generates structured ScientificFinding objects from analysis results.
 * CRITICAL (spec §19, §28): The engine must NOT overstate conclusions.
 *   - Never "Model is proven correct."
 *   - Instead: "Results are consistent with..."
 *   - "Diagnostic pattern may indicate..."
 *   - "Consider reviewing..."
 *
 * The findings are educational and conservative.
 */

/**
 * Generates findings from OLS regression diagnostics.
 */
export function generateOLSFindings(
  stats: RegressionStatistics,
  diagnostics: DiagnosticsSummary,
  residualDiagnostics: ResidualDiagnosticsResult
): ScientificFinding[] {
  const findings: ScientificFinding[] = [];
  const r2Pct = (stats.rSquared * 100).toFixed(1);

  // ---- R² / association strength ----
  if (stats.rSquared >= 0.9) {
    findings.push({
      severity: 'info',
      category: 'association',
      title: 'Strong linear association',
      explanation:
        `R² = ${r2Pct}% indicates that a large proportion of the variance in Y is explained ` +
        `by the linear relationship with X. However, a high R² alone does NOT prove the model ` +
        `is correct, linear, or causal — always examine the residual plot.`,
      recommendation: 'Verify the residual pattern below before drawing conclusions.',
    });
  } else if (stats.rSquared >= 0.5) {
    findings.push({
      severity: 'info',
      category: 'association',
      title: 'Moderate linear association',
      explanation:
        `R² = ${r2Pct}% indicates a moderate linear relationship. ` +
        `Some variance in Y is explained by X, but substantial residual variation remains.`,
    });
  } else {
    findings.push({
      severity: 'warning',
      category: 'association',
      title: 'Weak linear association',
      explanation:
        `R² = ${r2Pct}% indicates a weak linear relationship. ` +
        `The linear model explains little of the variance in Y. Consider whether a transformation ` +
        `or a different model might better capture the relationship.`,
    });
  }

  // ---- Residual pattern ----
  if (residualDiagnostics.pattern === 'curvature') {
    findings.push({
      severity: 'warning',
      category: 'residual-pattern',
      title: 'Possible curvature detected',
      explanation:
        'A systematic curved pattern in the residuals may indicate that a linear model ' +
        'does not adequately represent the relationship. Consider a log transformation ' +
        'of Y (for exponential curvature) or a polynomial term.',
      recommendation: 'Try the Transformations tab or the Model Comparison in the Analysis workspace.',
    });
  } else if (residualDiagnostics.pattern === 'heteroscedasticity') {
    findings.push({
      severity: 'warning',
      category: 'residual-pattern',
      title: 'Possible non-constant variance',
      explanation:
        'Increasing residual spread may indicate heteroscedasticity (non-constant variance). ' +
        'OLS standard errors may be biased. A log transformation often stabilizes variance ' +
        'that grows proportionally with the mean.',
    });
  } else if (residualDiagnostics.pattern === 'random') {
    findings.push({
      severity: 'info',
      category: 'residual-pattern',
      title: 'Residuals appear pattern-free',
      explanation:
        'The residual pattern is relatively random, which is generally consistent with an ' +
        'adequate linear functional form. This does not PROVE the model is correct — ' +
        'it only means no obvious pattern was detected.',
    });
  }

  // ---- Influential observations ----
  const influential = diagnostics.observations.filter((o) =>
    o.flags.includes('potentially-influential')
  );
  if (influential.length > 0) {
    findings.push({
      severity: influential.length > 1 ? 'warning' : 'info',
      category: 'influence',
      title: `${influential.length} potentially influential observation${influential.length > 1 ? 's' : ''}`,
      explanation:
        `Observation${influential.length > 1 ? 's' : ''} ${influential.map((o) => `#${o.index + 1}`).join(', ')} ` +
        `ha${influential.length > 1 ? 've' : 's'} Cook's distance above the conventional threshold of 4/n = ${diagnostics.thresholds.cooksThreshold.toFixed(4)}. ` +
        `Removing ${influential.length > 1 ? 'these points' : 'this point'} would meaningfully change the regression. ` +
        `NEVER automatically delete influential points — investigate the data source first.`,
      recommendation: 'Review the flagged observations in the Influence tab.',
    });
  }

  // ---- High leverage ----
  const highLev = diagnostics.observations.filter((o) =>
    o.flags.includes('high-leverage')
  );
  if (highLev.length > 0) {
    findings.push({
      severity: 'info',
      category: 'leverage',
      title: `${highLev.length} high-leverage observation${highLev.length > 1 ? 's' : ''}`,
      explanation:
        `Observation${highLev.length > 1 ? 's' : ''} ${highLev.map((o) => `#${o.index + 1}`).join(', ')} ` +
        `ha${highLev.length > 1 ? 've' : 's'} leverage above 4/n = ${diagnostics.thresholds.leverageThreshold.toFixed(4)}. ` +
        `High leverage means unusual X values — it does NOT automatically mean the observation is an error. ` +
        `The concern is high leverage combined with a large residual.`,
    });
  }

  // ---- Potential outliers ----
  const outliers = diagnostics.observations.filter((o) =>
    o.flags.includes('potential-outlier')
  );
  if (outliers.length > 0) {
    findings.push({
      severity: 'warning',
      category: 'outlier',
      title: `${outliers.length} potential outlier${outliers.length > 1 ? 's' : ''}`,
      explanation:
        `Observation${outliers.length > 1 ? 's' : ''} ${outliers.map((o) => `#${o.index + 1}`).join(', ')} ` +
        `ha${outliers.length > 1 ? 've' : 's'} a studentized residual ≥ 2.0. ` +
        `"Potential" means the point warrants review — it is NOT definitively wrong. ` +
        `Investigate the data source before deciding how to handle it.`,
      recommendation: 'Never auto-delete outliers. Investigate the cause first.',
    });
  }

  // ---- p-value (if available) ----
  if (stats.pValueSlope !== undefined && !isNaN(stats.pValueSlope)) {
    if (stats.pValueSlope < 0.05) {
      findings.push({
        severity: 'info',
        category: 'inference',
        title: 'Slope is statistically significant',
        explanation:
          `The slope t-test gives p = ${stats.pValueSlope < 0.001 ? '< 0.001' : stats.pValueSlope.toFixed(4)}, ` +
          `which is below the conventional 0.05 threshold. This suggests the slope is statistically ` +
          `different from zero. Note: statistical significance does NOT prove the model is correct or causal.`,
      });
    } else {
      findings.push({
        severity: 'info',
        category: 'inference',
        title: 'Slope is not statistically significant',
        explanation:
          `The slope t-test gives p = ${stats.pValueSlope.toFixed(4)}, which is above 0.05. ` +
          `The linear relationship is not statistically distinguishable from zero at this sample size. ` +
          `This does NOT prove there is no relationship — the sample may be too small.`,
      });
    }
  }

  return findings;
}

/**
 * Generates findings from PK analysis results.
 */
export function generatePKFindings(params: {
  k: number;
  halfLife: number;
  c0: number;
  rSquared: number;
  extrapPercentage: number;
  extrapolationSuppressed: boolean;
  terminalPhasePointCount: number;
  slope: number;
}): ScientificFinding[] {
  const findings: ScientificFinding[] = [];
  const { k, halfLife, c0, rSquared, extrapPercentage, terminalPhasePointCount, slope } = params;

  // ---- k validity ----
  if (!isFinite(k) || k <= 0) {
    findings.push({
      severity: 'critical',
      category: 'pk-k',
      title: 'Invalid elimination rate constant',
      explanation:
        `k = ${k} is not positive. In first-order elimination, k must be > 0. ` +
        `The fitted slope (slope = ${slope}) is non-negative, which contradicts elimination. ` +
        `Verify the data or the time ordering.`,
    });
  } else {
    findings.push({
      severity: 'info',
      category: 'pk-k',
      title: 'Valid elimination rate constant',
      explanation:
        `k = ${k.toFixed(4)} h⁻¹ is positive, consistent with first-order elimination. ` +
        `The half-life is t½ = ${isFinite(halfLife) ? halfLife.toFixed(2) : 'undefined'} h. ` +
        `Note: a valid k does NOT prove first-order kinetics — it only means the log-linear fit produced a negative slope.`,
    });
  }

  // ---- R² caveat (spec §10) ----
  if (rSquared >= 0.9) {
    findings.push({
      severity: 'info',
      category: 'pk-fit',
      title: 'Strong log-linear fit',
      explanation:
        `R² = ${(rSquared * 100).toFixed(1)}% on the log scale indicates a strong linear fit for ln(C) vs time. ` +
        `IMPORTANT: a high R² alone does NOT prove that the drug follows first-order elimination kinetics — ` +
        `model selection requires pharmacokinetic context and residual diagnostics.`,
    });
  } else {
    findings.push({
      severity: 'warning',
      category: 'pk-fit',
      title: 'Weak log-linear fit',
      explanation:
        `R² = ${(rSquared * 100).toFixed(1)}% is below 0.90. The log-linear fit is weak — the data may not ` +
        `follow mono-exponential elimination, or the terminal-phase selection may need adjustment.`,
    });
  }

  // ---- Extrapolation percentage ----
  if (!params.extrapolationSuppressed && extrapPercentage > 20) {
    findings.push({
      severity: 'warning',
      category: 'pk-auc',
      title: 'High AUC extrapolation percentage',
      explanation:
        `${extrapPercentage.toFixed(1)}% of AUC_total comes from extrapolation. ` +
        `Values above 20% suggest the sampling window is too short and the AUC_total estimate ` +
        `is highly model-dependent. Consider collecting more late-time-point samples.`,
    });
  }

  // ---- Terminal phase point count ----
  if (terminalPhasePointCount < 3) {
    findings.push({
      severity: 'warning',
      category: 'pk-terminal',
      title: 'Few terminal-phase points',
      explanation:
        `Only ${terminalPhasePointCount} point(s) were used in the terminal-phase regression. ` +
        `Slope estimates from fewer than 3 points are statistically unstable.`,
    });
  }

  // ---- C₀ extrapolation ----
  findings.push({
    severity: 'info',
    category: 'pk-c0',
    title: 'C₀ is an extrapolated estimate',
    explanation:
      `C₀ = ${c0.toFixed(3)} is the model's prediction at t = 0, recovered by back-transforming the intercept. ` +
      `This is an EXTRAPOLATION, not necessarily an observed measurement.`,
  });

  return findings;
}

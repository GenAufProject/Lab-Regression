import { DiagnosticFlag, DiagnosticsSummary, ObservationDiagnostic, RegressionStatistics } from '../../types';

/**
 * Phase 6 — Observation-level Diagnostics Engine (spec §3, §4, §5, §6).
 *
 * CRITICAL (spec §3): This module CONSUMES the Phase 2 RegressionStatistics
 * (which already has leverage, Cook's distance, and studentized residuals
 * computed on every RegressionPoint). It does NOT re-implement those calculations.
 *
 * This module adds:
 *   - structured DiagnosticFlag classification per observation
 *   - a DiagnosticsSummary with documented thresholds
 *   - cautious educational language (spec §6, §29)
 *
 * Spec §29: "NEVER automatically remove outliers." Flags are educational
 * indicators, NOT deletion rules.
 *
 * Spec §6: "Do NOT label an observation as definitively 'wrong'."
 * Use: "Potential outlier", "High leverage", "Potentially influential".
 *
 * Spec §28: Thresholds are documented and presented as conventions, not
 * universal scientific laws.
 */

/**
 * Documented diagnostic thresholds (spec §6).
 *
 * These are conventional educational thresholds, NOT universal laws:
 *   - Leverage: h_ii > 2p/n where p = 2 parameters (slope + intercept) for
 *     simple regression. This gives 4/n.
 *   - Cook's distance: D_i > 4/n is the conventional flag.
 *   - Studentized residual: |r_i| ≥ 2 is the ~95% bound under normality.
 */
export function computeThresholds(n: number): {
  leverageThreshold: number;
  cooksThreshold: number;
  studentizedResidualThreshold: number;
} {
  return {
    leverageThreshold: n > 0 ? 4 / n : Infinity,
    cooksThreshold: n > 0 ? 4 / n : Infinity,
    studentizedResidualThreshold: 2.0,
  };
}

/**
 * Computes per-observation diagnostics from the Phase 2 RegressionStatistics.
 *
 * The Phase 2 engine already computes leverage, Cook's distance, and
 * studentized residuals on each RegressionPoint. This function wraps them
 * with structured flags.
 */
export function computeObservationDiagnostics(
  stats: RegressionStatistics
): DiagnosticsSummary {
  const n = stats.n;
  const thresholds = computeThresholds(n);

  const observations: ObservationDiagnostic[] = stats.points.map((pt, idx) => {
    const flags: DiagnosticFlag[] = [];
    const leverage = pt.leverage ?? 0;
    const cooksD = pt.cooksDistance ?? 0;
    const studResid = pt.studentizedResidual ?? 0;
    const absStudResid = Math.abs(studResid);

    // Flag: high leverage (spec §4)
    if (leverage > thresholds.leverageThreshold) {
      flags.push('high-leverage');
    }
    // Flag: large residual / potential outlier (spec §6)
    if (absStudResid >= thresholds.studentizedResidualThreshold) {
      flags.push('large-residual');
      flags.push('potential-outlier');
    }
    // Flag: potentially influential (spec §5)
    if (cooksD > thresholds.cooksThreshold) {
      flags.push('potentially-influential');
    }
    // Flag: review observation (combined high leverage + large residual)
    if (
      leverage > thresholds.leverageThreshold &&
      absStudResid >= thresholds.studentizedResidualThreshold
    ) {
      flags.push('review-observation');
    }

    return {
      index: idx,
      id: pt.id,
      x: pt.x,
      y: pt.y,
      fitted: pt.predicted,
      residual: pt.residual,
      standardizedResidual: pt.standardizedResidual ?? studResid,
      studentizedResidual: studResid,
      leverage,
      cooksDistance: cooksD,
      flags,
    };
  });

  const leverages = observations.map((o) => o.leverage);
  const cooksDs = observations.map((o) => o.cooksDistance);
  const maxLeverage = Math.max(...leverages, 0);
  const maxCooksDistance = Math.max(...cooksDs, 0);
  const meanLeverage = leverages.reduce((a, b) => a + b, 0) / (n || 1);
  const flaggedObservations = observations.filter((o) => o.flags.length > 0);
  const allFlags = Array.from(new Set(flaggedObservations.flatMap((o) => o.flags)));

  return {
    observations,
    n,
    maxLeverage,
    maxCooksDistance,
    meanLeverage,
    flaggedCount: flaggedObservations.length,
    flags: allFlags,
    thresholds,
  };
}

/**
 * Educational explanation for a diagnostic flag (spec §6, §25).
 */
export function flagExplanation(flag: DiagnosticFlag): { label: string; explanation: string } {
  switch (flag) {
    case 'large-residual':
      return {
        label: 'Large residual',
        explanation:
          'The studentized residual exceeds the conventional threshold of 2.0. ' +
          'This observation deviates substantially from the fitted line. ' +
          'Review whether this is a data-entry error, a genuine biological extreme, or model mis-specification.',
      };
    case 'high-leverage':
      return {
        label: 'High leverage',
        explanation:
          'Leverage measures how unusual the X value is relative to the other observations. ' +
          'High leverage alone is NOT an error — it means the point has the potential to influence the fit. ' +
          'The concern is high leverage COMBINED with a large residual.',
      };
    case 'potentially-influential':
      return {
        label: 'Potentially influential',
        explanation:
          "Cook's distance exceeds the conventional threshold of 4/n. " +
          'Removing this observation would meaningfully change the slope or intercept. ' +
          'Investigate the point — never delete it without scientific justification.',
      };
    case 'potential-outlier':
      return {
        label: 'Potential outlier',
        explanation:
          'The studentized residual suggests this point may be an outlier. ' +
          '"Potential" means it warrants review — it is NOT definitively wrong. ' +
          'Investigate the data source before deciding how to handle it.',
      };
    case 'review-observation':
      return {
        label: 'Review observation',
        explanation:
          'This observation has BOTH high leverage and a large residual, making it ' +
          'a candidate for influence on the regression. Carefully review the data ' +
          'and consider whether the model is appropriate for this point.',
      };
  }
}

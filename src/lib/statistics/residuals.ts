import { RegressionPoint, RegressionStatistics } from '../../types';

export type DiagnosticFinding = {
  id: string;
  type: 'info' | 'caution' | 'check';
  title: string;
  description: string;
  pedagogicalTip: string;
};

export type ResidualAnalysis = {
  points: RegressionPoint[];
  maxAbsResidual: number;
  maxStudentizedResidual: number;
  maxCooksDistance: number;
  outlierCandidates: RegressionPoint[];
  highLeveragePoints: RegressionPoint[];
  influentialPoints: RegressionPoint[];
  hasCurvaturePattern: boolean;
  hasHeteroscedasticityTendency: boolean;
  residualSum: number;
  residualMean: number;
  findings: DiagnosticFinding[];
};

/**
 * Evaluates residuals for educational diagnostics.
 *
 * Phase 2 hardening:
 *   - Uses proper internally studentized residuals (r_i = e_i / (s·√(1-h_ii)))
 *     instead of the naive e_i / s scale-only residual.
 *   - Adds Cook's distance threshold (D_i > 4/n is the conventional flag).
 *   - Adds high-leverage detection (h_ii > 2·(k+1)/n where k=1 for simple regression).
 *   - Verifies the OLS invariant Σe_i ≈ 0 (within floating-point tolerance).
 *   - Uses cautious, pedagogically sound language as mandated in guidelines.
 *
 * Spec §18: residual sign convention is e_i = y_i - ŷ_i (observed minus predicted).
 * Spec §27: invariant testing — Σ residuals ≈ 0 when an intercept is included.
 */
export function analyzeResiduals(stats: RegressionStatistics): ResidualAnalysis {
  const points = stats.points;
  const n = points.length;

  if (n < 3) {
    return {
      points,
      maxAbsResidual: 0,
      maxStudentizedResidual: 0,
      maxCooksDistance: 0,
      outlierCandidates: [],
      highLeveragePoints: [],
      influentialPoints: [],
      hasCurvaturePattern: false,
      hasHeteroscedasticityTendency: false,
      residualSum: 0,
      residualMean: 0,
      findings: [
        {
          id: 'few-points',
          type: 'info',
          title: 'Limited Sample Size',
          description:
            'With fewer than 3 observations, residual diagnostics cannot assess distribution or pattern shape.',
          pedagogicalTip:
            'A minimum of 10 to 20 points is typically helpful to visually inspect residual assumptions.',
        },
      ],
    };
  }

  // 1. Outlier candidates: |studentized residual| ≥ 2.0 (≈ 95% bound under N(0,1))
  //    |r_i| ≥ 2.5 is a stronger flag (≈ 99% bound).
  const outlierCandidates = points.filter(
    (pt) => Math.abs(pt.studentizedResidual ?? 0) >= 2.0
  );

  // 2. High-leverage points: h_ii > 2·(k+1)/n where k=1 predictor → threshold = 4/n.
  //    Leverage ranges from 1/n (point at the mean of X) to 1 (point at extreme X).
  const leverageThreshold = 2 * 2 / n; // = 4/n for simple regression (k+1 = 2 params)
  const highLeveragePoints = points.filter(
    (pt) => (pt.leverage ?? 0) > leverageThreshold
  );

  // 3. Influential points: Cook's distance > 4/n is the conventional flag.
  //    D_i > 1 is a severe flag.
  const cooksThreshold = 4 / n;
  const influentialPoints = points.filter(
    (pt) => (pt.cooksDistance ?? 0) > cooksThreshold
  );

  // 4. Max statistics for display
  let maxAbsResidual = 0;
  let maxStudentizedResidual = 0;
  let maxCooksDistance = 0;
  let residualSum = 0;
  for (const pt of points) {
    const abs = Math.abs(pt.residual);
    if (abs > maxAbsResidual) maxAbsResidual = abs;
    const absR = Math.abs(pt.studentizedResidual ?? 0);
    if (absR > maxStudentizedResidual) maxStudentizedResidual = absR;
    const d = pt.cooksDistance ?? 0;
    if (d > maxCooksDistance) maxCooksDistance = d;
    residualSum += pt.residual;
  }
  const residualMean = residualSum / n;

  // 5. Curvature check (educational heuristic):
  //    Correlate residuals with (x - meanX)². Under correct linear specification,
  //    this correlation should be ≈ 0. A large absolute value indicates a
  //    systematic quadratic trend missed by the linear model.
  let sumProd = 0;
  let sumDevSq = 0;
  for (const pt of points) {
    const xDev = pt.x - stats.meanX;
    const xDevSq = xDev * xDev;
    sumProd += pt.residual * xDevSq;
    sumDevSq += Math.pow(xDevSq, 2);
  }
  const curvatureRatio =
    sumDevSq > 0 && stats.sse > 0
      ? Math.abs(sumProd) / Math.sqrt(sumDevSq * stats.sse)
      : 0;
  const hasCurvaturePattern = curvatureRatio > 0.45 && n >= 5;

  // 6. Heteroscedasticity check (educational heuristic):
  //    Compare mean |residual| in first half vs second half of fitted values.
  //    A ratio > 2.2 indicates fanning.
  const sortedByFitted = [...points].sort((a, b) => a.predicted - b.predicted);
  const mid = Math.floor(n / 2);
  const firstHalf = sortedByFitted.slice(0, mid);
  const secondHalf = sortedByFitted.slice(mid);

  const meanAbsFirst =
    firstHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) /
    Math.max(1, firstHalf.length);
  const meanAbsSecond =
    secondHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) /
    Math.max(1, secondHalf.length);

  const ratio =
    meanAbsFirst > 0 && meanAbsSecond > 0
      ? Math.max(meanAbsFirst / meanAbsSecond, meanAbsSecond / meanAbsFirst)
      : 1;
  const hasHeteroscedasticityTendency = ratio > 2.2 && n >= 8;

  // 7. Compile cautious educational findings
  const findings: DiagnosticFinding[] = [];

  if (hasCurvaturePattern) {
    findings.push({
      id: 'curvature',
      type: 'caution',
      title: 'Potential Non-Linear Curve Observed',
      description:
        'Residuals display a systematic curved trend (e.g. positive at extremes, negative in the middle, or vice-versa).',
      pedagogicalTip:
        'Curvature suggests the true relationship may not be purely linear. Consider a log-transformation or polynomial term.',
    });
  } else {
    findings.push({
      id: 'no-curvature',
      type: 'info',
      title: 'Residual Linearity',
      description: 'Residuals appear roughly dispersed around zero with no pronounced U-shape or inverted U-shape.',
      pedagogicalTip:
        'A good linear fit shows residuals randomly bouncing above and below zero across all fitted values.',
    });
  }

  if (hasHeteroscedasticityTendency) {
    findings.push({
      id: 'heteroscedasticity',
      type: 'caution',
      title: 'Spread Appears Uneven (Non-Constant Variance)',
      description:
        'The vertical spread of residuals appears to widen or narrow across the range of fitted values.',
      pedagogicalTip:
        'OLS regression assumes constant residual variance (homoscedasticity). A log transformation often stabilizes variance that grows proportionally with the scale.',
    });
  }

  if (outlierCandidates.length > 0) {
    findings.push({
      id: 'outliers',
      type: 'caution',
      title: `${outlierCandidates.length} Noticeable Residual${outlierCandidates.length > 1 ? 's' : ''} (|r*| ≥ 2)`,
      description: `Data point(s) ${outlierCandidates.map((p) => p.id).join(', ')} deviate substantially from the fitted line on the studentized scale.`,
      pedagogicalTip:
        'Never automatically discard outliers without investigating! First verify if there was a data entry or experimental error. If genuine, they often reveal important biological or physical phenomena.',
    });
  }

  if (highLeveragePoints.length > 0) {
    findings.push({
      id: 'high-leverage',
      type: 'check',
      title: `${highLeveragePoints.length} High-Leverage Point${highLeveragePoints.length > 1 ? 's' : ''} (h > ${(leverageThreshold).toFixed(2)})`,
      description: `Point(s) ${highLeveragePoints.map((p) => p.id).join(', ')} sit far from the centroid of X. They have the *potential* to strongly influence the fit.`,
      pedagogicalTip:
        'High leverage alone is not bad — it just means the point has unusual X. The real concern is high leverage *combined with* a large residual, which is what Cook\'s distance measures.',
    });
  }

  if (influentialPoints.length > 0) {
    findings.push({
      id: 'influential',
      type: 'caution',
      title: `${influentialPoints.length} Influential Point${influentialPoints.length > 1 ? 's' : ''} (Cook\'s D > ${cooksThreshold.toFixed(2)})`,
      description: `Point(s) ${influentialPoints.map((p) => p.id).join(', ')} have a Cook\'s distance above the conventional 4/n threshold. Removing them would meaningfully change the slope or intercept.`,
      pedagogicalTip:
        'Cook\'s distance combines leverage and residual size. The conventional cutoff is 4/n. Investigate these points: are they measurement errors, or genuine extreme observations?',
    });
  }

  // 7b. Invariant check (spec §27): Σ residuals ≈ 0 for OLS with intercept
  if (Math.abs(residualSum) > 1e-6 * Math.max(1, Math.abs(stats.sst))) {
    findings.push({
      id: 'invariant-violation',
      type: 'caution',
      title: 'Residual Sum Deviates from Zero',
      description: `The sum of residuals is ${residualSum.toExponential(3)}, which is larger than expected floating-point error. For OLS with an intercept, Σe_i must equal zero exactly.`,
      pedagogicalTip:
        'This usually indicates a numerical issue or that the regression was computed without an intercept. Verify the calculation engine.',
    });
  }

  if (findings.filter((f) => f.type === 'caution').length === 0) {
    findings.push({
      id: 'well-behaved',
      type: 'info',
      title: 'Residuals Well-Behaved',
      description:
        'Residuals are approximately centered at zero with reasonable dispersion across the fitted range.',
      pedagogicalTip:
        'Remember that a favorable residual plot does not prove causation; it only confirms that the linear model captures the observable pattern adequately.',
    });
  }

  return {
    points,
    maxAbsResidual,
    maxStudentizedResidual,
    maxCooksDistance,
    outlierCandidates,
    highLeveragePoints,
    influentialPoints,
    hasCurvaturePattern,
    hasHeteroscedasticityTendency,
    residualSum,
    residualMean,
    findings,
  };
}

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
  outlierCandidates: RegressionPoint[];
  hasCurvaturePattern: boolean;
  hasHeteroscedasticityTendency: boolean;
  findings: DiagnosticFinding[];
};

/**
 * Evaluates residuals for educational diagnostics.
 * Uses cautious, pedagogically sound language as mandated in guidelines.
 */
export function analyzeResiduals(stats: RegressionStatistics): ResidualAnalysis {
  const points = stats.points;
  const n = points.length;

  if (n < 3) {
    return {
      points,
      maxAbsResidual: 0,
      outlierCandidates: [],
      hasCurvaturePattern: false,
      hasHeteroscedasticityTendency: false,
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

  // 1. Identify outlier candidates (|standardized residual| > 2.0 or > 2.5)
  const outlierCandidates = points.filter(
    (pt) => Math.abs(pt.standardizedResidual ?? 0) >= 2.0
  );

  let maxAbsResidual = 0;
  for (const pt of points) {
    const abs = Math.abs(pt.residual);
    if (abs > maxAbsResidual) maxAbsResidual = abs;
  }

  // 2. Check for quadratic curvature tendency:
  // Correlate residuals with (x - meanX)^2
  let sumProd = 0;
  let sumDevSq = 0;
  for (const pt of points) {
    const xDev = pt.x - stats.meanX;
    const xDevSq = xDev * xDev;
    sumProd += pt.residual * xDevSq;
    sumDevSq += Math.pow(xDevSq, 2);
  }
  const curvatureRatio = sumDevSq > 0 ? Math.abs(sumProd) / Math.sqrt(sumDevSq * stats.sse) : 0;
  const hasCurvaturePattern = curvatureRatio > 0.45 && n >= 5;

  // 3. Check for heteroscedasticity tendency (fanning of residuals across fitted values)
  // Compare residual magnitude in first half vs second half of fitted values
  const sortedByFitted = [...points].sort((a, b) => a.predicted - b.predicted);
  const mid = Math.floor(n / 2);
  const firstHalf = sortedByFitted.slice(0, mid);
  const secondHalf = sortedByFitted.slice(mid);

  const meanAbsFirst =
    firstHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) / firstHalf.length;
  const meanAbsSecond =
    secondHalf.reduce((acc, p) => acc + Math.abs(p.residual), 0) / secondHalf.length;

  const ratio =
    meanAbsFirst > 0 && meanAbsSecond > 0
      ? Math.max(meanAbsFirst / meanAbsSecond, meanAbsSecond / meanAbsFirst)
      : 1;
  const hasHeteroscedasticityTendency = ratio > 2.2 && n >= 8;

  // Compile cautious educational findings
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
      title: `${outlierCandidates.length} Noticeable Residual${outlierCandidates.length > 1 ? 's' : ''} (|e*| ≥ 2)`,
      description: `Data point(s) ${outlierCandidates.map((p) => p.id).join(', ')} deviate substantially from the fitted line.`,
      pedagogicalTip:
        'Never automatically discard outliers without investigating! First verify if there was a data entry or experimental error. If genuine, they often reveal important biological or physical phenomena.',
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
    outlierCandidates,
    hasCurvaturePattern,
    hasHeteroscedasticityTendency,
    findings,
  };
}

import {
  AnalysisReport,
  DataPoint,
  DiagnosticsSummary,
  RegressionStatistics,
  ResidualDiagnosticsResult,
  ScientificFinding,
} from '../../types';
import { computeObservationDiagnostics } from './diagnostics';
import { computeResidualDiagnostics } from './residualDiagnostics';
import { generateOLSFindings, generatePKFindings } from './scientificInterpretation';

/**
 * Phase 6 — Scientific Report Generator (spec §20, §21).
 *
 * Generates a machine-readable AnalysisReport from the existing engine outputs.
 * The report is fully reproducible — it contains the exact dataset, model,
 * parameters, diagnostics, and findings (spec §23).
 *
 * Spec §20: supports printable report, exportable JSON, exportable CSV.
 * Spec §27: no rounding inside the engine — full precision preserved.
 */

/**
 * Generates a full OLS analysis report.
 */
export function generateOLSReport(
  data: DataPoint[],
  stats: RegressionStatistics,
  options: {
    xLabel?: string;
    yLabel?: string;
    xUnit?: string;
    yUnit?: string;
    datasetName?: string;
  } = {}
): AnalysisReport {
  const { xLabel = 'X', yLabel = 'Y', xUnit = '', yUnit = '' } = options;

  const diagnostics: DiagnosticsSummary = computeObservationDiagnostics(stats);
  const residualDiagnostics: ResidualDiagnosticsResult = computeResidualDiagnostics(stats);
  const findings: ScientificFinding[] = generateOLSFindings(stats, diagnostics, residualDiagnostics);

  const xVals = data.map((d) => d.x);
  const yVals = data.map((d) => d.y);

  const warnings: string[] = [];
  if (stats.rSquared < 0.5) {
    warnings.push('R² is below 0.5 — the linear model explains less than half of the variance in Y.');
  }
  if (diagnostics.flaggedCount > 0) {
    warnings.push(`${diagnostics.flaggedCount} observation(s) have diagnostic flags — review the Diagnostics tab.`);
  }
  if (residualDiagnostics.pattern !== 'random' && residualDiagnostics.pattern !== 'insufficient-data') {
    warnings.push(`Residual pattern suggests ${residualDiagnostics.pattern} — the linear model may be inappropriate.`);
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      applicationVersion: 'Phase 6',
      analysisType: 'ols',
    },
    dataset: {
      n: data.length,
      xLabel,
      yLabel,
      xUnit,
      yUnit,
      xRange: { min: Math.min(...xVals), max: Math.max(...xVals) },
      yRange: { min: Math.min(...yVals), max: Math.max(...yVals) },
      points: data.map((d) => ({ x: d.x, y: d.y })),
    },
    regression: {
      model: 'Ordinary Least Squares (OLS)',
      transformation: 'none',
      slope: stats.slope,
      intercept: stats.intercept,
      rSquared: stats.rSquared,
      adjustedRSquared: stats.adjustedRSquared ?? stats.rSquared,
      residualStandardError: stats.residualStandardError ?? stats.rmse,
      rmse: stats.predictionRMSE ?? Math.sqrt(stats.sse / stats.n),
      sse: stats.sse,
      sst: stats.sst,
      ssr: stats.ssr,
      n: stats.n,
      degreesOfFreedom: stats.n - 2,
      pValueSlope: stats.pValueSlope,
      fStat: stats.fStat,
      equation: `ŷ = ${stats.intercept} ${stats.slope >= 0 ? '+' : '−'} ${Math.abs(stats.slope)}·x`,
    },
    diagnostics: {
      maxLeverage: diagnostics.maxLeverage,
      maxCooksDistance: diagnostics.maxCooksDistance,
      meanLeverage: diagnostics.meanLeverage,
      flaggedObservations: diagnostics.flaggedCount,
      flags: diagnostics.flags,
      residualPattern: residualDiagnostics.pattern,
    },
    findings,
    warnings,
  };
}

/**
 * Exports observation-level diagnostics as CSV (spec §20).
 */
export function exportDiagnosticsCSV(diagnostics: DiagnosticsSummary): string {
  const headers = [
    'Index',
    'ID',
    'X',
    'Y',
    'Fitted',
    'Residual',
    'StandardizedResidual',
    'StudentizedResidual',
    'Leverage',
    'CooksDistance',
    'Flags',
  ];
  const rows = diagnostics.observations.map((o) => [
    o.index + 1,
    o.id,
    o.x,
    o.y,
    o.fitted,
    o.residual,
    o.standardizedResidual,
    o.studentizedResidual,
    o.leverage,
    o.cooksDistance,
    o.flags.join(';'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csv;
}

/**
 * Exports the full analysis report as JSON (spec §20, §21).
 */
export function exportReportJSON(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

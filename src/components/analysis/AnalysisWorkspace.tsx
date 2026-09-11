import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Download,
  FileText,
  Flag,
  Info,
  ListOrdered,
  RefreshCw,
  TrendingDown,
  AlertTriangle as Warning,
} from 'lucide-react';
import { DataPoint, RegressionStatistics, PKAnalysisSuccess } from '../../types';
import { computeObservationDiagnostics } from '../../lib/analysis/diagnostics';
import { computeResidualDiagnostics } from '../../lib/analysis/residualDiagnostics';
import { computeIntervalBand } from '../../lib/analysis/intervals';
import { compareModels } from '../../lib/analysis/modelComparison';
import {
  generateOLSFindings,
  generatePKFindings,
} from '../../lib/analysis/scientificInterpretation';
import {
  generateOLSReport,
  exportDiagnosticsCSV,
  exportReportJSON,
} from '../../lib/analysis/reportGenerator';
import { computeTerminalPhaseSensitivity } from '../../lib/analysis/pkDiagnostics';
import { formatNumber } from '../../lib/statistics/formatting';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { MathFormula } from '../common/MathFormula';

interface AnalysisWorkspaceProps {
  data: DataPoint[];
  stats: RegressionStatistics;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  pkResult?: PKAnalysisSuccess | null;
}

type Tab = 'diagnostics' | 'residuals' | 'influence' | 'intervals' | 'comparison' | 'pk' | 'report';

/**
 * Phase 6 — Unified Analysis Workspace (spec §24).
 *
 * Tabbed interface for advanced analysis:
 *   Diagnostics | Residuals | Influence | Intervals | Comparison | PK | Report
 */
export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({
  data,
  stats,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  pkResult,
}) => {
  const [tab, setTab] = useState<Tab>('diagnostics');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'diagnostics', label: 'Diagnostics', icon: <BarChart3 size={14} /> },
    { id: 'residuals', label: 'Residuals', icon: <Activity size={14} /> },
    { id: 'influence', label: 'Influence', icon: <Flag size={14} /> },
    { id: 'intervals', label: 'Intervals', icon: <TrendingDown size={14} /> },
    { id: 'comparison', label: 'Comparison', icon: <ChevronRight size={14} /> },
    { id: 'pk', label: 'PK', icon: <FileText size={14} /> },
    { id: 'report', label: 'Report', icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm">Advanced Analysis Workspace</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Diagnostics, residual analysis, influence, intervals, model comparison, and scientific reporting.
              All calculations reuse the Phase 2-4 engines — no duplicate math.
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-neutral-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'diagnostics' && <DiagnosticsPanel stats={stats} />}

      {tab === 'residuals' && <ResidualDiagnosticsTab stats={stats} xLabel={xLabel} yLabel={yLabel} />}

      {tab === 'influence' && <InfluenceTab stats={stats} />}

      {tab === 'intervals' && (
        <IntervalsTab
          stats={stats}
          xLabel={xLabel}
          yLabel={yLabel}
          xUnit={xUnit}
          yUnit={yUnit}
          confidenceLevel={confidenceLevel}
          onConfidenceLevelChange={setConfidenceLevel}
        />
      )}

      {tab === 'comparison' && (
        <ComparisonTab data={data} xLabel={xLabel} yLabel={yLabel} />
      )}

      {tab === 'pk' && pkResult && <PKDiagnosticsTab pkResult={pkResult} data={data} />}

      {tab === 'report' && (
        <ReportTab
          data={data}
          stats={stats}
          xLabel={xLabel}
          yLabel={yLabel}
          xUnit={xUnit}
          yUnit={yUnit}
          pkResult={pkResult}
        />
      )}

      {tab === 'pk' && !pkResult && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-xs text-neutral-500">
          PK diagnostics require a PK analysis. Switch to the PK Studio tab to run a first-order elimination analysis first.
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Residual Diagnostics Tab
// ===========================================================================

const ResidualDiagnosticsTab: React.FC<{ stats: RegressionStatistics; xLabel: string; yLabel: string }> = ({
  stats,
  xLabel,
  yLabel,
}) => {
  const result = useMemo(() => computeResidualDiagnostics(stats), [stats]);

  return (
    <div className="space-y-4">
      {/* Pattern classification */}
      <div className={`p-4 rounded-xl border ${
        result.pattern === 'random' ? 'bg-emerald-50/60 border-emerald-200' :
        result.pattern === 'curvature' || result.pattern === 'heteroscedasticity' ? 'bg-amber-50/60 border-amber-200' :
        'bg-neutral-50 border-neutral-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {result.pattern === 'random' ? <CheckCircle size={16} className="text-emerald-600" /> :
           <AlertTriangle size={16} className="text-amber-600" />}
          <h4 className="font-semibold text-neutral-900 text-sm">Residual Pattern: {result.patternDescription}</h4>
        </div>
        <p className="text-xs text-neutral-700 leading-relaxed">{result.interpretation}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white border border-neutral-200 rounded-lg p-2.5 text-xs">
          <div className="text-neutral-500 text-[10px] uppercase">Residual sum</div>
          <div className="font-mono font-bold">{formatNumber(result.residualSum, 6)}</div>
          <div className="text-[10px] text-neutral-400">Should be ≈ 0</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-2.5 text-xs">
          <div className="text-neutral-500 text-[10px] uppercase">Residual mean</div>
          <div className="font-mono font-bold">{formatNumber(result.residualMean, 6)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-2.5 text-xs">
          <div className="text-neutral-500 text-[10px] uppercase">Max |residual|</div>
          <div className="font-mono font-bold">{formatNumber(result.maxAbsResidual, 4)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-2.5 text-xs">
          <div className="text-neutral-500 text-[10px] uppercase">Max |std. resid.|</div>
          <div className="font-mono font-bold">{formatNumber(result.maxAbsStudentizedResidual, 4)}</div>
        </div>
      </div>

      {/* Q-Q plot */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-2">Normal Q-Q Plot</h4>
        <p className="text-[11px] text-neutral-500 mb-3">
          Theoretical normal quantiles vs ordered studentized residuals. An approximately linear
          pattern is consistent with (but does not prove) normality of residuals.
        </p>
        <SimpleQQPlot data={result.qqPlotData} />
      </div>

      {/* Histogram */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-2">Residual Histogram</h4>
        <SimpleHistogram bins={result.histogramBins} />
      </div>

      {/* Scale-location plot */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-2">Scale-Location Plot</h4>
        <p className="text-[11px] text-neutral-500 mb-3">
          √|standardized residual| vs fitted value. A horizontal band suggests constant variance;
          an increasing trend suggests heteroscedasticity.
        </p>
        <SimpleScaleLocation data={result.scaleLocationData} />
      </div>
    </div>
  );
};

// ===========================================================================
// Influence Tab
// ===========================================================================

const InfluenceTab: React.FC<{ stats: RegressionStatistics }> = ({ stats }) => {
  const diagnostics = useMemo(() => computeObservationDiagnostics(stats), [stats]);
  const flagged = diagnostics.observations.filter((o) => o.flags.length > 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-3">Influence Diagnostics</h4>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="text-[10px] uppercase text-neutral-500">Max leverage</div>
            <div className="font-mono font-bold text-lg">{formatNumber(diagnostics.maxLeverage, 4)}</div>
            <div className="text-[10px] text-neutral-400">Threshold: 4/n = {diagnostics.thresholds.leverageThreshold.toFixed(4)}</div>
          </div>
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="text-[10px] uppercase text-neutral-500">Max Cook's D</div>
            <div className="font-mono font-bold text-lg">{formatNumber(diagnostics.maxCooksDistance, 6)}</div>
            <div className="text-[10px] text-neutral-400">Threshold: 4/n = {diagnostics.thresholds.cooksThreshold.toFixed(4)}</div>
          </div>
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="text-[10px] uppercase text-neutral-500">Flagged observations</div>
            <div className="font-mono font-bold text-lg">{diagnostics.flaggedCount} / {diagnostics.n}</div>
          </div>
        </div>

        {/* Leverage vs Cook's distance scatter */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-neutral-700 mb-2">Leverage vs Cook's Distance</h5>
          <SimpleScatter
            points={diagnostics.observations.map((o) => ({
              x: o.leverage,
              y: o.cooksDistance,
              label: `#${o.index + 1}`,
              flagged: o.flags.length > 0,
            }))}
            xLabel="Leverage (h_i)"
            yLabel="Cook's Distance"
            xThreshold={diagnostics.thresholds.leverageThreshold}
            yThreshold={diagnostics.thresholds.cooksThreshold}
          />
        </div>

        {flagged.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
            <div className="text-xs font-semibold text-amber-900 mb-1">
              {flagged.length} flagged observation(s) — review recommended
            </div>
            <div className="text-[11px] text-amber-800">
              NEVER automatically delete flagged observations. Investigate the data source,
              check for measurement errors, and consider whether the model is appropriate.
              Cook's distance is a diagnostic indicator, NOT a deletion rule.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===========================================================================
// Intervals Tab
// ===========================================================================

const IntervalsTab: React.FC<{
  stats: RegressionStatistics;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  confidenceLevel: number;
  onConfidenceLevelChange: (level: number) => void;
}> = ({ stats, xLabel, yLabel, xUnit, yUnit, confidenceLevel, onConfidenceLevelChange }) => {
  const band = useMemo(
    () => computeIntervalBand(stats, confidenceLevel, 40),
    [stats, confidenceLevel]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-neutral-900 text-sm">Confidence & Prediction Intervals</h4>
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-xs">
            {[0.90, 0.95, 0.99].map((cl) => (
              <button
                key={cl}
                type="button"
                onClick={() => onConfidenceLevelChange(cl)}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  confidenceLevel === cl ? 'bg-teal-700 text-white shadow-xs' : 'text-neutral-600'
                }`}
              >
                {Math.round(cl * 100)}%
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 mb-3">
          <strong>CI (confidence interval):</strong> uncertainty around the estimated MEAN response —
          how precisely we know the average Y at each X.{' '}
          <strong>PI (prediction interval):</strong> uncertainty for an INDIVIDUAL future observation —
          where a single new Y would fall. The PI is always wider because it includes both
          the mean uncertainty AND the observation noise.
        </div>

        {band.suppressed ? (
          <div className="p-4 text-center text-xs text-amber-700">
            {band.suppressedReason}
          </div>
        ) : (
          <IntervalChart
            band={band}
            stats={stats}
            xLabel={xLabel}
            yLabel={yLabel}
            xUnit={xUnit}
            yUnit={yUnit}
          />
        )}
      </div>
    </div>
  );
};

// ===========================================================================
// Model Comparison Tab
// ===========================================================================

const ComparisonTab: React.FC<{ data: DataPoint[]; xLabel: string; yLabel: string }> = ({
  data,
  xLabel,
  yLabel,
}) => {
  const comparison = useMemo(
    () => compareModels(data, xLabel, yLabel),
    [data, xLabel, yLabel]
  );

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900">
        <strong>Cross-scale R² comparison caveat:</strong> {comparison.comparisonCaveat}
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
            <tr>
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">R² Scale</th>
              <th className="py-2.5 px-3 text-right">R²</th>
              <th className="py-2.5 px-3 text-right">Adj. R²</th>
              <th className="py-2.5 px-3 text-right">RMSE (fitted)</th>
              <th className="py-2.5 px-3 text-right">RMSE (orig.)</th>
              <th className="py-2.5 px-3 text-right">Slope</th>
              <th className="py-2.5 px-3">Equation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-mono">
            {comparison.models.map((m) => (
              <tr key={m.modelId} className={`hover:bg-neutral-50/70 ${!m.domainValid ? 'opacity-50' : ''}`}>
                <td className="py-2 px-3 font-sans font-medium text-neutral-900">{m.modelName}</td>
                <td className="py-2 px-3 text-neutral-500">{m.rSquaredScale}</td>
                <td className="py-2 px-3 text-right font-bold text-teal-800">
                  {m.domainValid ? formatNumber(m.rSquared, 4) : '—'}
                </td>
                <td className="py-2 px-3 text-right">
                  {m.domainValid ? formatNumber(m.adjustedRSquared, 4) : '—'}
                </td>
                <td className="py-2 px-3 text-right">
                  {m.domainValid ? formatNumber(m.rmse, 4) : '—'}
                </td>
                <td className="py-2 px-3 text-right">
                  {m.domainValid && m.rmseOriginalScale !== undefined ? formatNumber(m.rmseOriginalScale, 4) : '—'}
                </td>
                <td className="py-2 px-3 text-right">
                  {m.domainValid ? formatNumber(m.slope, 4) : '—'}
                </td>
                <td className="py-2 px-3 text-neutral-600 text-[11px]">{m.equation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interpretability notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {comparison.models.map((m) => (
          <div key={m.modelId} className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="font-semibold text-neutral-900 text-xs mb-1">{m.modelName}</div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">{m.interpretabilityNote}</p>
            {!m.domainValid && m.domainError && (
              <div className="mt-1.5 text-[10px] text-rose-600">{m.domainError}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===========================================================================
// PK Diagnostics Tab
// ===========================================================================

const PKDiagnosticsTab: React.FC<{ pkResult: PKAnalysisSuccess; data: DataPoint[] }> = ({
  pkResult,
  data,
}) => {
  const sensitivity = useMemo(
    () => computeTerminalPhaseSensitivity(
      data.map((d) => ({ id: d.id, time: d.x, concentration: d.y })),
      pkResult.logBase
    ),
    [data, pkResult.logBase]
  );

  const findings = useMemo(
    () =>
      generatePKFindings({
        k: pkResult.regression.eliminationRateConstant,
        halfLife: pkResult.regression.halfLife,
        c0: pkResult.regression.estimatedC0,
        rSquared: pkResult.regression.rSquared,
        extrapPercentage: pkResult.trapezoidalAUC.extrapFraction * 100,
        extrapolationSuppressed: pkResult.trapezoidalAUC.extrapolationSuppressed,
        terminalPhasePointCount: pkResult.terminalPhase.pointCount,
        slope: pkResult.regression.slope,
      }),
    [pkResult]
  );

  return (
    <div className="space-y-4">
      {/* Terminal-phase sensitivity */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-2">Terminal-Phase Sensitivity</h4>
        <p className="text-[11px] text-neutral-500 mb-3">{sensitivity.caveat}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2 px-3">Points</th>
                <th className="py-2 px-3">Time range</th>
                <th className="py-2 px-3 text-right">Slope</th>
                <th className="py-2 px-3 text-right">k</th>
                <th className="py-2 px-3 text-right">t½</th>
                <th className="py-2 px-3 text-right">R²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sensitivity.entries.map((e, i) => (
                <tr
                  key={i}
                  className={`hover:bg-neutral-50/70 ${
                    e.pointCount === pkResult.terminalPhase.pointCount ? 'bg-teal-50/30' : ''
                  }`}
                >
                  <td className="py-1.5 px-3">{e.pointCount}</td>
                  <td className="py-1.5 px-3">{e.timeRange.start}–{e.timeRange.end}</td>
                  <td className="py-1.5 px-3 text-right">{formatNumber(e.slope, 4)}</td>
                  <td className="py-1.5 px-3 text-right">{formatNumber(e.k, 4)}</td>
                  <td className="py-1.5 px-3 text-right">{formatNumber(e.halfLife, 2)}</td>
                  <td className="py-1.5 px-3 text-right">{formatNumber(e.rSquared, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUC report */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-3">AUC Report</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-teal-50/60 p-2.5 rounded-lg border border-teal-200">
            <div className="text-[10px] uppercase text-teal-700">AUC_last</div>
            <div className="font-mono font-bold text-teal-900">{formatNumber(pkResult.trapezoidalAUC.aucLast, 4)}</div>
            <div className="text-[10px] text-teal-600">trapezoidal</div>
          </div>
          <div className={`p-2.5 rounded-lg border ${pkResult.trapezoidalAUC.extrapolationSuppressed ? 'bg-neutral-50 border-neutral-200' : 'bg-amber-50/60 border-amber-200'}`}>
            <div className="text-[10px] uppercase text-amber-700">AUC_extra</div>
            <div className="font-mono font-bold">
              {pkResult.trapezoidalAUC.extrapolationSuppressed ? '—' : formatNumber(pkResult.trapezoidalAUC.aucExtra, 4)}
            </div>
            <div className="text-[10px] text-neutral-500">= C_last / k</div>
          </div>
          <div className="bg-teal-50/60 p-2.5 rounded-lg border border-teal-200">
            <div className="text-[10px] uppercase text-teal-700">AUC_total</div>
            <div className="font-mono font-bold text-teal-900">
              {pkResult.trapezoidalAUC.extrapolationSuppressed ? '—' : formatNumber(pkResult.trapezoidalAUC.aucTotal, 4)}
            </div>
          </div>
          <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
            <div className="text-[10px] uppercase text-neutral-500">Extrap %</div>
            <div className="font-mono font-bold">
              {pkResult.trapezoidalAUC.extrapolationSuppressed
                ? '—'
                : `${(pkResult.trapezoidalAUC.extrapFraction * 100).toFixed(1)}%`}
            </div>
            <div className="text-[10px] text-neutral-500">{pkResult.trapezoidalAUC.extrapolationSuppressed ? 'suppressed' : '>20% = caution'}</div>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <h4 className="font-semibold text-neutral-900 text-sm mb-3">Scientific Findings</h4>
        <div className="space-y-2">
          {findings.map((f, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs ${
                f.severity === 'critical'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : f.severity === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                {f.severity === 'critical' ? <AlertTriangle size={13} /> :
                 f.severity === 'warning' ? <Warning size={13} /> : <Info size={13} />}
                {f.title}
              </div>
              <p className="leading-relaxed">{f.explanation}</p>
              {f.recommendation && (
                <p className="mt-1 italic opacity-80">→ {f.recommendation}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// Report Tab
// ===========================================================================

const ReportTab: React.FC<{
  data: DataPoint[];
  stats: RegressionStatistics;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  pkResult?: PKAnalysisSuccess | null;
}> = ({ data, stats, xLabel, yLabel, xUnit, yUnit, pkResult }) => {
  const report = useMemo(
    () => generateOLSReport(data, stats, { xLabel, yLabel, xUnit, yUnit }),
    [data, stats, xLabel, yLabel, xUnit, yUnit]
  );
  const diagnostics = useMemo(() => computeObservationDiagnostics(stats), [stats]);

  const handleDownloadJSON = () => {
    const json = exportReportJSON(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regression-lab-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const csv = exportDiagnosticsCSV(diagnostics);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regression-lab-diagnostics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-neutral-900 text-sm">Scientific Analysis Report</h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium"
            >
              <Download size={12} />
              JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-800 text-white font-medium"
            >
              <Download size={12} />
              CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
            >
              <FileText size={12} />
              Print
            </button>
          </div>
        </div>

        {/* Report content */}
        <div className="space-y-3 text-xs">
          <ReportSection title="1. Dataset">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div><span className="text-neutral-500">N:</span> {report.dataset.n}</div>
              <div><span className="text-neutral-500">X range:</span> {formatNumber(report.dataset.xRange.min, 2)} – {formatNumber(report.dataset.xRange.max, 2)}</div>
              <div><span className="text-neutral-500">Y range:</span> {formatNumber(report.dataset.yRange.min, 2)} – {formatNumber(report.dataset.yRange.max, 2)}</div>
              <div><span className="text-neutral-500">Generated:</span> {new Date(report.metadata.generatedAt).toLocaleString()}</div>
            </div>
          </ReportSection>

          {report.regression && (
            <ReportSection title="2. Regression">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div><span className="text-neutral-500">Slope:</span> {formatNumber(report.regression.slope, 6)}</div>
                <div><span className="text-neutral-500">Intercept:</span> {formatNumber(report.regression.intercept, 6)}</div>
                <div><span className="text-neutral-500">R²:</span> {formatNumber(report.regression.rSquared, 6)}</div>
                <div><span className="text-neutral-500">Adj. R²:</span> {formatNumber(report.regression.adjustedRSquared, 6)}</div>
                <div><span className="text-neutral-500">SSE:</span> {formatNumber(report.regression.sse, 6)}</div>
                <div><span className="text-neutral-500">SST:</span> {formatNumber(report.regression.sst, 6)}</div>
                <div><span className="text-neutral-500">df:</span> {report.regression.degreesOfFreedom}</div>
                <div><span className="text-neutral-500">p(slope):</span> {report.regression.pValueSlope !== undefined ? formatNumber(report.regression.pValueSlope, 4) : '—'}</div>
              </div>
            </ReportSection>
          )}

          {report.diagnostics && (
            <ReportSection title="3. Diagnostics">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                <div><span className="text-neutral-500">Max leverage:</span> {formatNumber(report.diagnostics.maxLeverage, 6)}</div>
                <div><span className="text-neutral-500">Max Cook's D:</span> {formatNumber(report.diagnostics.maxCooksDistance, 6)}</div>
                <div><span className="text-neutral-500">Mean leverage:</span> {formatNumber(report.diagnostics.meanLeverage, 6)}</div>
                <div><span className="text-neutral-500">Flagged:</span> {report.diagnostics.flaggedObservations}</div>
                <div><span className="text-neutral-500">Pattern:</span> {report.diagnostics.residualPattern}</div>
              </div>
            </ReportSection>
          )}

          {report.findings.length > 0 && (
            <ReportSection title="4. Scientific Findings">
              <div className="space-y-1.5">
                {report.findings.map((f, i) => (
                  <div key={i} className="text-xs">
                    <span className={`font-semibold ${f.severity === 'critical' ? 'text-rose-700' : f.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>
                      [{f.severity.toUpperCase()}]
                    </span>{' '}
                    {f.title}: {f.explanation}
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {report.warnings.length > 0 && (
            <ReportSection title="5. Warnings">
              <ul className="list-disc list-inside text-amber-800 text-xs">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </ReportSection>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-neutral-100 pb-2">
    <h5 className="font-semibold text-neutral-900 text-xs mb-1.5">{title}</h5>
    {children}
  </div>
);

// ===========================================================================
// Simple chart sub-components (SVG-based, no external library)
// ===========================================================================

const SimpleQQPlot: React.FC<{ data: { theoretical: number; observed: number; index: number }[] }> = ({ data }) => {
  if (data.length < 2) return <div className="text-xs text-neutral-500 text-center py-4">Insufficient data for Q-Q plot</div>;
  const w = 320, h = 240, m = 35;
  const allVals = [...data.flatMap((d) => [d.theoretical, d.observed])];
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const pad = (max - min) * 0.1 || 1;
  const sx = (x: number) => m + ((x - (min - pad)) / (max - min + 2 * pad)) * (w - 2 * m);
  const sy = (y: number) => m + (h - 2 * m) - ((y - (min - pad)) / (max - min + 2 * pad)) * (h - 2 * m);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-w-md mx-auto">
      {/* Reference line y=x */}
      <line x1={sx(min - pad)} y1={sy(min - pad)} x2={sx(max + pad)} y2={sy(max + pad)} stroke="#d1d5db" strokeDasharray="4 3" />
      {/* Points */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.theoretical)} cy={sy(d.observed)} r={3} fill="#0f766e" />
      ))}
      {/* Axes */}
      <line x1={m} y1={m} x2={m} y2={h - m} stroke="#9ca3af" />
      <line x1={m} y1={h - m} x2={w - m} y2={h - m} stroke="#9ca3af" />
      <text x={w / 2} y={h - 5} textAnchor="middle" className="text-[9px] fill-neutral-500">Theoretical quantiles</text>
      <text x={10} y={h / 2} transform={`rotate(-90 10 ${h / 2})`} textAnchor="middle" className="text-[9px] fill-neutral-500">Studentized residuals</text>
    </svg>
  );
};

const SimpleHistogram: React.FC<{ bins: { binStart: number; binEnd: number; count: number }[] }> = ({ bins }) => {
  if (bins.length === 0) return null;
  const w = 320, h = 200, m = 35;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const barW = (w - 2 * m) / bins.length;
  const sy = (c: number) => m + (h - 2 * m) - (c / maxCount) * (h - 2 * m);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-w-md mx-auto">
      {bins.map((b, i) => (
        <rect
          key={i}
          x={m + i * barW}
          y={sy(b.count)}
          width={barW - 1}
          height={m + (h - 2 * m) - sy(b.count)}
          fill="#0d9488"
          fillOpacity="0.7"
        />
      ))}
      <line x1={m} y1={h - m} x2={w - m} y2={h - m} stroke="#9ca3af" />
      <line x1={m} y1={m} x2={m} y2={h - m} stroke="#9ca3af" />
      <text x={w / 2} y={h - 5} textAnchor="middle" className="text-[9px] fill-neutral-500">Residual</text>
      <text x={10} y={h / 2} transform={`rotate(-90 10 ${h / 2})`} textAnchor="middle" className="text-[9px] fill-neutral-500">Count</text>
    </svg>
  );
};

const SimpleScaleLocation: React.FC<{ data: { fitted: number; sqrtAbsStdResidual: number }[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const w = 320, h = 200, m = 35;
  const xs = data.map((d) => d.fitted);
  const ys = data.map((d) => d.sqrtAbsStdResidual);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.1 || 1, padY = (maxY - minY) * 0.1 || 0.1;
  const sx = (x: number) => m + ((x - (minX - padX)) / (maxX - minX + 2 * padX)) * (w - 2 * m);
  const sy = (y: number) => m + (h - 2 * m) - ((y - (minY - padY)) / (maxY - minY + 2 * padY)) * (h - 2 * m);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-w-md mx-auto">
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.fitted)} cy={sy(d.sqrtAbsStdResidual)} r={3} fill="#0f766e" />
      ))}
      <line x1={m} y1={m} x2={m} y2={h - m} stroke="#9ca3af" />
      <line x1={m} y1={h - m} x2={w - m} y2={h - m} stroke="#9ca3af" />
      <text x={w / 2} y={h - 5} textAnchor="middle" className="text-[9px] fill-neutral-500">Fitted values</text>
      <text x={10} y={h / 2} transform={`rotate(-90 10 ${h / 2})`} textAnchor="middle" className="text-[9px] fill-neutral-500">√|Std. residual|</text>
    </svg>
  );
};

const SimpleScatter: React.FC<{
  points: { x: number; y: number; label: string; flagged: boolean }[];
  xLabel: string;
  yLabel: string;
  xThreshold?: number;
  yThreshold?: number;
}> = ({ points, xLabel, yLabel, xThreshold, yThreshold }) => {
  if (points.length < 2) return null;
  const w = 360, h = 260, m = 40;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, xThreshold ?? 0);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, yThreshold ?? 0);
  const padX = (maxX - minX) * 0.1 || 1, padY = (maxY - minY) * 0.1 || 1;
  const sx = (x: number) => m + ((x - (minX - padX)) / (maxX - minX + 2 * padX)) * (w - 2 * m);
  const sy = (y: number) => m + (h - 2 * m) - ((y - (minY - padY)) / (maxY - minY + 2 * padY)) * (h - 2 * m);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-w-lg mx-auto">
      {/* Threshold lines */}
      {xThreshold !== undefined && (
        <line x1={sx(xThreshold)} y1={m} x2={sx(xThreshold)} y2={h - m} stroke="#f59e0b" strokeDasharray="4 3" opacity="0.6" />
      )}
      {yThreshold !== undefined && (
        <line x1={m} y1={sy(yThreshold)} x2={w - m} y2={sy(yThreshold)} stroke="#f59e0b" strokeDasharray="4 3" opacity="0.6" />
      )}
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.flagged ? 5 : 3.5}
            fill={p.flagged ? '#dc2626' : '#0f766e'}
            fillOpacity={p.flagged ? 0.8 : 0.6}
          />
          {p.flagged && (
            <text x={sx(p.x) + 6} y={sy(p.y) + 3} className="text-[9px] fill-rose-700 font-mono">{p.label}</text>
          )}
        </g>
      ))}
      {/* Axes */}
      <line x1={m} y1={h - m} x2={w - m} y2={h - m} stroke="#9ca3af" />
      <line x1={m} y1={m} x2={m} y2={h - m} stroke="#9ca3af" />
      <text x={w / 2} y={h - 5} textAnchor="middle" className="text-[9px] fill-neutral-500">{xLabel}</text>
      <text x={10} y={h / 2} transform={`rotate(-90 10 ${h / 2})`} textAnchor="middle" className="text-[9px] fill-neutral-500">{yLabel}</text>
    </svg>
  );
};

const IntervalChart: React.FC<{
  band: { points: { x: number; predicted: number; ciLower: number; ciUpper: number; piLower: number; piUpper: number }[]; confidenceLevel: number };
  stats: RegressionStatistics;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
}> = ({ band, stats, xLabel, yLabel, xUnit, yUnit }) => {
  const w = 520, h = 340, m = 50;
  const allY = [
    ...band.points.flatMap((p) => [p.piLower, p.piUpper, p.predicted]),
    ...stats.points.map((p) => p.y),
  ];
  const allX = [...band.points.map((p) => p.x), ...stats.points.map((p) => p.x)];
  const minX = Math.min(...allX), maxX = Math.max(...allX);
  const minY = Math.min(...allY), maxY = Math.max(...allY);
  const padX = (maxX - minX) * 0.05 || 1, padY = (maxY - minY) * 0.1 || 1;
  const sx = (x: number) => m + ((x - (minX - padX)) / (maxX - minX + 2 * padX)) * (w - 2 * m);
  const sy = (y: number) => m + (h - 2 * m) - ((y - (minY - padY)) / (maxY - minY + 2 * padY)) * (h - 2 * m);

  const ciPath = band.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)},${sy(p.ciUpper)}`).join(' ') +
    ' ' + band.points.slice().reverse().map((p) => `L ${sx(p.x)},${sy(p.ciLower)}`).join(' ') + ' Z';
  const piPath = band.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)},${sy(p.piUpper)}`).join(' ') +
    ' ' + band.points.slice().reverse().map((p) => `L ${sx(p.x)},${sy(p.piLower)}`).join(' ') + ' Z';
  const linePath = band.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)},${sy(p.predicted)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <clipPath id="interval-clip">
          <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} />
        </clipPath>
      </defs>
      <g clipPath="url(#interval-clip)">
        {/* PI band */}
        <path d={piPath} fill="#fde68a" fillOpacity="0.4" />
        {/* CI band */}
        <path d={ciPath} fill="#5eead4" fillOpacity="0.4" />
        {/* Regression line */}
        <path d={linePath} fill="none" stroke="#0f766e" strokeWidth="2" />
        {/* Data points */}
        {stats.points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#0f766e" stroke="#fff" strokeWidth="1" />
        ))}
      </g>
      {/* Axes */}
      <line x1={m} y1={h - m} x2={w - m} y2={h - m} stroke="#9ca3af" />
      <line x1={m} y1={m} x2={m} y2={h - m} stroke="#9ca3af" />
      <text x={w / 2} y={h - 10} textAnchor="middle" className="text-[10px] fill-neutral-600">{xLabel} {xUnit ? `(${xUnit})` : ''}</text>
      <text x={12} y={h / 2} transform={`rotate(-90 12 ${h / 2})`} textAnchor="middle" className="text-[10px] fill-neutral-600">{yLabel} {yUnit ? `(${yUnit})` : ''}</text>
      {/* Legend */}
      <g transform={`translate(${m + 10}, ${m + 10})`}>
        <rect x={0} y={-8} width={14} height={8} fill="#5eead4" fillOpacity="0.5" />
        <text x={18} y={-1} className="text-[9px] fill-neutral-700">CI ({Math.round(band.confidenceLevel * 100)}%)</text>
        <rect x={0} y={4} width={14} height={8} fill="#fde68a" fillOpacity="0.5" />
        <text x={18} y={11} className="text-[9px] fill-neutral-700">PI ({Math.round(band.confidenceLevel * 100)}%)</text>
        <line x1={0} y1={20} x2={14} y2={20} stroke="#0f766e" strokeWidth="2" />
        <text x={18} y={23} className="text-[9px] fill-neutral-700">Regression line</text>
      </g>
    </svg>
  );
};

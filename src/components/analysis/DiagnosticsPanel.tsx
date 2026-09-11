import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Download,
  FileText,
  Filter,
  Flag,
  Info,
  TrendingDown,
  TrendingUp,
  AlertTriangle as Warning,
} from 'lucide-react';
import { DataPoint, RegressionStatistics } from '../../types';
import { computeObservationDiagnostics, flagExplanation } from '../../lib/analysis/diagnostics';
import { formatNumber } from '../../lib/statistics/formatting';
import { TooltipTerm } from '../common/TooltipTerm';

interface DiagnosticsPanelProps {
  stats: RegressionStatistics;
  decimals?: number;
}

/**
 * Phase 6 — Diagnostics Panel (spec §7).
 *
 * Shows summary cards (R², adjusted R², RMSE, RSE, SSE, max leverage, max Cook's D)
 * and an observation-level diagnostic table with flags.
 *
 * Reuses the Phase 2 RegressionStatistics — no duplicate calculations.
 */
export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ stats, decimals = 4 }) => {
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'index' | 'leverage' | 'cooks' | 'residual'>('index');

  const diagnostics = useMemo(() => computeObservationDiagnostics(stats), [stats]);

  const sortedObs = useMemo(() => {
    const obs = [...diagnostics.observations];
    if (sortBy === 'leverage') obs.sort((a, b) => b.leverage - a.leverage);
    else if (sortBy === 'cooks') obs.sort((a, b) => b.cooksDistance - a.cooksDistance);
    else if (sortBy === 'residual') obs.sort((a, b) => Math.abs(b.studentizedResidual) - Math.abs(a.studentizedResidual));
    return obs;
  }, [diagnostics, sortBy]);

  const displayed = showFlaggedOnly ? sortedObs.filter((o) => o.flags.length > 0) : sortedObs;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <SummaryCard label="R²" value={formatNumber(stats.rSquared, decimals)} accent="teal" />
        <SummaryCard label="Adj. R²" value={formatNumber(stats.adjustedRSquared ?? stats.rSquared, decimals)} accent="teal" />
        <SummaryCard
          label="RMSE"
          value={formatNumber(stats.predictionRMSE ?? Math.sqrt(stats.sse / stats.n), decimals)}
          accent="neutral"
          hint="√(SSE/n) — prediction RMSE"
        />
        <SummaryCard
          label="Resid. SE (s)"
          value={formatNumber(stats.residualStandardError ?? stats.rmse, decimals)}
          accent="neutral"
          hint="√(SSE/(n−2)) — residual standard error"
        />
        <SummaryCard label="SSE" value={formatNumber(stats.sse, decimals)} accent="neutral" />
        <SummaryCard
          label="Max h_i"
          value={formatNumber(diagnostics.maxLeverage, decimals)}
          accent={diagnostics.maxLeverage > diagnostics.thresholds.leverageThreshold ? 'amber' : 'neutral'}
          hint={`Threshold: 4/n = ${diagnostics.thresholds.leverageThreshold.toFixed(4)}`}
        />
        <SummaryCard
          label="Max Cook's D"
          value={formatNumber(diagnostics.maxCooksDistance, decimals)}
          accent={diagnostics.maxCooksDistance > diagnostics.thresholds.cooksThreshold ? 'amber' : 'neutral'}
          hint={`Threshold: 4/n = ${diagnostics.thresholds.cooksThreshold.toFixed(4)}`}
        />
      </div>

      {/* RMSE vs RSE distinction (spec §3) */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>RMSE vs Residual Standard Error:</strong>{' '}
          RMSE = √(SSE/n) is the prediction root-mean-square error.{' '}
          Residual Standard Error s = √(SSE/(n−2)) is the unbiased estimate of σ used for
          confidence intervals and hypothesis tests. They are NOT the same.
        </div>
      </div>

      {/* Observation table */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-teal-700" />
            <h4 className="font-semibold text-neutral-900 text-sm">Observation Diagnostics</h4>
            <span className="text-[11px] text-neutral-500">
              {diagnostics.flaggedCount} flagged / {diagnostics.n} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-medium"
            >
              <option value="index">Sort: Index</option>
              <option value="leverage">Sort: Leverage</option>
              <option value="cooks">Sort: Cook's D</option>
              <option value="residual">Sort: |Residual|</option>
            </select>
            <button
              type="button"
              onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                showFlaggedOnly
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Filter size={12} />
              {showFlaggedOnly ? 'Flagged only' : 'All observations'}
            </button>
          </div>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2 px-2 text-center">#</th>
                <th className="py-2 px-2.5 text-right">X</th>
                <th className="py-2 px-2.5 text-right">Y</th>
                <th className="py-2 px-2.5 text-right">Ŷ</th>
                <th className="py-2 px-2.5 text-right">Residual</th>
                <th className="py-2 px-2.5 text-right">Std. Resid.</th>
                <th className="py-2 px-2.5 text-right">Leverage</th>
                <th className="py-2 px-2.5 text-right">Cook's D</th>
                <th className="py-2 px-2.5 text-center">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {displayed.map((o) => (
                <tr key={o.id} className={`hover:bg-neutral-50/70 ${o.flags.length > 0 ? 'bg-amber-50/20' : ''}`}>
                  <td className="py-1.5 px-2 text-center text-neutral-400">{o.index + 1}</td>
                  <td className="py-1.5 px-2.5 text-right">{formatNumber(o.x, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right">{formatNumber(o.y, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-teal-700">{formatNumber(o.fitted, decimals)}</td>
                  <td className={`py-1.5 px-2.5 text-right ${o.residual >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {o.residual >= 0 ? '+' : ''}{formatNumber(o.residual, decimals)}
                  </td>
                  <td className={`py-1.5 px-2.5 text-right ${Math.abs(o.studentizedResidual) >= 2 ? 'text-rose-700 font-bold' : 'text-neutral-600'}`}>
                    {formatNumber(o.studentizedResidual, decimals)}
                  </td>
                  <td className={`py-1.5 px-2.5 text-right ${o.leverage > diagnostics.thresholds.leverageThreshold ? 'text-amber-700 font-bold' : 'text-neutral-600'}`}>
                    {formatNumber(o.leverage, decimals)}
                  </td>
                  <td className={`py-1.5 px-2.5 text-right ${o.cooksDistance > diagnostics.thresholds.cooksThreshold ? 'text-amber-700 font-bold' : 'text-neutral-600'}`}>
                    {formatNumber(o.cooksDistance, 6)}
                  </td>
                  <td className="py-1.5 px-2.5 text-center">
                    {o.flags.length > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Flag size={11} className="text-amber-600" />
                        <span className="text-[10px] text-amber-700">{o.flags.length}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Flag legend */}
        {diagnostics.flags.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50/40 border border-amber-200 rounded-lg">
            <div className="text-xs font-semibold text-amber-900 mb-1.5">Flag legend (documented thresholds):</div>
            <div className="space-y-1">
              {diagnostics.flags.map((f) => {
                const exp = flagExplanation(f);
                return (
                  <div key={f} className="text-[11px] text-amber-800">
                    <strong>{exp.label}:</strong> {exp.explanation}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-amber-700 italic">
              Thresholds: Leverage &gt; 4/n = {diagnostics.thresholds.leverageThreshold.toFixed(4)} ·
              Cook's D &gt; 4/n = {diagnostics.thresholds.cooksThreshold.toFixed(4)} ·
              |Studentized residual| ≥ 2.0. These are conventional educational thresholds, not universal laws.
              Never auto-delete flagged observations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Summary card sub-component ----

const SummaryCard: React.FC<{
  label: string;
  value: string;
  accent: 'teal' | 'amber' | 'neutral';
  hint?: string;
}> = ({ label, value, accent, hint }) => {
  const color =
    accent === 'teal' ? 'text-teal-800 bg-teal-50 border-teal-200'
    : accent === 'amber' ? 'text-amber-800 bg-amber-50 border-amber-200'
    : 'text-neutral-800 bg-neutral-50 border-neutral-200';
  return (
    <div className={`p-2.5 rounded-lg border ${color}`} title={hint}>
      <div className="text-[10px] uppercase font-semibold opacity-70">{label}</div>
      <div className="font-mono font-bold text-sm mt-0.5">{value}</div>
    </div>
  );
};

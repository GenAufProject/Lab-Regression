import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Binary,
  Calculator,
  ChevronDown,
  ChevronRight,
  Info,
  LineChart,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DataPoint, LogBase, TransformType } from '../../types';
import { calculateSimpleLinearRegression } from '../../lib/statistics/linearRegression';
import {
  getLogTransformationMetadata,
  transformDataset,
} from '../../lib/statistics/transformations';
import { analyzeLogRegression } from '../../lib/statistics/logRegression';
import { formatNumber } from '../../lib/statistics/formatting';
import { MathFormula } from '../common/MathFormula';
import { LogRegressionChart } from '../charts/LogRegressionChart';

interface TransformationModuleProps {
  data: DataPoint[];
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
}

type ChartScale = 'original' | 'transformed';

export const TransformationModule: React.FC<TransformationModuleProps> = ({
  data,
  xLabel = 'X',
  yLabel = 'Y',
  xUnit = '',
  yUnit = '',
}) => {
  // Log-linear mode (Phase 3): ln or log10 of Y. Sqrt is intentionally NOT
  // offered here per spec §24 — "Do not expose sqrt as a log-regression mode."
  const [logBase, setLogBase] = useState<LogBase>('ln');
  const [chartScale, setChartScale] = useState<ChartScale>('transformed');
  const [activeTraceStep, setActiveTraceStep] = useState<number | null>(null);

  // Raw linear regression on the untransformed data (for comparison)
  const rawRegression = useMemo(() => calculateSimpleLinearRegression(data), [data]);

  // Phase 3: delegate to the log-regression engine (spec §6 — reuses OLS).
  // The engine handles domain validation, transformation, OLS fit, and the
  // 11-step calculation trace.
  const logAnalysis = useMemo(
    () => analyzeLogRegression(data, logBase, { xLabel, yLabel }),
    [data, logBase, xLabel, yLabel]
  );

  // Model comparison metrics (kept for backward-compat with the existing UI)
  const comparisonModels = useMemo(() => {
    const models: {
      name: string;
      transform: TransformType;
      r2: number | null;
      s: number | null;
      equation: string;
      backTransformed?: string;
      error?: string;
    }[] = [];

    // Linear (no transform)
    if (rawRegression.status === 'success') {
      const b = rawRegression.stats.slope;
      const a = rawRegression.stats.intercept;
      models.push({
        name: 'Linear (No Transform)',
        transform: 'none',
        r2: rawRegression.stats.rSquared,
        s: rawRegression.stats.residualStandardError ?? rawRegression.stats.rmse,
        equation: `${yLabel} = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}·${xLabel}`,
      });
    }

    // ln(Y)
    const lnRes = transformDataset(data, 'none', 'ln');
    if (lnRes.status === 'success') {
      const reg = calculateSimpleLinearRegression(lnRes.transformedPoints);
      if (reg.status === 'success') {
        const b = reg.stats.slope;
        const a = reg.stats.intercept;
        models.push({
          name: 'Log-Linear: ln(Y)',
          transform: 'ln',
          r2: reg.stats.rSquared,
          s: reg.stats.residualStandardError ?? reg.stats.rmse,
          equation: `ln(${yLabel}) = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}·${xLabel}`,
          backTransformed: `${yLabel} = ${formatNumber(Math.exp(a), 3)} · e^(${formatNumber(b, 3)}·${xLabel})`,
        });
      }
    } else {
      models.push({
        name: 'Log-Linear: ln(Y)',
        transform: 'ln',
        r2: null,
        s: null,
        equation: 'Cannot fit',
        error: 'Requires Y > 0',
      });
    }

    // log10(Y)
    const log10Res = transformDataset(data, 'none', 'log10');
    if (log10Res.status === 'success') {
      const reg = calculateSimpleLinearRegression(log10Res.transformedPoints);
      if (reg.status === 'success') {
        const b = reg.stats.slope;
        const a = reg.stats.intercept;
        models.push({
          name: 'Log-Linear: log10(Y)',
          transform: 'log10',
          r2: reg.stats.rSquared,
          s: reg.stats.residualStandardError ?? reg.stats.rmse,
          equation: `log₁₀(${yLabel}) = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}·${xLabel}`,
          backTransformed: `${yLabel} = ${formatNumber(Math.pow(10, a), 3)} · 10^(${formatNumber(b, 3)}·${xLabel})`,
        });
      }
    } else {
      models.push({
        name: 'Log-Linear: log10(Y)',
        transform: 'log10',
        r2: null,
        s: null,
        equation: 'Cannot fit',
        error: 'Requires Y > 0',
      });
    }

    return models;
  }, [data, rawRegression, xLabel, yLabel]);

  const logMeta = getLogTransformationMetadata(logBase);
  const logResult = logAnalysis.status === 'success' ? logAnalysis.result : null;
  const logError = logAnalysis.status === 'error' ? logAnalysis.error : null;

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------- */}
      {/* Header + Log Base Selector                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
              <Binary size={16} className="text-teal-700" />
              <span>Log-Linear Regression Studio</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Fit ln(Y) = a + b·X or log₁₀(Y) = a + b·X using the validated Phase 2 OLS engine,
              then back-transform to the original scale.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-700">Transform Y:</span>
            <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLogBase('ln')}
                className={`px-3 py-1 rounded-md transition-all ${
                  logBase === 'ln'
                    ? 'bg-teal-700 text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ln(Y) — base e
              </button>
              <button
                type="button"
                onClick={() => setLogBase('log10')}
                className={`px-3 py-1 rounded-md transition-all ${
                  logBase === 'log10'
                    ? 'bg-teal-700 text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                log₁₀(Y) — base 10
              </button>
            </div>
          </div>
        </div>

        {/* Domain metadata card */}
        <div className="mt-3 p-3 bg-teal-50/40 border border-teal-100 rounded-lg text-xs text-teal-90050 space-y-1">
          <div className="font-semibold text-teal-900">{logMeta.displayName}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-teal-800">
            <div><span className="text-teal-600">Notation:</span> <MathFormula math={logMeta.notationLatex} /></div>
            <div><span className="text-teal-600">Inverse:</span> <MathFormula math={logMeta.inverseNotationLatex} /></div>
            <div><span className="text-teal-600">Domain:</span> {logMeta.domainDescription}</div>
            <div>
              <span className="text-teal-600">Accepts:</span>{' '}
              {logMeta.acceptsNegative ? 'negatives' : logMeta.acceptsZero ? 'zero & positives' : 'positives only'}
            </div>
          </div>
        </div>

        {/* Validation error (spec §5, §25) */}
        {logError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-semibold block">Logarithmic Regression Cannot Be Calculated</span>
              <p className="leading-relaxed">
                The selected transformation ({logMeta.displayName}) requires Y &gt; 0.
                ln(Y) and log₁₀(Y) are undefined for zero and negative values.
              </p>
              {logError.invalidRows && logError.invalidRows.length > 0 && (
                <div className="text-rose-800 font-mono text-[11px] bg-rose-100/60 p-2 rounded">
                  <div className="font-semibold mb-0.5">Invalid observations ({logError.invalidRows.length} total):</div>
                  {logError.invalidRows.slice(0, 10).map((r) => (
                    <div key={r.row}>Row {r.row}: {r.reason}</div>
                  ))}
                  {logError.invalidRows.length > 10 && (
                    <div className="text-rose-700 mt-0.5">… and {logError.invalidRows.length - 10} more</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Equation cards (spec §8 — distinguish transformed vs original)  */}
      {/* ---------------------------------------------------------------- */}
      {logResult && (
        <div className="bg-gradient-to-r from-teal-900 to-neutral-900 text-white p-4 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-teal-300 uppercase tracking-wider mb-2">
            Fitted Log-Linear Model ({logMeta.displayName})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <div className="text-[11px] text-teal-200 mb-1">Regression Equation (transformed scale):</div>
              <div className="text-sm font-bold text-white overflow-x-auto">
                <MathFormula math={logResult.equationTransformedLatex} block />
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-lg border border-teal-500/30">
              <div className="text-[11px] text-teal-200 mb-1">Back-Transformed Equation (original scale):</div>
              <div className="text-sm font-bold text-emerald-300 overflow-x-auto">
                <MathFormula math={logResult.equationOriginalLatex} block />
              </div>
            </div>
          </div>

          {/* Key fit metrics row */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <div className="text-teal-300 text-[10px] uppercase">Slope (b)</div>
              <div className="font-mono font-bold text-white">{formatNumber(logResult.coefficients.slope, 4)}</div>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <div className="text-teal-300 text-[10px] uppercase">Intercept (a)</div>
              <div className="font-mono font-bold text-white">{formatNumber(logResult.coefficients.intercept, 4)}</div>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <div className="text-teal-300 text-[10px] uppercase">R² (transformed scale)</div>
              <div className="font-mono font-bold text-emerald-300">{formatNumber(logResult.fit.rSquared, 4)}</div>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <div className="text-teal-300 text-[10px] uppercase">Resid. Std. Error (s)</div>
              <div className="font-mono font-bold text-white">
                {formatNumber(logResult.fit.residualStandardError, 4)}
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-amber-200/80 italic">
            Note: R² is computed on the transformed scale. Do not directly compare it to R² from the raw-Y linear model.
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Dual-view chart (spec §14, §15)                                  */}
      {/* ---------------------------------------------------------------- */}
      {logResult && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-100 px-1 text-xs">
            <div className="flex items-center gap-3">
              <LineChart size={15} className="text-teal-700" />
              <span className="font-semibold text-neutral-800">Dual-View Scatter Plot</span>
              <span className="text-neutral-500 text-[11px]">
                Toggle between original (curved) and transformed (linearized) scales
              </span>
            </div>
            <div className="inline-flex rounded-md bg-neutral-100 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setChartScale('original')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartScale === 'original' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
                }`}
              >
                Original Scale (Y vs X)
              </button>
              <button
                type="button"
                onClick={() => setChartScale('transformed')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartScale === 'transformed' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
                }`}
              >
                Transformed Scale ({logBase}(Y) vs X)
              </button>
            </div>
          </div>
          <LogRegressionChart
            result={logResult}
            scaleMode={chartScale}
            xLabel={xLabel}
            yLabel={yLabel}
            xUnit={xUnit}
            yUnit={yUnit}
            height={380}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Coefficient interpretation (spec §9, §10)                        */}
      {/* ---------------------------------------------------------------- */}
      {logResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Slope interpretation */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 text-sm mb-2">
              {logResult.interpretation.multiplicativeFactor >= 1
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-rose-600" />}
              <span>Slope Interpretation (b = {formatNumber(logResult.coefficients.slope, 4)})</span>
            </div>
            <div className="space-y-2 text-xs text-neutral-700">
              <p className="leading-relaxed">{logResult.interpretation.slopeNarrative}</p>
              <div className="bg-teal-50/60 border border-teal-200 rounded-lg p-2.5 font-mono text-[11px] text-teal-950">
                <div>
                  <span className="text-teal-700">Multiplicative factor per unit X:</span>{' '}
                  <span className="font-bold">
                    {logBase === 'ln' ? 'e^b' : '10^b'} = {formatNumber(logResult.interpretation.multiplicativeFactor, 4)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-teal-700">% change per unit X:</span>{' '}
                  <span className="font-bold">
                    {logResult.interpretation.percentChangePerUnitX >= 0 ? '+' : ''}
                    {formatNumber(logResult.interpretation.percentChangePerUnitX, 2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Intercept interpretation */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 text-sm mb-2">
              <Calculator size={16} className="text-teal-700" />
              <span>Intercept Interpretation (a = {formatNumber(logResult.coefficients.intercept, 4)})</span>
            </div>
            <div className="space-y-2 text-xs text-neutral-700">
              <p className="leading-relaxed">{logResult.interpretation.interceptNarrative}</p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 font-mono text-[11px] text-neutral-800">
                <div>
                  <span className="text-neutral-600">Predicted Y at X = 0:</span>{' '}
                  <span className="font-bold">
                    {logBase === 'ln' ? 'e^a' : '10^a'} = {formatNumber(logResult.interpretation.predictedYAtX0, 4)}
                  </span>
                </div>
                {logResult.interpretation.x0OutsideObservedRange && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-amber-700">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span className="font-medium">X = 0 lies outside the observed data range — intercept is an extrapolation.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Prediction table (spec §11)                                      */}
      {/* ---------------------------------------------------------------- */}
      {logResult && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-teal-700" />
              <h4 className="font-semibold text-neutral-900 text-sm">
                Predictions: Observed, Transformed, and Back-Transformed
              </h4>
            </div>
            <span className="text-[11px] text-neutral-500">
              Spec §11: separate transformed vs original-scale values
            </span>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="py-2 px-2 text-center text-neutral-400">#</th>
                  <th className="py-2 px-2.5 text-right">{xLabel}</th>
                  <th className="py-2 px-2.5 text-right">Y observed</th>
                  <th className="py-2 px-2.5 text-right">{logBase}(Y)</th>
                  <th className="py-2 px-2.5 text-right">pred {logBase}(Y)</th>
                  <th className="py-2 px-2.5 text-right text-teal-800">pred Y (back-transformed)</th>
                  <th className="py-2 px-2.5 text-right">resid (transformed)</th>
                  <th className="py-2 px-2.5 text-right">resid (original)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logResult.predictions.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-neutral-50/70">
                    <td className="py-1.5 px-2 text-center text-neutral-400">{idx + 1}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatNumber(p.x, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right">{formatNumber(p.yObserved, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(p.yTransformed, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(p.predictedTransformed, 3)}</td>
                    <td className="py-1.5 px-2.5 text-right text-teal-700 font-semibold">{formatNumber(p.predictedOriginal, 3)}</td>
                    <td className={`py-1.5 px-2.5 text-right ${p.residualTransformed >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {p.residualTransformed >= 0 ? '+' : ''}{formatNumber(p.residualTransformed, 3)}
                    </td>
                    <td className={`py-1.5 px-2.5 text-right ${p.residualOriginal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {p.residualOriginal >= 0 ? '+' : ''}{formatNumber(p.residualOriginal, 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 italic">
            Note: transformed residuals are what OLS minimizes; original-scale residuals are informational only.
            Back-transformed predictions are median estimates (Jensen's inequality bias applies to the mean).
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Calculation trace (spec §16)                                     */}
      {/* ---------------------------------------------------------------- */}
      {logResult && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-teal-700" />
              <h4 className="font-semibold text-neutral-900 text-sm">
                11-Step Log-Linear Calculation Trace
              </h4>
            </div>
            <span className="text-xs text-neutral-500">Generated by the domain layer (spec §16)</span>
          </div>

          <div className="mt-3 space-y-2">
            {logResult.calculationTrace.map((s) => {
              const isExpanded = activeTraceStep === s.step;
              return (
                <div
                  key={`trace-${s.step}`}
                  className={`border rounded-lg transition-all ${
                    isExpanded ? 'border-teal-500 bg-teal-50/20' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTraceStep(isExpanded ? null : s.step)}
                    className="w-full text-left p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-mono font-bold flex items-center justify-center text-[10px]">
                        {s.step}
                      </span>
                      <span className="font-semibold text-neutral-900">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
                      <span className="truncate max-w-xs">{s.result}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3.5 pb-3 text-xs text-neutral-700 border-t border-teal-100 pt-2 space-y-2">
                      <p className="leading-relaxed text-neutral-600">{s.description}</p>
                      <div className="bg-white border border-neutral-200 rounded p-2.5 overflow-x-auto text-center">
                        <MathFormula math={s.formulaLatex} block />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ln vs log10 educational comparison (spec §17)                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-teal-700" />
          <h4 className="font-semibold text-neutral-900 text-sm">ln vs log₁₀ — Mathematical Equivalence</h4>
        </div>
        <div className="border border-neutral-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2 px-3">Feature</th>
                <th className="py-2 px-3">ln (natural log)</th>
                <th className="py-2 px-3">log₁₀ (common log)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-2 px-3 font-medium">Base</td>
                <td className="py-2 px-3 font-mono">e ≈ 2.71828</td>
                <td className="py-2 px-3 font-mono">10</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Equation</td>
                <td className="py-2 px-3"><MathFormula math="\ln(Y) = a + bX" /></td>
                <td className="py-2 px-3"><MathFormula math="\log_{10}(Y) = a + bX" /></td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Back-transform</td>
                <td className="py-2 px-3"><MathFormula math="\hat{Y} = e^{a + bX}" /></td>
                <td className="py-2 px-3"><MathFormula math="\hat{Y} = 10^{a + bX}" /></td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Multiplicative factor</td>
                <td className="py-2 px-3 font-mono">e^b</td>
                <td className="py-2 px-3 font-mono">10^b</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">PK slope → k</td>
                <td className="py-2 px-3 font-mono">k = −b</td>
                <td className="py-2 px-3 font-mono">k = −b · ln(10) ≈ −2.303b</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Relationship</td>
                <td colSpan={2} className="py-2 px-3 text-center text-neutral-600">
                  <MathFormula math="\log_{10}(x) = \frac{\ln(x)}{\ln(10)} \approx \frac{\ln(x)}{2.302585}" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
          <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Key insight:</strong> Changing the logarithm base does <em>not</em> change the underlying
            exponential model — it only rescales the slope and intercept by a factor of ln(10).
            The back-transformed predictions, multiplicative factors, R², and residuals are identical
            (up to floating-point precision) regardless of which log base you use, as long as you apply
            the matching back-transform consistently.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Model comparison table (kept for backward compat)                */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-teal-700" />
          <h4 className="font-semibold text-neutral-900 text-sm">Model Comparison Summary</h4>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Fitted Equation</th>
                <th className="py-2.5 px-3">Back-Transformed Form</th>
                <th className="py-2.5 px-3 text-right">R² (Fitted Scale)</th>
                <th className="py-2.5 px-3 text-right">Residual Std. Error (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono">
              {comparisonModels.map((m) => (
                <tr key={m.name} className="hover:bg-neutral-50/50">
                  <td className="py-2 px-3 font-sans font-medium text-neutral-900">{m.name}</td>
                  <td className="py-2 px-3">{m.equation}</td>
                  <td className="py-2 px-3 text-neutral-600">{m.backTransformed || '—'}</td>
                  <td className="py-2 px-3 text-right font-bold text-teal-800">
                    {m.r2 !== null ? formatNumber(m.r2, 3) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-neutral-700">
                    {m.s !== null ? formatNumber(m.s, 3) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Important Statistical Note on R² Comparison:</strong> Do <em>not</em> directly compare R² values
            between models with different dependent variable transformations (e.g. Raw Y vs. ln(Y)). The R² of ln(Y)
            measures variance explained on the logarithmic scale, not on the original physical scale!
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-3 bg-neutral-100/80 border border-neutral-200 rounded-lg text-xs text-neutral-700 flex items-center gap-2">
        <ArrowRight size={14} className="text-teal-700" />
        <span>
          Switch to the <strong>PK Studio</strong> tab to apply log-linear regression to pharmacokinetic
          concentration-time data and derive k, t½, Vd, and CL from the fitted slope and intercept.
        </span>
      </div>
    </div>
  );
};

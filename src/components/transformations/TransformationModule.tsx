import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Binary, Scale } from 'lucide-react';
import { DataPoint, TransformType } from '../../types';
import { calculateSimpleLinearRegression } from '../../lib/statistics/linearRegression';
import { transformDataset } from '../../lib/statistics/transformations';
import { formatNumber } from '../../lib/statistics/formatting';
import { InteractiveScatterPlot } from '../charts/InteractiveScatterPlot';
import { MathFormula } from '../common/MathFormula';

interface TransformationModuleProps {
  data: DataPoint[];
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
}

export const TransformationModule: React.FC<TransformationModuleProps> = ({
  data,
  xLabel = 'X',
  yLabel = 'Y',
  xUnit = '',
  yUnit = '',
}) => {
  const [transformY, setTransformY] = useState<TransformType>('ln');
  const [transformX, setTransformX] = useState<TransformType>('none');

  // Fit raw data
  const rawRegression = useMemo(() => calculateSimpleLinearRegression(data), [data]);

  // Fit transformed data
  const transformResult = useMemo(
    () => transformDataset(data, transformX, transformY),
    [data, transformX, transformY]
  );

  const transformedRegression = useMemo(() => {
    if (transformResult.status === 'error') return null;
    return calculateSimpleLinearRegression(transformResult.transformedPoints);
  }, [transformResult]);

  // Model comparison metrics
  const comparisonModels = useMemo(() => {
    const models: {
      name: string;
      transform: TransformType;
      r2: number | null;
      rmse: number | null;
      equation: string;
      backTransformed?: string;
      error?: string;
    }[] = [];

    // Raw
    if (rawRegression.status === 'success') {
      const b = rawRegression.stats.slope;
      const a = rawRegression.stats.intercept;
      models.push({
        name: 'Linear (No Transform)',
        transform: 'none',
        r2: rawRegression.stats.rSquared,
        rmse: rawRegression.stats.rmse,
        equation: `Y = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}X`,
      });
    }

    // Natural log ln(Y)
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
          rmse: reg.stats.rmse,
          equation: `ln(Y) = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}X`,
          backTransformed: `Y = ${formatNumber(Math.exp(a), 3)} · e^(${formatNumber(b, 3)}X)`,
        });
      }
    } else {
      models.push({
        name: 'Log-Linear: ln(Y)',
        transform: 'ln',
        r2: null,
        rmse: null,
        equation: 'Cannot fit',
        error: 'Requires Y > 0',
      });
    }

    // Base-10 log log10(Y)
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
          rmse: reg.stats.rmse,
          equation: `log₁₀(Y) = ${formatNumber(a, 3)} ${b >= 0 ? '+' : '-'} ${formatNumber(Math.abs(b), 3)}X`,
          backTransformed: `Y = ${formatNumber(Math.pow(10, a), 3)} · 10^(${formatNumber(b, 3)}X)`,
        });
      }
    } else {
      models.push({
        name: 'Log-Linear: log10(Y)',
        transform: 'log10',
        r2: null,
        rmse: null,
        equation: 'Cannot fit',
        error: 'Requires Y > 0',
      });
    }

    return models;
  }, [data, rawRegression]);

  // Dynamic back-transformed formula for the current active selection
  const backTransformedEquation = useMemo(() => {
    if (
      transformedRegression?.status !== 'success' ||
      (transformY === 'none' && transformX === 'none')
    ) {
      return null;
    }

    const b = transformedRegression.stats.slope;
    const a = transformedRegression.stats.intercept;

    if (transformY === 'ln' && transformX === 'none') {
      const scaleA = Math.exp(a);
      return {
        plain: `Y = ${formatNumber(scaleA, 3)} · e^(${formatNumber(b, 3)}X)`,
        latex: `Y = ${formatNumber(scaleA, 3)} \\cdot e^{${formatNumber(b, 3)}X}`,
      };
    }

    if (transformY === 'log10' && transformX === 'none') {
      const scaleA = Math.pow(10, a);
      return {
        plain: `Y = ${formatNumber(scaleA, 3)} · 10^(${formatNumber(b, 3)}X)`,
        latex: `Y = ${formatNumber(scaleA, 3)} \\cdot 10^{${formatNumber(b, 3)}X}`,
      };
    }

    return null;
  }, [transformedRegression, transformX, transformY]);

  return (
    <div className="space-y-4">
      {/* Transformation Selector Bar */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
              <Binary size={16} className="text-teal-700" />
              <span>Variable Transformation Studio</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Transform non-linear curves into linear equations to fit OLS regression.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <label className="font-medium text-neutral-700">Transform Y:</label>
              <select
                value={transformY}
                onChange={(e) => setTransformY(e.target.value as TransformType)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-medium text-teal-900 focus:ring-1 focus:ring-teal-500"
              >
                <option value="none">None (Raw Y)</option>
                <option value="ln">Natural Log: ln(Y)</option>
                <option value="log10">Common Log: log₁₀(Y)</option>
                <option value="sqrt">Square Root: √Y</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-medium text-neutral-700">Transform X:</label>
              <select
                value={transformX}
                onChange={(e) => setTransformX(e.target.value as TransformType)}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
              >
                <option value="none">None (Raw X)</option>
                <option value="ln">ln(X)</option>
                <option value="log10">log₁₀(X)</option>
                <option value="sqrt">√X</option>
              </select>
            </div>
          </div>
        </div>

        {/* Domain Constraint Error Banner */}
        {transformResult.status === 'error' && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Mathematical Domain Restriction</span>
              <p className="leading-relaxed">{transformResult.message}</p>
              <div className="mt-1 text-rose-800 font-mono text-[11px]">
                Offending sample values: [{transformResult.invalidValues.join(', ')}]
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Before / After Side-by-Side Plots */}
      {transformResult.status === 'success' &&
        rawRegression.status === 'success' &&
        transformedRegression?.status === 'success' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Before: Raw Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-neutral-800">1. Original Scale Data</span>
                <span className="text-neutral-500 font-mono">
                  R² = {formatNumber(rawRegression.stats.rSquared, 3)}
                </span>
              </div>
              <InteractiveScatterPlot
                stats={rawRegression.stats}
                xLabel={xLabel}
                yLabel={yLabel}
                xUnit={xUnit}
                yUnit={yUnit}
                height={320}
              />
            </div>

            {/* After: Transformed Data */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-teal-900">
                  2. Transformed Scale ({transformY !== 'none' ? `${transformY}(${yLabel})` : yLabel})
                </span>
                <span className="text-teal-700 font-mono font-bold">
                  R² = {formatNumber(transformedRegression.stats.rSquared, 3)}
                </span>
              </div>
              <InteractiveScatterPlot
                stats={transformedRegression.stats}
                xLabel={transformX !== 'none' ? `${transformX}(${xLabel})` : xLabel}
                yLabel={transformY !== 'none' ? `${transformY}(${yLabel})` : yLabel}
                height={320}
              />
            </div>
          </div>
        )}

      {/* Back-Transformed Equation Card */}
      {backTransformedEquation && (
        <div className="bg-gradient-to-r from-teal-900 to-neutral-900 text-white p-4 rounded-xl shadow-xs">
          <div className="text-[11px] font-medium text-teal-300 uppercase tracking-wider mb-1">
            Fitted Transformed Model & Back-Transformed Prediction
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="bg-white/10 p-3 rounded-lg border border-white/10 font-mono">
              <div className="text-[11px] text-teal-200 mb-1">Transformed Linear Equation:</div>
              <div className="text-sm font-bold text-white">
                {transformY}(Y) = {formatNumber(transformedRegression?.status === 'success' ? transformedRegression.stats.intercept : 0, 3)}{' '}
                {(transformedRegression?.status === 'success' ? transformedRegression.stats.slope : 0) >= 0 ? '+' : '-'}{' '}
                {formatNumber(Math.abs(transformedRegression?.status === 'success' ? transformedRegression.stats.slope : 0), 3)}X
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-lg border border-teal-500/30 font-mono">
              <div className="text-[11px] text-teal-200 mb-1">Back-Transformed Natural Model:</div>
              <div className="text-sm font-bold text-emerald-300">
                <MathFormula math={backTransformedEquation.latex} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Comparison Table */}
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
                <th className="py-2.5 px-3 text-right">RMSE (Fitted Scale)</th>
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
                    {m.rmse !== null ? formatNumber(m.rmse, 3) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Educational note on R² comparison */}
        <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Important Statistical Note on R² Comparison:</strong> Do <em>not</em> directly compare R² values
            between models with different dependent variable transformations (e.g. Raw Y vs. ln(Y)). The R² of ln(Y)
            measures variance explained on the logarithmic scale, not on the original physical scale!
          </p>
        </div>
      </div>
    </div>
  );
};

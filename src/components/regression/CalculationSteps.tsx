import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, ListOrdered } from 'lucide-react';
import { RegressionStatistics } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';
import { MathFormula } from '../common/MathFormula';

interface CalculationStepsProps {
  stats: RegressionStatistics;
  xLabel?: string;
  yLabel?: string;
  decimals?: number;
}

export const CalculationSteps: React.FC<CalculationStepsProps> = ({
  stats,
  xLabel = 'X',
  yLabel = 'Y',
  decimals = 3,
}) => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      step: 1,
      title: 'Raw Data Pairs',
      desc: `We start with n = ${stats.n} paired observations.`,
      formula: `\\{(x_1, y_1), (x_2, y_2), \\dots, (x_n, y_n)\\}`,
      result: `Sample size n = ${stats.n}`,
    },
    {
      step: 2,
      title: 'Calculate Centroid Means (x̄ and ȳ)',
      desc: 'Sum each variable and divide by sample size n. The regression line is mathematically guaranteed to pass through this centroid point (x̄, ȳ).',
      formula: `\\bar{x} = \\frac{\\sum x_i}{n} = \\frac{${formatNumber(stats.sumX, 2)}}{${stats.n}} = ${formatNumber(stats.meanX, decimals)}, \\quad \\bar{y} = \\frac{\\sum y_i}{n} = \\frac{${formatNumber(stats.sumY, 2)}}{${stats.n}} = ${formatNumber(stats.meanY, decimals)}`,
      result: `Centroid: (${formatNumber(stats.meanX, decimals)}, ${formatNumber(stats.meanY, decimals)})`,
    },
    {
      step: 3,
      title: 'Calculate Deviations from Means',
      desc: 'Subtract the mean from each observation. Positive deviations mean above average; negative deviations mean below average.',
      formula: `d_{x_i} = (x_i - \\bar{x}), \\quad d_{y_i} = (y_i - \\bar{y})`,
      result: `Note: \\sum (x_i - \\bar{x}) \\equiv 0 \\text{ and } \\sum (y_i - \\bar{y}) \\equiv 0`,
    },
    {
      step: 4,
      title: 'Calculate Cross-Products of Deviations',
      desc: 'Multiply each X-deviation by its paired Y-deviation. When both X and Y are above their means (or both below), the product is positive, indicating a positive relationship.',
      formula: `p_i = (x_i - \\bar{x})(y_i - \\bar{y})`,
      result: 'Calculated for every observation row in the table below.',
    },
    {
      step: 5,
      title: 'Calculate Squared X Deviations',
      desc: 'Square each X-deviation to measure the horizontal variance in the independent variable.',
      formula: `(x_i - \\bar{x})^2`,
      result: 'Calculated for every observation row in the table below.',
    },
    {
      step: 6,
      title: 'Sum Cross-Products (Sxy)',
      desc: 'The numerator of the slope equation: covariance sum.',
      formula: `S_{xy} = \\sum_{i=1}^n (x_i - \\bar{x})(y_i - \\bar{y}) = ${formatNumber(stats.sxy, decimals)}`,
      result: `S_{xy} = ${formatNumber(stats.sxy, decimals)}`,
    },
    {
      step: 7,
      title: 'Sum Squared X Deviations (Sxx)',
      desc: 'The denominator of the slope equation: sum of squares for X.',
      formula: `S_{xx} = \\sum_{i=1}^n (x_i - \\bar{x})^2 = ${formatNumber(stats.sxx, decimals)}`,
      result: `S_{xx} = ${formatNumber(stats.sxx, decimals)}`,
    },
    {
      step: 8,
      title: 'Solve for the Slope (b)',
      desc: 'Divide covariance sum Sxy by variance sum Sxx. This minimizes the sum of squared vertical errors.',
      formula: `b = \\frac{S_{xy}}{S_{xx}} = \\frac{${formatNumber(stats.sxy, decimals)}}{${formatNumber(stats.sxx, decimals)}} = ${formatNumber(stats.slope, decimals)}`,
      result: `Slope b = ${formatNumber(stats.slope, decimals)}`,
    },
    {
      step: 9,
      title: 'Solve for the Intercept (a)',
      desc: 'Using the point (x̄, ȳ) that lies on the line: ȳ = a + b(x̄) => a = ȳ - b(x̄).',
      formula: `a = \\bar{y} - b\\bar{x} = ${formatNumber(stats.meanY, decimals)} - (${formatNumber(stats.slope, decimals)})(${formatNumber(stats.meanX, decimals)}) = ${formatNumber(stats.intercept, decimals)}`,
      result: `Intercept a = ${formatNumber(stats.intercept, decimals)}`,
    },
    {
      step: 10,
      title: 'Formulate the Regression Equation & R²',
      desc: 'Assemble the final predictive model and evaluate how well it explains the total variation in Y.',
      formula: `\\hat{Y} = ${formatNumber(stats.intercept, decimals)} ${stats.slope >= 0 ? '+' : '-'} ${formatNumber(Math.abs(stats.slope), decimals)}X, \\quad R^2 = 1 - \\frac{SSE}{SST} = 1 - \\frac{${formatNumber(stats.sse, decimals)}}{${formatNumber(stats.sst, decimals)}} = ${formatNumber(stats.rSquared, decimals)}`,
      result: `Equation: Ŷ = ${formatNumber(stats.intercept, decimals)} ${stats.slope >= 0 ? '+' : '-'} ${formatNumber(Math.abs(stats.slope), decimals)}X (R² = ${(stats.rSquared * 100).toFixed(1)}%)`,
    },
    {
      step: 11,
      title: 'Residual Standard Error & Inferential Statistics (Phase 2)',
      desc: `The residual standard error s = √(SSE/(n-2)) estimates the typical spread of residuals. ` +
            `It is used to compute the standard errors of the slope and intercept, which in turn yield ` +
            `t-statistics, confidence intervals, and p-values for hypothesis testing. ` +
            `For OLS with intercept and n > 2, degrees of freedom df = n - 2 = ${stats.n - 2}.`,
      formula:
        `s = \\sqrt{\\frac{SSE}{n-2}} = \\sqrt{\\frac{${formatNumber(stats.sse, decimals)}}{${stats.n - 2}}} = ${formatNumber(stats.residualStandardError ?? stats.rmse, decimals)} \\\\[6pt] ` +
        `SE(b) = \\frac{s}{\\sqrt{S_{xx}}} = ${formatNumber(stats.seSlope, decimals)}, \\quad ` +
        `SE(a) = s\\sqrt{\\tfrac{1}{n} + \\tfrac{\\bar{x}^2}{S_{xx}}} = ${formatNumber(stats.seIntercept, decimals)} \\\\[6pt] ` +
        `t_b = \\frac{b}{SE(b)} = ${formatNumber(stats.tStatSlope, decimals)}, \\quad ` +
        `t_a = \\frac{a}{SE(a)} = ${formatNumber(stats.tStatIntercept, decimals)}`,
      result:
        `s = ${formatNumber(stats.residualStandardError ?? stats.rmse, decimals)}  |  ` +
        `df = ${stats.n - 2}  |  ` +
        `t(b) = ${formatNumber(stats.tStatSlope, decimals)}` +
        (stats.pValueSlope !== undefined && !isNaN(stats.pValueSlope)
          ? `  |  p(b) = ${stats.pValueSlope < 0.001 ? '< 0.001' : stats.pValueSlope.toFixed(4)}`
          : ''),
    },
  ];

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-teal-700" />
          <h3 className="font-semibold text-neutral-900 text-sm">
            Step-by-Step Derivation & Full Calculation Table
          </h3>
        </div>
        <span className="text-xs text-neutral-500">11 Sequential OLS Steps</span>
      </div>

      {/* Sequential Accordion Steps */}
      <div className="space-y-2">
        {steps.map((s) => {
          const isExpanded = activeStep === s.step;
          return (
            <div
              key={`step-${s.step}`}
              className={`border rounded-lg transition-all ${
                isExpanded ? 'border-teal-500 bg-teal-50/20' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveStep(isExpanded ? null : s.step)}
                className="w-full text-left p-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-mono font-bold flex items-center justify-center text-[10px]">
                    {s.step}
                  </span>
                  <span className="font-semibold text-neutral-900">{s.title}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
                  <span>{s.result}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3 text-xs text-neutral-700 border-t border-teal-100 pt-2 space-y-2">
                  <p className="leading-relaxed text-neutral-600">{s.desc}</p>
                  <div className="bg-white border border-neutral-200 rounded p-2.5 overflow-x-auto text-center">
                    <MathFormula math={s.formula} block />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Step-by-Step Calculation Table */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-800">
            Observation-Level Intermediate Deviations
          </span>
          <span className="text-[11px] text-neutral-500">
            Scroll horizontally to view all terms
          </span>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2 px-2 text-center text-neutral-400">#</th>
                <th className="py-2 px-2.5 text-right">{xLabel}</th>
                <th className="py-2 px-2.5 text-right">{yLabel}</th>
                <th className="py-2 px-2.5 text-right">X - X̄</th>
                <th className="py-2 px-2.5 text-right">Y - Ȳ</th>
                <th className="py-2 px-2.5 text-right">(X - X̄)²</th>
                <th className="py-2 px-2.5 text-right">(Y - Ȳ)²</th>
                <th className="py-2 px-2.5 text-right">(X-X̄)(Y-Ȳ)</th>
                <th className="py-2 px-2.5 text-right text-teal-800 font-bold">Ŷ (Fit)</th>
                <th className="py-2 px-2.5 text-right text-amber-800 font-bold">Residual (e)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stats.rows.map((r, idx) => (
                <tr key={`calc-row-${r.id}`} className="hover:bg-neutral-50/70">
                  <td className="py-1.5 px-2 text-center text-neutral-400">{idx + 1}</td>
                  <td className="py-1.5 px-2.5 text-right">{formatNumber(r.x, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right">{formatNumber(r.y, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(r.xDev, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(r.yDev, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(r.xDevSq, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-neutral-600">{formatNumber(r.yDevSq, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right font-medium text-neutral-900">{formatNumber(r.prodDev, decimals)}</td>
                  <td className="py-1.5 px-2.5 text-right text-teal-700 font-medium">{formatNumber(r.predicted, decimals)}</td>
                  <td
                    className={`py-1.5 px-2.5 text-right font-medium ${
                      r.residual >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {r.residual >= 0 ? '+' : ''}
                    {formatNumber(r.residual, decimals)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-100/90 font-bold text-neutral-900 border-t-2 border-neutral-300 text-[11px]">
              <tr>
                <td className="py-2 px-2 text-center text-neutral-500">Σ</td>
                <td className="py-2 px-2.5 text-right">{formatNumber(stats.sumX, decimals)}</td>
                <td className="py-2 px-2.5 text-right">{formatNumber(stats.sumY, decimals)}</td>
                <td className="py-2 px-2.5 text-right text-neutral-400">0.000</td>
                <td className="py-2 px-2.5 text-right text-neutral-400">0.000</td>
                <td className="py-2 px-2.5 text-right text-teal-800">Sxx={formatNumber(stats.sxx, decimals)}</td>
                <td className="py-2 px-2.5 text-right text-teal-800">Syy={formatNumber(stats.syy, decimals)}</td>
                <td className="py-2 px-2.5 text-right text-teal-800">Sxy={formatNumber(stats.sxy, decimals)}</td>
                <td className="py-2 px-2.5 text-right text-neutral-500">—</td>
                <td className="py-2 px-2.5 text-right text-amber-800">SSE={formatNumber(stats.sse, decimals)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { RegressionStatistics } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';
import { predictY } from '../../lib/statistics/linearRegression';
import { TooltipTerm } from '../common/TooltipTerm';

interface RegressionSummaryProps {
  stats: RegressionStatistics;
  xLabel?: string;
  yLabel?: string;
  decimals?: number;
}

export const RegressionSummary: React.FC<RegressionSummaryProps> = ({
  stats,
  xLabel = 'X',
  yLabel = 'Y',
  decimals = 3,
}) => {
  const [predictInputX, setPredictInputX] = useState<string>('');

  const bSign = stats.slope >= 0 ? '+' : '-';
  const bAbs = formatNumber(Math.abs(stats.slope), decimals);
  const aStr = formatNumber(stats.intercept, decimals);

  // Prediction calculator
  const parsedX = parseFloat(predictInputX);
  const prediction =
    !isNaN(parsedX) && isFinite(parsedX)
      ? predictY(parsedX, stats, stats.confidenceLevel || 0.95)
      : null;

  return (
    <div className="space-y-3">
      {/* Primary Equation Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium text-teal-200 uppercase tracking-wider">
              Fitted Ordinary Least Squares Equation
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-0.5 text-white">
              {yLabel} = {aStr} {bSign} {bAbs}·{xLabel}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-teal-700/60 border border-teal-500/40 text-teal-100 text-xs px-2.5 py-1 rounded-full font-mono font-medium">
              n = {stats.n} observations
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Key Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Slope card */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <TooltipTerm term="Slope">Slope (b)</TooltipTerm>
            <span className="text-[10px] text-neutral-400 font-mono">ΔY/ΔX</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900">
            {formatNumber(stats.slope, decimals)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1 truncate" title={`95% CI: [${formatNumber(stats.ciSlope[0], decimals)}, ${formatNumber(stats.ciSlope[1], decimals)}]`}>
            95% CI: [{formatNumber(stats.ciSlope[0], 2)}, {formatNumber(stats.ciSlope[1], 2)}]
          </div>
        </div>

        {/* Intercept card */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <TooltipTerm term="Intercept">Intercept (a)</TooltipTerm>
            <span className="text-[10px] text-neutral-400 font-mono">X=0</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900">
            {formatNumber(stats.intercept, decimals)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1 truncate" title={`95% CI: [${formatNumber(stats.ciIntercept[0], decimals)}, ${formatNumber(stats.ciIntercept[1], decimals)}]`}>
            95% CI: [{formatNumber(stats.ciIntercept[0], 2)}, {formatNumber(stats.ciIntercept[1], 2)}]
          </div>
        </div>

        {/* R² Card */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <TooltipTerm term="R²">R² (Variance)</TooltipTerm>
            <span className="text-[10px] text-neutral-400 font-mono">Fit</span>
          </div>
          <div className="text-lg font-bold font-mono text-teal-700">
            {formatNumber(stats.rSquared, decimals)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            {(stats.rSquared * 100).toFixed(1)}% explained
          </div>
        </div>

        {/* Pearson r / RMSE */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <TooltipTerm term="RMSE">RMSE</TooltipTerm>
            <span className="text-[10px] text-neutral-400 font-mono">Error</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-900">
            {formatNumber(stats.rmse, decimals)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            r = {formatNumber(stats.r, decimals)}
          </div>
        </div>
      </div>

      {/* Interactive Predictor Widget */}
      <div className="bg-neutral-50/90 border border-neutral-200/70 rounded-xl p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-800 mb-2">
          <Calculator size={14} className="text-teal-700" />
          <span>Interactive Prediction Calculator</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="predict-x-input" className="text-neutral-600">Enter {xLabel}:</label>
            <input
              id="predict-x-input"
              type="number"
              step="any"
              placeholder={`e.g. ${formatNumber(stats.meanX, 1)}`}
              value={predictInputX}
              onChange={(e) => setPredictInputX(e.target.value)}
              className="w-28 px-2 py-1 bg-white border border-neutral-300 rounded font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {prediction && (
            <div className="flex flex-wrap items-center gap-4 bg-white border border-teal-200 rounded-lg px-3 py-1.5 shadow-2xs">
              <div>
                <span className="text-neutral-500 text-[11px] block">Expected Ŷ:</span>
                <span className="font-mono font-bold text-teal-800 text-sm">
                  {formatNumber(prediction.predicted, decimals)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[11px] block">95% Mean CI:</span>
                <span className="font-mono text-neutral-700 text-[11px]">
                  [{formatNumber(prediction.ciLower, 2)}, {formatNumber(prediction.ciUpper, 2)}]
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[11px] block">95% Prediction Interval:</span>
                <span className="font-mono text-neutral-700 text-[11px]">
                  [{formatNumber(prediction.piLower, 2)}, {formatNumber(prediction.piUpper, 2)}]
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

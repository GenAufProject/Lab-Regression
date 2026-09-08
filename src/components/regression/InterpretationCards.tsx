import React from 'react';
import { AlertTriangle, Compass, Info, Lightbulb, TrendingUp } from 'lucide-react';
import { RegressionStatistics } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';
import { analyzeResiduals } from '../../lib/statistics/residuals';

interface InterpretationCardsProps {
  stats: RegressionStatistics;
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
}

export const InterpretationCards: React.FC<InterpretationCardsProps> = ({
  stats,
  xLabel = 'X',
  yLabel = 'Y',
  xUnit = '',
  yUnit = '',
}) => {
  const slope = stats.slope;
  const intercept = stats.intercept;
  const r2 = stats.rSquared;
  const residualsAnalysis = analyzeResiduals(stats);

  const xUnitStr = xUnit ? ` ${xUnit}` : '';
  const yUnitStr = yUnit ? ` ${yUnit}` : '';

  return (
    <div className="space-y-3 text-xs">
      {/* Slope Interpretation Card */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 mb-1.5">
          <TrendingUp size={15} className="text-teal-700" />
          <span>Interpreting the Slope (b = {formatNumber(slope, 3)})</span>
        </div>
        <p className="text-neutral-700 leading-relaxed">
          The slope describes the expected change in <strong>{yLabel}</strong> for every one-unit increase in{' '}
          <strong>{xLabel}</strong>.
        </p>
        <div className="mt-2 p-2.5 bg-teal-50/70 border border-teal-200/60 rounded-lg text-teal-950 font-medium leading-relaxed">
          {slope > 0 ? (
            <span>
              Your slope is <strong>+{formatNumber(slope, 3)}</strong>. This means for every 1{xUnitStr} increase in{' '}
              {xLabel}, {yLabel} is expected to <strong>increase by approximately {formatNumber(slope, 3)}{yUnitStr}</strong>.
            </span>
          ) : slope < 0 ? (
            <span>
              Your slope is <strong>{formatNumber(slope, 3)}</strong>. This means for every 1{xUnitStr} increase in{' '}
              {xLabel}, {yLabel} is expected to <strong>decrease by approximately {formatNumber(Math.abs(slope), 3)}{yUnitStr}</strong>.
            </span>
          ) : (
            <span>
              Your slope is <strong>0.000</strong>. The fitted line is horizontal, meaning changes in {xLabel} do not
              predict any linear shift in {yLabel}.
            </span>
          )}
        </div>
      </div>

      {/* Intercept Interpretation Card */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 mb-1.5">
          <Compass size={15} className="text-teal-700" />
          <span>Interpreting the Intercept (a = {formatNumber(intercept, 3)})</span>
        </div>
        <p className="text-neutral-700 leading-relaxed">
          The intercept is the model’s predicted value of <strong>{yLabel}</strong> when{' '}
          <strong>{xLabel} is exactly zero</strong>.
        </p>
        <div className="mt-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 leading-relaxed">
          <span>
            When {xLabel} = 0{xUnitStr}, the predicted {yLabel} is <strong>{formatNumber(intercept, 3)}{yUnitStr}</strong>.
          </span>
          <span className="block mt-1 text-neutral-500 text-[11px]">
            <em>Scientific Note:</em> The intercept is not always physically meaningful, especially if zero lies far
            outside the range of your observed data (e.g., human adult weight = 0). Avoid treating it as a real physical
            quantity unless zero has direct operational meaning (such as Time = 0 in IV bolus pharmacokinetics).
          </span>
        </div>
      </div>

      {/* R² Interpretation Card */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 mb-1.5">
          <Lightbulb size={15} className="text-teal-700" />
          <span>Interpreting R² ({formatNumber(r2, 3)} / {(r2 * 100).toFixed(1)}%)</span>
        </div>
        <p className="text-neutral-700 leading-relaxed">
          R² describes the proportion of total variability in <strong>{yLabel}</strong> explained by the fitted linear model
          on <strong>{xLabel}</strong>.
        </p>
        <div className="mt-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 leading-relaxed">
          <span>
            Approximately <strong>{(r2 * 100).toFixed(1)}%</strong> of the variance in {yLabel} is accounted for by
            this linear relationship with {xLabel}. The remaining <strong>{(100 - r2 * 100).toFixed(1)}%</strong> resides in
            unexplained residual scatter.
          </span>
        </div>

        {/* Warning callout */}
        <div className="mt-2.5 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
          <AlertTriangle size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Critical Caution:</strong> A high R² does <em>not</em> by itself prove that the model is appropriate,
            nor that the true relationship is linear, nor that X causes Y! Non-linear curves can artificially produce high R²
            when forced into a straight line. Always examine the residual plot.
          </p>
        </div>
      </div>

      {/* Residual Diagnostics Finding Callouts */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 mb-2">
          <Info size={15} className="text-teal-700" />
          <span>Educational Residual Insights</span>
        </div>
        <div className="space-y-2">
          {residualsAnalysis.findings.map((f) => (
            <div
              key={f.id}
              className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                f.type === 'caution'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-teal-50/50 border-teal-200/80 text-teal-950'
              }`}
            >
              <div className="font-semibold mb-0.5">{f.title}</div>
              <div className="text-neutral-700 mb-1">{f.description}</div>
              <div className="text-[11px] opacity-80 font-medium italic">
                Tip: {f.pedagogicalTip}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Correlation vs Regression Callout */}
      <div className="p-3 bg-neutral-100/80 border border-neutral-200 rounded-lg text-neutral-700 text-xs">
        <span className="font-semibold text-neutral-900 block mb-1">
          Correlation vs. Regression Distinction
        </span>
        <p className="leading-relaxed text-neutral-600">
          <strong>Correlation</strong> describes the symmetric strength and direction of linear association between two
          variables. <strong>Regression</strong> establishes a directional mathematical formula for prediction and rate of change.
          Neither alone establishes causation without experimental control.
        </p>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Dna, Play, RefreshCw, Sliders, Zap } from 'lucide-react';
import { DataPoint } from '../../types';
import { calculateSimpleLinearRegression } from '../../lib/statistics/linearRegression';
import { formatNumber } from '../../lib/statistics/formatting';
import { InteractiveScatterPlot } from '../charts/InteractiveScatterPlot';

/**
 * Deterministic pseudo-random number generator (LCG)
 * Ensures reproducible simulations without flaky state.
 */
function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Standard normal random variable using Box-Muller transform
 */
function randomNormal(rand: () => number, mean = 0, stdDev = 1): number {
  const u1 = Math.max(1e-7, rand());
  const u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

export const RegressionPlayground: React.FC = () => {
  const [trueSlope, setTrueSlope] = useState<number>(1.5);
  const [trueIntercept, setTrueIntercept] = useState<number>(2.0);
  const [noiseStd, setNoiseStd] = useState<number>(2.0);
  const [sampleSize, setSampleSize] = useState<number>(30);
  const [seed, setSeed] = useState<number>(42);
  const [includeOutlier, setIncludeOutlier] = useState<boolean>(false);

  // Generate synthetic sample points based on parameters
  const { generatedPoints, cleanPoints, outlierPoint } = useMemo(() => {
    const rand = pseudoRandom(seed);
    const points: DataPoint[] = [];

    // X points spaced evenly across [0, 10] with slight jitter
    for (let i = 0; i < sampleSize; i++) {
      const baseX = (i / (sampleSize - 1)) * 10;
      const x = Math.max(0, baseX + (rand() - 0.5) * 0.4);
      const epsilon = randomNormal(rand, 0, noiseStd);
      const y = trueIntercept + trueSlope * x + epsilon;
      points.push({
        id: `sim-${i + 1}`,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      });
    }

    const clean = [...points];
    let outlier: DataPoint | undefined;

    if (includeOutlier) {
      // High leverage, large negative residual outlier
      const outlierX = 9.5;
      const trueYAtX = trueIntercept + trueSlope * outlierX;
      const outlierY = trueYAtX - noiseStd * 3.5 - 8.0;
      outlier = {
        id: 'outlier-pt',
        x: Number(outlierX.toFixed(2)),
        y: Number(outlierY.toFixed(2)),
      };
      points.push(outlier);
    }

    return {
      generatedPoints: points,
      cleanPoints: clean,
      outlierPoint: outlier,
    };
  }, [trueSlope, trueIntercept, noiseStd, sampleSize, seed, includeOutlier]);

  // Fit OLS on current points
  const regressionWithCurrent = useMemo(
    () => calculateSimpleLinearRegression(generatedPoints),
    [generatedPoints]
  );

  // Fit OLS on clean points (without outlier) for comparison
  const regressionClean = useMemo(
    () => calculateSimpleLinearRegression(cleanPoints),
    [cleanPoints]
  );

  const stats = regressionWithCurrent.status === 'success' ? regressionWithCurrent.stats : null;
  const cleanStats = regressionClean.status === 'success' ? regressionClean.stats : null;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
              <Sliders size={16} className="text-teal-700" />
              <span>Interactive Regression Simulator</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Simulate true underlying parameters, add noise, and observe how sampling variability and outliers affect OLS estimates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSeed(Math.floor(Math.random() * 10000))}
            className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            <span>Resample (New Random Seed)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Controls Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs space-y-4 text-xs">
          <div className="font-semibold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center gap-1.5">
            <Sliders size={14} className="text-teal-700" />
            <span>Simulation Parameters</span>
          </div>

          {/* True Slope */}
          <div>
            <div className="flex justify-between text-neutral-700 mb-1">
              <span>True Slope (β₁):</span>
              <span className="font-mono font-bold text-teal-800">{trueSlope.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-4"
              max="4"
              step="0.1"
              value={trueSlope}
              onChange={(e) => setTrueSlope(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* True Intercept */}
          <div>
            <div className="flex justify-between text-neutral-700 mb-1">
              <span>True Intercept (β₀):</span>
              <span className="font-mono font-bold text-teal-800">{trueIntercept.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-8"
              max="10"
              step="0.5"
              value={trueIntercept}
              onChange={(e) => setTrueIntercept(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Noise Standard Deviation */}
          <div>
            <div className="flex justify-between text-neutral-700 mb-1">
              <span>Noise Dispersion (σ):</span>
              <span className="font-mono font-bold text-amber-800">{noiseStd.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.2"
              value={noiseStd}
              onChange={(e) => setNoiseStd(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Normal random error added to each observation: ε ~ N(0, σ²)
            </p>
          </div>

          {/* Sample Size */}
          <div>
            <div className="flex justify-between text-neutral-700 mb-1">
              <span>Sample Size (n):</span>
              <span className="font-mono font-bold text-neutral-900">{sampleSize} points</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Outlier Toggle */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="flex items-center gap-2 cursor-pointer p-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-950 font-medium">
              <input
                type="checkbox"
                checked={includeOutlier}
                onChange={(e) => setIncludeOutlier(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Inject Influential Outlier Point</span>
            </label>
            <p className="text-[11px] text-neutral-500 mt-1 px-1">
              Inserts an extreme leverage point to observe how single observations distort the fitted line and R².
            </p>
          </div>

          {/* Preset scenarios */}
          <div className="pt-2 border-t border-neutral-100 space-y-1.5">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Quick Scenarios:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTrueSlope(1.8);
                  setTrueIntercept(1.0);
                  setNoiseStd(0.4);
                  setIncludeOutlier(false);
                }}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px]"
              >
                Near-Perfect Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrueSlope(0.5);
                  setTrueIntercept(4.0);
                  setNoiseStd(4.5);
                  setIncludeOutlier(false);
                }}
                className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px]"
              >
                High Noise
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrueSlope(2.0);
                  setTrueIntercept(0.0);
                  setNoiseStd(1.2);
                  setIncludeOutlier(true);
                }}
                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded text-[11px]"
              >
                Influential Outlier
              </button>
            </div>
          </div>
        </div>

        {/* Chart and Comparison (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {stats && (
            <InteractiveScatterPlot
              stats={stats}
              xLabel="Simulated X"
              yLabel="Simulated Y"
              trueLine={{
                slope: trueSlope,
                intercept: trueIntercept,
                label: `True Model: Y = ${trueIntercept} + ${trueSlope}X`,
              }}
              outlierPointId={outlierPoint?.id}
              height={380}
            />
          )}

          {/* Comparison Table: True vs Sample Estimate */}
          {stats && (
            <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-900 text-xs">
                  Parameter Estimation Accuracy
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  n = {stats.n} | σ = {noiseStd.toFixed(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Slope (b):</span>
                  <div className="font-mono font-bold text-teal-800 text-sm">
                    {formatNumber(stats.slope, 3)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    True: {trueSlope.toFixed(2)} (Δ {formatNumber(stats.slope - trueSlope, 2)})
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Intercept (a):</span>
                  <div className="font-mono font-bold text-teal-800 text-sm">
                    {formatNumber(stats.intercept, 3)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    True: {trueIntercept.toFixed(2)} (Δ {formatNumber(stats.intercept - trueIntercept, 2)})
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Sample R²:</span>
                  <div className="font-mono font-bold text-neutral-900 text-sm">
                    {formatNumber(stats.rSquared, 3)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {(stats.rSquared * 100).toFixed(1)}% variance
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Residual Std. Error (s):</span>
                  <div className="font-mono font-bold text-neutral-900 text-sm">
                    {formatNumber(stats.residualStandardError ?? stats.rmse, 3)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Target σ: {noiseStd.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Outlier Impact Comparison Callout */}
              {includeOutlier && cleanStats && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                    <AlertTriangle size={14} className="text-amber-700" />
                    <span>Outlier Impact Comparison</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-amber-950 mt-2">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Slope without:</span>
                      <span className="font-semibold">{formatNumber(cleanStats.slope, 3)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Slope with outlier:</span>
                      <span className="font-semibold text-rose-700">{formatNumber(stats.slope, 3)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">R² without:</span>
                      <span className="font-semibold">{formatNumber(cleanStats.rSquared, 3)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">R² with outlier:</span>
                      <span className="font-semibold text-rose-700">{formatNumber(stats.rSquared, 3)}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-amber-900 leading-relaxed">
                    Notice how a single influential observation severely lowers the slope and collapses R². This illustrates
                    why least squares is sensitive to extreme values.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

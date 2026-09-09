import React, { useId, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { LogRegressionResult } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';
import { backTransformPrediction } from '../../lib/statistics/transformations';

interface LogRegressionChartProps {
  result: LogRegressionResult;
  /** Which scale to render: 'original' draws the exponential curve; 'transformed' draws the linear fit. */
  scaleMode: 'original' | 'transformed';
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
  height?: number;
}

/**
 * Phase 3 — Dual-view scatter plot for log-linear regression (spec §14, §15).
 *
 * Two rendering modes:
 *
 * 1. **Original scale** — plots raw (x, y) points and the back-transformed
 *    regression curve ŷ = backTransform(a + b·x). This produces an
 *    exponential curve, NOT a straight line. The UI label explicitly says
 *    "Original scale" to avoid the spec §14 trap of "misleadingly drawing
 *    a straight line on the original scale for a log-linear model."
 *
 * 2. **Transformed scale** — plots (x, z = transform(y)) points and the
 *    linear regression line ẑ = a + b·x. This is the linearized view.
 *
 * Both views share the same underlying OLS result, so toggling between
 * them is instantaneous and the user can see why the transformation
 * linearizes the data.
 *
 * Spec §30: this component contains ZERO statistical calculations beyond
 * coordinate scaling for SVG. All math (slope, intercept, predictions,
 * back-transform) is delegated to the engine layer.
 */
export const LogRegressionChart: React.FC<LogRegressionChartProps> = ({
  result,
  scaleMode,
  xLabel = 'X',
  yLabel = 'Y',
  xUnit = '',
  yUnit = '',
  height = 380,
}) => {
  const chartId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: string;
    index: number;
    x: number;
    yObserved: number;
    yPredicted: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const margin = { top: 32, right: 36, bottom: 56, left: 68 };
  const width = 640;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { logBase, coefficients, rawData, transformedData, regression } = result;

  // Compute domains
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (scaleMode === 'original') {
      // Plot raw Y; also include the back-transformed curve endpoints
      const ys = rawData.map((p) => p.y);
      const predictedAtXMin = backTransformPrediction(
        coefficients.intercept + coefficients.slope * Math.min(...rawData.map((p) => p.x)),
        logBase
      );
      const predictedAtXMax = backTransformPrediction(
        coefficients.intercept + coefficients.slope * Math.max(...rawData.map((p) => p.x)),
        logBase
      );
      const allY = [...ys, predictedAtXMin, predictedAtXMax];
      let minY = Math.min(...allY);
      let maxY = Math.max(...allY);
      if (minY === maxY) { minY -= 1; maxY += 1; }
      if (minY > 0) minY = 0; // anchor at zero for concentration-like data
      const pad = (maxY - minY) * 0.12 || 1;
      return {
        xMin: Math.min(...rawData.map((p) => p.x)),
        xMax: Math.max(...rawData.map((p) => p.x)),
        yMin: minY,
        yMax: maxY + pad,
      };
    }
    // Transformed scale
    const zs = transformedData.map((p) => p.y);
    const predZs = transformedData.map((p) => coefficients.intercept + coefficients.slope * p.x);
    const allZ = [...zs, ...predZs];
    let minZ = Math.min(...allZ);
    let maxZ = Math.max(...allZ);
    if (minZ === maxZ) { minZ -= 1; maxZ += 1; }
    const pad = (maxZ - minZ) * 0.12 || 1;
    return {
      xMin: Math.min(...rawData.map((p) => p.x)),
      xMax: Math.max(...rawData.map((p) => p.x)),
      yMin: minZ - pad,
      yMax: maxZ + pad,
    };
  }, [scaleMode, rawData, transformedData, coefficients, logBase]);

  // Add 8% horizontal padding
  const xPad = (xMax - xMin) * 0.08 || 1;
  const xMinPadded = xMin - xPad;
  const xMaxPadded = xMax + xPad;

  const scaleX = (x: number) =>
    margin.left + ((x - xMinPadded) / (xMaxPadded - xMinPadded)) * innerWidth;
  const scaleY = (y: number) =>
    margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;

  // Build the regression visualization path
  const regressionPath = useMemo(() => {
    const steps = 80;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const curX = xMinPadded + ((xMaxPadded - xMinPadded) / steps) * i;
      const z = coefficients.intercept + coefficients.slope * curX;
      const y =
        scaleMode === 'original' ? backTransformPrediction(z, logBase) : z;
      pts.push(`${i === 0 ? 'M' : 'L'} ${scaleX(curX)},${scaleY(y)}`);
    }
    return pts.join(' ');
  }, [scaleMode, xMinPadded, xMaxPadded, coefficients, logBase, scaleX, scaleY]);

  // Tick generation
  const xTicks = useMemo(() => {
    const count = 6;
    const step = (xMaxPadded - xMinPadded) / count;
    return Array.from({ length: count + 1 }, (_, i) => xMinPadded + i * step);
  }, [xMinPadded, xMaxPadded]);

  const yTicks = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  // Export SVG handler
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-regression-${scaleMode}-scale.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const yDisplayLabel =
    scaleMode === 'original'
      ? `${yLabel} ${yUnit ? `(${yUnit})` : ''}`
      : `${logBase}(${yLabel})`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        style={{ maxHeight: `${height}px` }}
      >
        <defs>
          <clipPath id={`${chartId}-clip`}>
            <rect x={margin.left} y={margin.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        <g stroke="#f3f4f6" strokeDasharray="3 3">
          {xTicks.map((xVal, i) => (
            <line key={`gx-${i}`} x1={scaleX(xVal)} y1={margin.top} x2={scaleX(xVal)} y2={margin.top + innerHeight} />
          ))}
          {yTicks.map((yVal, i) => (
            <line key={`gy-${i}`} x1={margin.left} y1={scaleY(yVal)} x2={margin.left + innerWidth} y2={scaleY(yVal)} />
          ))}
        </g>

        {/* Axes */}
        <g stroke="#9ca3af" strokeWidth="1.2">
          <line x1={margin.left} y1={margin.top + innerHeight} x2={margin.left + innerWidth} y2={margin.top + innerHeight} />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerHeight} />
        </g>

        {/* Tick labels */}
        <g className="text-[11px] fill-neutral-500 font-mono">
          {xTicks.map((xVal, i) => (
            <text key={`tx-${i}`} x={scaleX(xVal)} y={margin.top + innerHeight + 16} textAnchor="middle">
              {formatNumber(xVal, 1)}
            </text>
          ))}
          {yTicks.map((yVal, i) => (
            <text key={`ty-${i}`} x={margin.left - 8} y={scaleY(yVal) + 4} textAnchor="end">
              {formatNumber(yVal, scaleMode === 'original' ? 1 : 2)}
            </text>
          ))}
        </g>

        {/* Axis titles */}
        <text
          x={margin.left + innerWidth / 2}
          y={margin.top + innerHeight + 40}
          textAnchor="middle"
          className="text-xs font-medium fill-neutral-700"
        >
          {xLabel} {xUnit ? `(${xUnit})` : ''}
        </text>
        <text
          x={-(margin.top + innerHeight / 2)}
          y={20}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-xs font-medium fill-neutral-700"
        >
          {yDisplayLabel}
        </text>

        {/* Scale badge */}
        <g transform={`translate(${margin.left + 10}, ${margin.top + 14})`}>
          <rect
            x={-2}
            y={-12}
            width={scaleMode === 'original' ? 130 : 150}
            height={18}
            rx={4}
            fill={scaleMode === 'original' ? '#fef3c7' : '#ccfbf1'}
            stroke={scaleMode === 'original' ? '#f59e0b' : '#14b8a6'}
            strokeWidth="1"
          />
          <text x={6} y={1} className="text-[10px] font-bold font-mono">
            {scaleMode === 'original' ? 'Original scale (curve)' : 'Transformed scale (linear)'}
          </text>
        </g>

        {/* Clipped plot area */}
        <g clipPath={`url(#${chartId}-clip)`}>
          {/* Regression curve / line */}
          {regressionPath && (
            <path
              d={regressionPath}
              fill="none"
              stroke="#0f766e"
              strokeWidth={scaleMode === 'original' ? '2.5' : '2.5'}
              strokeDasharray={scaleMode === 'original' ? 'none' : 'none'}
            />
          )}

          {/* Observed data points */}
          {(scaleMode === 'original' ? rawData : transformedData).map((pt, idx) => {
            const px = scaleX(pt.x);
            const py = scaleY(pt.y);
            const isHovered = hoveredPoint?.id === pt.id;
            return (
              <g key={`pt-${pt.id}`} className="cursor-pointer">
                {isHovered && (
                  <circle cx={px} cy={py} r={9} fill="#0d9488" fillOpacity="0.25" />
                )}
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? 6 : 5}
                  fill="#0f766e"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  onMouseEnter={() => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    setHoveredPoint({
                      id: pt.id,
                      index: idx + 1,
                      x: pt.x,
                      yObserved: rawData[idx].y,
                      yPredicted: backTransformPrediction(
                        coefficients.intercept + coefficients.slope * pt.x,
                        logBase
                      ),
                      screenX: (px / width) * (rect?.width || width),
                      screenY: (py / height) * (rect?.height || height),
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <text
                  x={px}
                  y={py - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-neutral-400 font-mono pointer-events-none"
                >
                  #{idx + 1}
                </text>
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g transform={`translate(${margin.left + 145}, ${margin.top + 14})`} className="text-[11px]">
          <circle cx="4" cy="-4" r="4" fill="#0f766e" />
          <text x="14" y="0" fill="#374151" className="font-medium">
            Observed (n={rawData.length})
          </text>
          <line x1="100" y1="-4" x2="120" y2="-4" stroke="#0f766e" strokeWidth="2.5" />
          <text x="126" y="0" fill="#374151" className="font-medium">
            {scaleMode === 'original' ? 'Fitted exponential curve' : 'Fitted linear (OLS)'}
          </text>
        </g>

        {/* SVG export button (top right) */}
        <g
          transform={`translate(${margin.left + innerWidth - 60}, ${margin.top - 22})`}
          className="cursor-pointer"
          onClick={handleExportSvg}
        >
          <rect x={-2} y={-12} width={56} height={18} rx={4} fill="#f3f4f6" stroke="#d1d5db" />
          <text x={26} y={1} textAnchor="middle" className="text-[10px] fill-neutral-700 font-medium">
            ⬇ SVG
          </text>
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-30 pointer-events-none bg-neutral-900/95 text-white text-xs p-2.5 rounded-lg shadow-lg border border-neutral-700 -translate-x-1/2 -translate-y-full -mt-2"
          style={{ left: `${hoveredPoint.screenX}px`, top: `${hoveredPoint.screenY}px` }}
        >
          <div className="font-semibold text-teal-300">Observation #{hoveredPoint.index}</div>
          <div className="text-[11px] font-mono text-neutral-300 mt-0.5">
            <div>{xLabel}: {formatNumber(hoveredPoint.x, 3)} {xUnit}</div>
            <div>{yLabel} observed: {formatNumber(hoveredPoint.yObserved, 3)} {yUnit}</div>
            <div className="text-teal-200">{yLabel} predicted: {formatNumber(hoveredPoint.yPredicted, 3)} {yUnit}</div>
            <div className="text-neutral-400 mt-0.5">
              resid: {formatNumber(hoveredPoint.yObserved - hoveredPoint.yPredicted, 3)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

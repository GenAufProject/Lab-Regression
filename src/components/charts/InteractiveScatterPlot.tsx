import React, { useId, useMemo, useRef, useState } from 'react';
import { Download, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { DataPoint, RegressionStatistics } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';
import { predictY } from '../../lib/statistics/linearRegression';

interface InteractiveScatterPlotProps {
  stats: RegressionStatistics;
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
  showConfidenceBand?: boolean;
  showResidualLines?: boolean;
  trueLine?: { slope: number; intercept: number; label?: string };
  outlierPointId?: string;
  height?: number;
  highlightPointId?: string | null;
  onPointClick?: (point: DataPoint) => void;
}

export const InteractiveScatterPlot: React.FC<InteractiveScatterPlotProps> = ({
  stats,
  xLabel = 'X (Independent Variable)',
  yLabel = 'Y (Dependent Variable)',
  xUnit = '',
  yUnit = '',
  showConfidenceBand: initialShowCI = true,
  showResidualLines: initialShowResiduals = false,
  trueLine,
  outlierPointId,
  height = 420,
  highlightPointId,
  onPointClick,
}) => {
  const chartId = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  const [showCI, setShowCI] = useState(initialShowCI);
  const [showResiduals, setShowResiduals] = useState(initialShowResiduals);
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: string;
    index: number;
    x: number;
    y: number;
    predicted: number;
    residual: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Padding
  const margin = { top: 32, right: 36, bottom: 56, left: 68 };
  const width = 640; // responsive viewBox base width

  // Compute min/max domains with 10% generous padding
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xVals = stats.points.map((p) => p.x);
    const yVals = stats.points.map((p) => p.y);

    let minX = Math.min(...xVals);
    let maxX = Math.max(...xVals);
    let minY = Math.min(...yVals);
    let maxY = Math.max(...yVals);

    // Also include predicted endpoints
    const predMin = stats.intercept + stats.slope * minX;
    const predMax = stats.intercept + stats.slope * maxX;
    minY = Math.min(minY, predMin, predMax);
    maxY = Math.max(maxY, predMin, predMax);

    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    const xPadding = (maxX - minX) * 0.12 || 1;
    const yPadding = (maxY - minY) * 0.15 || 1;

    return {
      xMin: minX - xPadding,
      xMax: maxX + xPadding,
      yMin: minY - yPadding,
      yMax: maxY + yPadding,
    };
  }, [stats]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Coordinate scales
  const scaleX = (x: number) => margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
  const scaleY = (y: number) => margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;

  // Generate regression line endpoints
  const lineP1 = { x: xMin, y: stats.intercept + stats.slope * xMin };
  const lineP2 = { x: xMax, y: stats.intercept + stats.slope * xMax };

  // Generate confidence interval ribbon (smooth shaded polygon)
  const ciPolygonPath = useMemo(() => {
    if (!showCI || stats.n < 3) return '';
    const steps = 30;
    const topPoints: string[] = [];
    const bottomPoints: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const curX = xMin + ((xMax - xMin) / steps) * i;
      const pred = predictY(curX, stats, stats.confidenceLevel || 0.95);
      const px = scaleX(curX);
      const pyUpper = scaleY(pred.ciUpper);
      const pyLower = scaleY(pred.ciLower);
      topPoints.push(`${px},${pyUpper}`);
      bottomPoints.unshift(`${px},${pyLower}`);
    }

    return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
  }, [showCI, stats, xMin, xMax, scaleX, scaleY]);

  // Ticks
  const xTicks = useMemo(() => {
    const count = 6;
    const step = (xMax - xMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => xMin + i * step);
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const count = 6;
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
    a.download = 'regression-lab-scatterplot.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl p-3 shadow-xs">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-100 px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-800">Scatter Plot with OLS Fit</span>
          <span className="text-neutral-600 font-mono">
            Ŷ = {formatNumber(stats.intercept, 3)} {stats.slope >= 0 ? '+' : '-'} {formatNumber(Math.abs(stats.slope), 3)}X
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCI(!showCI)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showCI ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
            title="Toggle 95% Confidence Interval band"
          >
            {showCI ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>95% CI</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResiduals(!showResiduals)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              showResiduals ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
            title="Toggle residual error drop lines"
          >
            {showResiduals ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Residuals</span>
          </button>

          <button
            type="button"
            onClick={handleExportSvg}
            className="flex items-center gap-1 px-2 py-1 text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
            title="Export chart as SVG image"
          >
            <Download size={13} />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          style={{ maxHeight: `${height}px` }}
        >
          <defs>
            <clipPath id={`${chartId}-clip`}>
              <rect
                x={margin.left}
                y={margin.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>

          {/* Grid lines */}
          <g className="grid-lines" stroke="#e5e7eb" strokeDasharray="3 3">
            {xTicks.map((xVal, i) => (
              <line
                key={`gx-${i}`}
                x1={scaleX(xVal)}
                y1={margin.top}
                x2={scaleX(xVal)}
                y2={margin.top + innerHeight}
              />
            ))}
            {yTicks.map((yVal, i) => (
              <line
                key={`gy-${i}`}
                x1={margin.left}
                y1={scaleY(yVal)}
                x2={margin.left + innerWidth}
                y2={scaleY(yVal)}
              />
            ))}
          </g>

          {/* Axis lines */}
          <g stroke="#9ca3af" strokeWidth="1.2">
            {/* X axis */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
            />
            {/* Y axis */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + innerHeight}
            />
          </g>

          {/* Axis tick labels */}
          <g className="tick-labels text-[11px] fill-neutral-500 font-mono">
            {xTicks.map((xVal, i) => (
              <text
                key={`tx-${i}`}
                x={scaleX(xVal)}
                y={margin.top + innerHeight + 16}
                textAnchor="middle"
              >
                {formatNumber(xVal, 1)}
              </text>
            ))}
            {yTicks.map((yVal, i) => (
              <text
                key={`ty-${i}`}
                x={margin.left - 8}
                y={scaleY(yVal) + 4}
                textAnchor="end"
              >
                {formatNumber(yVal, 1)}
              </text>
            ))}
          </g>

          {/* Axis Titles */}
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
            {yLabel} {yUnit ? `(${yUnit})` : ''}
          </text>

          {/* Clipped Area for Plot elements */}
          <g clipPath={`url(#${chartId}-clip)`}>
            {/* Confidence band */}
            {showCI && ciPolygonPath && (
              <path
                d={ciPolygonPath}
                fill="#0d9488"
                fillOpacity="0.12"
                stroke="none"
              />
            )}

            {/* True Line (if simulation mode) */}
            {trueLine && (
              <line
                x1={scaleX(xMin)}
                y1={scaleY(trueLine.intercept + trueLine.slope * xMin)}
                x2={scaleX(xMax)}
                y2={scaleY(trueLine.intercept + trueLine.slope * xMax)}
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            )}

            {/* Regression line (OLS) */}
            <line
              x1={scaleX(lineP1.x)}
              y1={scaleY(lineP1.y)}
              x2={scaleX(lineP2.x)}
              y2={scaleY(lineP2.y)}
              stroke="#0f766e"
              strokeWidth="2.5"
            />

            {/* Residual drop lines */}
            {showResiduals &&
              stats.points.map((pt) => {
                const px = scaleX(pt.x);
                const py = scaleY(pt.y);
                const predY = scaleY(pt.predicted);
                const isPositive = pt.residual >= 0;
                return (
                  <line
                    key={`res-${pt.id}`}
                    x1={px}
                    y1={py}
                    x2={px}
                    y2={predY}
                    stroke={isPositive ? '#15803d' : '#b91c1c'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                );
              })}

            {/* Observed Data Points */}
            {stats.points.map((pt, idx) => {
              const px = scaleX(pt.x);
              const py = scaleY(pt.y);
              const isOutlier = pt.id === outlierPointId;
              const isHighlighted = pt.id === highlightPointId;
              const isHovered = hoveredPoint?.id === pt.id;

              return (
                <g key={pt.id} className="cursor-pointer">
                  {/* Outer halo on hover */}
                  {(isHovered || isHighlighted) && (
                    <circle
                      cx={px}
                      cy={py}
                      r={10}
                      fill={isOutlier ? '#f87171' : '#2dd4bf'}
                      fillOpacity="0.3"
                    />
                  )}
                  {/* Main point */}
                  <circle
                    cx={px}
                    cy={py}
                    r={isOutlier ? 7 : isHovered ? 6 : 5}
                    fill={isOutlier ? '#dc2626' : '#0f766e'}
                    stroke="#ffffff"
                    strokeWidth={isHovered || isHighlighted ? '2.5' : '1.5'}
                    onMouseEnter={(e) => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      setHoveredPoint({
                        id: pt.id,
                        index: idx + 1,
                        x: pt.x,
                        y: pt.y,
                        predicted: pt.predicted,
                        residual: pt.residual,
                        screenX: (px / width) * (rect?.width || width),
                        screenY: (py / height) * (rect?.height || height),
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onPointClick && onPointClick(pt)}
                  />
                  {/* Point number indicator */}
                  <text
                    x={px}
                    y={py - 8}
                    textAnchor="middle"
                    className="text-[9px] fill-neutral-400 font-mono select-none pointer-events-none"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Legend */}
          <g transform={`translate(${margin.left + 10}, ${margin.top + 14})`} className="text-[11px]">
            <rect x="0" y="-8" width="8" height="8" fill="#0f766e" rx="4" />
            <text x="12" y="0" fill="#374151" className="font-medium">
              Observed Data (n={stats.n})
            </text>

            <line x1="140" y1="-4" x2="160" y2="-4" stroke="#0f766e" strokeWidth="2.5" />
            <text x="166" y="0" fill="#374151" className="font-medium">
              Fitted OLS Line
            </text>

            {trueLine && (
              <>
                <line x1="280" y1="-4" x2="300" y2="-4" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
                <text x="306" y="0" fill="#4338ca" className="font-medium">
                  {trueLine.label || 'True Underlying Model'}
                </text>
              </>
            )}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-none bg-neutral-900/95 text-white text-xs p-2.5 rounded-lg shadow-xl border border-neutral-700 transform -translate-x-1/2 -translate-y-full -mt-2 transition-transform duration-75"
            style={{
              left: `${hoveredPoint.screenX}px`,
              top: `${hoveredPoint.screenY}px`,
            }}
          >
            <div className="font-semibold text-teal-300 pb-1 mb-1 border-b border-neutral-700 flex justify-between gap-4">
              <span>Observation #{hoveredPoint.index}</span>
              <span className="text-neutral-400 font-mono">ID: {hoveredPoint.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
              <span className="text-neutral-400">X:</span>
              <span className="text-right text-white font-medium">{formatNumber(hoveredPoint.x, 3)}</span>

              <span className="text-neutral-400">Observed Y:</span>
              <span className="text-right text-white font-medium">{formatNumber(hoveredPoint.y, 3)}</span>

              <span className="text-neutral-400">Predicted Ŷ:</span>
              <span className="text-right text-teal-200">{formatNumber(hoveredPoint.predicted, 3)}</span>

              <span className="text-neutral-400">Residual (Y-Ŷ):</span>
              <span
                className={`text-right font-medium ${
                  hoveredPoint.residual >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {hoveredPoint.residual >= 0 ? '+' : ''}
                {formatNumber(hoveredPoint.residual, 3)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

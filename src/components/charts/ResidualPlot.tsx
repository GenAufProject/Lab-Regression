import React, { useId, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { RegressionStatistics } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';

interface ResidualPlotProps {
  stats: RegressionStatistics;
  height?: number;
}

export const ResidualPlot: React.FC<ResidualPlotProps> = ({ stats, height = 320 }) => {
  const chartId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [xAxisMode, setXAxisMode] = useState<'fitted' | 'x'>('fitted');
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: string;
    index: number;
    xVal: number;
    residual: number;
    stdResidual: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const margin = { top: 28, right: 36, bottom: 50, left: 64 };
  const width = 640;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Domain calculations
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xVals = stats.points.map((p) => (xAxisMode === 'fitted' ? p.predicted : p.x));
    const residuals = stats.points.map((p) => p.residual);

    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);

    const maxAbsResidual = Math.max(...residuals.map((r) => Math.abs(r)), stats.rmse * 2.5);
    const xPad = (maxX - minX) * 0.1 || 1;

    return {
      xMin: minX - xPad,
      xMax: maxX + xPad,
      yMin: -maxAbsResidual * 1.15,
      yMax: maxAbsResidual * 1.15,
    };
  }, [stats, xAxisMode]);

  const scaleX = (x: number) => margin.left + ((x - xMin) / (xMax - xMin)) * innerWidth;
  const scaleY = (y: number) => margin.top + innerHeight - ((y - yMin) / (yMax - yMin)) * innerHeight;

  const zeroY = scaleY(0);

  // Ticks
  const xTicks = useMemo(() => {
    const count = 5;
    const step = (xMax - xMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => xMin + i * step);
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const count = 4;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  return (
    <div className="w-full bg-white border border-neutral-200/80 rounded-xl p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-100 px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-800">Residual Diagnostics Plot</span>
          <span className="text-neutral-500 text-[11px]">
            Target: Random scatter around horizontal zero line
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-neutral-100 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setXAxisMode('fitted')}
              className={`px-2 py-1 rounded transition-colors ${
                xAxisMode === 'fitted' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Residuals vs. Fitted (Ŷ)
            </button>
            <button
              type="button"
              onClick={() => setXAxisMode('x')}
              className={`px-2 py-1 rounded transition-colors ${
                xAxisMode === 'x' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Residuals vs. X
            </button>
          </div>
        </div>
      </div>

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
              <line
                key={`gx-${i}`}
                x1={scaleX(xVal)}
                y1={margin.top}
                x2={scaleX(xVal)}
                y2={margin.top + innerHeight}
              />
            ))}
          </g>

          {/* Zero baseline */}
          <line
            x1={margin.left}
            y1={zeroY}
            x2={margin.left + innerWidth}
            y2={zeroY}
            stroke="#0d9488"
            strokeWidth="1.8"
          />

          {/* Standard error 2*RMSE threshold bands (dashed) */}
          {stats.rmse > 0 && (
            <g stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity={0.7}>
              <line
                x1={margin.left}
                y1={scaleY(2 * stats.rmse)}
                x2={margin.left + innerWidth}
                y2={scaleY(2 * stats.rmse)}
              />
              <line
                x1={margin.left}
                y1={scaleY(-2 * stats.rmse)}
                x2={margin.left + innerWidth}
                y2={scaleY(-2 * stats.rmse)}
              />
              <text
                x={margin.left + innerWidth - 6}
                y={scaleY(2 * stats.rmse) - 4}
                textAnchor="end"
                className="text-[9px] fill-amber-700 font-mono"
              >
                +2 RMSE (Threshold)
              </text>
              <text
                x={margin.left + innerWidth - 6}
                y={scaleY(-2 * stats.rmse) + 11}
                textAnchor="end"
                className="text-[9px] fill-amber-700 font-mono"
              >
                -2 RMSE (Threshold)
              </text>
            </g>
          )}

          {/* Axes */}
          <g stroke="#9ca3af" strokeWidth="1.2">
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
            />
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + innerHeight}
            />
          </g>

          {/* Tick labels */}
          <g className="text-[11px] fill-neutral-500 font-mono">
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
            y={margin.top + innerHeight + 38}
            textAnchor="middle"
            className="text-xs font-medium fill-neutral-700"
          >
            {xAxisMode === 'fitted' ? 'Fitted Values (Ŷ)' : 'X (Independent Variable)'}
          </text>
          <text
            x={-(margin.top + innerHeight / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-xs font-medium fill-neutral-700"
          >
            Residual (Y - Ŷ)
          </text>

          {/* Points and Stems */}
          <g clipPath={`url(#${chartId}-clip)`}>
            {stats.points.map((pt, idx) => {
              const curX = xAxisMode === 'fitted' ? pt.predicted : pt.x;
              const px = scaleX(curX);
              const py = scaleY(pt.residual);
              const isLarge = Math.abs(pt.standardizedResidual ?? 0) >= 2;
              const isHovered = hoveredPoint?.id === pt.id;

              return (
                <g key={`res-pt-${pt.id}`} className="cursor-pointer">
                  {/* Stem line from zero to residual */}
                  <line
                    x1={px}
                    y1={zeroY}
                    x2={px}
                    y2={py}
                    stroke={pt.residual >= 0 ? '#10b981' : '#f43f5e'}
                    strokeWidth={isHovered ? '2' : '1.2'}
                    opacity={0.8}
                  />

                  {/* Residual point */}
                  <circle
                    cx={px}
                    cy={py}
                    r={isLarge ? 6 : isHovered ? 5.5 : 4.5}
                    fill={isLarge ? '#ef4444' : pt.residual >= 0 ? '#059669' : '#e11d48'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseEnter={() => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      setHoveredPoint({
                        id: pt.id,
                        index: idx + 1,
                        xVal: curX,
                        residual: pt.residual,
                        stdResidual: pt.standardizedResidual ?? 0,
                        screenX: (px / width) * (rect?.width || width),
                        screenY: (py / height) * (rect?.height || height),
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-none bg-neutral-900/95 text-white text-xs p-2 rounded-lg shadow-lg border border-neutral-700 -translate-x-1/2 -translate-y-full -mt-2"
            style={{ left: `${hoveredPoint.screenX}px`, top: `${hoveredPoint.screenY}px` }}
          >
            <div className="font-semibold text-teal-300">Point #{hoveredPoint.index}</div>
            <div className="text-[11px] font-mono text-neutral-300">
              <div>
                {xAxisMode === 'fitted' ? 'Fitted Ŷ' : 'X'}: {formatNumber(hoveredPoint.xVal, 3)}
              </div>
              <div>
                Residual: {hoveredPoint.residual >= 0 ? '+' : ''}
                {formatNumber(hoveredPoint.residual, 3)}
              </div>
              <div className="text-neutral-400">
                Std. Residual: {formatNumber(hoveredPoint.stdResidual, 2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

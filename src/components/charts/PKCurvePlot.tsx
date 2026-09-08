import React, { useId, useMemo, useRef, useState } from 'react';
import { Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { PKDataPoint, PKRegressionResult } from '../../types';
import { formatNumber } from '../../lib/statistics/formatting';

interface PKCurvePlotProps {
  data: PKDataPoint[];
  pkResult: PKRegressionResult;
  showHalfLifeGuide?: boolean;
  height?: number;
}

export const PKCurvePlot: React.FC<PKCurvePlotProps> = ({
  data,
  pkResult,
  showHalfLifeGuide: initialShowHalfLife = true,
  height = 380,
}) => {
  const chartId = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');
  const [showHalfLife, setShowHalfLife] = useState(initialShowHalfLife);
  const [hoveredPoint, setHoveredPoint] = useState<{
    id: string;
    time: number;
    conc: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const margin = { top: 32, right: 36, bottom: 56, left: 68 };
  const width = 640;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { c0, k, halfLife, units, logBase } = {
    c0: pkResult.estimatedC0,
    k: pkResult.eliminationRateConstant,
    halfLife: pkResult.halfLife,
    units: pkResult.units,
    logBase: pkResult.logBase,
  };

  // Domain calculations
  const { tMin, tMax, cMin, cMax } = useMemo(() => {
    const times = data.map((d) => d.time);
    const concs = data.map((d) => d.concentration);

    const maxT = Math.max(...times, isFinite(halfLife) ? halfLife * 2.2 : 10);
    const maxC = Math.max(...concs, c0) * 1.15;
    const minC = scaleMode === 'log' ? Math.min(...concs) * 0.7 : 0;

    return {
      tMin: 0,
      tMax: maxT * 1.05,
      cMin: Math.max(minC, scaleMode === 'log' ? 0.001 : 0),
      cMax: maxC,
    };
  }, [data, c0, halfLife, scaleMode]);

  // Coordinate scales
  const scaleT = (t: number) => margin.left + ((t - tMin) / (tMax - tMin)) * innerWidth;

  const scaleC = (c: number) => {
    if (scaleMode === 'linear') {
      return margin.top + innerHeight - ((c - cMin) / (cMax - cMin)) * innerHeight;
    }
    // Log scale
    const safeC = Math.max(c, 0.0001);
    const logVal = logBase === 'ln' ? Math.log(safeC) : Math.log10(safeC);
    const logMin = logBase === 'ln' ? Math.log(cMin) : Math.log10(cMin);
    const logMax = logBase === 'ln' ? Math.log(cMax) : Math.log10(cMax);
    return margin.top + innerHeight - ((logVal - logMin) / (logMax - logMin)) * innerHeight;
  };

  // Smooth theoretical decay curve
  const curvePath = useMemo(() => {
    if (k <= 0 || c0 <= 0) return '';
    const pointsCount = 80;
    const pts: string[] = [];

    for (let i = 0; i <= pointsCount; i++) {
      const curT = tMin + ((tMax - tMin) / pointsCount) * i;
      const curC = c0 * Math.exp(-k * curT);
      const px = scaleT(curT);
      const py = scaleC(curC);
      pts.push(`${i === 0 ? 'M' : 'L'} ${px},${py}`);
    }

    return pts.join(' ');
  }, [c0, k, tMin, tMax, scaleT, scaleC]);

  // Ticks
  const tTicks = useMemo(() => {
    const count = 6;
    const step = (tMax - tMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => tMin + i * step);
  }, [tMin, tMax]);

  const cTicks = useMemo(() => {
    if (scaleMode === 'linear') {
      const count = 5;
      const step = (cMax - cMin) / count;
      return Array.from({ length: count + 1 }, (_, i) => cMin + i * step);
    }
    // Log tick marks
    const ticks: number[] = [];
    let cur = cMin;
    const factor = logBase === 'ln' ? Math.E : 10;
    while (cur <= cMax * 1.5) {
      ticks.push(cur);
      cur *= factor;
      if (ticks.length > 8) break;
    }
    if (!ticks.includes(cMax)) ticks.push(cMax);
    return ticks;
  }, [scaleMode, cMin, cMax, logBase]);

  // Half life coordinates
  const cHalf = c0 / 2;
  const showHalfLifeGuides =
    showHalfLife && isFinite(halfLife) && halfLife > 0 && halfLife <= tMax && c0 > 0;

  return (
    <div className="w-full bg-white border border-neutral-200/80 rounded-xl p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-100 px-1 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-800">
            Pharmacokinetic Concentration-Time Curve
          </span>
          <span className="text-teal-700 font-mono text-[11px]">
            C(t) = C₀ · e^(-kt)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Linear vs Log scale toggle */}
          <div className="inline-flex rounded-md bg-neutral-100 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setScaleMode('linear')}
              className={`px-2 py-1 rounded transition-colors ${
                scaleMode === 'linear' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Linear Scale
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('log')}
              className={`px-2 py-1 rounded transition-colors ${
                scaleMode === 'log' ? 'bg-white font-medium text-teal-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Semi-Log ({logBase})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHalfLife(!showHalfLife)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-[11px] ${
              showHalfLife ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <span>t½ Guide</span>
          </button>
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
            {tTicks.map((tVal, i) => (
              <line
                key={`gt-${i}`}
                x1={scaleT(tVal)}
                y1={margin.top}
                x2={scaleT(tVal)}
                y2={margin.top + innerHeight}
              />
            ))}
            {cTicks.map((cVal, i) => (
              <line
                key={`gc-${i}`}
                x1={margin.left}
                y1={scaleC(cVal)}
                x2={margin.left + innerWidth}
                y2={scaleC(cVal)}
              />
            ))}
          </g>

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
            {tTicks.map((tVal, i) => (
              <text
                key={`tt-${i}`}
                x={scaleT(tVal)}
                y={margin.top + innerHeight + 16}
                textAnchor="middle"
              >
                {formatNumber(tVal, 1)}
              </text>
            ))}
            {cTicks.map((cVal, i) => (
              <text
                key={`tc-${i}`}
                x={margin.left - 8}
                y={scaleC(cVal) + 4}
                textAnchor="end"
              >
                {formatNumber(cVal, scaleMode === 'log' ? 2 : 1)}
              </text>
            ))}
          </g>

          {/* Axis Labels */}
          <text
            x={margin.left + innerWidth / 2}
            y={margin.top + innerHeight + 40}
            textAnchor="middle"
            className="text-xs font-medium fill-neutral-700"
          >
            Time ({units.time})
          </text>
          <text
            x={-(margin.top + innerHeight / 2)}
            y={20}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-xs font-medium fill-neutral-700"
          >
            {scaleMode === 'log' ? `${logBase}(Concentration)` : `Concentration (${units.concentration})`}
          </text>

          {/* Plotting content */}
          <g clipPath={`url(#${chartId}-clip)`}>
            {/* Smooth fitted curve */}
            {curvePath && (
              <path
                d={curvePath}
                fill="none"
                stroke="#0f766e"
                strokeWidth={scaleMode === 'log' ? '2.5' : '2.2'}
              />
            )}

            {/* Visual Half-Life guides */}
            {showHalfLifeGuides && (
              <g className="half-life-guide">
                {/* Horizontal guide from C0/2 to curve */}
                <line
                  x1={margin.left}
                  y1={scaleC(cHalf)}
                  x2={scaleT(halfLife)}
                  y2={scaleC(cHalf)}
                  stroke="#d97706"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                {/* Vertical guide from curve down to time axis */}
                <line
                  x1={scaleT(halfLife)}
                  y1={scaleC(cHalf)}
                  x2={scaleT(halfLife)}
                  y2={margin.top + innerHeight}
                  stroke="#d97706"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />

                {/* Point at (t1/2, C0/2) */}
                <circle
                  cx={scaleT(halfLife)}
                  cy={scaleC(cHalf)}
                  r={5}
                  fill="#d97706"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Label at C0/2 on Y axis */}
                <text
                  x={margin.left + 6}
                  y={scaleC(cHalf) - 6}
                  className="text-[10px] fill-amber-800 font-medium font-mono"
                >
                  C₀ / 2 = {formatNumber(cHalf, 2)}
                </text>

                {/* Label at t1/2 on X axis */}
                <text
                  x={scaleT(halfLife) + 4}
                  y={margin.top + innerHeight - 8}
                  className="text-[10px] fill-amber-800 font-medium font-mono"
                >
                  t½ = {formatNumber(halfLife, 2)} {units.time}
                </text>
              </g>
            )}

            {/* Estimated C0 anchor point at t=0 */}
            {c0 > 0 && (
              <g>
                <circle
                  cx={scaleT(0)}
                  cy={scaleC(c0)}
                  r={5.5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={scaleT(0) + 8}
                  y={scaleC(c0) + 4}
                  className="text-[10px] font-semibold fill-amber-700 font-mono"
                >
                  C₀ = {formatNumber(c0, 2)}
                </text>
              </g>
            )}

            {/* Observed sample points */}
            {data.map((pt, idx) => {
              const px = scaleT(pt.time);
              const py = scaleC(pt.concentration);
              const isHovered = hoveredPoint?.id === pt.id;

              return (
                <g key={`pk-pt-${pt.id}`} className="cursor-pointer">
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
                        time: pt.time,
                        conc: pt.concentration,
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
          <g transform={`translate(${margin.left + 12}, ${margin.top + 14})`} className="text-[11px]">
            <circle cx="4" cy="-4" r="4" fill="#0f766e" />
            <text x="14" y="0" fill="#374151" className="font-medium">
              Observed Points
            </text>

            <line x1="120" y1="-4" x2="140" y2="-4" stroke="#0f766e" strokeWidth="2.5" />
            <text x="146" y="0" fill="#374151" className="font-medium">
              Fitted Decay Curve
            </text>

            {showHalfLifeGuides && (
              <>
                <line x1="260" y1="-4" x2="280" y2="-4" stroke="#d97706" strokeWidth="2" strokeDasharray="3 2" />
                <text x="286" y="0" fill="#b45309" className="font-medium">
                  Half-Life (t½) Guide
                </text>
              </>
            )}
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-none bg-neutral-900/95 text-white text-xs p-2 rounded-lg shadow-lg border border-neutral-700 -translate-x-1/2 -translate-y-full -mt-2"
            style={{ left: `${hoveredPoint.screenX}px`, top: `${hoveredPoint.screenY}px` }}
          >
            <div className="font-semibold text-teal-300">Observation</div>
            <div className="text-[11px] font-mono text-neutral-300">
              <div>Time: {formatNumber(hoveredPoint.time, 2)} {units.time}</div>
              <div>Conc: {formatNumber(hoveredPoint.conc, 3)} {units.concentration}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

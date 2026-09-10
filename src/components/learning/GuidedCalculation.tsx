import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ListOrdered, RotateCcw } from 'lucide-react';
import { DataPoint } from '../../types';
import { buildGuidedCalculationTrace } from '../../lib/learning/guidedCalculation';
import { formatNumber } from '../../lib/statistics/formatting';
import { MathFormula } from '../common/MathFormula';

interface GuidedCalculationProps {
  data: DataPoint[];
  xLabel?: string;
  yLabel?: string;
}

/**
 * Phase 5 — Guided Calculation UI (spec §3, §4).
 *
 * Progressive-disclosure viewer for the 10-step OLS derivation.
 * The actual calculation is performed by the Phase 2 regression engine
 * via lib/learning/guidedCalculation.ts — NO duplicate math in this
 * component (spec §27).
 *
 * Spec §4: supports Next / Previous / Show all / Restart.
 * Spec §28: no rounding — full precision throughout.
 */
export const GuidedCalculation: React.FC<GuidedCalculationProps> = ({
  data,
  xLabel = 'X',
  yLabel = 'Y',
}) => {
  const [activeStep, setActiveStep] = useState<number | null>(1);

  const trace = useMemo(
    () => buildGuidedCalculationTrace(data, xLabel, yLabel),
    [data, xLabel, yLabel]
  );

  if (!trace) {
    return (
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs text-xs text-neutral-500 text-center">
        Provide at least 2 valid data points to generate the guided calculation.
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <ListOrdered size={16} className="text-teal-700" />
          <h4 className="font-semibold text-neutral-900 text-sm">
            Guided OLS Calculation ({trace.totalSteps} steps)
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveStep(activeStep === null ? 1 : null)}
            className="text-[11px] px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
          >
            {activeStep === null ? 'Step-by-step' : 'Show all'}
          </button>
          {activeStep !== null && (
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="text-[11px] px-2 py-1 rounded text-neutral-600 hover:bg-neutral-100 font-medium flex items-center gap-1"
            >
              <RotateCcw size={11} />
              Restart
            </button>
          )}
        </div>
      </div>

      {activeStep !== null && (
        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <span>
            Step {activeStep} of {trace.totalSteps}
          </span>
          <div className="flex-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all"
              style={{ width: `${(activeStep / trace.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {trace.steps.map((s) => {
          const isExpanded = activeStep === null || activeStep === s.step;
          if (activeStep !== null && !isExpanded) return null;
          return (
            <div
              key={s.step}
              className={`border rounded-lg transition-all ${
                isExpanded && activeStep === s.step
                  ? 'border-teal-500 bg-teal-50/20'
                  : 'border-neutral-200'
              }`}
            >
              <div
                className={`p-2.5 flex items-center justify-between gap-2 ${
                  activeStep === null ? 'cursor-pointer' : ''
                }`}
                onClick={() => activeStep === null ? undefined : setActiveStep(s.step)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-mono font-bold flex items-center justify-center text-[10px]">
                    {s.step}
                  </span>
                  <span className="font-semibold text-neutral-900 text-xs">{s.title}</span>
                </div>
                {activeStep === null && (
                  <ChevronDown size={14} className="text-neutral-400" />
                )}
              </div>
              <div className="px-3.5 pb-3 text-xs text-neutral-700 border-t border-teal-100 pt-2 space-y-2">
                <p className="leading-relaxed text-neutral-600">{s.description}</p>
                <div className="bg-white border border-neutral-200 rounded p-2.5 overflow-x-auto text-center">
                  <MathFormula math={s.formulaLatex} block />
                </div>
                <div className="text-[11px] text-teal-700 font-mono">{s.result}</div>
                {s.table && <StepTable table={s.table} />}
              </div>
            </div>
          );
        })}
      </div>

      {activeStep !== null && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep <= 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="text-[11px] text-neutral-500 font-mono">
            {activeStep} / {trace.totalSteps}
          </span>
          <button
            type="button"
            onClick={() => setActiveStep(Math.min(trace.totalSteps, activeStep + 1))}
            disabled={activeStep >= trace.totalSteps}
            className="text-xs px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-30 text-white font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Helper: render a step's per-observation table
// ===========================================================================

const StepTable: React.FC<{ table: NonNullable<ReturnType<typeof buildGuidedCalculationTrace>>['steps'][0]['table'] }> = ({ table }) => {
  if (!table) return null;
  return (
    <div className="mt-2 border border-neutral-200 rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
      <table className="w-full text-[11px] font-mono">
        <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0">
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="py-1.5 px-2 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {table.rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-neutral-50/70">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-1 px-2 text-right">
                  {typeof cell === 'number' ? formatNumber(cell, 3) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

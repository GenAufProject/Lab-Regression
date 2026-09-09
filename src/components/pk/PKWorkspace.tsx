import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronRight,
  Clock,
  Droplet,
  FlaskConical,
  Info,
  ListOrdered,
  Pill,
  Table as TableIcon,
  TrendingDown,
} from 'lucide-react';
import { PKDataPoint, PKUnits } from '../../types';
import { analyzeFirstOrderElimination } from '../../lib/pharmacokinetics/pkAnalysis';
import {
  deriveAUCUnitLabel,
  deriveClearanceUnitLabel,
  deriveVdUnitLabel,
  CONCENTRATION_UNITS,
  DOSE_UNITS,
  TIME_UNITS,
} from '../../lib/pharmacokinetics/pkUnits';
import { formatNumber } from '../../lib/statistics/formatting';
import { MathFormula } from '../common/MathFormula';
import { EducationalDisclaimer } from '../common/EducationalDisclaimer';
import { TooltipTerm } from '../common/TooltipTerm';
import { PKCurvePlot } from '../charts/PKCurvePlot';

// Initial educational PK dataset — matches Phase 2 default for continuity.
const INITIAL_PK_DATA: PKDataPoint[] = [
  { id: 'pk-1', time: 0.0, concentration: 10.2 },
  { id: 'pk-2', time: 1.0, concentration: 7.8 },
  { id: 'pk-3', time: 2.0, concentration: 6.1 },
  { id: 'pk-4', time: 4.0, concentration: 3.8 },
  { id: 'pk-5', time: 6.0, concentration: 2.4 },
  { id: 'pk-6', time: 8.0, concentration: 1.5 },
];

type TerminalPhaseStrategy = 'all-points' | 'best-rsquared-suffix';

export const PKWorkspace: React.FC = () => {
  const [pkData, setPkData] = useState<PKDataPoint[]>(INITIAL_PK_DATA);
  const [logBase, setLogBase] = useState<'ln' | 'log10'>('ln');
  const [units, setUnits] = useState<PKUnits>({
    time: 'h',
    concentration: 'mg/L',
    dose: 'mg',
  });
  const [dose, setDose] = useState<string>('500');
  const [terminalStrategy, setTerminalStrategy] =
    useState<TerminalPhaseStrategy>('all-points');
  const [activeTraceStep, setActiveTraceStep] = useState<number | null>(null);

  // Row handlers (input layer — no statistical logic here, spec §3)
  const handleUpdateRow = (
    id: string,
    field: 'time' | 'concentration',
    val: string
  ) => {
    const num = parseFloat(val);
    setPkData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: isNaN(num) ? 0 : num } : item
      )
    );
  };

  const handleAddRow = () => {
    const lastTime = pkData.length > 0 ? pkData[pkData.length - 1].time : 0;
    setPkData((prev) => [
      ...prev,
      { id: `pk-${Date.now()}`, time: lastTime + 2, concentration: 1.0 },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (pkData.length <= 2) {
      alert('PK analysis requires at least 2 time-concentration pairs.');
      return;
    }
    setPkData((prev) => prev.filter((p) => p.id !== id));
  };

  const handleResetSample = () => {
    setPkData(INITIAL_PK_DATA);
    setUnits({ time: 'h', concentration: 'mg/L', dose: 'mg' });
    setDose('500');
    setTerminalStrategy('all-points');
  };

  // ----- Phase 4 analysis engine -----
  const parsedDose = parseFloat(dose);
  const analysis = useMemo(
    () =>
      analyzeFirstOrderElimination(pkData, {
        logBase,
        units,
        dose: !isNaN(parsedDose) && parsedDose > 0 ? parsedDose : undefined,
        terminalPhaseStrategy: terminalStrategy,
      }),
    [pkData, logBase, units, parsedDose, terminalStrategy]
  );

  const isSuccess = analysis.status === 'success';
  const result = isSuccess ? analysis : null;
  const errorResult = !isSuccess ? analysis : null;
  const pk = result?.regression ?? null;

  return (
    <div className="space-y-4">
      <EducationalDisclaimer />

      {/* ============================================================= */}
      {/* SECTION 1: Configuration (spec §27)                            */}
      {/* ============================================================= */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
              <FlaskConical size={18} className="text-teal-700" />
              <span>First-Order Elimination PK Studio (Phase 4)</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Concentration–time data → log-linear regression → k, t½, C₀, AUC.
              Reuses the Phase 2/3 statistical engine — no duplicate math.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLogBase('ln')}
                className={`px-3 py-1 rounded-md transition-all ${
                  logBase === 'ln'
                    ? 'bg-teal-700 text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ln(C)
              </button>
              <button
                type="button"
                onClick={() => setLogBase('log10')}
                className={`px-3 py-1 rounded-md transition-all ${
                  logBase === 'log10'
                    ? 'bg-teal-700 text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                log₁₀(C)
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetSample}
              className="text-xs text-neutral-600 hover:text-neutral-900 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Reset Sample
            </button>
          </div>
        </div>

        {/* Units + Dose + Terminal strategy row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              Time Unit:
            </label>
            <select
              value={units.time}
              onChange={(e) => setUnits({ ...units, time: e.target.value })}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
            >
              {TIME_UNITS.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol} ({u.displayName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              Concentration Unit:
            </label>
            <select
              value={units.concentration}
              onChange={(e) =>
                setUnits({ ...units, concentration: e.target.value })
              }
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
            >
              {CONCENTRATION_UNITS.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              IV Bolus Dose ({units.dose}):
            </label>
            <input
              type="number"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-mono text-neutral-900 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">
              Terminal Phase Strategy:
            </label>
            <select
              value={terminalStrategy}
              onChange={(e) =>
                setTerminalStrategy(e.target.value as TerminalPhaseStrategy)
              }
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
            >
              <option value="all-points">All points (clean data)</option>
              <option value="best-rsquared-suffix">
                Best-R² suffix (auto-select)
              </option>
            </select>
          </div>
        </div>
        <div className="mt-1.5 text-[10px] text-neutral-400 italic">
          Dose is optional (enables Vd & CL derivation). Terminal-phase
          strategy chooses which observations are used for the elimination
          regression.
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 2: Data input + validation                             */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900">
              Concentration-Time Points
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              + Add Time Point
            </button>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 sticky top-0">
                <tr>
                  <th className="p-2 w-8 text-neutral-400 font-mono">#</th>
                  <th className="p-2">Time ({units.time})</th>
                  <th className="p-2">Conc ({units.concentration})</th>
                  <th className="p-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {pkData.map((pt, idx) => (
                  <tr
                    key={pt.id}
                    className={`hover:bg-teal-50/40 ${
                      result?.predictions[idx]?.inTerminalPhase
                        ? 'bg-teal-50/30'
                        : ''
                    }`}
                  >
                    <td className="p-1.5 text-center text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="any"
                        value={pt.time}
                        onChange={(e) =>
                          handleUpdateRow(pt.id, 'time', e.target.value)
                        }
                        className="w-full px-1.5 py-0.5 border border-neutral-200 rounded text-neutral-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="any"
                        value={pt.concentration}
                        onChange={(e) =>
                          handleUpdateRow(
                            pt.id,
                            'concentration',
                            e.target.value
                          )
                        }
                        className="w-full px-1.5 py-0.5 border border-neutral-200 rounded text-neutral-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(pt.id)}
                        disabled={pkData.length <= 2}
                        className="text-neutral-400 hover:text-rose-600 text-xs"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-teal-700 italic">
            Rows shaded teal are in the selected terminal phase.
          </div>

          {/* Validation error */}
          {errorResult && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle
                size={15}
                className="shrink-0 mt-0.5 text-rose-600"
              />
              <div>
                <span className="font-semibold block">
                  PK Analysis Error ({errorResult.type})
                </span>
                <span className="text-[11px] text-rose-700 mt-0.5 block whitespace-pre-line">
                  {errorResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Non-fatal warnings */}
          {result && result.warnings.length > 0 && (
            <div className="space-y-1.5">
              {result.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-[11px] flex items-start gap-2 ${
                    w.severity === 'warning'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : w.severity === 'caution'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                >
                  <AlertTriangle
                    size={12}
                    className="shrink-0 mt-0.5"
                  />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart column */}
        <div className="lg:col-span-8 space-y-3">
          {pk && (
            <PKCurvePlot data={pkData} pkResult={pk} height={350} />
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 3: PK Parameter Cards (k, t½, C₀, R²)                   */}
      {/* ============================================================= */}
      {pk && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="Elimination Rate (k)">
                Elimination Rate (k)
              </TooltipTerm>
              <Clock size={14} className="text-teal-700" />
            </div>
            <div className="text-xl font-bold font-mono text-teal-900">
              {formatNumber(pk.eliminationRateConstant, 4)}
            </div>
            <div className="text-[11px] text-teal-700 font-mono mt-0.5">
              {units.time}⁻¹
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="Half-Life">Half-Life (t½)</TooltipTerm>
              <Activity size={14} className="text-amber-700" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-900">
              {formatNumber(pk.halfLife, 2)}
            </div>
            <div className="text-[11px] text-amber-700 font-mono mt-0.5">
              {units.time}
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="C0">Estimated C₀</TooltipTerm>
              <Droplet size={14} className="text-teal-700" />
            </div>
            <div className="text-xl font-bold font-mono text-neutral-900">
              {formatNumber(pk.estimatedC0, 3)}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              {units.concentration}
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="R²">R² ({logBase} fit)</TooltipTerm>
              <span className="text-[10px] text-neutral-400 font-mono">
                Goodness
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-teal-800">
              {formatNumber(pk.rSquared, 4)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              {(pk.rSquared * 100).toFixed(1)}% explained
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 4: AUC panel (spec §13, §14)                            */}
      {/* ============================================================= */}
      {result && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-teal-700" />
            <h4 className="font-semibold text-neutral-900 text-sm">
              AUC — Area Under the Concentration-Time Curve
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200/80">
              <div className="text-teal-700 text-[10px] uppercase font-semibold">
                AUC_last (trapezoidal)
              </div>
              <div className="font-mono font-bold text-teal-900 mt-1 text-sm">
                {formatNumber(result.trapezoidalAUC.aucLast, 4)}
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5">
                {deriveAUCUnitLabel(units)}
              </div>
            </div>
            <div
              className={`p-3 rounded-lg border ${
                result.trapezoidalAUC.extrapolationSuppressed
                  ? 'bg-neutral-50 border-neutral-200'
                  : 'bg-amber-50/60 border-amber-200/80'
              }`}
            >
              <div
                className={`text-[10px] uppercase font-semibold ${
                  result.trapezoidalAUC.extrapolationSuppressed
                    ? 'text-neutral-500'
                    : 'text-amber-700'
                }`}
              >
                AUC_extra (extrapolated)
              </div>
              <div className="font-mono font-bold mt-1 text-sm text-neutral-900">
                {result.trapezoidalAUC.extrapolationSuppressed
                  ? '—'
                  : formatNumber(result.trapezoidalAUC.aucExtra, 4)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                = C_last / k
              </div>
            </div>
            <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200/80">
              <div className="text-teal-700 text-[10px] uppercase font-semibold">
                AUC_total
              </div>
              <div className="font-mono font-bold text-teal-900 mt-1 text-sm">
                {result.trapezoidalAUC.extrapolationSuppressed
                  ? '—'
                  : formatNumber(result.trapezoidalAUC.aucTotal, 4)}
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5">
                {deriveAUCUnitLabel(units)}
              </div>
            </div>
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div className="text-neutral-500 text-[10px] uppercase font-semibold">
                AUC_theoretical
              </div>
              <div className="font-mono font-bold text-neutral-900 mt-1 text-sm">
                {formatNumber(result.trapezoidalAUC.aucTheoretical, 4)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                = C₀ / k (model)
              </div>
            </div>
          </div>
          {result.trapezoidalAUC.extrapolationSuppressed ? (
            <div className="mt-3 text-[11px] text-amber-700 italic">
              Extrapolation suppressed:{' '}
              {result.trapezoidalAUC.extrapolationSuppressedReason}
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-neutral-600">
              Extrapolated fraction:{' '}
              <span className="font-mono font-semibold">
                {(result.trapezoidalAUC.extrapFraction * 100).toFixed(2)}%
              </span>{' '}
              of AUC_total. Values above 20% suggest the sampling window may
              be too short.
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 5: Terminal-phase info (spec §15)                       */}
      {/* ============================================================= */}
      {result && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Info size={15} className="text-teal-700" />
            <h4 className="font-semibold text-neutral-900 text-sm">
              Terminal Phase Selection
            </h4>
            <span className="ml-auto text-[11px] text-neutral-500 font-mono">
              {result.terminalPhase.method} ·{' '}
              {result.terminalPhase.pointCount} point(s) · R² ={' '}
              {formatNumber(result.terminalPhase.rSquared, 4)}
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {result.terminalPhase.explanation}
          </p>
          <div className="mt-2 text-[11px] text-neutral-500 font-mono">
            Time range: t = {result.terminalPhase.timeRange.start} to{' '}
            {result.terminalPhase.timeRange.end} {units.time}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 6: Optional IV bolus derived params (Vd & CL)           */}
      {/* ============================================================= */}
      {pk && pk.volumeOfDistribution && (
        <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-xs">
          <div className="font-semibold text-teal-950 mb-2 flex items-center gap-1.5">
            <Pill size={14} className="text-teal-800" />
            <span>
              Single-Compartment IV Bolus Derived Parameters (Dose = {pk.dose}{' '}
              {units.dose})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-2.5 rounded-lg border border-teal-200/80">
              <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                <TooltipTerm term="Volume of Distribution">
                  Volume of Distribution (Vd = Dose / C₀)
                </TooltipTerm>
              </div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {formatNumber(pk.volumeOfDistribution, 2)} {deriveVdUnitLabel(units)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Vd = {pk.dose} {units.dose} / {formatNumber(pk.estimatedC0, 2)}{' '}
                {units.concentration}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-teal-200/80">
              <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                <TooltipTerm term="Clearance">
                  Systemic Clearance (CL = k × Vd)
                </TooltipTerm>
              </div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {formatNumber(pk.clearance ?? 0, 2)} {deriveClearanceUnitLabel(units)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                CL = {formatNumber(pk.eliminationRateConstant, 3)} {units.time}⁻¹ ×{' '}
                {formatNumber(pk.volumeOfDistribution, 2)} {deriveVdUnitLabel(units)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 7: Predictions & residuals table (spec §11, §12, §21)   */}
      {/* ============================================================= */}
      {result && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <TableIcon size={15} className="text-teal-700" />
            <h4 className="font-semibold text-neutral-900 text-sm">
              Predictions & Residuals (transformed vs original scale)
            </h4>
          </div>
          <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200 sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="py-2 px-2 text-center text-neutral-400">#</th>
                  <th className="py-2 px-2.5 text-right">Time</th>
                  <th className="py-2 px-2.5 text-right">C observed</th>
                  <th className="py-2 px-2.5 text-right">{logBase}(C)</th>
                  <th className="py-2 px-2.5 text-right">pred {logBase}(C)</th>
                  <th className="py-2 px-2.5 text-right text-teal-800">
                    pred C
                  </th>
                  <th className="py-2 px-2.5 text-right">resid (transf.)</th>
                  <th className="py-2 px-2.5 text-right">resid (orig.)</th>
                  <th className="py-2 px-2.5 text-center">terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.predictions.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-neutral-50/70 ${
                      p.inTerminalPhase ? 'bg-teal-50/30' : ''
                    }`}
                  >
                    <td className="py-1.5 px-2 text-center text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 text-right">
                      {formatNumber(p.time, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right">
                      {formatNumber(p.concentrationObserved, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-neutral-600">
                      {formatNumber(p.concentrationTransformed, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-neutral-600">
                      {formatNumber(p.concentrationPredictedTransformed, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-teal-700 font-semibold">
                      {formatNumber(p.concentrationPredicted, 3)}
                    </td>
                    <td
                      className={`py-1.5 px-2.5 text-right ${
                        p.residualTransformed >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {p.residualTransformed >= 0 ? '+' : ''}
                      {formatNumber(p.residualTransformed, 3)}
                    </td>
                    <td
                      className={`py-1.5 px-2.5 text-right ${
                        p.residualOriginal >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {p.residualOriginal >= 0 ? '+' : ''}
                      {formatNumber(p.residualOriginal, 3)}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      {p.inTerminalPhase ? (
                        <span className="text-teal-700 font-bold">●</span>
                      ) : (
                        <span className="text-neutral-300">○</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 italic">
            Transformed residuals are what OLS minimizes; original-scale
            residuals are informational only. ● = point used in terminal-phase
            regression.
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 8: Calculation trace (spec §17)                         */}
      {/* ============================================================= */}
      {result && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ListOrdered size={16} className="text-teal-700" />
              <h4 className="font-semibold text-neutral-900 text-sm">
                PK Calculation Trace (generated by domain layer)
              </h4>
            </div>
            <span className="text-xs text-neutral-500">
              {result.calculationTrace.length} steps
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {result.calculationTrace.map((s) => {
              const isExpanded = activeTraceStep === s.step;
              return (
                <div
                  key={`trace-${s.step}`}
                  className={`border rounded-lg transition-all ${
                    isExpanded
                      ? 'border-teal-500 bg-teal-50/20'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTraceStep(isExpanded ? null : s.step)
                    }
                    className="w-full text-left p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-mono font-bold flex items-center justify-center text-[10px]">
                        {s.step}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {s.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
                      <span className="truncate max-w-xs">{s.result}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3.5 pb-3 text-xs text-neutral-700 border-t border-teal-100 pt-2 space-y-2">
                      <p className="leading-relaxed text-neutral-600">
                        {s.description}
                      </p>
                      <div className="bg-white border border-neutral-200 rounded p-2.5 overflow-x-auto text-center">
                        <MathFormula math={s.formulaLatex} block />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 9: Educational interpretation (spec §19)                */}
      {/* ============================================================= */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={15} className="text-teal-700" />
              <h4 className="font-semibold text-neutral-900 text-sm">
                Interpreting k and t½
              </h4>
            </div>
            <div className="space-y-2 text-xs text-neutral-700">
              <p className="leading-relaxed">
                {result.interpretation.kNarrative}
              </p>
              <p className="leading-relaxed">
                {result.interpretation.halfLifeNarrative}
              </p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Droplet size={15} className="text-teal-700" />
              <h4 className="font-semibold text-neutral-900 text-sm">
                Interpreting C₀ and AUC
              </h4>
            </div>
            <div className="space-y-2 text-xs text-neutral-700">
              <p className="leading-relaxed">
                {result.interpretation.c0Narrative}
              </p>
              <p className="leading-relaxed">
                {result.interpretation.aucNarrative}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={15} className="text-amber-700" />
              <h4 className="font-semibold text-amber-950 text-sm">
                Interpreting R² (caution)
              </h4>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed">
              {result.interpretation.rSquaredNarrative}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 10: ln vs log10 educational link (spec §20)             */}
      {/* ============================================================= */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-700">
        <div className="font-semibold text-neutral-900 flex items-center gap-1.5 mb-2">
          <BookOpen size={15} className="text-teal-700" />
          <span>ln vs log₁₀ — Equivalent Models, Different Scaling</span>
        </div>
        <p className="leading-relaxed text-neutral-600 mb-2">
          The two log bases are mathematically equivalent:{' '}
          <MathFormula math="\log_{10}(x) = \frac{\ln(x)}{\ln(10)}" />. Slopes
          differ by a factor of ln(10) ≈ 2.303, but k, t½, C₀, and back-
          transformed predictions are identical (within floating-point
          tolerance).
        </p>
        <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="bg-white p-2 rounded border border-neutral-200">
            <div className="text-teal-700 font-semibold mb-1">
              ln(C) model:
            </div>
            <div>k = −slope</div>
            <div>C₀ = e^intercept</div>
            <div>t½ = ln(2) / k</div>
          </div>
          <div className="bg-white p-2 rounded border border-neutral-200">
            <div className="text-teal-700 font-semibold mb-1">
              log₁₀(C) model:
            </div>
            <div>k = −slope × ln(10)</div>
            <div>C₀ = 10^intercept</div>
            <div>t½ = ln(2) / k (same)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

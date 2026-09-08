import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  FlaskConical,
  HelpCircle,
  Pill,
  Sparkles,
} from 'lucide-react';
import { PKDataPoint, PKUnits } from '../../types';
import { analyzePKData } from '../../lib/pharmacokinetics/pkRegression';
import { formatNumber } from '../../lib/statistics/formatting';
import { PKCurvePlot } from '../charts/PKCurvePlot';
import { MathFormula } from '../common/MathFormula';
import { EducationalDisclaimer } from '../common/EducationalDisclaimer';
import { TooltipTerm } from '../common/TooltipTerm';

// Initial educational PK dataset
const INITIAL_PK_DATA: PKDataPoint[] = [
  { id: 'pk-1', time: 0.0, concentration: 10.2 },
  { id: 'pk-2', time: 1.0, concentration: 7.8 },
  { id: 'pk-3', time: 2.0, concentration: 6.1 },
  { id: 'pk-4', time: 4.0, concentration: 3.8 },
  { id: 'pk-5', time: 6.0, concentration: 2.4 },
  { id: 'pk-6', time: 8.0, concentration: 1.5 },
];

export const PKWorkspace: React.FC = () => {
  const [pkData, setPkData] = useState<PKDataPoint[]>(INITIAL_PK_DATA);
  const [logBase, setLogBase] = useState<'ln' | 'log10'>('ln');
  const [units, setUnits] = useState<PKUnits>({
    time: 'h',
    concentration: 'mg/L',
    dose: 'mg',
  });
  const [dose, setDose] = useState<string>('500');
  const [activeStep, setActiveStep] = useState<number>(1);

  // Update row
  const handleUpdateRow = (id: string, field: 'time' | 'concentration', val: string) => {
    const num = parseFloat(val);
    setPkData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: isNaN(num) ? 0 : num } : item))
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
  };

  // Run PK analysis
  const parsedDose = parseFloat(dose);
  const analysisResult = useMemo(() => {
    return analyzePKData(pkData, logBase, units, !isNaN(parsedDose) && parsedDose > 0 ? parsedDose : undefined);
  }, [pkData, logBase, units, parsedDose]);

  const isSuccess = analysisResult.status === 'success';
  const pk = isSuccess ? analysisResult.regression : null;

  // Step walkthrough metadata
  const walkthroughSteps = [
    {
      step: 1,
      title: 'Observe Concentration-Time Decay',
      desc: 'Plasma concentration decreases over time as the body clears the drug via hepatic metabolism and renal excretion.',
      formula: 'C(t) = C_0 \\cdot e^{-kt}',
    },
    {
      step: 2,
      title: `Apply Logarithmic Transformation (${logBase})`,
      desc: logBase === 'ln'
        ? 'Taking the natural logarithm of C(t) = C₀ e^(-kt) yields ln(C) = ln(C₀) - kt.'
        : 'Taking common log10 yields log₁₀(C) = log₁₀(C₀) - (k / 2.303)t.',
      formula: logBase === 'ln'
        ? '\\ln(C) = \\ln(C_0) - kt'
        : '\\log_{10}(C) = \\log_{10}(C_0) - \\frac{k}{2.303}t',
    },
    {
      step: 3,
      title: 'Plot Transformed Concentration vs. Time',
      desc: 'Notice how the curved exponential decay transforms into a straight line on the semi-log plot.',
      formula: 'Y = a + bX \\iff \\ln(C) = a + bt',
    },
    {
      step: 4,
      title: 'Fit Ordinary Least Squares Line',
      desc: 'Compute the regression slope (b) and intercept (a) through least squares minimization.',
      formula: pk ? `b = ${formatNumber(pk.slope, 4)}, \\quad a = ${formatNumber(pk.intercept, 4)}` : 'b = S_{xy}/S_{xx}',
    },
    {
      step: 5,
      title: 'Interpret the Slope',
      desc: 'The negative slope describes the rate of proportional loss per unit of time.',
      formula: pk ? `\\text{Slope} = ${formatNumber(pk.slope, 4)} \\text{ ${units.time}}^{-1}` : 'b = -k',
    },
    {
      step: 6,
      title: 'Derive Elimination Rate Constant (k)',
      desc: logBase === 'ln'
        ? 'With natural log, k = -slope directly.'
        : 'With log10, multiply by ln(10) ≈ 2.303: k = -2.303 × slope.',
      formula: logBase === 'ln'
        ? `k = -\\text{slope} = ${pk ? formatNumber(pk.eliminationRateConstant, 4) : '—'} \\text{ ${units.time}}^{-1}`
        : `k = -2.303 \\times \\text{slope} = ${pk ? formatNumber(pk.eliminationRateConstant, 4) : '—'} \\text{ ${units.time}}^{-1}`,
    },
    {
      step: 7,
      title: 'Calculate Elimination Half-Life (t½)',
      desc: 'The time required for plasma drug concentration to decrease by 50% is t½ = ln(2) / k.',
      formula: pk
        ? `t_{1/2} = \\frac{\\ln(2)}{k} = \\frac{0.69315}{${formatNumber(pk.eliminationRateConstant, 4)}} = ${formatNumber(pk.halfLife, 2)} \\text{ ${units.time}}`
        : 't_{1/2} = \\frac{\\ln(2)}{k}',
    },
    {
      step: 8,
      title: 'Estimate Initial Concentration (C₀)',
      desc: logBase === 'ln'
        ? 'Recover C₀ by exponentiating the intercept: C₀ = e^(intercept).'
        : 'Recover C₀ with base 10: C₀ = 10^(intercept).',
      formula: pk
        ? logBase === 'ln'
          ? `C_0 = e^{${formatNumber(pk.intercept, 3)}} = ${formatNumber(pk.estimatedC0, 3)} \\text{ ${units.concentration}}`
          : `C_0 = 10^{${formatNumber(pk.intercept, 3)}} = ${formatNumber(pk.estimatedC0, 3)} \\text{ ${units.concentration}}`
        : 'C_0 = e^a',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Educational Disclaimer Banner */}
      <EducationalDisclaimer />

      {/* Top Configuration Card */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
              <FlaskConical size={18} className="text-teal-700" />
              <span>One-Compartment First-Order Elimination Studio</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Connect linear regression to drug concentration decay, elimination rate constant k, and half-life.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Log base toggle */}
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
                Natural Log: ln(C)
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
                Common Log: log₁₀(C)
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

        {/* Units and Dose Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
          <div>
            <label className="block text-neutral-600 font-medium mb-1">Time Unit:</label>
            <select
              value={units.time}
              onChange={(e) => setUnits({ ...units, time: e.target.value })}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
            >
              <option value="h">Hours (h)</option>
              <option value="min">Minutes (min)</option>
              <option value="day">Days (day)</option>
              <option value="s">Seconds (s)</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">Concentration Unit:</label>
            <select
              value={units.concentration}
              onChange={(e) => setUnits({ ...units, concentration: e.target.value })}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-medium text-neutral-800 focus:ring-1 focus:ring-teal-500"
            >
              <option value="mg/L">mg/L</option>
              <option value="µg/mL">µg/mL</option>
              <option value="ng/mL">ng/mL</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-600 font-medium mb-1">IV Bolus Dose ({units.dose}):</label>
            <input
              type="number"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 font-mono text-neutral-900 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-col justify-end">
            <span className="text-[11px] text-neutral-400">
              Dose is optional to estimate Vd (Dose/C₀) and Clearance.
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Entry + Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Data Table Column (4 cols) */}
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
                  <tr key={pt.id} className="hover:bg-teal-50/40">
                    <td className="p-1.5 text-center text-neutral-400">{idx + 1}</td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="any"
                        value={pt.time}
                        onChange={(e) => handleUpdateRow(pt.id, 'time', e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-neutral-200 rounded text-neutral-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        step="any"
                        value={pt.concentration}
                        onChange={(e) => handleUpdateRow(pt.id, 'concentration', e.target.value)}
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

          {/* Error display if any */}
          {analysisResult.status === 'error' && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <div>
                <span className="font-semibold block">{analysisResult.error.message}</span>
                {analysisResult.error.detail && (
                  <span className="text-[11px] text-rose-700 mt-0.5 block">{analysisResult.error.detail}</span>
                )}
              </div>
            </div>
          )}

          {isSuccess && analysisResult.warning && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span className="text-[11px] leading-relaxed">{analysisResult.warning}</span>
            </div>
          )}
        </div>

        {/* Chart Column (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {pk && <PKCurvePlot data={pkData} pkResult={pk} height={350} />}
        </div>
      </div>

      {/* PK Parameter Results Cards */}
      {pk && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Elimination Rate Constant k */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="Elimination Rate (k)">Elimination Rate (k)</TooltipTerm>
              <Clock size={14} className="text-teal-700" />
            </div>
            <div className="text-xl font-bold font-mono text-teal-900">
              {formatNumber(pk.eliminationRateConstant, 4)}
            </div>
            <div className="text-[11px] text-teal-700 font-mono mt-0.5">
              {units.time}⁻¹
            </div>
          </div>

          {/* Half-life */}
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

          {/* Initial Concentration C0 */}
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

          {/* R² on fitted log scale */}
          <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <TooltipTerm term="R²">R² ({logBase} fit)</TooltipTerm>
              <span className="text-[10px] text-neutral-400 font-mono">Goodness</span>
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

      {/* Optional IV Bolus Parameters (Vd & CL) */}
      {pk && pk.volumeOfDistribution && (
        <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-xs">
          <div className="font-semibold text-teal-950 mb-2 flex items-center gap-1.5">
            <Pill size={14} className="text-teal-800" />
            <span>Single-Compartment IV Bolus Derived Parameters (Dose = {pk.dose} {units.dose})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-2.5 rounded-lg border border-teal-200/80">
              <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                <TooltipTerm term="Volume of Distribution">Volume of Distribution (Vd = Dose / C₀)</TooltipTerm>
              </div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {formatNumber(pk.volumeOfDistribution, 2)} L
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Vd = {pk.dose} {units.dose} / {formatNumber(pk.estimatedC0, 2)} {units.concentration}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-teal-200/80">
              <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                <TooltipTerm term="Clearance">Systemic Clearance (CL = k × Vd)</TooltipTerm>
              </div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {formatNumber(pk.clearance, 2)} L/{units.time}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                CL = {formatNumber(pk.eliminationRateConstant, 3)} {units.time}⁻¹ × {formatNumber(pk.volumeOfDistribution, 2)} L
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8-Step Interactive PK Walkthrough */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h4 className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
              <BookOpen size={16} className="text-teal-700" />
              <span>Step-by-Step PK Calculation Walkthrough</span>
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Step {activeStep} of {walkthroughSteps.length}: {walkthroughSteps[activeStep - 1].title}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activeStep <= 1}
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Previous step"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-medium px-2 text-neutral-700">
              {activeStep} / {walkthroughSteps.length}
            </span>
            <button
              type="button"
              disabled={activeStep >= walkthroughSteps.length}
              onClick={() => setActiveStep((prev) => Math.min(walkthroughSteps.length, prev + 1))}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Next step"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 p-4 bg-teal-50/30 border border-teal-100 rounded-xl space-y-2.5 text-xs">
          <div className="font-bold text-teal-950 text-sm">
            Step {activeStep}: {walkthroughSteps[activeStep - 1].title}
          </div>
          <p className="text-neutral-700 leading-relaxed text-xs">
            {walkthroughSteps[activeStep - 1].desc}
          </p>
          <div className="bg-white border border-teal-200/80 rounded-lg p-3 text-center overflow-x-auto">
            <MathFormula math={walkthroughSteps[activeStep - 1].formula} block />
          </div>
        </div>
      </div>

      {/* ln vs log10 Education Callout */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs text-neutral-700 space-y-2">
        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
          <HelpCircle size={15} className="text-teal-700" />
          <span>Why does 2.303 appear in base-10 log equations?</span>
        </div>
        <p className="leading-relaxed text-neutral-600">
          The natural logarithm uses base <em>e</em> (Euler’s constant ≈ 2.71828), whereas common logarithms use base 10.
          By the logarithm change of base theorem, <MathFormula math="\ln(x) = \ln(10) \times \log_{10}(x)" />.
          Since <MathFormula math="\ln(10) \approx 2.302585" />, converting from base 10 to natural rate constants requires
          multiplying the log10 slope by 2.303.
        </p>
        <div className="font-mono text-[11px] text-teal-900 bg-white p-2 rounded border border-neutral-200">
          k = -2.303 × (slope of log₁₀ C vs t) &nbsp;|&nbsp; k = -slope of ln C vs t
        </div>
      </div>
    </div>
  );
};

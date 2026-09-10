import React, { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { MathFormula } from '../common/MathFormula';

interface FormulaEntry {
  id: string;
  section: string;
  label: string;
  formula: string;
  description: string;
}

/**
 * Phase 5 — Formula Reference (spec §16).
 *
 * A searchable, categorized reference of formulas supported by the engine.
 * Only formulas that the engine actually computes are listed (spec §16).
 */
const FORMULAS: FormulaEntry[] = [
  // ---- Regression ----
  {
    id: 'reg-equation',
    section: 'Regression',
    label: 'Regression equation',
    formula: '\\hat{y} = b_0 + b_1 x',
    description: 'The fitted line. Given X, predicts the expected (mean) Y.',
  },
  {
    id: 'reg-slope',
    section: 'Regression',
    label: 'Slope',
    formula: 'b_1 = \\frac{S_{xy}}{S_{xx}} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}',
    description: 'Rate of change of Y per unit X. Numerator = covariance sum; denominator = X variance sum.',
  },
  {
    id: 'reg-intercept',
    section: 'Regression',
    label: 'Intercept',
    formula: 'b_0 = \\bar{y} - b_1 \\bar{x}',
    description: 'Predicted Y at X = 0. Derived from the centroid (x̄, ȳ) lying on the line.',
  },
  {
    id: 'reg-r2',
    section: 'Regression',
    label: 'R² (coefficient of determination)',
    formula: 'R^2 = 1 - \\frac{SSE}{SST}',
    description: 'Proportion of variance in Y explained by the linear model. High R² ≠ model correctness.',
  },
  {
    id: 'reg-sse',
    section: 'Regression',
    label: 'SSE (sum of squared errors)',
    formula: 'SSE = \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2',
    description: 'Unexplained variation. Minimized by OLS.',
  },
  {
    id: 'reg-sst',
    section: 'Regression',
    label: 'SST (total sum of squares)',
    formula: 'SST = \\sum_{i=1}^{n} (y_i - \\bar{y})^2',
    description: 'Total variation in Y around its mean.',
  },
  {
    id: 'reg-rse',
    section: 'Regression',
    label: 'Residual standard error (s)',
    formula: 's = \\sqrt{\\frac{SSE}{n - 2}}',
    description: 'Estimated standard deviation of residuals. Uses df = n − 2 (NOT n).',
  },
  {
    id: 'reg-se-slope',
    section: 'Regression',
    label: 'Standard error of slope',
    formula: 'SE(b_1) = \\frac{s}{\\sqrt{S_{xx}}}',
    description: 'Used for slope confidence intervals and t-tests.',
  },
  {
    id: 'reg-ci-mean',
    section: 'Regression',
    label: 'Confidence interval (mean response)',
    formula: '\\hat{y}_0 \\pm t \\cdot s \\sqrt{\\frac{1}{n} + \\frac{(x_0 - \\bar{x})^2}{S_{xx}}}',
    description: 'CI for the mean Y at X = x₀. Narrowest at x̄.',
  },
  {
    id: 'reg-pi',
    section: 'Regression',
    label: 'Prediction interval (individual obs)',
    formula: '\\hat{y}_0 \\pm t \\cdot s \\sqrt{1 + \\frac{1}{n} + \\frac{(x_0 - \\bar{x})^2}{S_{xx}}}',
    description: 'PI for a single future Y. Wider than the CI (includes σ²).',
  },
  {
    id: 'reg-leverage',
    section: 'Regression',
    label: 'Leverage (hat diagonal)',
    formula: 'h_{ii} = \\frac{1}{n} + \\frac{(x_i - \\bar{x})^2}{S_{xx}}',
    description: 'How far an observation\'s X is from x̄. High leverage > 4/n (simple regression).',
  },
  {
    id: 'reg-cooks',
    section: 'Regression',
    label: 'Cook\'s distance',
    formula: 'D_i = \\frac{r_i^2}{2} \\cdot \\frac{h_{ii}}{1 - h_{ii}}',
    description: 'Influence of observation i. Conventional flag: D_i > 4/n.',
  },

  // ---- Transformations ----
  {
    id: 'trans-ln',
    section: 'Transformations',
    label: 'Natural logarithm',
    formula: 'z = \\ln(y), \\quad y > 0',
    description: 'Linearizes Y = A·e^(bX) → ln(Y) = ln(A) + bX. Back-transform via exp.',
  },
  {
    id: 'trans-log10',
    section: 'Transformations',
    label: 'Common logarithm',
    formula: 'z = \\log_{10}(y) = \\frac{\\ln(y)}{\\ln(10)} \\approx \\frac{\\ln(y)}{2.303}',
    description: 'Same linearization as ln, different scale. Back-transform via 10^x.',
  },
  {
    id: 'trans-change-base',
    section: 'Transformations',
    label: 'Change of base',
    formula: '\\log_{10}(x) = \\frac{\\ln(x)}{\\ln(10)}',
    description: 'ln and log10 differ by a constant factor. Slopes convert accordingly.',
  },
  {
    id: 'trans-back-ln',
    section: 'Transformations',
    label: 'Back-transform (ln)',
    formula: '\\hat{y} = e^{\\hat{z}} = e^{a + bX}',
    description: 'Recovers Y on the original scale. Returns median (Jensen bias on mean).',
  },
  {
    id: 'trans-back-log10',
    section: 'Transformations',
    label: 'Back-transform (log10)',
    formula: '\\hat{y} = 10^{\\hat{z}}',
    description: 'Recovers Y on the original scale from a log10 fit.',
  },

  // ---- First-order PK ----
  {
    id: 'pk-decay',
    section: 'Pharmacokinetics',
    label: 'First-order elimination',
    formula: 'C(t) = C_0 \\cdot e^{-kt}',
    description: 'Concentration decays exponentially. C₀ = initial concentration; k = elimination rate.',
  },
  {
    id: 'pk-linearize',
    section: 'Pharmacokinetics',
    label: 'Linearized PK (ln)',
    formula: '\\ln(C) = \\ln(C_0) - kt',
    description: 'Taking ln of the decay equation yields a linear form: slope = −k, intercept = ln(C₀).',
  },
  {
    id: 'pk-k-ln',
    section: 'Pharmacokinetics',
    label: 'k from ln slope',
    formula: 'k = -\\text{slope}',
    description: 'Elimination rate constant from an ln(C) vs time regression. k > 0 always.',
  },
  {
    id: 'pk-k-log10',
    section: 'Pharmacokinetics',
    label: 'k from log10 slope',
    formula: 'k = -\\text{slope} \\cdot \\ln(10) \\approx -2.303 \\cdot \\text{slope}',
    description: 'Elimination rate constant from a log10(C) vs time regression.',
  },
  {
    id: 'pk-half-life',
    section: 'Pharmacokinetics',
    label: 'Half-life',
    formula: 't_{1/2} = \\frac{\\ln(2)}{k} \\approx \\frac{0.693}{k}',
    description: 'Time for concentration to drop by 50%. Constant for first-order kinetics.',
  },
  {
    id: 'pk-c0',
    section: 'Pharmacokinetics',
    label: 'Initial concentration',
    formula: 'C_0 = e^{\\text{intercept}} \\text{ (ln)} \\quad \\text{or} \\quad C_0 = 10^{\\text{intercept}} \\text{ (log10)}',
    description: 'Extrapolated concentration at t = 0. Not necessarily an observed measurement.',
  },
  {
    id: 'pk-vd',
    section: 'Pharmacokinetics',
    label: 'Volume of distribution',
    formula: 'V_d = \\frac{\\text{Dose}}{C_0}',
    description: 'Apparent volume. Requires IV bolus dose input.',
  },
  {
    id: 'pk-cl',
    section: 'Pharmacokinetics',
    label: 'Clearance',
    formula: 'CL = k \\cdot V_d = \\frac{\\text{Dose}}{\\text{AUC}}',
    description: 'Volume of plasma cleared per unit time. Two equivalent formulas.',
  },

  // ---- AUC ----
  {
    id: 'auc-trap',
    section: 'AUC',
    label: 'Trapezoidal AUC (observed)',
    formula: '\\text{AUC}_{last} = \\sum_{i=1}^{n-1} \\frac{C_i + C_{i+1}}{2} (t_{i+1} - t_i)',
    description: 'Linear trapezoidal rule over observed data points.',
  },
  {
    id: 'auc-extra',
    section: 'AUC',
    label: 'AUC extrapolation',
    formula: '\\text{AUC}_{extra} = \\frac{C_{last}}{k}',
    description: 'Extrapolation from last observation to infinity. Suppressed when k ≤ 0 or C_last ≤ 0.',
  },
  {
    id: 'auc-total',
    section: 'AUC',
    label: 'Total AUC',
    formula: '\\text{AUC}_{total} = \\text{AUC}_{last} + \\text{AUC}_{extra}',
    description: 'Total area under the curve. Model-dependent when extrapFraction is high.',
  },
  {
    id: 'auc-theoretical',
    section: 'AUC',
    label: 'Theoretical AUC',
    formula: '\\text{AUC}_{theoretical} = \\frac{C_0}{k}',
    description: 'Model-based AUC for a mono-exponential fit. Compare against AUC_last as a fit diagnostic.',
  },
];

export const FormulaReference: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  const sections = useMemo(() => {
    const s = new Set(FORMULAS.map((f) => f.section));
    return ['all', ...Array.from(s)];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FORMULAS.filter((f) => {
      if (activeSection !== 'all' && f.section !== activeSection) return false;
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.formula.toLowerCase().includes(q) ||
        f.section.toLowerCase().includes(q)
      );
    });
  }, [query, activeSection]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-teal-700" />
          <h3 className="font-semibold text-neutral-900 text-sm">Formula Reference</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search formulas..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 font-medium text-neutral-700"
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All sections' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((f) => (
          <div key={f.id} className="bg-white border border-neutral-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="text-[10px] uppercase font-bold text-teal-700 tracking-wider mb-1">
              {f.section}
            </div>
            <div className="font-semibold text-neutral-900 text-xs mb-2">{f.label}</div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-center overflow-x-auto">
              <MathFormula math={f.formula} block />
            </div>
            <p className="text-[11px] text-neutral-600 mt-2 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-xs text-neutral-500">
          No formulas match "{query}".
        </div>
      )}

      <div className="text-[11px] text-neutral-400 text-center">
        {filtered.length} of {FORMULAS.length} formulas shown. All are computed by the Regression Lab engine.
      </div>
    </div>
  );
};

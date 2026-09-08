import React from 'react';
import { BookOpen, Check, FileCheck, HelpCircle, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { MathFormula } from '../common/MathFormula';
import { EducationalDisclaimer } from '../common/EducationalDisclaimer';

export const ReferencePage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Educational Disclaimer Banner */}
      <EducationalDisclaimer />

      {/* Header */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} className="text-teal-700" />
          <h2 className="text-lg font-bold text-neutral-900">
            Statistical & Pharmacokinetic Formula Reference
          </h2>
        </div>
        <p className="text-xs text-neutral-500">
          Rigorous mathematical formulas, derivations, and diagnostic checklists for ordinary least squares regression and first-order elimination kinetics.
        </p>
      </div>

      {/* Section 1: Core OLS Linear Regression */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-semibold text-neutral-900 text-sm pb-2 border-b border-neutral-100 flex items-center gap-2">
          <Layers size={16} className="text-teal-700" />
          <span>1. Ordinary Least Squares (OLS) Regression Equations</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Linear Model Specification</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Fitted line minimizing vertical squared residuals:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="\hat{y}_i = a + b x_i" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Centroid Point</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Every OLS regression line is guaranteed to pass through:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="(\bar{x}, \bar{y}) = \left(\frac{\sum x_i}{n}, \frac{\sum y_i}{n}\right)" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Slope Formula (b)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Ratio of covariance sum to variance sum of X:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="b = \frac{S_{xy}}{S_{xx}} = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Y-Intercept Formula (a)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Solved directly from the centroid point:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="a = \bar{y} - b\bar{x}" block />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Sums of Squares & Fit Metrics */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-semibold text-neutral-900 text-sm pb-2 border-b border-neutral-100 flex items-center gap-2">
          <Layers size={16} className="text-teal-700" />
          <span>2. Sums of Squares, R², and Error Metrics</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Total Sum of Squares (SST)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="SST = \sum (y_i - \bar{y})^2" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Total variation in Y about its mean.</p>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Error Sum of Squares (SSE)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="SSE = \sum (y_i - \hat{y}_i)^2" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Unexplained residual variation.</p>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Coefficient of Determination (R²)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="R^2 = 1 - \frac{SSE}{SST} = \frac{SSR}{SST}" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Proportion of variance explained.</p>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Root Mean Squared Error (RMSE)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="RMSE = \sqrt{\frac{1}{n} \sum (y_i - \hat{y}_i)^2}" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Sample standard deviation of residuals.</p>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Standard Error of Regression (s_e)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="s_e = \sqrt{\frac{SSE}{n - 2}}" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Unbiased estimate of error variance.</p>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Standard Error of Slope (SE_b)</div>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center mb-1">
              <MathFormula math="SE_b = \frac{s_e}{\sqrt{S_{xx}}}" block />
            </div>
            <p className="text-neutral-500 text-[10px]">Used to compute confidence interval for slope.</p>
          </div>
        </div>
      </div>

      {/* Section 3: The LINE Assumptions Checklist */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="font-semibold text-neutral-900 text-sm pb-2 border-b border-neutral-100 flex items-center gap-2">
          <FileCheck size={16} className="text-teal-700" />
          <span>3. Classical Gauss-Markov "LINE" Assumptions Checklist</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <div className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-teal-700 text-white rounded flex items-center justify-center font-mono text-xs">L</span>
              <span>Linearity</span>
            </div>
            <p className="text-neutral-600 leading-relaxed text-[11px]">
              The true relationship between X and Y is linear in parameters. Verified when residuals are scattered randomly around zero with no curved bow or U-shape.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <div className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-teal-700 text-white rounded flex items-center justify-center font-mono text-xs">I</span>
              <span>Independence of Errors</span>
            </div>
            <p className="text-neutral-600 leading-relaxed text-[11px]">
              Observations and errors are mutually uncorrelated. In time-series or sequential data, residuals should not show positive autocorrelation (drift or waves).
            </p>
          </div>

          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <div className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-teal-700 text-white rounded flex items-center justify-center font-mono text-xs">N</span>
              <span>Normality of Residuals</span>
            </div>
            <p className="text-neutral-600 leading-relaxed text-[11px]">
              Residuals follow a normal distribution <MathFormula math="\epsilon_i \sim \mathcal{N}(0, \sigma^2)" />. Crucial for valid hypothesis tests (t-tests, p-values) with small sample sizes.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <div className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-teal-700 text-white rounded flex items-center justify-center font-mono text-xs">E</span>
              <span>Equal Variance (Homoscedasticity)</span>
            </div>
            <p className="text-neutral-600 leading-relaxed text-[11px]">
              Residual error variance is constant across all values of X. If the spread fans out like a megaphone, heteroscedasticity is present and standard errors become biased.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Pharmacokinetics Equations */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-semibold text-neutral-900 text-sm pb-2 border-b border-neutral-100 flex items-center gap-2">
          <Layers size={16} className="text-teal-700" />
          <span>4. Pharmacokinetics: One-Compartment First-Order Elimination</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Exponential Decay Law</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Rate of elimination is proportional to current plasma drug concentration:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="C(t) = C_0 \cdot e^{-kt}" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Log-Linear Regression Equation</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Linearized form for Ordinary Least Squares estimation:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="\ln(C) = \ln(C_0) - kt \quad \implies \quad \text{Slope} = -k" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Elimination Half-Life (t½)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Time required for concentration to decrease by exactly 50%:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="t_{1/2} = \frac{\ln(2)}{k} = \frac{0.693147\dots}{k}" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Base-10 Log Conversion Factor (2.303)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Relating common log10 regression slope to natural rate constant k:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="k = -2.303 \times (\text{slope of } \log_{10} C \text{ vs } t)" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Volume of Distribution (Vd)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Apparent physiological volume relating total body drug to plasma concentration:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="V_d = \frac{\text{Dose}_{\text{IV}}}{C_0}" block />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="font-semibold text-neutral-900 mb-1">Total Systemic Clearance (CL)</div>
            <p className="text-neutral-600 mb-2 text-[11px]">
              Volume of plasma completely cleared of drug per unit of time:
            </p>
            <div className="bg-white p-2 border border-neutral-200 rounded text-center">
              <MathFormula math="CL = k \cdot V_d = \frac{\text{Dose}}{\text{AUC}}" block />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

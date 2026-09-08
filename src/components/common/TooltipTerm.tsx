import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const DEFINITIONS: Record<string, { title: string; explanation: string; formula?: string }> = {
  Slope: {
    title: 'Slope (b)',
    explanation: 'The expected change in Y for every one-unit increase in X.',
    formula: 'b = Sxy / Sxx',
  },
  Intercept: {
    title: 'Intercept (a)',
    explanation: 'The predicted value of Y when X = 0. In pharmacokinetics, it represents ln(C0) or log10(C0).',
    formula: 'a = ȳ - b x̄',
  },
  'R²': {
    title: 'Coefficient of Determination (R²)',
    explanation: 'The fraction of total variance in Y explained by the linear model. High R² does not alone prove linearity.',
    formula: 'R² = 1 - (SSE / SST)',
  },
  'Pearson r': {
    title: 'Pearson Correlation Coefficient (r)',
    explanation: 'Measures the direction and linear strength between -1.0 (perfect negative) and +1.0 (perfect positive).',
    formula: 'r = Sxy / √(Sxx · Syy)',
  },
  Residual: {
    title: 'Residual (e)',
    explanation: 'The vertical difference between the observed Y value and the model predicted value: Observed - Predicted.',
    formula: 'e_i = y_i - ŷ_i',
  },
  RMSE: {
    title: 'Root Mean Squared Error (RMSE)',
    explanation: 'The typical magnitude of regression residuals in the original measurement units of Y.',
    formula: 'RMSE = √(SSE / (n - 2))',
  },
  SSE: {
    title: 'Sum of Squared Errors (SSE)',
    explanation: 'The sum of squared vertical distances from observed points to the regression line (minimized by OLS).',
    formula: 'SSE = Σ(y_i - ŷ_i)²',
  },
  'Half-Life': {
    title: 'Elimination Half-Life (t½)',
    explanation: 'The time required for plasma drug concentration to decrease by 50% under first-order kinetics.',
    formula: 't½ = ln(2) / k ≈ 0.693 / k',
  },
  'Elimination Rate (k)': {
    title: 'Elimination Rate Constant (k)',
    explanation: 'Fraction of drug removed per unit time under first-order elimination. Units are inverse time (e.g. h⁻¹).',
    formula: 'k = -slope (with ln)',
  },
  C0: {
    title: 'Initial Concentration (C0)',
    explanation: 'Hypothetical plasma concentration at the exact instant of an intravenous injection before elimination begins.',
    formula: 'C0 = exp(intercept)',
  },
  'Volume of Distribution': {
    title: 'Volume of Distribution (Vd)',
    explanation: 'Apparent fluid volume that would be required to contain the total drug dose at the observed initial concentration C0.',
    formula: 'Vd = Dose / C0',
  },
  Clearance: {
    title: 'Total Body Clearance (CL)',
    explanation: 'Volume of plasma completely cleared of drug per unit time.',
    formula: 'CL = k × Vd',
  },
};

interface TooltipTermProps {
  term: keyof typeof DEFINITIONS | string;
  children?: React.ReactNode;
  className?: string;
}

export const TooltipTerm: React.FC<TooltipTermProps> = ({ term, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const def = DEFINITIONS[term];

  if (!def) {
    return <span className={className}>{children || term}</span>;
  }

  return (
    <span className="relative inline-flex items-center gap-1 group cursor-pointer">
      <span
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`border-b border-dotted border-teal-600 text-teal-900 font-medium ${className}`}
      >
        {children || term}
      </span>
      <HelpCircle
        size={13}
        className="text-teal-600 opacity-60 group-hover:opacity-100 transition-opacity"
      />

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-neutral-100 text-xs rounded-lg shadow-xl pointer-events-none transition-all"
        >
          <div className="font-semibold text-teal-300 mb-1">{def.title}</div>
          <div className="text-neutral-300 leading-relaxed">{def.explanation}</div>
          {def.formula && (
            <div className="mt-2 pt-1 border-t border-neutral-700 text-teal-200 font-mono text-[11px]">
              {def.formula}
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </span>
  );
};

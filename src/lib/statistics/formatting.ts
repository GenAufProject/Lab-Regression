/**
 * Number and formula formatting utilities.
 */

export function formatNumber(
  val: number | null | undefined,
  decimals = 3,
  options?: {
    forceScientific?: boolean;
    showSign?: boolean;
    useGrouping?: boolean;
  }
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  if (!isFinite(val)) {
    return val > 0 ? '+∞' : '-∞';
  }

  // Very small non-zero numbers
  const abs = Math.abs(val);
  if (abs > 0 && (abs < Math.pow(10, -decimals) || abs >= 1000000 || options?.forceScientific)) {
    const expStr = val.toExponential(decimals);
    // Convert e.g. 1.234e-5 into standard exponential or unicode representation
    return expStr;
  }

  const sign = options?.showSign && val > 0 ? '+' : '';
  const formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: options?.useGrouping ?? false,
  });

  return `${sign}${formatted}`;
}

/**
 * Formats a linear equation: y = a + bx
 */
export function formatLinearEquation(
  slope: number,
  intercept: number,
  decimals = 3,
  xSymbol = 'X',
  ySymbol = 'Y'
): {
  plain: string;
  latex: string;
} {
  const b = slope;
  const a = intercept;

  const aFormatted = formatNumber(a, decimals);
  const bAbs = formatNumber(Math.abs(b), decimals);
  const bSign = b >= 0 ? '+' : '-';

  // Plain string
  const plain = `${ySymbol} = ${aFormatted} ${bSign} ${bAbs}${xSymbol}`;

  // LaTeX string for KaTeX
  const latex = `${ySymbol} = ${aFormatted} ${bSign} ${bAbs}\\,${xSymbol}`;

  return { plain, latex };
}

/**
 * Formats an exponential pharmacokinetic model: C(t) = C0 * e^(-kt)
 */
export function formatPKModel(
  c0: number,
  k: number,
  decimals = 3,
  timeSymbol = 't',
  concSymbol = 'C(t)'
): {
  plain: string;
  latex: string;
} {
  const c0Str = formatNumber(c0, decimals);
  const kStr = formatNumber(k, decimals);

  const plain = `${concSymbol} = ${c0Str} × e^(-${kStr}${timeSymbol})`;
  const latex = `${concSymbol} = ${c0Str} \\cdot e^{-${kStr}${timeSymbol}}`;

  return { plain, latex };
}

/**
 * Phase 2: Formats a p-value with adaptive precision.
 * - p < 0.001 → "< 0.001"
 * - p < 0.01  → 3 decimals
 * - p < 0.05  → 3 decimals
 * - p < 0.10  → 3 decimals
 * - p >= 0.10 → 2 decimals
 *
 * Spec §34: this is the presentation layer; the engine stores full precision.
 */
export function formatPValue(p: number | null | undefined): string {
  if (p === null || p === undefined || isNaN(p)) return '—';
  if (!isFinite(p)) return p > 0 ? '1.000' : '0.000';
  if (p < 0.001) return '< 0.001';
  if (p < 0.1) return p.toFixed(3);
  return p.toFixed(2);
}

/**
 * Phase 2: Returns a human-readable significance label for a p-value.
 * Useful for inline indicators next to slope estimates.
 */
export function significanceLabel(p: number | null | undefined): {
  label: string;
  symbol: string;
  color: 'emerald' | 'amber' | 'neutral';
} {
  if (p === null || p === undefined || isNaN(p)) {
    return { label: 'n/a', symbol: '', color: 'neutral' };
  }
  if (p < 0.001) return { label: 'highly significant', symbol: '***', color: 'emerald' };
  if (p < 0.01) return { label: 'very significant', symbol: '**', color: 'emerald' };
  if (p < 0.05) return { label: 'significant', symbol: '*', color: 'emerald' };
  if (p < 0.1) return { label: 'marginal', symbol: '†', color: 'amber' };
  return { label: 'not significant', symbol: 'ns', color: 'neutral' };
}

/**
 * Phase 2: Formats a confidence level (0.95) as a percentage string ("95%").
 */
export function formatConfidenceLevel(level: number): string {
  if (level <= 0 || level >= 1) return '—';
  return `${Math.round(level * 100)}%`;
}

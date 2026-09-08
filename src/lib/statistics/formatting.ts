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

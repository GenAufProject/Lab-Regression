import { describe, expect, it } from 'vitest';
import {
  formatConfidenceLevel,
  formatLinearEquation,
  formatNumber,
  formatPValue,
  formatPKModel,
  significanceLabel,
} from '../formatting';

describe('formatNumber', () => {
  it('returns "—" for null, undefined, and NaN', () => {
    expect(formatNumber(null, 3)).toBe('—');
    expect(formatNumber(undefined, 3)).toBe('—');
    expect(formatNumber(NaN, 3)).toBe('—');
  });

  it('returns "+∞" / "-∞" for non-finite values', () => {
    expect(formatNumber(Infinity, 3)).toBe('+∞');
    expect(formatNumber(-Infinity, 3)).toBe('-∞');
  });

  it('formats to the requested number of decimals', () => {
    expect(formatNumber(3.14159265, 2)).toBe('3.14');
    expect(formatNumber(3.14159265, 4)).toBe('3.1416');
    expect(formatNumber(2.5, 0)).toBe('3'); // toLocaleString rounds
  });

  it('uses scientific notation for very small non-zero numbers', () => {
    const result = formatNumber(0.00001, 3);
    expect(result).toMatch(/e/);
  });

  it('uses scientific notation for very large numbers', () => {
    const result = formatNumber(1_000_000, 3);
    expect(result).toMatch(/e/);
  });

  it('shows explicit + sign when showSign is true and value > 0', () => {
    expect(formatNumber(3.14, 2, { showSign: true })).toBe('+3.14');
    expect(formatNumber(-3.14, 2, { showSign: true })).toBe('-3.14');
  });

  it('does not add + sign when value is 0', () => {
    expect(formatNumber(0, 2, { showSign: true })).toBe('0.00');
  });
});

describe('formatPValue (Phase 2)', () => {
  it('returns "—" for null, undefined, NaN', () => {
    expect(formatPValue(null)).toBe('—');
    expect(formatPValue(undefined)).toBe('—');
    expect(formatPValue(NaN)).toBe('—');
  });

  it('returns "< 0.001" for very small p-values', () => {
    expect(formatPValue(0.0001)).toBe('< 0.001');
    expect(formatPValue(0.00001)).toBe('< 0.001');
    expect(formatPValue(0)).toBe('< 0.001');
  });

  it('returns 3 decimals for p in [0.001, 0.1)', () => {
    expect(formatPValue(0.05)).toBe('0.050');
    expect(formatPValue(0.025)).toBe('0.025');
    expect(formatPValue(0.001)).toBe('0.001');
    expect(formatPValue(0.099)).toBe('0.099');
  });

  it('returns 2 decimals for p ≥ 0.1', () => {
    expect(formatPValue(0.1)).toBe('0.10');
    expect(formatPValue(0.5)).toBe('0.50');
    expect(formatPValue(1)).toBe('1.00');
  });
});

describe('significanceLabel (Phase 2)', () => {
  it('returns "***" highly significant for p < 0.001', () => {
    const r = significanceLabel(0.0001);
    expect(r.symbol).toBe('***');
    expect(r.color).toBe('emerald');
  });

  it('returns "**" very significant for 0.001 ≤ p < 0.01', () => {
    const r = significanceLabel(0.005);
    expect(r.symbol).toBe('**');
    expect(r.color).toBe('emerald');
  });

  it('returns "*" significant for 0.01 ≤ p < 0.05', () => {
    const r = significanceLabel(0.03);
    expect(r.symbol).toBe('*');
    expect(r.color).toBe('emerald');
  });

  it('returns "†" marginal for 0.05 ≤ p < 0.1', () => {
    const r = significanceLabel(0.07);
    expect(r.symbol).toBe('†');
    expect(r.color).toBe('amber');
  });

  it('returns "ns" not significant for p ≥ 0.1', () => {
    const r = significanceLabel(0.3);
    expect(r.symbol).toBe('ns');
    expect(r.color).toBe('neutral');
  });

  it('handles invalid p-values gracefully', () => {
    expect(significanceLabel(null).label).toBe('n/a');
    expect(significanceLabel(undefined).label).toBe('n/a');
    expect(significanceLabel(NaN).label).toBe('n/a');
  });
});

describe('formatConfidenceLevel (Phase 2)', () => {
  it('formats 0.95 → "95%"', () => {
    expect(formatConfidenceLevel(0.95)).toBe('95%');
  });
  it('formats 0.90 → "90%"', () => {
    expect(formatConfidenceLevel(0.9)).toBe('90%');
  });
  it('formats 0.99 → "99%"', () => {
    expect(formatConfidenceLevel(0.99)).toBe('99%');
  });
  it('returns "—" for out-of-range values', () => {
    expect(formatConfidenceLevel(0)).toBe('—');
    expect(formatConfidenceLevel(1)).toBe('—');
    expect(formatConfidenceLevel(-0.1)).toBe('—');
    expect(formatConfidenceLevel(1.1)).toBe('—');
  });
});

describe('formatLinearEquation', () => {
  it('formats y = a + bx for positive slope', () => {
    const r = formatLinearEquation(0.6, 2.2, 3);
    expect(r.plain).toContain('2.200');
    expect(r.plain).toContain('+');
    expect(r.plain).toContain('0.600');
  });

  it('formats y = a - bx for negative slope', () => {
    const r = formatLinearEquation(-0.5, 10, 3);
    expect(r.plain).toContain('10.000');
    expect(r.plain).toContain('-');
    expect(r.plain).toContain('0.500');
  });

  it('produces valid LaTeX for KaTeX rendering', () => {
    const r = formatLinearEquation(0.6, 2.2, 3);
    // The LaTeX uses \, (thin space) between slope and variable, which is
    // standard KaTeX notation. Just verify the numeric values are present.
    expect(r.latex).toContain('2.200');
    expect(r.latex).toContain('0.600');
    expect(r.latex).toContain('Y');
    expect(r.latex).toContain('X');
  });
});

describe('formatPKModel', () => {
  it('formats C(t) = C0 · e^(-kt)', () => {
    const r = formatPKModel(10, 0.2, 3);
    expect(r.plain).toContain('10.000');
    expect(r.plain).toContain('e^(-0.200');
    expect(r.latex).toContain('e^{-0.200');
  });
});

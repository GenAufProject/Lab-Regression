import { TrapezoidalAUC } from '../../types';

/**
 * Phase 4 — Linear trapezoidal AUC computation (spec §13, §14).
 *
 *   AUC_last  = Σ_{i=1}^{n-1} [(C_i + C_{i+1}) / 2] × (t_{i+1} − t_i)
 *
 * The linear trapezoidal rule is the simplest NCA (non-compartmental analysis)
 * AUC estimator. It assumes concentration varies linearly between adjacent
 * observations. For pure exponential decay this slightly overestimates AUC
 * (because the true curve is convex downward), but it is the standard
 * educational baseline and matches regulatory NCA conventions.
 *
 * Spec §13: validate chronological time ordering, finite values, valid
 * intervals. Returns a structured TrapezoidalAUC object with per-interval
 * areas so the UI can render a calculation trace.
 *
 * Spec §14: extrapolation AUC_extra = C_last / k is computed separately
 * (see extrapolateAUC below) and only when k > 0 and C_last > 0.
 *
 * Spec §34: no rounding — full IEEE-754 precision throughout.
 */
export function calculateTrapezoidalAUC(
  points: { time: number; concentration: number }[]
): {
  aucLast: number;
  intervals: TrapezoidalAUC['intervals'];
  cLast: number;
  tLast: number;
} {
  if (points.length < 2) {
    return {
      aucLast: 0,
      intervals: [],
      cLast: points.length === 1 ? points[0].concentration : NaN,
      tLast: points.length === 1 ? points[0].time : NaN,
    };
  }

  // Sort by time ascending (defensive — caller is expected to pre-sort,
  // but we never want to silently produce negative Δt areas).
  const sorted = [...points].sort((a, b) => a.time - b.time);

  const intervals: TrapezoidalAUC['intervals'] = [];
  let aucLast = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const tStart = sorted[i].time;
    const tEnd = sorted[i + 1].time;
    const cStart = sorted[i].concentration;
    const cEnd = sorted[i + 1].concentration;
    const dt = tEnd - tStart;
    // Trapezoid area = (cStart + cEnd) / 2 × Δt
    // Negative concentrations would produce negative areas — we compute
    // them anyway (the caller's validation should have caught these)
    // but flag them by leaving the area signed.
    const area = ((cStart + cEnd) / 2) * dt;
    aucLast += area;
    intervals.push({ tStart, tEnd, cStart, cEnd, area });
  }

  const last = sorted[sorted.length - 1];
  return {
    aucLast,
    intervals,
    cLast: last.concentration,
    tLast: last.time,
  };
}

/**
 * Phase 4 — AUC extrapolation to infinity (spec §14).
 *
 *   AUC_extra = C_last / k
 *
 * This extrapolates the tail of the AUC from the last observed time point
 * to infinity, assuming first-order elimination continues beyond the
 * observation window.
 *
 * Validation (spec §14): do NOT calculate extrapolated AUC when:
 *   - k is invalid (k ≤ 0, NaN, Infinity)
 *   - C_last is invalid (≤ 0, NaN, Infinity)
 *   - the terminal regression itself failed
 *
 * Returns a structured object so the UI can explicitly label the
 * extrapolated component as model-dependent.
 */
export function extrapolateAUC(cLast: number, k: number): {
  aucExtra: number;
  suppressed: boolean;
  suppressedReason?: string;
} {
  if (!isFinite(k) || k <= 0) {
    return {
      aucExtra: NaN,
      suppressed: true,
      suppressedReason: `Extrapolation suppressed: elimination rate constant k must be finite and > 0 (received k = ${k}).`,
    };
  }
  if (!isFinite(cLast) || cLast <= 0) {
    return {
      aucExtra: NaN,
      suppressed: true,
      suppressedReason: `Extrapolation suppressed: last observed concentration must be finite and > 0 (received C_last = ${cLast}).`,
    };
  }
  return {
    aucExtra: cLast / k,
    suppressed: false,
  };
}

/**
 * Phase 4 — Compose the full TrapezoidalAUC result object.
 *
 * Combines:
 *   - AUC_last (trapezoidal, from observed data)
 *   - AUC_extra = C_last / k (model-based extrapolation, if valid)
 *   - AUC_total = AUC_last + AUC_extra
 *   - AUC_theoretical = C₀ / k (model-based, from Phase 2)
 *   - extrapFraction = AUC_extra / AUC_total (regulatory flag if > 0.20)
 *
 * Spec §34: no rounding.
 */
export function composeTrapezoidalAUC(
  points: { time: number; concentration: number }[],
  k: number,
  c0: number,
  aucTheoretical: number
): TrapezoidalAUC {
  const trap = calculateTrapezoidalAUC(points);
  const extrap = extrapolateAUC(trap.cLast, k);

  const aucExtra = extrap.aucExtra;
  const aucTotal = extrap.suppressed ? NaN : trap.aucLast + aucExtra;
  const extrapFraction =
    !extrap.suppressed && isFinite(aucTotal) && aucTotal > 0
      ? aucExtra / aucTotal
      : NaN;

  return {
    aucLast: trap.aucLast,
    intervals: trap.intervals,
    aucExtra,
    aucTotal,
    aucTheoretical,
    extrapFraction,
    extrapolationSuppressed: extrap.suppressed,
    extrapolationSuppressedReason: extrap.suppressedReason,
  };
}

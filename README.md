# Regression Lab — Phase 2 Statistical Engine Documentation

> **Phase 2 scope**: audit, validate, refactor, and harden the existing
> statistical engine. The UI is preserved; only labels that conflated
> RMSE with the residual standard error have been corrected (spec §11, §32).

## 1. Architecture

```
src/lib/statistics/         ← pure mathematical engine (no React, no rounding)
  descriptive.ts            ← mean, sum, variance, std dev, sumOfSquares, minMax
  linearRegression.ts       ← OLS fit, leverage, studentized residuals, Cook's D, p-values
  transformations.ts        ← ln / log10 / sqrt with strict domain validation
  residuals.ts              ← educational residual diagnostics
  formatting.ts             ← presentation-layer formatting ONLY (spec §34)
src/lib/pharmacokinetics/   ← PK prototype (audited, not redesigned — spec §24)
  elimination.ts            ← k, t½, C0, Vd, CL, AUC₀→∞, prediction interval helper
  pkRegression.ts           ← log-linear regression wrapper for PK data
src/types.ts                ← shared domain types
src/lib/**/__tests__/       ← vitest unit tests (189 tests, 6 suites)
```

The engine is **pure**: no React, no DOM, no I/O. React components consume
statistical results; they never re-implement formulas (spec §30).

## 2. Statistical Definitions

### 2.1 Simple Linear Regression (OLS)

Given paired observations `(xᵢ, yᵢ)` for `i = 1..n`:

| Quantity | Formula | Notes |
|---|---|---|
| Means | `x̄ = Σxᵢ/n`, `ȳ = Σyᵢ/n` | Computed with full float precision |
| Centered values | `dxᵢ = xᵢ − x̄`, `dyᵢ = yᵢ − ȳ` | Used for numerical stability (spec §5) |
| `Sxx` | `Σ(dxᵢ²)` | Sum of squared X deviations |
| `Syy` | `Σ(dyᵢ²)` | Total sum of squares (SST) |
| `Sxy` | `Σ(dxᵢ · dyᵢ)` | Cross-product sum |
| Slope | `b = Sxy / Sxx` | Undefined when `Sxx = 0` |
| Intercept | `a = ȳ − b · x̄` | Line passes through `(x̄, ȳ)` |
| Prediction | `ŷᵢ = a + b · xᵢ` | |
| Residual | `eᵢ = yᵢ − ŷᵢ` | Sign convention: observed − predicted |
| SSE | `Σeᵢ²` | Error sum of squares |
| SSR | `Σ(ŷᵢ − ȳ)²` | Regression sum of squares |
| SST | `Σ(yᵢ − ȳ)² = Syy` | Total sum of squares |
| OLS identity | `SST = SSR + SSE` | Holds exactly for OLS with intercept |
| `R²` | `1 − SSE/SST` | Clamped to `[0,1]` for display; raw value also exposed |
| Pearson `r` | `Sxy / √(Sxx · Syy)` | Sign matches slope; undefined when `Sxx=0` or `Syy=0` |

### 2.2 Residual Standard Error vs RMSE (spec §11)

This distinction is critical and was previously conflated in the codebase.

| Quantity | Formula | Use |
|---|---|---|
| **Residual standard error** `s` | `√(SSE / (n−2))` | Used for `SE(b)`, `SE(a)`, CIs, PIs — the canonical OLS quantity |
| **Prediction RMSE** | `√(SSE / n)` | Used in forecasting / ML contexts; *not* used for inference |

The historical `stats.rmse` field actually computes `s = √(SSE/(n−2))`. To remove
the ambiguity (spec §11), the engine now exposes:

- `stats.residualStandardError` — canonical name, value `√(SSE/(n−2))`
- `stats.rmse` — deprecated alias, **same value** as `residualStandardError` (kept for backward compat)
- `stats.predictionRMSE` — the true RMSE, value `√(SSE/n)` (new field)

UI labels now correctly say "Residual Std. Error (s)" instead of "RMSE".

### 2.3 Standard Errors

| Quantity | Formula |
|---|---|
| `SE(b)` | `s / √Sxx` |
| `SE(a)` | `s · √(1/n + x̄²/Sxx)` |

Both use the residual standard error `s`, **not** the prediction RMSE.

### 2.4 Confidence Intervals

For confidence level `1 − α` and `df = n − 2`:

| Interval | Formula |
|---|---|
| Slope CI | `b ± t(1−α/2, df) · SE(b)` |
| Intercept CI | `a ± t(1−α/2, df) · SE(a)` |
| Mean response CI at `x₀` | `ŷ₀ ± t · SEmean`, where `SEmean = s · √(1/n + (x₀−x̄)²/Sxx)` |
| Prediction interval at `x₀` | `ŷ₀ ± t · SEpred`, where `SEpred = s · √(1 + 1/n + (x₀−x̄)²/Sxx)` |

The prediction interval is **always wider** than the confidence interval because
it includes the additional `σ²` term representing observation noise.

The Student-t critical value is looked up from exact tables for `df ∈ {1..120}`
at confidence levels `0.90 / 0.95 / 0.99`, linearly interpolated between tabled
values, and falls back to the normal `z` critical value (via Acklam's inverse
normal CDF) for non-tabled levels or `df > 120`.

### 2.5 Hypothesis Testing (Phase 2)

| Statistic | Formula | p-value |
|---|---|---|
| Slope t-stat | `t_b = b / SE(b)` | Two-tailed Student-t p-value via incomplete beta function |
| Intercept t-stat | `t_a = a / SE(a)` | Two-tailed Student-t p-value |
| Overall F-stat | `F = MSR / MSE = (SSR/1) / MSE` | Equals `t_b²` for simple regression |

p-values are computed via the regularized incomplete beta function
`I_x(a, b)` (Lentz's continued fraction, Numerical Recipes 6.4) with a
normal-CDF fast path for `df > 200`. Accuracy: ~1e-5 across the full range.

### 2.6 Leverage, Studentized Residuals, Cook's Distance (Phase 2)

| Quantity | Formula | Threshold |
|---|---|---|
| Leverage `h_ii` | `1/n + (xᵢ − x̄)²/Sxx` | High leverage if `h > 2(k+1)/n = 4/n` |
| Internally studentized residual `rᵢ` | `eᵢ / (s · √(1 − h_ii))` | Outlier if `|rᵢ| ≥ 2` |
| Cook's distance `Dᵢ` | `(rᵢ²/2) · (h_ii / (1 − h_ii))` | Influential if `Dᵢ > 4/n` |

Reference: Montgomery, Peck & Vining (2012), Ch. 5.

## 3. Transformations

| Transform | Domain | Back-transform | Note |
|---|---|---|---|
| `none` | all reals | identity | |
| `ln` | `x > 0` | `exp(x)` | Returns median prediction (Jensen bias on mean) |
| `log10` | `x > 0` | `10^x` | `ln(x) = ln(10) · log10(x)` |
| `sqrt` | `x ≥ 0` | `x²` | Accepts 0 (distinct from log domain) |

Domain violations return a structured error listing all offending values
(spec §21, §33), never silent NaNs. The original dataset is never mutated;
`transformDataset` returns a defensive copy (spec §22).

The `axis` field correctly reports `'none'` when both transforms are `'none'`
(Phase 2 fix — previously defaulted to `'y'`).

## 4. Pharmacokinetic Module (audited, not redesigned — spec §24)

The PK module fits a log-linear regression to concentration-time data and
derives first-order elimination parameters:

| Parameter | Formula | Notes |
|---|---|---|
| `k` (elimination rate) | `−slope` (ln) or `−slope · ln(10)` (log10) | Units: `time⁻¹` |
| `t½` (half-life) | `ln(2) / k` | NaN when `k ≤ 0` |
| `C₀` (initial conc.) | `exp(intercept)` (ln) or `10^intercept` (log10) | |
| `Vd` (volume of dist.) | `Dose / C₀` | Requires dose input |
| `CL` (clearance) | `k · Vd` | Cross-checked against `Dose / AUC` |
| `AUC₀→∞` (Phase 2) | `C₀ / k` | New; equals `∫₀^∞ C₀ e^(-kt) dt` |
| `CL from AUC` (Phase 2) | `Dose / AUC` | Independent cross-check of `k · Vd` |

For perfectly specified mono-exponential data, `CL(k·Vd) = CL(Dose/AUC)` to
floating-point precision. A meaningful discrepancy (>0.01%) emits a warning
indicating the data deviates from a pure mono-exponential decay.

A `predictConcentrationWithInterval` helper computes a back-transformed
prediction interval on the original concentration scale (asymmetric due to
the non-linear back-transform — the standard PK convention).

**Limitation (deferred to Phase 3+)**: only IV bolus one-compartment
first-order elimination is supported. Oral absorption, infusion, multi-
compartment models, and trapezoidal AUC are intentionally NOT implemented
in Phase 2.

## 5. Input Validation

The engine validates inputs centrally (spec §6):

| Error type | Trigger |
|---|---|
| `INSUFFICIENT_DATA` | `n < 2` valid pairs |
| `ZERO_VARIANCE_X` | All X values identical (`Sxx = 0`) |
| `NON_FINITE_VALUE` | NaN or Infinity in input (filtered before computing) |
| `LENGTH_MISMATCH` | X and Y arrays of different lengths (where applicable) |
| `DOMAIN_ERROR` | Transform domain violation (e.g., `ln(0)`) |
| `NON_POSITIVE_CONCENTRATION` | PK: any concentration ≤ 0 |

Errors never return silent `NaN` or misleading zeros; they always return a
structured `{ status: 'error', error: { type, message, detail } }` result.

## 6. Numerical Stability (spec §5)

- All sums of squares use **centered** calculations: `Sxx = Σ(xᵢ − x̄)²`,
  never the algebraically equivalent but numerically unstable `Σxᵢ² − (Σxᵢ)²/n`.
- No intermediate rounding (spec §34). The engine stores full IEEE-754
  double precision throughout; rounding happens only in `formatting.ts`
  at the presentation layer.
- Leverage `h_ii` is clamped to `[0, 1]` to guard against floating-point
  excursions near the bounds.
- `R²` is exposed both raw (`rSquaredRaw`) and clamped (`rSquared`) so
  diagnostic transparency is preserved.

## 7. Rounding Policy (spec §34)

**Inside the engine**: never round. Store full float64 precision.

```ts
// BAD — never do this in the engine
const slope = Number(rawSlope.toFixed(4));

// GOOD
const slope = rawSlope;
```

**At the presentation layer**: use `formatNumber(value, decimals)` from
`formatting.ts`. The `decimals` preference is user-controlled in Settings.

The two PK display strings `equationFitted` and `equationNatural` are
**deprecated** display-only fields that violate this policy. They are kept
for backward compatibility but marked deprecated; the UI should build its
own display strings from the full-precision numeric fields.

## 8. Edge Case Behavior

| Case | Behavior |
|---|---|
| `n < 2` | `INSUFFICIENT_DATA` error |
| `n = 2` | Perfect fit (`R²=1`, `SSE=0`), `df=0`, no inferential stats |
| All X identical | `ZERO_VARIANCE_X` error |
| All Y identical | `slope=0`, `R²=1` by convention, `r=0` |
| Perfect linear fit | `SSE=0`, `s=0`, `SE(b)=0`, p-values are NaN (degenerate) |
| NaN/Infinity in input | Filtered out before computing; `n` reflects valid pairs only |
| Large magnitudes (`1e6`) | No precision loss; uses centered calculations |
| Small magnitudes (`1e-6`) | No precision loss |

## 9. Invariants Tested (spec §27)

The test suite verifies these mathematical identities with float tolerances:

- `SST = SSR + SSE` (OLS identity)
- `Σ residuals = 0` (when intercept is included)
- `Σ residualSquared = SSE`
- `R² = 1` and `SSE = 0` for perfect linear data
- `r² = R²` (Pearson r squared equals coefficient of determination)
- `F = t_b²` for simple regression (one slope parameter)
- `p(F) = p(t_b)` for simple regression
- `CL(k·Vd) = Dose/AUC` for one-compartment IV bolus
- `ln(x) = ln(10) · log10(x)` (logarithm change-of-base)
- `AUC = C₀/k` for the mono-exponential model

## 10. Test Suite

```
Test Files  6 passed (6)
     Tests  189 passed (189)
  Duration  ~1s
```

| Suite | Tests | Coverage |
|---|---|---|
| `descriptive.test.ts` | 22 | mean, sum, variance, std dev, sumOfSquares, minMax, edge cases |
| `linearRegression.test.ts` | 60 | canonical dataset, perfect fit, edge cases, t-critical, z-critical, p-values, predictY, invariants |
| `transformations.test.ts` | 30 | ln/log10/sqrt/none, domain validation, axis reporting, back-transform, invariants |
| `residuals.test.ts` | 10 | curvature, leverage, Cook's D, outliers, well-behaved, finding structure |
| `formatting.test.ts` | 25 | formatNumber, formatPValue, significanceLabel, formatConfidenceLevel, equations |
| `elimination.test.ts` (PK) | 42 | all PK formulas, AUC, CL cross-check, prediction intervals, edge cases |

## 11. Build & Run

```bash
bun install
bun run lint     # tsc --noEmit
bun run test     # vitest run
bun run build    # vite build
bun run dev      # vite dev server on :3000
```

## 12. Phase 2 Limitations (deferred)

The following are intentionally **out of scope** for Phase 2 (spec §39):

- Multiple regression (more than one predictor)
- Nonlinear regression
- ANOVA tables beyond the overall F-test
- Advanced hypothesis testing (Breusch-Pagan, Shapiro-Wilk, Durbin-Watson)
- Multi-compartment PK models
- Oral absorption / infusion PK
- Trapezoidal AUC computation
- Automated PK model selection
- Machine learning
- User authentication, cloud database, production analytics

These belong to Phase 3 and beyond. The Phase 2 deliverable is a
**mathematically correct, numerically reliable, strongly typed, testable**
statistical engine ready to serve as the foundation for those future phases.

# Regression Lab — Statistical Engine Documentation

> **Phase 4 scope**: build a comprehensive, regression-based pharmacokinetics
> analysis engine on top of the Phase 2/3 infrastructure. The PK engine
> reuses the validated OLS engine via `analyzePKData` (no duplicate math —
> spec §6). Adds trapezoidal AUC, AUC extrapolation, terminal-phase
> selection, prediction tables, calculation trace, educational
> interpretation, and a centralized unit registry. Phase 1-3 content is
> preserved; this README is additive.

## 0. Phase 4 — Pharmacokinetics Analysis Engine

### 0.1 What was added

```
src/lib/pharmacokinetics/
  pkAnalysis.ts              ← NEW: Phase 4 canonical entry point (analyzeFirstOrderElimination)
  trapezoidalAUC.ts          ← NEW: linear trapezoidal AUC + extrapolation
  terminalPhase.ts           ← NEW: deterministic terminal-phase selection
  pkInterpretation.ts        ← NEW: educational narratives for k, t½, C₀, R², AUC
  pkUnits.ts                 ← NEW: centralized unit registry + derived-unit helpers
src/components/pk/
  PKWorkspace.tsx            ← UPGRADED: 10 organized sections, terminal-phase viz, AUC panel,
                                prediction table, calculation trace, interpretation cards
src/lib/data/
  sampleDatasets.ts          ← + 3 new PK datasets (clean, noisy, non-first-order)
src/types.ts                 ← + PKAnalysisSuccess, PKAnalysisError, TrapezoidalAUC,
                                TerminalPhase, PKPredictionRow, PKCalculationStep,
                                PKWarning, PKInterpretation, PKObservation, PKRoute
src/lib/pharmacokinetics/__tests__/
  pkAnalysis.test.ts         ← NEW: 61 tests
```

### 0.2 Architecture (spec §3)

```
UI (PKWorkspace.tsx)
  ↓
PK Analysis Service (pkAnalysis.ts)
  ↓
Phase 2 analyzePKData → Phase 2 calculateSimpleLinearRegression
  ↓
Pure Mathematical Functions (elimination.ts, trapezoidalAUC.ts)
```

The PK analysis service is the single entry point. React components never
compute slope, intercept, k, t½, C₀, AUC, or residuals directly (spec §3).

### 0.3 First-Order Elimination Model

The engine fits the linearized form of the first-order elimination equation:

| Log base | Linearized form | Slope interpretation | Back-transform |
|---|---|---|---|
| ln       | `ln(C) = ln(C₀) − kt`            | `slope = −k`                | `C = e^(a+bt)`     |
| log10    | `log10(C) = log10(C₀) − (k/ln10)t` | `slope = −k/ln(10)`       | `C = 10^(a+bt)`    |

Derived PK parameters:

| Parameter | Formula | Notes |
|---|---|---|
| k (elimination rate) | `k = −slope` (ln) or `−slope × ln(10)` (log10) | Units: time⁻¹ |
| t½ (half-life) | `t½ = ln(2) / k` | NaN when k ≤ 0 |
| C₀ (initial conc.) | `C₀ = e^intercept` (ln) or `10^intercept` (log10) | Extrapolated, not observed |
| Vd (vol. of dist.) | `Vd = Dose / C₀` | Requires dose input |
| CL (clearance) | `CL = k × Vd = Dose / AUC` | Two independent computations |

### 0.4 AUC — Trapezoidal + Extrapolation (spec §13, §14)

The Phase 4 engine adds the standard non-compartmental AUC components:

```
AUC_last  = Σ [(C_i + C_{i+1}) / 2] × (t_{i+1} − t_i)    (linear trapezoidal, observed data)
AUC_extra = C_last / k                                     (model-based extrapolation to ∞)
AUC_total = AUC_last + AUC_extra
AUC_theoretical = C₀ / k                                   (model-based, for comparison)
extrapFraction = AUC_extra / AUC_total                     (regulatory flag if > 20%)
```

**Extrapolation is suppressed** (returns NaN) when:
- k ≤ 0, NaN, or Infinity
- C_last ≤ 0, NaN, or Infinity

The UI explicitly labels AUC_extra as model-dependent and warns when the
extrapolated fraction exceeds 20%.

### 0.5 Terminal-Phase Selection (spec §15)

Two deterministic strategies:

1. **`all-points`** (default) — use every valid observation. Appropriate for
   clean educational IV bolus data where the entire curve is terminal.

2. **`best-rsquared-suffix`** — try every contiguous suffix of length ≥ 3
   from the end of the time-sorted data, pick the one with the highest R²
   on the log-linear fit. Deterministic and fully explainable: "we tried
   every suffix from the end and picked the one with the best linear fit."

The selected indices, point count, time range, method, R², and a human-
readable explanation are exposed on the `TerminalPhase` result object.

### 0.6 Predictions & Residuals (spec §11, §12)

Each observation produces a `PKPredictionRow` with:

| Field | Meaning |
|---|---|
| `concentrationObserved` | Raw measured concentration |
| `concentrationTransformed` | `ln(C)` or `log10(C)` |
| `concentrationPredictedTransformed` | `ẑ = a + b·t` |
| `concentrationPredicted` | Back-transformed: `e^ẑ` or `10^ẑ` |
| `residualTransformed` | `e_i = z_i − ẑ_i` (what OLS minimizes) |
| `residualOriginal` | `y_i − ŷ_i` (informational only) |
| `inTerminalPhase` | Whether this point is in the selected terminal phase |

The `predictConcentration(time, regression)` helper is reusable for
predictions at arbitrary times.

### 0.7 Calculation Trace (spec §17)

The engine generates a 7-step calculation trace, consumed verbatim by the UI:

1. Transform C → z = log(C)
2. Fit OLS regression: z = a + b·t
3. Extract the slope (b)
4. Derive elimination rate constant (k)
5. Calculate half-life (t½)
6. Estimate initial concentration (C₀)
7. Compute AUC (trapezoidal + extrapolation)

Each step has `step`, `title`, `description`, `formulaLatex`, and `result`.
Generated by the domain layer; React renders verbatim.

### 0.8 Educational Interpretation (spec §19)

The `PKInterpretation` object provides narratives for k, t½, R², C₀, and AUC.
The narratives explicitly avoid overclaiming:
- R² narrative: "a high R² alone does NOT prove that the first-order
  elimination model is appropriate"
- C₀ narrative: "C₀ is NOT necessarily an observed measurement — it is the
  model's prediction at t = 0"
- AUC narrative: "values above 20% suggest the sampling window may be too
  short and the AUC_total estimate becomes model-dependent"

### 0.9 Unit Handling (spec §18)

Centralized in `pkUnits.ts`:
- `TIME_UNITS`, `CONCENTRATION_UNITS`, `DOSE_UNITS` registries
- `unitDisplayName(symbol, category)` — symbol → human-readable
- `isKnownUnit(symbol, category)` — validation
- `deriveAUCUnitLabel(units)` — `${concentration}·${time}` (e.g. "mg/L·h")
- `deriveClearanceUnitLabel(units)` — infers volume from concentration
  denominator (e.g. "L/h", "mL/min")
- `deriveVdUnitLabel(units)` — infers volume unit

**No silent unit conversion.** The engine never converts between units; if
the user selects "mg/L", all values are reported in mg/L.

### 0.10 Validation & Error Handling (spec §5, §22, §29)

Fatal errors (return `PKAnalysisError`):

| Error type | Trigger |
|---|---|
| `INSUFFICIENT_DATA` | n < 2 valid pairs |
| `NON_FINITE_VALUE` | NaN or Infinity in time or concentration |
| `NON_POSITIVE_CONCENTRATION` | Any concentration ≤ 0 (required for log transform) |
| `ZERO_TIME_VARIANCE` | All time values identical |
| `INVALID_REGRESSION` | Underlying OLS regression failed |

Non-fatal warnings (return `PKWarning[]` on success):

| Warning code | Trigger |
|---|---|
| `POSITIVE_SLOPE` | Fitted slope ≥ 0 (contradicts first-order elimination) |
| `POOR_TERMINAL_FIT` | R² < 0.90 on the log scale |
| `HIGH_EXTRAPOLATION_FRACTION` | extrapFraction > 20% |
| `FEW_TERMINAL_POINTS` | Terminal phase has < 3 points |
| `DUPLICATE_TIMES` | Input contains duplicate time values |
| `NON_MONOTONIC_TIME` | Input times not in ascending order |

### 0.11 Phase 4 Test Suite

```
Test Files  8 passed (8)
     Tests  306 passed (306)   ← 245 (Phase 1-3) + 61 (Phase 4)
```

The new `pkAnalysis.test.ts` (61 tests) covers:
- First-order regression on synthetic data (spec §24)
- ln vs log10 equivalence (spec §7)
- Prediction (spec §11)
- Trapezoidal AUC (spec §13)
- AUC extrapolation (spec §14)
- Terminal-phase selection (spec §15)
- PK calculation trace (spec §17)
- Cross-validation with regression engine (spec §25)
- Validation & error handling (spec §5, §22, §29)
- Educational interpretation (spec §19)
- Unit handling (spec §18)
- No rounding inside the engine (spec §26, §34)
- Regression safety — Phase 1-3 functionality intact (spec §33)

### 0.12 Sample Datasets (spec §23)

Three new PK datasets added:

1. **`pk-clean-first-order`** — `C(t) = 20·e^(−0.15t)`, 8 points, no noise.
   Expected: k = 0.15 h⁻¹, t½ ≈ 4.62 h, C₀ = 20 mg/L, R² = 1.000.

2. **`pk-noisy-first-order`** — same model with ±2-5% deterministic noise.
   Realistic measurement variability; R² ≈ 0.995+.

3. **`pk-non-first-order`** — bi-exponential `C(t) = 30·e^(−2t) + 12·e^(−0.1t)`.
   Demonstrates why terminal-phase selection matters: a single log-linear
   fit on all points shows curvature; the best-rsquared-suffix selector
   picks the late points (t ≥ 6h) and recovers k ≈ 0.1 h⁻¹.

### 0.13 Limitations (intentionally deferred per spec §32)

- No population PK / nonlinear mixed-effects modeling
- No multi-compartment modeling (the bi-exponential dataset is for
  teaching terminal-phase selection, not for fitting a 2-compartment model)
- No Bayesian PK / Monte Carlo simulation
- No bioequivalence statistics / NCA regulatory reporting
- No full IV infusion modeling (only IV bolus derived parameters: Vd, CL)
- No multiple-dose steady state
- No advanced dose optimization / clinical decision support
- No oral absorption / first-pass modeling
- Trapezoidal AUC uses linear trapezoidal rule only (log-trapezoidal and
  up-down options not implemented)

### 0.14 Educational Use Only

The PK module is an educational analysis tool for teaching how regression
is used to estimate pharmacokinetic parameters. It is NOT a substitute for
validated clinical/pharmacometric software. Never use the outputs for
patient-specific therapeutic drug monitoring or clinical dosing decisions.

---

# Phase 3 — Log-Linear Regression Engine (preserved)

## 0. Phase 3 — Log-Linear Regression Engine

### 0.1 What was added

```
src/lib/statistics/
  logRegression.ts          ← NEW: log-linear engine (reuses OLS)
  regressionAnalysis.ts     ← NEW: unified dispatcher (linear | log-linear)
  transformations.ts        ← UPGRADED: TRANSFORMATION_REGISTRY metadata
src/components/transformations/
  TransformationModule.tsx  ← UPGRADED: log-regression UI, dual-view, trace
src/components/charts/
  LogRegressionChart.tsx    ← NEW: dual-view chart (original curve | transformed line)
src/lib/data/
  sampleDatasets.ts         ← + exponential-decay-demo dataset (spec §30)
  learningContent.ts        ← + Lesson 19 "Why take the logarithm?" (spec §28)
  quizQuestions.ts          ← + 6 log-linear practice questions (spec §29)
src/types.ts                ← + LogRegressionResult, CalculationStep, etc.
src/lib/statistics/__tests__/
  logRegression.test.ts     ← NEW: 56 tests
```

### 0.2 Log-Linear Model Definition

A log-linear regression fits a linear model to a logarithmically transformed
response variable (spec §34):

```
ln(Y) = a + b·X        (natural-log model)
log10(Y) = a + b·X     (common-log model)
```

The engine transforms Y, fits the existing Phase 2 OLS regression on the
transformed scale, and back-transforms predictions via:

| Log base | Back-transform | Multiplicative factor | % change |
|---|---|---|---|
| ln       | ŷ = e^(a+bX)    | e^b        | (e^b − 1) × 100% |
| log10    | ŷ = 10^(a+bX)   | 10^b       | (10^b − 1) × 100% |

**Critical distinction (spec §11, §12):**
- R² is computed on the **transformed scale** and must not be directly compared
  to raw-Y R².
- Transformed residuals (e_i = z_i − ẑ_i) are what OLS minimizes.
- Original-scale differences (y_i − ŷ_i) are informational only.
- Back-transformed predictions are **median** predictions, not mean predictions
  (Jensen's inequality bias applies to the mean; a Duan smearing estimator
  would be needed for an unbiased mean estimate).

### 0.3 ln vs log10 — Mathematical Equivalence

The two log bases are mathematically equivalent (spec §17, §18):

```
log10(x) = ln(x) / ln(10)
```

Therefore, for the same dataset:
- `slope_log10 = slope_ln / ln(10)`
- `intercept_log10 = intercept_ln / ln(10)`
- Back-transformed predictions are identical (within floating-point tolerance)
- R² is identical
- Multiplicative factor `e^b_ln = 10^b_log10` (same value)

The engine validates this equivalence with dedicated tests in
`logRegression.test.ts`.

### 0.4 Transformation Metadata Registry (spec §4)

Every transformation is now defined in exactly one place:
`TRANSFORMATION_REGISTRY`. Each entry provides:

```ts
type TransformationMetadata = {
  type: TransformType;
  name: string;
  displayName: string;
  notationLatex: string;       // KaTeX for forward transform
  inverseNotationLatex: string;// KaTeX for inverse transform
  domain: 'all-reals' | 'strictly-positive' | 'non-negative';
  domainDescription: string;
  forward: (x: number) => number;
  inverse: (z: number) => number;
  explanation: string;
  preservesSign: boolean;
  acceptsZero: boolean;
  acceptsNegative: boolean;
};
```

The log-regression engine, the UI, and the validation logic all consume this
registry. Adding a new transformation requires updating only the registry.

### 0.5 Domain Validation (spec §5, §25)

Logarithmic transformations require Y > 0. The engine reports every offending
row in a structured error (never silent NaNs, never silent filtering):

```
Log-linear regression (Natural Logarithm) cannot be calculated.

The selected transformation requires Y > 0. Natural Logarithm is undefined
for zero and negative values.

Invalid observations (2 total):
  Row 2: Y = 0 violates Natural Logarithm domain (Strictly positive (x > 0))
  Row 4: Y = -1.5 violates Natural Logarithm domain (Strictly positive (x > 0))
```

### 0.6 Calculation Trace (spec §16)

The engine generates an 11-step calculation trace, consumed verbatim by the UI:

1. Raw data
2. Transform Y → z = log(Y)
3. Calculate means (x̄, z̄)
4. Calculate deviations (xᵢ − x̄, zᵢ − z̄)
5. Sxx = Σ(xᵢ − x̄)²
6. Sxz = Σ(xᵢ − x̄)(zᵢ − z̄)
7. Slope b = Sxz / Sxx
8. Intercept a = z̄ − b·x̄
9. Predicted transformed values ẑᵢ = a + b·xᵢ
10. Transformed residuals eᵢ = zᵢ − ẑᵢ, SSE = Σeᵢ²
11. Back-transform ŷᵢ = exp(ẑᵢ) or 10^(ẑᵢ)

The trace is generated by the domain layer; React never reconstructs formulas.

### 0.7 PK Compatibility (spec §22, §23)

The log-regression engine does NOT compute PK-specific quantities (k, t½, Vd,
CL, AUC). It exposes only the regression coefficients. The PK layer (Phase 2
`pkRegression.ts`) consumes the slope and intercept to derive:

| PK parameter | ln model | log10 model |
|---|---|---|
| Elimination rate k | `−slope` | `−slope × ln(10)` |
| Initial concentration C₀ | `exp(intercept)` | `10^intercept` |
| Half-life t½ | `ln(2) / k` | `ln(2) / k` |

This separation keeps generic regression code free of PK-specific formulas.

### 0.8 Unified Regression Dispatcher (spec §3)

The `analyzeRegression()` function in `regressionAnalysis.ts` is the single
entry point for both linear and log-linear modes. The UI never branches on
regression type itself — it calls this dispatcher and renders the result.

### 0.9 Phase 3 Test Suite

```
Test Files  7 passed (7)
     Tests  245 passed (245)   ← 189 (Phase 2) + 56 (Phase 3)
```

The new `logRegression.test.ts` (56 tests) covers:
- Transformation metadata registry (spec §4)
- Log-linear regression on perfect mono-exponential data
- ln vs log10 numerical equivalence (spec §18)
- Regression equivalence: logRegression(ln) ≡ linearRegression(ln(Y)) (spec §19)
- Domain validation (spec §5, §20)
- Edge cases (n<2, n=2, constant X, constant Y, repeated X, empty, non-finite)
- PK compatibility (spec §22, §23)
- predictLogRegression (spec §11, §21)
- No rounding inside the engine (spec §34)

---

# Phase 2 — Statistical Engine Audit & Hardening (preserved)

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

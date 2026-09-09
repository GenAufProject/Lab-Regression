import { DatasetPreset } from '../../types';

export const SAMPLE_DATASETS: DatasetPreset[] = [
  {
    id: 'strong-positive',
    name: '1. Strong Positive Linear: Study Hours & Exam Score',
    category: 'statistics',
    description:
      'A classic pedagogical dataset demonstrating a clean, high-correlation positive relationship with moderate natural variance.',
    xLabel: 'Study Time',
    yLabel: 'Exam Score',
    xUnit: 'hours',
    yUnit: 'points',
    data: [
      { x: 1.5, y: 52 },
      { x: 2.0, y: 58 },
      { x: 2.8, y: 64 },
      { x: 3.5, y: 71 },
      { x: 4.2, y: 76 },
      { x: 5.0, y: 83 },
      { x: 6.1, y: 89 },
      { x: 7.0, y: 94 },
      { x: 8.2, y: 97 },
      { x: 9.0, y: 99 },
    ],
    educationalNotes:
      'Notice how points tightly hug the regression line. R² is high (~0.98), reflecting that most variation in score is linearly predicted by study hours.',
  },
  {
    id: 'weak-linear',
    name: '2. Weak Linear: Sleep Duration & Morning Alertness',
    category: 'statistics',
    description:
      'Demonstrates substantial scatter where a slight upward trend exists, but R² is low and residuals are wide.',
    xLabel: 'Sleep Duration',
    yLabel: 'Alertness Rating',
    xUnit: 'hours',
    yUnit: 'scale 1-10',
    data: [
      { x: 4.0, y: 3.2 },
      { x: 4.5, y: 5.5 },
      { x: 5.0, y: 4.0 },
      { x: 5.5, y: 6.8 },
      { x: 6.0, y: 4.9 },
      { x: 6.5, y: 7.2 },
      { x: 7.0, y: 5.8 },
      { x: 7.5, y: 8.5 },
      { x: 8.0, y: 6.2 },
      { x: 8.5, y: 7.0 },
      { x: 9.0, y: 6.0 },
    ],
    educationalNotes:
      'Individual variation and unmeasured confounders mean the linear model only explains a modest portion of total variance. Low R² does not mean regression is "wrong"—it accurately reflects high residual variance.',
  },
  {
    id: 'negative-linear',
    name: '3. Negative Linear: Ambient Temperature & Gas Heating Cost',
    category: 'statistics',
    description:
      'Shows a negative slope where increasing the independent variable decreases the expected dependent variable.',
    xLabel: 'Outside Temperature',
    yLabel: 'Daily Heating Gas',
    xUnit: '°C',
    yUnit: 'm³',
    data: [
      { x: -5, y: 22.4 },
      { x: -2, y: 19.8 },
      { x: 0, y: 17.5 },
      { x: 4, y: 14.1 },
      { x: 8, y: 11.2 },
      { x: 12, y: 8.6 },
      { x: 16, y: 5.4 },
      { x: 20, y: 2.1 },
    ],
    educationalNotes:
      'The slope is negative. Every 1°C increase in ambient temperature reduces expected heating gas consumption by ~0.8 units.',
  },
  {
    id: 'outlier-demonstration',
    name: '4. Influential Outlier: Fertilizer Dose & Crop Yield',
    category: 'diagnostics',
    description:
      'A dataset containing an extreme influential leverage point (row 8) that tilts the regression line and deflates R².',
    xLabel: 'Fertilizer Concentration',
    yLabel: 'Biomass Yield',
    xUnit: 'g/m²',
    yUnit: 'kg',
    data: [
      { x: 10, y: 14.2 },
      { x: 20, y: 22.0 },
      { x: 30, y: 31.5 },
      { x: 40, y: 42.1 },
      { x: 50, y: 51.0 },
      { x: 60, y: 60.8 },
      { x: 70, y: 71.2 },
      { x: 80, y: 18.0 }, // Outlier! (e.g. crop diseased or data typo)
      { x: 90, y: 88.5 },
    ],
    educationalNotes:
      'Observe Point #8 (80, 18.0). Notice the large residual and how it pulls down the slope. In practice, researchers must investigate whether this was a recording error or biological shock before deciding how to handle it.',
  },
  {
    id: 'nonlinear-curve',
    name: '5. Non-Linear Curve: Substrate Concentration & Reaction Velocity',
    category: 'diagnostics',
    description:
      'Data generated from saturating kinetics. Fitting a straight line yields a misleading model with distinct residual curvature.',
    xLabel: 'Substrate [S]',
    yLabel: 'Velocity (V)',
    xUnit: 'µM',
    yUnit: 'µmol/min',
    data: [
      { x: 1, y: 8.5 },
      { x: 2, y: 15.2 },
      { x: 4, y: 24.8 },
      { x: 8, y: 34.0 },
      { x: 12, y: 38.5 },
      { x: 18, y: 42.1 },
      { x: 25, y: 44.8 },
      { x: 35, y: 46.9 },
    ],
    educationalNotes:
      'Look at the residual plot! Residuals will show a clear inverted-U shape. A straight line over-predicts in the middle and under-predicts at the ends. This demonstrates why residual diagnostics are essential.',
  },
  {
    id: 'pk-elimination-standard',
    name: '6. Pharmacokinetics: First-Order Elimination Decay',
    category: 'pharmacokinetics',
    description:
      'Standard textbook IV Bolus concentration-time decay profile. Ideal for learning natural logarithm (ln) transformation.',
    xLabel: 'Time post-dose',
    yLabel: 'Plasma Concentration',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 0.0, y: 10.2 },
      { x: 1.0, y: 7.8 },
      { x: 2.0, y: 6.1 },
      { x: 4.0, y: 3.8 },
      { x: 6.0, y: 2.4 },
      { x: 8.0, y: 1.5 },
    ],
    educationalNotes:
      'Concentration decays exponentially: C(t) = C0 * e^(-kt). Transforming Y with ln(C) linearizes the data, allowing simple linear regression to calculate k = -slope and C0 = exp(intercept).',
  },
  {
    id: 'pk-clinical-gentamicin',
    name: '7. Clinical PK: Gentamicin Elimination (Single Compartment)',
    category: 'pharmacokinetics',
    description:
      'Synthetic clinical monitoring points after a 350 mg IV bolus infusion, sampled during the post-distribution elimination phase.',
    xLabel: 'Time',
    yLabel: 'Serum Gentamicin',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 1.0, y: 16.4 },
      { x: 2.5, y: 11.2 },
      { x: 4.0, y: 7.7 },
      { x: 6.0, y: 4.8 },
      { x: 8.0, y: 2.9 },
      { x: 12.0, y: 1.1 },
    ],
    educationalNotes:
      'Gentamicin has predominantly renal elimination. With regular monitoring, calculating k and t1/2 allows adjusting dosage intervals to avoid nephrotoxicity while maintaining efficacy.',
  },
  {
    // Phase 3 (spec §30): Deterministic exponential decay dataset designed
    // specifically to demonstrate log-linear regression. The ground-truth
    // model is C(t) = 50 · e^(−0.25·t) with mild deterministic noise added
    // (NOT random) so the dataset is reproducible across runs and tests.
    //
    // On the original scale, C vs t is a curved exponential decay.
    // On the ln(C) vs t scale, the data is approximately linear with
    // slope ≈ −0.25 and intercept ≈ ln(50) ≈ 3.912.
    id: 'exponential-decay-demo',
    name: '8. Exponential Decay (Log-Linear Demo): Drug Concentration vs Time',
    category: 'pharmacokinetics',
    description:
      'Deterministic exponential decay C(t) = 50·e^(−0.25t) with mild reproducible noise. ' +
      'Curved on the original scale, linear on the ln(C) scale. Designed for Phase 3 log-linear regression.',
    xLabel: 'Time',
    yLabel: 'Concentration',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 0, y: 50.0 },
      { x: 1, y: 39.0 },   // exact: 38.94, +0.06 deterministic noise
      { x: 2, y: 30.4 },   // exact: 30.33, +0.07
      { x: 3, y: 23.7 },   // exact: 23.62, +0.08
      { x: 4, y: 18.4 },   // exact: 18.39, +0.01
      { x: 6, y: 11.2 },   // exact: 11.11, +0.09
      { x: 8, y: 6.7 },    // exact: 6.74, -0.04
      { x: 10, y: 4.1 },   // exact: 4.07, +0.03
      { x: 12, y: 2.5 },   // exact: 2.47, +0.03
      { x: 16, y: 0.92 },  // exact: 0.907, +0.013
    ],
    educationalNotes:
      'Ground-truth model: C(t) = 50·e^(−0.25t). ' +
      'On the original scale (C vs t) the data curves downward — a straight line over-predicts in the middle. ' +
      'On the transformed scale (ln(C) vs t) the data is approximately linear with slope ≈ −0.25 and intercept ≈ ln(50) ≈ 3.912. ' +
      'This is exactly the structure of first-order pharmacokinetic elimination: ln(C) = ln(C₀) − kt, so k ≈ 0.25 h⁻¹, t½ ≈ ln(2)/0.25 ≈ 2.77 h.',
  },
  // -------------------------------------------------------------------------
  // Phase 4 (spec §23): three dedicated PK datasets for first-order
  // elimination education. Clean → near-perfect mono-exponential; noisy →
  // realistic measurement variability; non-first-order → bi-exponential
  // (two-compartment-looking) profile where a single log-linear fit fails
  // the residual diagnostic.
  // -------------------------------------------------------------------------
  {
    // Clean first-order dataset: C(t) = 20·e^(−0.15t), 8 points, no noise.
    // Expected: slope ≈ −0.15, intercept ≈ ln(20) ≈ 2.9957, k ≈ 0.15 h⁻¹,
    // t½ ≈ 4.62 h, C₀ ≈ 20 mg/L.
    id: 'pk-clean-first-order',
    name: '9. PK Clean: First-Order Elimination (no noise)',
    category: 'pharmacokinetics',
    description:
      'Deterministic mono-exponential decay C(t) = 20·e^(−0.15t) with no measurement noise. ' +
      'Ideal for verifying the regression recovers k, t½, and C₀ exactly.',
    xLabel: 'Time',
    yLabel: 'Concentration',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 0, y: 20.0 },
      { x: 1, y: 17.277 },   // 20·e^(-0.15) ≈ 17.277
      { x: 2, y: 14.918 },   // 20·e^(-0.30) ≈ 14.918
      { x: 4, y: 11.094 },   // 20·e^(-0.60) ≈ 11.094
      { x: 6, y: 8.252 },    // 20·e^(-0.90) ≈ 8.252
      { x: 8, y: 6.139 },    // 20·e^(-1.20) ≈ 6.139
      { x: 12, y: 3.396 },   // 20·e^(-1.80) ≈ 3.396
      { x: 16, y: 1.880 },   // 20·e^(-2.40) ≈ 1.880
    ],
    educationalNotes:
      'Pure mono-exponential decay. The ln(C) vs t plot will be perfectly linear with ' +
      'R² = 1.000. k = 0.15 h⁻¹, t½ = ln(2)/0.15 ≈ 4.62 h, C₀ = 20 mg/L. ' +
      'Use this dataset to verify the engine recovers the parameters exactly.',
  },
  {
    // Noisy first-order dataset: same C(t) = 20·e^(−0.15t) but with mild
    // deterministic ±2-5% variability to mimic real measurement error.
    id: 'pk-noisy-first-order',
    name: '10. PK Noisy: First-Order Elimination (realistic variability)',
    category: 'pharmacokinetics',
    description:
      'Same mono-exponential decay C(t) = 20·e^(−0.15t) with mild deterministic measurement ' +
      'noise (±2-5%). The regression should still recover k ≈ 0.15 h⁻¹ and t½ ≈ 4.62 h, ' +
      'but R² will be < 1.0 and residuals will be visible.',
    xLabel: 'Time',
    yLabel: 'Concentration',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 0, y: 20.4 },     // exact 20.000, +0.40
      { x: 1, y: 17.1 },     // exact 17.277, -0.18
      { x: 2, y: 15.2 },     // exact 14.918, +0.28
      { x: 4, y: 10.8 },     // exact 11.094, -0.29
      { x: 6, y: 8.5 },      // exact 8.252, +0.25
      { x: 8, y: 6.0 },      // exact 6.139, -0.14
      { x: 12, y: 3.5 },     // exact 3.396, +0.10
      { x: 16, y: 1.8 },     // exact 1.880, -0.08
    ],
    educationalNotes:
      'Realistic measurement variability (~2-5%). The regression still recovers k ≈ 0.15 h⁻¹, ' +
      't½ ≈ 4.62 h, and C₀ ≈ 20 mg/L, but R² will be < 1.0 (typically 0.995+). ' +
      'Residuals on the ln scale should be small and randomly distributed. ' +
      'This is the kind of data you would expect from a well-designed clinical PK study.',
  },
  {
    // Non-first-order dataset: bi-exponential profile (two-compartment-like).
    // C(t) = 30·e^(−2t) + 12·e^(−0.1t)  — fast distribution phase + slow
    // elimination phase. A single log-linear fit on all points will show
    // strong curvature in the residuals; the "terminal phase" is only the
    // slow tail (t ≥ 6h) where the distribution phase is negligible.
    id: 'pk-non-first-order',
    name: '11. PK Non-First-Order: Bi-Exponential (two-compartment-like)',
    category: 'pharmacokinetics',
    description:
      'Bi-exponential profile C(t) = 30·e^(−2t) + 12·e^(−0.1t). The early phase (t < 4h) ' +
      'shows rapid distribution; the terminal phase (t ≥ 6h) follows mono-exponential ' +
      'elimination. A single log-linear fit on all points will show curvature in residuals.',
    xLabel: 'Time',
    yLabel: 'Concentration',
    xUnit: 'h',
    yUnit: 'mg/L',
    data: [
      { x: 0, y: 42.000 },   // 30 + 12 = 42
      { x: 0.5, y: 22.451 }, // 30·e^(-1.0) + 12·e^(-0.05) = 11.036 + 11.415
      { x: 1, y: 14.918 },   // 30·e^(-2) + 12·e^(-0.1) = 4.066 + 10.857
      { x: 2, y: 10.374 },   // 30·e^(-4) + 12·e^(-0.2) = 0.549 + 9.825
      { x: 4, y: 8.054 },    // 30·e^(-8) + 12·e^(-0.4) = 0.010 + 8.044
      { x: 6, y: 6.586 },    // 30·e^(-12) + 12·e^(-0.6) ≈ 0 + 6.586
      { x: 8, y: 5.392 },    // 12·e^(-0.8) = 5.392
      { x: 12, y: 3.614 },   // 12·e^(-1.2) = 3.614
      { x: 16, y: 2.423 },   // 12·e^(-1.6) = 2.423
      { x: 24, y: 1.089 },   // 12·e^(-2.4) = 1.089
    ],
    educationalNotes:
      'Bi-exponential (two-compartment-like) profile. The early distribution phase ' +
      '(t < 4h) is dominated by 30·e^(−2t); the terminal elimination phase (t ≥ 6h) ' +
      'is dominated by 12·e^(−0.1t). Fitting a single log-linear regression to ALL ' +
      'points will produce curvature in the residuals. The terminal-phase selector ' +
      '(best-rsquared-suffix) should automatically pick the late points (t ≥ 6h) ' +
      'and recover k ≈ 0.1 h⁻¹, t½ ≈ 6.93 h.',
  },
];

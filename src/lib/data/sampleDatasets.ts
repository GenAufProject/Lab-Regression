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
];

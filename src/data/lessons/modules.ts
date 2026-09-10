import { LearningModule } from '../../types';

/**
 * Phase 5 — Learning Modules (spec §1).
 *
 * Five modules mapping to the conceptual learning path:
 *   A — Regression Fundamentals
 *   B — Understanding OLS
 *   C — Regression Diagnostics
 *   D — Transformations
 *   E — Pharmacokinetics
 */
export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'module-a-regression-fundamentals',
    letter: 'A',
    title: 'Regression Fundamentals',
    description:
      'Start here. Learn what regression is, what X and Y mean, and how a scatter plot reveals relationships.',
    category: 'regression-fundamentals',
    lessonIds: [
      'a1-what-is-regression',
      'a2-variables-and-scatter-plots',
      'a3-slope-and-intercept',
      'a4-regression-equation',
    ],
  },
  {
    id: 'module-b-understanding-ols',
    letter: 'B',
    title: 'Understanding OLS',
    description:
      'Go inside the calculation. Learn how means, deviations, and sums of squares produce the slope and intercept.',
    category: 'ols',
    lessonIds: [
      'b1-means-and-deviations',
      'b2-sxy-and-sxx',
      'b3-slope-and-intercept-derivation',
      'b4-sse-sst-and-r-squared',
    ],
  },
  {
    id: 'module-c-regression-diagnostics',
    letter: 'C',
    title: 'Regression Diagnostics',
    description:
      'A fitted line is not the end of the story. Learn to read residual plots, spot outliers, and check assumptions.',
    category: 'diagnostics',
    lessonIds: [
      'c1-residuals-and-residual-plots',
      'c2-outliers-and-leverage',
      'c3-patterns-in-residuals',
      'c4-why-r-squared-is-not-enough',
    ],
  },
  {
    id: 'module-d-transformations',
    letter: 'D',
    title: 'Transformations',
    description:
      'Linearize curved relationships. Learn when and how to apply ln and log10 transformations.',
    category: 'transformations',
    lessonIds: [
      'd1-why-transform',
      'd2-ln-and-log10',
      'd3-domain-restrictions',
      'd4-back-transformation',
    ],
  },
  {
    id: 'module-e-pharmacokinetics',
    letter: 'E',
    title: 'Pharmacokinetics',
    description:
      'Connect regression to drug elimination. Derive k, t½, C₀, and AUC from concentration-time data.',
    category: 'pk',
    lessonIds: [
      'e1-concentration-vs-time',
      'e2-first-order-elimination',
      'e3-linearization',
      'e4-k-and-half-life',
      'e5-c0-and-auc',
      'e6-terminal-phase',
      'e7-interpretation-and-limitations',
    ],
  },
];

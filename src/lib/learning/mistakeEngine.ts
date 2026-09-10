import { LearningMistake } from '../../types';

/**
 * Phase 5 — Mistake Explanation Engine (spec §14).
 *
 * Provides context-sensitive explanations for common learning mistakes.
 * When a learner submits an incorrect answer, the practice engine looks
 * up the question's `mistakeCategory` and retrieves a structured
 * explanation from this registry.
 *
 * The explanations are educational — they explain WHY the answer is wrong
 * and what the correct reasoning should be, rather than simply marking
 * the answer incorrect.
 *
 * Spec §14: "Use context-sensitive explanations."
 * Spec §13: "Do not simply say 'Wrong.' Instead show 'Not quite.' Then
 * explain the conceptual mistake."
 */

/**
 * A structured mistake explanation.
 */
export type MistakeExplanation = {
  category: LearningMistake;
  /** Short label for the mistake type. */
  label: string;
  /** Human-readable explanation of why this mistake occurs and how to correct it. */
  explanation: string;
  /** The correct principle the learner should apply. */
  correctPrinciple: string;
};

/**
 * The mistake registry. Each entry is a reusable explanation keyed by
 * mistake category. Add new entries here when new mistake patterns are
 * identified.
 */
export const MISTAKE_REGISTRY: Record<LearningMistake, MistakeExplanation> = {
  'wrong-sign': {
    category: 'wrong-sign',
    label: 'Sign error',
    explanation:
      'You may have flipped the sign of the slope or the rate constant. ' +
      'In regression, slope = (change in Y) / (change in X); for a decreasing ' +
      'relationship the slope is negative. In pharmacokinetics, the elimination ' +
      'rate constant k is defined as a POSITIVE quantity, so k = −slope (the ' +
      'slope is negative, and we negate it to get a positive k).',
    correctPrinciple:
      'For ln(C) vs time: slope is negative (concentration decreases), and k = −slope > 0.',
  },
  'wrong-transformation': {
    category: 'wrong-transformation',
    label: 'Wrong transformation',
    explanation:
      'You may have applied the wrong logarithm base or confused ln with log10. ' +
      'ln uses base e (≈ 2.718); log10 uses base 10. They are related by ' +
      'log10(x) = ln(x) / ln(10) ≈ ln(x) / 2.303. The slope on the log10 scale ' +
      'differs from the slope on the ln scale by a factor of 1/ln(10).',
    correctPrinciple:
      'ln: k = −slope. log10: k = −slope × ln(10) ≈ −2.303 × slope. Both recover the same k.',
  },
  'wrong-formula': {
    category: 'wrong-formula',
    label: 'Wrong formula',
    explanation:
      'You may have used the wrong formula for this quantity. Double-check the ' +
      'formula reference: slope = Sxy/Sxx, intercept = ȳ − b·x̄, ' +
      'R² = 1 − SSE/SST, t½ = ln(2)/k, C₀ = e^intercept (ln) or 10^intercept (log10).',
    correctPrinciple:
      'Always verify which formula applies to the scale (raw vs transformed) and the model (linear vs log-linear).',
  },
  'wrong-interpretation': {
    category: 'wrong-interpretation',
    label: 'Misinterpretation',
    explanation:
      'You may have over-interpreted the result. A high R² does not prove the ' +
      'model is correct — it only confirms linearity on the transformed scale. ' +
      'A slope describes association, not causation. An intercept at X=0 may be ' +
      'an extrapolation outside the observed data range.',
    correctPrinciple:
      'Always pair numerical results with residual diagnostics and domain context.',
  },
  'rounding-too-early': {
    category: 'rounding-too-early',
    label: 'Premature rounding',
    explanation:
      'You may have rounded intermediate values during the calculation. This ' +
      'propagates error through subsequent steps. For example, rounding the ' +
      'slope to 2 decimals before computing k = −slope can shift k by several ' +
      'percent. Keep full precision until the final display step.',
    correctPrinciple:
      'Calculate with full IEEE-754 precision; round only at the presentation layer.',
  },
  'domain-error': {
    category: 'domain-error',
    label: 'Domain violation',
    explanation:
      'You may have tried to apply a logarithm to a non-positive value. ln(x) ' +
      'and log10(x) are only defined for x > 0. Concentrations of 0 or negative ' +
      'values cannot be log-transformed — the analysis must reject them rather ' +
      'than silently producing NaN.',
    correctPrinciple:
      'Logarithmic transformations require strictly positive inputs (x > 0).',
  },
  'unit-error': {
    category: 'unit-error',
    label: 'Unit mismatch',
    explanation:
      'You may have mixed up the units. k has units of time⁻¹ (e.g. h⁻¹), ' +
      't½ has units of time (e.g. h), C₀ has units of concentration (e.g. mg/L), ' +
      'and AUC has units of concentration × time (e.g. mg·h/L). Always verify ' +
      'the units are consistent with the formula.',
    correctPrinciple:
      'Check units at every step: [k] = T⁻¹, [t½] = T, [C₀] = M/L³, [AUC] = (M/L³)·T.',
  },
  'r2-misinterpretation': {
    category: 'r2-misinterpretation',
    label: 'R² over-claim',
    explanation:
      'You may have treated a high R² as proof that the model is correct. R² ' +
      'only measures the proportion of variance explained by the LINEAR fit on ' +
      'the (possibly transformed) scale. A curved relationship can have a high ' +
      'R² when forced into a straight line, and a high R² on the log scale does ' +
      'not automatically prove first-order elimination kinetics.',
    correctPrinciple:
      'R² is necessary but not sufficient. Always examine the residual plot and the original-scale curve fit.',
  },
  'pk-slope-sign': {
    category: 'pk-slope-sign',
    label: 'PK slope sign',
    explanation:
      'In first-order elimination, concentration DECREASES over time, so the ' +
      'slope of ln(C) vs time is NEGATIVE. The elimination rate constant k is ' +
      'defined as a positive quantity: k = −slope. If you computed k = slope, ' +
      'you would get a negative k, which is physically meaningless for elimination.',
    correctPrinciple:
      'slope < 0 (decay), so k = −slope > 0. A positive slope would indicate the drug is being produced, not eliminated.',
  },
  conceptual: {
    category: 'conceptual',
    label: 'Conceptual gap',
    explanation:
      'The answer suggests a conceptual misunderstanding. Review the lesson ' +
      'objectives and key takeaways, then try the question again with the ' +
      'correct principle in mind.',
    correctPrinciple:
      'Re-read the relevant lesson section and focus on the relationship between the variables.',
  },
  calculation: {
    category: 'calculation',
    label: 'Calculation error',
    explanation:
      'The setup appears correct but the numerical result is off. Re-check ' +
      'each arithmetic step: means, deviations, sums of squares, and the final ' +
      'division. Avoid rounding intermediate values.',
    correctPrinciple:
      'Recompute step by step with full precision, using the formula reference.',
  },
};

/**
 * Returns the mistake explanation for a given category, or a generic
 * fallback if the category is unknown (defensive — should never happen
 * with the union type, but guards against stringly-typed callers).
 */
export function getMistakeExplanation(category: LearningMistake): MistakeExplanation {
  return MISTAKE_REGISTRY[category] ?? MISTAKE_REGISTRY.conceptual;
}

/**
 * Returns true if a mistake category is in the registry.
 */
export function isKnownMistake(category: string): boolean {
  return category in MISTAKE_REGISTRY;
}

/**
 * Returns all mistake categories (for the formula reference / about page).
 */
export function getAllMistakeCategories(): MistakeExplanation[] {
  return Object.values(MISTAKE_REGISTRY);
}

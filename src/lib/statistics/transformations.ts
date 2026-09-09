import { DataPoint, LogBase, TransformType, TransformationMetadata } from '../../types';

export type TransformResult =
  | {
      status: 'success';
      transformedPoints: DataPoint[];
      originalPoints: DataPoint[];
      transformation: TransformType;
      axis: 'none' | 'x' | 'y' | 'both';
      domainNotice?: string;
    }
  | {
      status: 'error';
      message: string;
      invalidCount: number;
      invalidValues: number[];
      transformation: TransformType;
    };

/**
 * Phase 3: Centralized transformation metadata registry (spec §4).
 *
 * Each transformation defines:
 *   - name, displayName, notationLatex, inverseNotationLatex
 *   - domain (typed enum) + human-readable domainDescription
 *   - forward / inverse functions (pure, no rounding — spec §34)
 *   - explanation, preservesSign, acceptsZero, acceptsNegative
 *
 * The log-regression engine and the UI both consume this registry so that
 * transformation logic is defined in exactly one place.
 */
export const TRANSFORMATION_REGISTRY: Record<TransformType, TransformationMetadata> = {
  none: {
    type: 'none',
    name: 'identity',
    displayName: 'Identity (no transform)',
    notationLatex: 'x',
    inverseNotationLatex: 'z',
    domain: 'all-reals',
    domainDescription: 'All real numbers',
    forward: (x) => x,
    inverse: (z) => z,
    explanation:
      'The identity transformation leaves the data unchanged. Use this for standard linear regression on the original scale.',
    preservesSign: true,
    acceptsZero: true,
    acceptsNegative: true,
  },
  ln: {
    type: 'ln',
    name: 'ln',
    displayName: 'Natural Logarithm (base e)',
    notationLatex: '\\ln(x)',
    inverseNotationLatex: 'e^{z}',
    domain: 'strictly-positive',
    domainDescription: 'Strictly positive (x > 0)',
    forward: (x) => (x > 0 ? Math.log(x) : NaN),
    inverse: (z) => Math.exp(z),
    explanation:
      'The natural logarithm uses base e (≈ 2.71828). It linearizes exponential growth/decay curves and is the canonical transform for first-order pharmacokinetic elimination: ln(C) = ln(C₀) − kt, so k = −slope and C₀ = exp(intercept).',
    preservesSign: false,
    acceptsZero: false,
    acceptsNegative: false,
  },
  log10: {
    type: 'log10',
    name: 'log10',
    displayName: 'Common Logarithm (base 10)',
    notationLatex: '\\log_{10}(x)',
    inverseNotationLatex: '10^{z}',
    domain: 'strictly-positive',
    domainDescription: 'Strictly positive (x > 0)',
    forward: (x) => (x > 0 ? Math.log10(x) : NaN),
    inverse: (z) => Math.pow(10, z),
    explanation:
      'The common logarithm uses base 10. It is equivalent to ln(x)/ln(10), so the slope differs from the ln model by a factor of 1/ln(10) ≈ 0.4343. For PK: k = −slope × ln(10) ≈ −2.303 × slope and C₀ = 10^intercept.',
    preservesSign: false,
    acceptsZero: false,
    acceptsNegative: false,
  },
  sqrt: {
    type: 'sqrt',
    name: 'sqrt',
    displayName: 'Square Root',
    notationLatex: '\\sqrt{x}',
    inverseNotationLatex: 'z^{2}',
    domain: 'non-negative',
    domainDescription: 'Non-negative (x ≥ 0)',
    forward: (x) => (x >= 0 ? Math.sqrt(x) : NaN),
    inverse: (z) => z * z,
    explanation:
      'The square-root transform is a variance-stabilizing transformation for Poisson-like count data. It is NOT a log-regression mode (spec §24) and is not supported by the log-regression engine, but is available for general transformation studies.',
    preservesSign: false,
    acceptsZero: true,
    acceptsNegative: false,
  },
};

/**
 * Phase 3: Returns the metadata for a transformation, throwing a typed error
 * for unknown transformations (defensive — should never happen with the
 * `TransformType` union, but guards against stringly-typed callers).
 */
export function getTransformationMetadata(type: TransformType): TransformationMetadata {
  const meta = TRANSFORMATION_REGISTRY[type];
  if (!meta) {
    // Defensive — the union should prevent this, but we never want to return
    // undefined silently to a caller that will then crash on .forward().
    throw new Error(`Unknown transformation type: ${type as string}`);
  }
  return meta;
}

/**
 * Phase 3: Returns true if a value is in the domain of the given transformation.
 * Uses the typed metadata rather than ad-hoc checks.
 */
export function isInDomain(value: number, type: TransformType): boolean {
  const meta = getTransformationMetadata(type);
  if (!isFinite(value)) return false;
  switch (meta.domain) {
    case 'all-reals':
      return true;
    case 'strictly-positive':
      return value > 0;
    case 'non-negative':
      return value >= 0;
  }
}

/**
 * Phase 3: Convenience accessor for the two log transformations used by the
 * log-regression engine. Returns the metadata for the requested log base.
 */
export function getLogTransformationMetadata(logBase: LogBase): TransformationMetadata {
  return getTransformationMetadata(logBase);
}

/**
 * Returns a human-readable description of the mathematical domain
 * constraint for a transformation. Used for clear validation errors
 * (spec §21, §33).
 *
 * Phase 3: now delegates to the registry's domainDescription field.
 */
export function transformDomainDescription(type: TransformType): string {
  return getTransformationMetadata(type).domainDescription;
}

/**
 * Transforms a single numeric value according to the specified transform type.
 *
 * Spec §34 (rounding policy): NO rounding is performed here — full
 * floating-point precision is preserved. Formatting is the responsibility
 * of the presentation layer only.
 *
 * Phase 3: now delegates to TRANSFORMATION_REGISTRY so that transformation
 * logic is defined in exactly one place (spec §4 metadata-driven design).
 */
export function transformValue(
  value: number,
  type: TransformType
): { success: boolean; result: number; error?: string } {
  if (type === 'none') {
    return { success: true, result: value };
  }
  const meta = getTransformationMetadata(type);
  if (!isInDomain(value, type)) {
    return {
      success: false,
      result: NaN,
      error: `${meta.displayName} requires ${meta.domainDescription.toLowerCase()}. Received ${value}.`,
    };
  }
  return { success: true, result: meta.forward(value) };
}

/**
 * Transforms a dataset along X, Y, or both axes with strict validation.
 *
 * Spec §22: the original `points` array is NEVER mutated; the returned
 * `originalPoints` is a defensive copy.
 *
 * Spec §21: invalid domains produce a structured error with the offending
 * values, NOT silent NaNs.
 *
 * Phase 2 fix: the `axis` field now correctly reports 'none' when both
 * transforms are 'none' (previously defaulted to 'y').
 *
 * Phase 3: now uses `isInDomain` from the registry rather than ad-hoc
 * per-type conditionals, so adding a new transformation requires only
 * updating TRANSFORMATION_REGISTRY.
 */
export function transformDataset(
  points: { id: string; x: number; y: number }[],
  transformX: TransformType = 'none',
  transformY: TransformType = 'none'
): TransformResult {
  const invalidValues: number[] = [];
  const invalidReasons: string[] = [];

  // Check domain constraints — collect ALL offending values for a clear error
  for (const pt of points) {
    if (transformX !== 'none' && !isInDomain(pt.x, transformX)) {
      invalidValues.push(pt.x);
      invalidReasons.push(`x=${pt.x}`);
    }
    if (transformY !== 'none' && !isInDomain(pt.y, transformY)) {
      invalidValues.push(pt.y);
      invalidReasons.push(`y=${pt.y}`);
    }
  }

  if (invalidValues.length > 0) {
    const primaryTransform = transformY !== 'none' ? transformY : transformX;
    const meta = getTransformationMetadata(primaryTransform);
    const isLog = primaryTransform === 'ln' || primaryTransform === 'log10';
    return {
      status: 'error',
      transformation: primaryTransform,
      message: isLog
        ? `Logarithmic transformation (${primaryTransform}) requires ${meta.domainDescription.toLowerCase()}. The following ${invalidValues.length} value(s) cannot be transformed: ${invalidReasons
            .slice(0, 5)
            .join(', ')}${invalidValues.length > 5 ? ' …' : ''}.`
        : `${meta.displayName} requires ${meta.domainDescription.toLowerCase()}. The following ${invalidValues.length} value(s) cannot be transformed: ${invalidReasons
            .slice(0, 5)
            .join(', ')}${invalidValues.length > 5 ? ' …' : ''}.`,
      invalidCount: invalidValues.length,
      invalidValues: invalidValues.slice(0, 5),
    };
  }

  const transformedPoints: DataPoint[] = points.map((pt) => {
    const tx = transformValue(pt.x, transformX).result;
    const ty = transformValue(pt.y, transformY).result;
    return {
      id: pt.id,
      x: tx,
      y: ty,
    };
  });

  // Phase 2 fix: correctly report 'none' when neither axis is transformed
  let axis: 'none' | 'x' | 'y' | 'both';
  if (transformX === 'none' && transformY === 'none') {
    axis = 'none';
  } else if (transformX !== 'none' && transformY !== 'none') {
    axis = 'both';
  } else if (transformX !== 'none') {
    axis = 'x';
  } else {
    axis = 'y';
  }

  return {
    status: 'success',
    transformedPoints,
    originalPoints: points.map((p) => ({ ...p })), // defensive copy (spec §22)
    transformation: transformY !== 'none' ? transformY : transformX,
    axis,
  };
}

/**
 * Back-transforms a predicted value on the transformed scale back to
 * the original scale.
 *
 * Phase 2 hardening note (Jensen's inequality):
 * For non-linear back-transformations (exp, 10^x, x²), the back-transformed
 * *mean* is NOT equal to the mean of the back-transformed values — there is
 * a systematic bias. For precise prediction intervals on the original scale,
 * a Duan smearing estimator or lognormal correction should be applied.
 * The simple back-transform below returns the *median* prediction on the
 * original scale, which is bias-free for monotone transforms.
 *
 * Spec §34: NO rounding performed.
 *
 * Phase 3: now delegates to the registry's inverse function (spec §4).
 */
export function backTransformPrediction(
  predictedTransformedY: number,
  transformY: TransformType
): number {
  return getTransformationMetadata(transformY).inverse(predictedTransformedY);
}

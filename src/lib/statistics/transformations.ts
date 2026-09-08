import { DataPoint, TransformType } from '../../types';

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
 * Returns a human-readable description of the mathematical domain
 * constraint for a transformation. Used for clear validation errors
 * (spec §21, §33).
 */
export function transformDomainDescription(type: TransformType): string {
  switch (type) {
    case 'ln':
    case 'log10':
      return 'requires strictly positive values (> 0)';
    case 'sqrt':
      return 'requires non-negative values (≥ 0)';
    case 'none':
    default:
      return '';
  }
}

/**
 * Transforms a single numeric value according to the specified transform type.
 *
 * Spec §34 (rounding policy): NO rounding is performed here — full
 * floating-point precision is preserved. Formatting is the responsibility
 * of the presentation layer only.
 */
export function transformValue(
  value: number,
  type: TransformType
): { success: boolean; result: number; error?: string } {
  if (type === 'none') {
    return { success: true, result: value };
  }

  if (type === 'ln') {
    if (!(value > 0)) {
      return {
        success: false,
        result: NaN,
        error: `Natural logarithm requires values > 0. Received ${value}.`,
      };
    }
    return { success: true, result: Math.log(value) };
  }

  if (type === 'log10') {
    if (!(value > 0)) {
      return {
        success: false,
        result: NaN,
        error: `Base-10 logarithm requires values > 0. Received ${value}.`,
      };
    }
    return { success: true, result: Math.log10(value) };
  }

  if (type === 'sqrt') {
    if (value < 0) {
      return {
        success: false,
        result: NaN,
        error: `Square root requires values ≥ 0. Received ${value}.`,
      };
    }
    return { success: true, result: Math.sqrt(value) };
  }

  return { success: true, result: value };
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
    if (transformX === 'ln' || transformX === 'log10') {
      if (!(pt.x > 0)) {
        invalidValues.push(pt.x);
        invalidReasons.push(`x=${pt.x}`);
      }
    } else if (transformX === 'sqrt' && pt.x < 0) {
      invalidValues.push(pt.x);
      invalidReasons.push(`x=${pt.x}`);
    }

    if (transformY === 'ln' || transformY === 'log10') {
      if (!(pt.y > 0)) {
        invalidValues.push(pt.y);
        invalidReasons.push(`y=${pt.y}`);
      }
    } else if (transformY === 'sqrt' && pt.y < 0) {
      invalidValues.push(pt.y);
      invalidReasons.push(`y=${pt.y}`);
    }
  }

  if (invalidValues.length > 0) {
    const isLog =
      transformX === 'ln' ||
      transformX === 'log10' ||
      transformY === 'ln' ||
      transformY === 'log10';
    const primaryTransform = transformY !== 'none' ? transformY : transformX;
    return {
      status: 'error',
      transformation: primaryTransform,
      message: isLog
        ? `Logarithmic transformation (${primaryTransform}) ${transformDomainDescription(
            primaryTransform
          )}. The following ${invalidValues.length} value(s) cannot be transformed: ${invalidReasons
            .slice(0, 5)
            .join(', ')}${invalidValues.length > 5 ? ' …' : ''}.`
        : `Square root transformation ${transformDomainDescription(
            primaryTransform
          )}. The following ${invalidValues.length} value(s) cannot be transformed: ${invalidReasons
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
 */
export function backTransformPrediction(
  predictedTransformedY: number,
  transformY: TransformType
): number {
  switch (transformY) {
    case 'ln':
      return Math.exp(predictedTransformedY);
    case 'log10':
      return Math.pow(10, predictedTransformedY);
    case 'sqrt':
      return Math.pow(predictedTransformedY, 2);
    case 'none':
    default:
      return predictedTransformedY;
  }
}

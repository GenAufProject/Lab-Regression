import { DataPoint, TransformType } from '../../types';

export type TransformResult =
  | {
      status: 'success';
      transformedPoints: DataPoint[];
      originalPoints: DataPoint[];
      transformation: TransformType;
      axis: 'x' | 'y' | 'both';
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
 * Transforms a single numeric value according to the specified transform type.
 */
export function transformValue(
  value: number,
  type: TransformType
): { success: boolean; result: number; error?: string } {
  if (type === 'none') {
    return { success: true, result: value };
  }

  if (type === 'ln') {
    if (value <= 0) {
      return {
        success: false,
        result: NaN,
        error: `Natural logarithm requires values > 0. Received ${value}.`,
      };
    }
    return { success: true, result: Math.log(value) };
  }

  if (type === 'log10') {
    if (value <= 0) {
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
 */
export function transformDataset(
  points: { id: string; x: number; y: number }[],
  transformX: TransformType = 'none',
  transformY: TransformType = 'none'
): TransformResult {
  const invalidValues: number[] = [];

  // Check domain constraints
  for (const pt of points) {
    if (transformX === 'ln' || transformX === 'log10') {
      if (pt.x <= 0) invalidValues.push(pt.x);
    } else if (transformX === 'sqrt' && pt.x < 0) {
      invalidValues.push(pt.x);
    }

    if (transformY === 'ln' || transformY === 'log10') {
      if (pt.y <= 0) invalidValues.push(pt.y);
    } else if (transformY === 'sqrt' && pt.y < 0) {
      invalidValues.push(pt.y);
    }
  }

  if (invalidValues.length > 0) {
    const isLog =
      transformX === 'ln' ||
      transformX === 'log10' ||
      transformY === 'ln' ||
      transformY === 'log10';
    return {
      status: 'error',
      transformation: transformY !== 'none' ? transformY : transformX,
      message: isLog
        ? 'Logarithmic transformations (ln, log10) require strictly positive values (> 0). Values ≤ 0 cannot be mathematically transformed.'
        : 'Square root transformation requires values greater than or equal to zero (≥ 0).',
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

  return {
    status: 'success',
    transformedPoints,
    originalPoints: points,
    transformation: transformY !== 'none' ? transformY : transformX,
    axis: transformX !== 'none' && transformY !== 'none' ? 'both' : transformX !== 'none' ? 'x' : 'y',
  };
}

/**
 * Back-transforms a predicted value on the transformed scale back to original scale.
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

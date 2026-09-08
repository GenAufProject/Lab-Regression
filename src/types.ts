export type DataPoint = {
  id: string;
  x: number;
  y: number;
};

export type RegressionPoint = DataPoint & {
  predicted: number;
  residual: number;
  residualSquared: number;
  standardizedResidual?: number;
};

export type RegressionCalculationRow = {
  id: string;
  x: number;
  y: number;
  xDev: number; // x - meanX
  yDev: number; // y - meanY
  xDevSq: number; // (x - meanX)^2
  yDevSq: number; // (y - meanY)^2
  prodDev: number; // (x - meanX)*(y - meanY)
  predicted: number;
  residual: number;
};

export type RegressionStatistics = {
  n: number;
  meanX: number;
  meanY: number;
  sumX: number;
  sumY: number;
  sxx: number; // sum((x - meanX)^2)
  syy: number; // sum((y - meanY)^2)
  sxy: number; // sum((x - meanX)*(y - meanY))
  slope: number; // b = sxy / sxx
  intercept: number; // a = meanY - b * meanX
  r: number; // Pearson correlation coefficient
  rSquared: number; // Coefficient of determination
  adjustedRSquared?: number;
  sse: number; // Sum of squared errors (residuals)
  ssr: number; // Sum of squares regression
  sst: number; // Total sum of squares = sse + ssr
  mse: number; // Mean squared error = sse / (n - 2)
  rmse: number; // Root mean squared error = sqrt(mse)
  seSlope: number; // Standard error of slope
  seIntercept: number; // Standard error of intercept
  tStatSlope: number;
  tStatIntercept: number;
  confidenceLevel: number; // e.g. 0.95
  ciSlope: [number, number]; // [lower, upper]
  ciIntercept: [number, number]; // [lower, upper]
  rows: RegressionCalculationRow[];
  points: RegressionPoint[];
};

export type RegressionErrorType =
  | 'INSUFFICIENT_DATA'
  | 'ZERO_VARIANCE_X'
  | 'ZERO_VARIANCE_Y'
  | 'INVALID_NUMBERS'
  | 'DOMAIN_ERROR';

export type RegressionError = {
  type: RegressionErrorType;
  message: string;
  detail?: string;
};

export type RegressionResult =
  | {
      status: 'success';
      stats: RegressionStatistics;
    }
  | {
      status: 'error';
      error: RegressionError;
    };

export type TransformType = 'none' | 'ln' | 'log10' | 'sqrt';

export type PKUnits = {
  time: string; // e.g., "h", "min", "day"
  concentration: string; // e.g., "mg/L", "µg/mL", "ng/mL"
  dose: string; // e.g., "mg", "g", "µg"
};

export type PKDataPoint = {
  id: string;
  time: number;
  concentration: number;
};

export type PKRegressionResult = {
  logBase: 'ln' | 'log10';
  slope: number;
  intercept: number;
  rSquared: number;
  r: number;
  rmse: number;
  eliminationRateConstant: number; // k
  halfLife: number; // t_1/2
  estimatedC0: number; // C0
  equationFitted: string;
  equationNatural: string;
  units: PKUnits;
  // Optional IV Bolus derived parameters
  dose?: number;
  volumeOfDistribution?: number; // Vd = Dose / C0
  clearance?: number; // CL = k * Vd
};

export type DatasetPreset = {
  id: string;
  name: string;
  category: 'statistics' | 'pharmacokinetics' | 'diagnostics';
  description: string;
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  data: { x: number; y: number }[];
  educationalNotes?: string;
};

export type QuizQuestion = {
  id: string;
  category: 'linear-regression' | 'r-squared' | 'residuals' | 'transformations' | 'pk';
  title: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
  formulaNote?: string;
};

export type UserPreferences = {
  decimals: number;
  confidenceLevel: number;
  showEquation: boolean;
  showConfidenceBand: boolean;
  showPredictionBand: boolean;
  showResidualLines: boolean;
  presentationMode: boolean;
};

export type AppNavSection =
  | 'dashboard'
  | 'learn'
  | 'regression'
  | 'transformations'
  | 'simulator'
  | 'pk'
  | 'practice'
  | 'reference'
  | 'settings';

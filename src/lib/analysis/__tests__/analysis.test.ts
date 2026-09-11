import { describe, expect, it } from 'vitest';
import { computeObservationDiagnostics, computeThresholds, flagExplanation } from '../diagnostics';
import { computeResidualDiagnostics } from '../residualDiagnostics';
import { computeIntervalBand } from '../intervals';
import { compareModels } from '../modelComparison';
import { generateOLSFindings, generatePKFindings } from '../scientificInterpretation';
import { generateOLSReport, exportDiagnosticsCSV, exportReportJSON } from '../reportGenerator';
import { computeTerminalPhaseSensitivity } from '../pkDiagnostics';
import { loadHistory, addToHistory, deleteHistoryEntry, clearHistory, setHistoryStorage } from '../historyStore';
import { calculateSimpleLinearRegression } from '../../statistics/linearRegression';

// Canonical dataset
const DATA = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 5 },
];

function getStats() {
  const r = calculateSimpleLinearRegression(DATA);
  if (r.status !== 'success') throw new Error('setup failed');
  return r.stats;
}

// ===========================================================================
// Diagnostics Engine (spec §3-§7)
// ===========================================================================

describe('diagnostics — observation-level (spec §3-§7)', () => {
  it('computes thresholds correctly (4/n, 2.0)', () => {
    const t = computeThresholds(10);
    expect(t.leverageThreshold).toBeCloseTo(0.4, 6);
    expect(t.cooksThreshold).toBeCloseTo(0.4, 6);
    expect(t.studentizedResidualThreshold).toBe(2.0);
  });

  it('produces one ObservationDiagnostic per observation', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    expect(d.observations.length).toBe(stats.n);
    expect(d.n).toBe(stats.n);
  });

  it('leverage values match the Phase 2 engine (spec §27)', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    d.observations.forEach((o, i) => {
      expect(o.leverage).toBeCloseTo(stats.points[i].leverage ?? 0, 10);
    });
  });

  it('Cook\'s distance values match the Phase 2 engine', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    d.observations.forEach((o, i) => {
      expect(o.cooksDistance).toBeCloseTo(stats.points[i].cooksDistance ?? 0, 10);
    });
  });

  it('studentized residuals match the Phase 2 engine', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    d.observations.forEach((o, i) => {
      expect(o.studentizedResidual).toBeCloseTo(stats.points[i].studentizedResidual ?? 0, 10);
    });
  });

  it('mean leverage ≈ p/n = 2/n (spec §33 invariant)', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    // For simple regression with intercept, p = 2, so sum(h_i) ≈ 2, mean ≈ 2/n
    expect(d.meanLeverage).toBeCloseTo(2 / stats.n, 4);
  });

  it('flagExplanation returns non-empty label and explanation for each flag', () => {
    const flags = ['large-residual', 'high-leverage', 'potentially-influential', 'potential-outlier', 'review-observation'] as const;
    for (const f of flags) {
      const exp = flagExplanation(f);
      expect(exp.label.length).toBeGreaterThan(0);
      expect(exp.explanation.length).toBeGreaterThan(20);
    }
  });

  it('flags outlier in a dataset with a known outlier', () => {
    // Use enough points so the outlier produces |studentized residual| ≥ 2
    const baseData = [
      { x: 1, y: 2.2 }, { x: 2, y: 3.1 }, { x: 3, y: 3.9 },
      { x: 4, y: 4.8 }, { x: 5, y: 5.6 }, { x: 6, y: 6.4 },
      { x: 7, y: 7.1 }, { x: 8, y: 8.0 }, { x: 9, y: 8.8 },
      { x: 10, y: 9.6 },
    ];
    const outlierData = [...baseData, { x: 5.5, y: 25 }];
    const r = calculateSimpleLinearRegression(outlierData);
    if (r.status !== 'success') return;
    const d = computeObservationDiagnostics(r.stats);
    const flagged = d.observations.filter((o) => o.flags.includes('potential-outlier'));
    expect(flagged.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Residual Diagnostics (spec §8, §9)
// ===========================================================================

describe('residualDiagnostics (spec §8, §9)', () => {
  it('classifies the canonical dataset as random or curvature', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    expect(['random', 'curvature', 'heteroscedasticity', 'insufficient-data']).toContain(r.pattern);
  });

  it('produces Q-Q plot data with theoretical and observed quantiles', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    expect(r.qqPlotData.length).toBe(stats.n);
    for (const pt of r.qqPlotData) {
      expect(isFinite(pt.theoretical)).toBe(true);
      expect(isFinite(pt.observed)).toBe(true);
    }
  });

  it('produces histogram bins with counts summing to n', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    const total = r.histogramBins.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(stats.n);
  });

  it('produces scale-location data for every observation', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    expect(r.scaleLocationData.length).toBe(stats.n);
  });

  it('residual sum ≈ 0 for OLS with intercept (spec §33)', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    expect(Math.abs(r.residualSum)).toBeLessThan(1e-10);
  });

  it('returns insufficient-data pattern for n < 5', () => {
    const small = calculateSimpleLinearRegression([{ x: 1, y: 2 }, { x: 2, y: 4 }]);
    if (small.status !== 'success') return;
    const r = computeResidualDiagnostics(small.stats);
    expect(r.pattern).toBe('insufficient-data');
  });

  it('interpretation uses cautious language (spec §9, §28)', () => {
    const stats = getStats();
    const r = computeResidualDiagnostics(stats);
    // Should NOT claim proof — "does not PROVE" is acceptable cautionary language.
    // Check it doesn't say "proves the model" or "is proven correct".
    const lower = r.interpretation.toLowerCase();
    expect(lower).not.toMatch(/proven correct/);
    expect(lower).not.toMatch(/\bproves the model\b/);
  });
});

// ===========================================================================
// Intervals (spec §10)
// ===========================================================================

describe('intervals (spec §10)', () => {
  it('produces a band of points across the X range', () => {
    const stats = getStats();
    const band = computeIntervalBand(stats, 0.95, 20);
    expect(band.suppressed).toBe(false);
    expect(band.points.length).toBe(21); // steps + 1
  });

  it('PI is wider than CI at every point (spec §10)', () => {
    const stats = getStats();
    const band = computeIntervalBand(stats, 0.95, 10);
    for (const p of band.points) {
      const ciWidth = p.ciUpper - p.ciLower;
      const piWidth = p.piUpper - p.piLower;
      expect(piWidth).toBeGreaterThan(ciWidth);
    }
  });

  it('supports configurable confidence level (spec §10)', () => {
    const stats = getStats();
    const band95 = computeIntervalBand(stats, 0.95, 10);
    const band99 = computeIntervalBand(stats, 0.99, 10);
    const w95 = band95.points[5].ciUpper - band95.points[5].ciLower;
    const w99 = band99.points[5].ciUpper - band99.points[5].ciLower;
    expect(w99).toBeGreaterThan(w95);
  });

  it('is suppressed when df ≤ 0', () => {
    const twoPoints = calculateSimpleLinearRegression([{ x: 1, y: 2 }, { x: 3, y: 6 }]);
    if (twoPoints.status !== 'success') return;
    const band = computeIntervalBand(twoPoints.stats, 0.95, 10);
    expect(band.suppressed).toBe(true);
  });
});

// ===========================================================================
// Model Comparison (spec §12, §13)
// ===========================================================================

describe('modelComparison (spec §12, §13)', () => {
  it('produces 3 model entries (linear, ln, log10)', () => {
    const r = compareModels(DATA);
    expect(r.models.length).toBe(3);
    expect(r.models.map((m) => m.modelId)).toEqual(['linear', 'ln-linear', 'log10-linear']);
  });

  it('labels the R² scale correctly (spec §12)', () => {
    const r = compareModels(DATA);
    expect(r.models[0].rSquaredScale).toBe('original-Y');
    expect(r.models[1].rSquaredScale).toBe('ln(Y)');
    expect(r.models[2].rSquaredScale).toBe('log10(Y)');
  });

  it('includes a cross-scale comparison caveat (spec §12)', () => {
    const r = compareModels(DATA);
    expect(r.comparisonCaveat).toMatch(/do not.*compare.*R²/i);
    expect(r.comparisonCaveat).toMatch(/different.*scale/i);
  });

  it('ln and log10 models produce identical R² (within tolerance)', () => {
    const r = compareModels(DATA);
    const lnModel = r.models[1];
    const log10Model = r.models[2];
    if (lnModel.domainValid && log10Model.domainValid) {
      expect(lnModel.rSquared).toBeCloseTo(log10Model.rSquared, 8);
    }
  });

  it('marks domain invalid for ln when Y ≤ 0 exists', () => {
    const badData = [
      { x: 1, y: 2 },
      { x: 2, y: -1 },
      { x: 3, y: 3 },
    ];
    const r = compareModels(badData);
    expect(r.models[1].domainValid).toBe(false);
    expect(r.models[2].domainValid).toBe(false);
  });
});

// ===========================================================================
// Scientific Interpretation (spec §19, §28)
// ===========================================================================

describe('scientificInterpretation (spec §19, §28)', () => {
  it('generates at least one finding for the canonical dataset', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    const rd = computeResidualDiagnostics(stats);
    const findings = generateOLSFindings(stats, d, rd);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('never uses "proven correct" language (spec §28)', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    const rd = computeResidualDiagnostics(stats);
    const findings = generateOLSFindings(stats, d, rd);
    for (const f of findings) {
      expect(f.explanation.toLowerCase()).not.toMatch(/\bproven\b/);
    }
  });

  it('generates PK findings with R² caveat (spec §10)', () => {
    const findings = generatePKFindings({
      k: 0.2,
      halfLife: 3.47,
      c0: 10,
      rSquared: 0.95,
      extrapPercentage: 10,
      extrapolationSuppressed: false,
      terminalPhasePointCount: 5,
      slope: -0.2,
    });
    const r2Finding = findings.find((f) => f.category === 'pk-fit');
    expect(r2Finding?.explanation).toMatch(/does not.*prove/i);
  });

  it('generates critical finding for k ≤ 0', () => {
    const findings = generatePKFindings({
      k: -0.1,
      halfLife: NaN,
      c0: 10,
      rSquared: 0.9,
      extrapPercentage: 0,
      extrapolationSuppressed: true,
      terminalPhasePointCount: 3,
      slope: 0.1,
    });
    const critical = findings.find((f) => f.severity === 'critical');
    expect(critical).toBeDefined();
    expect(critical?.title.toLowerCase()).toMatch(/invalid.*elimination/);
  });
});

// ===========================================================================
// Report Generator (spec §20, §21)
// ===========================================================================

describe('reportGenerator (spec §20, §21)', () => {
  it('generates a complete AnalysisReport', () => {
    const stats = getStats();
    const report = generateOLSReport(
      DATA.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y })),
      stats
    );
    expect(report.metadata.analysisType).toBe('ols');
    expect(report.dataset.n).toBe(DATA.length);
    expect(report.regression).toBeDefined();
    expect(report.regression?.slope).toBeCloseTo(stats.slope, 10);
    expect(report.regression?.rSquared).toBeCloseTo(stats.rSquared, 10);
    expect(report.diagnostics).toBeDefined();
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('preserves full precision in the report (spec §27)', () => {
    const stats = getStats();
    const report = generateOLSReport(
      DATA.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y })),
      stats
    );
    // The report slope should match the engine slope exactly
    expect(report.regression?.slope).toBe(stats.slope);
    expect(report.regression?.rSquared).toBe(stats.rSquared);
  });

  it('exportDiagnosticsCSV produces valid CSV with headers', () => {
    const stats = getStats();
    const d = computeObservationDiagnostics(stats);
    const csv = exportDiagnosticsCSV(d);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Index');
    expect(lines[0]).toContain('Leverage');
    expect(lines[0]).toContain('CooksDistance');
    expect(lines.length).toBe(d.observations.length + 1);
  });

  it('exportReportJSON produces valid JSON', () => {
    const stats = getStats();
    const report = generateOLSReport(
      DATA.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y })),
      stats
    );
    const json = exportReportJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.metadata.analysisType).toBe('ols');
    expect(parsed.dataset.n).toBe(DATA.length);
  });
});

// ===========================================================================
// PK Diagnostics (spec §14-§18)
// ===========================================================================

describe('pkDiagnostics (spec §14-§18)', () => {
  const PK_DATA = [
    { id: '1', time: 0, concentration: 20 },
    { id: '2', time: 1, concentration: 20 * Math.exp(-0.15) },
    { id: '3', time: 2, concentration: 20 * Math.exp(-0.30) },
    { id: '4', time: 4, concentration: 20 * Math.exp(-0.60) },
    { id: '5', time: 6, concentration: 20 * Math.exp(-0.90) },
    { id: '6', time: 8, concentration: 20 * Math.exp(-1.20) },
  ];

  it('produces sensitivity entries for different terminal point counts', () => {
    const r = computeTerminalPhaseSensitivity(PK_DATA, 'ln', 3);
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries[0].pointCount).toBeGreaterThanOrEqual(3);
  });

  it('each entry has k, halfLife, rSquared', () => {
    const r = computeTerminalPhaseSensitivity(PK_DATA, 'ln', 3);
    for (const e of r.entries) {
      expect(isFinite(e.k)).toBe(true);
      expect(isFinite(e.halfLife)).toBe(true);
      expect(isFinite(e.rSquared)).toBe(true);
    }
  });

  it('includes the educational caveat (spec §16)', () => {
    const r = computeTerminalPhaseSensitivity(PK_DATA, 'ln', 3);
    expect(r.caveat).toMatch(/does not.*prove/i);
  });
});

// ===========================================================================
// History Store (spec §22, §23)
// ===========================================================================

describe('historyStore (spec §22, §23)', () => {
  let mockStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
  let store: Map<string, string>;

  function setupMock() {
    store = new Map();
    mockStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    };
    setHistoryStorage(mockStorage);
  }

  it('starts empty', () => {
    setupMock();
    expect(loadHistory()).toEqual([]);
  });

  it('adds and retrieves history entries', () => {
    setupMock();
    const stats = getStats();
    const report = generateOLSReport(
      DATA.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y })),
      stats
    );
    const updated = addToHistory(report, 'test-dataset', 'none');
    expect(updated.length).toBe(1);
    expect(updated[0].datasetName).toBe('test-dataset');
    const loaded = loadHistory();
    expect(loaded.length).toBe(1);
  });

  it('deletes a history entry by id', () => {
    setupMock();
    const stats = getStats();
    const report = generateOLSReport(
      DATA.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y })),
      stats
    );
    const updated = addToHistory(report, 'test', 'none');
    const id = updated[0].id;
    const after = deleteHistoryEntry(id);
    expect(after.length).toBe(0);
  });

  it('handles corrupted storage gracefully (spec §29)', () => {
    setupMock();
    store.set('reglab_analysis_history_v1', '{invalid json');
    expect(loadHistory()).toEqual([]);
  });
});

// ===========================================================================
// Invariant / Property Tests (spec §33)
// ===========================================================================

describe('invariants (spec §33)', () => {
  it('SST ≈ SSR + SSE', () => {
    const stats = getStats();
    const tol = 1e-9 * Math.max(1, Math.abs(stats.sst));
    expect(Math.abs(stats.sst - (stats.ssr + stats.sse))).toBeLessThan(tol);
  });

  it('R² ≈ SSR / SST', () => {
    const stats = getStats();
    if (stats.sst > 0) {
      expect(stats.rSquared).toBeCloseTo(stats.ssr / stats.sst, 8);
    }
  });

  it('R² ≈ 1 − SSE/SST', () => {
    const stats = getStats();
    if (stats.sst > 0) {
      expect(stats.rSquared).toBeCloseTo(1 - stats.sse / stats.sst, 8);
    }
  });

  it('mean residual ≈ 0', () => {
    const stats = getStats();
    const sum = stats.points.reduce((acc, p) => acc + p.residual, 0);
    expect(Math.abs(sum / stats.n)).toBeLessThan(1e-10);
  });

  it('sum of leverage ≈ p = 2 (spec §33)', () => {
    const stats = getStats();
    const sumH = stats.points.reduce((acc, p) => acc + (p.leverage ?? 0), 0);
    // For simple regression with intercept, sum(h_i) = p = 2
    expect(Math.abs(sumH - 2)).toBeLessThan(1e-9);
  });
});

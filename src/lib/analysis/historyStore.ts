import { AnalysisHistoryEntry, AnalysisReport } from '../../types';

/**
 * Phase 6 — Analysis History Store (spec §22, §23).
 *
 * Lightweight localStorage-backed history of past analyses. No backend,
 * no cloud, no authentication (spec §22, §30).
 *
 * Spec §23: preserves the exact dataset and full report snapshot for
 * reproducibility. No floating-point rounding during storage.
 *
 * Spec §22: allows view previous analysis, reopen, delete.
 */

const STORAGE_KEY = 'reglab_analysis_history_v1';
const MAX_ENTRIES = 20; // prevent unbounded localStorage growth

interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): HistoryStorage {
  if (typeof localStorage !== 'undefined') return localStorage;
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

let storage: HistoryStorage = getDefaultStorage();

export function setHistoryStorage(s: HistoryStorage): void {
  storage = s;
}

/**
 * Loads all analysis history entries.
 * Spec §29: handles corrupted storage gracefully.
 */
export function loadHistory(): AnalysisHistoryEntry[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Adds a new analysis to the history.
 * Spec §23: stores the full report snapshot for reproducibility.
 */
export function addToHistory(
  report: AnalysisReport,
  datasetName: string,
  transformation: string
): AnalysisHistoryEntry[] {
  const history = loadHistory();
  const entry: AnalysisHistoryEntry = {
    id: `analysis-${Date.now()}`,
    timestamp: new Date().toISOString(),
    analysisType: report.metadata.analysisType,
    datasetName,
    transformation,
    keyResults: {
      slope: report.regression?.slope,
      intercept: report.regression?.intercept,
      rSquared: report.regression?.rSquared,
      k: report.pharmacokinetics?.k,
      halfLife: report.pharmacokinetics?.halfLife,
      c0: report.pharmacokinetics?.c0,
      aucTotal: report.pharmacokinetics?.aucTotal,
    },
    reportSnapshot: report,
  };

  // Prepend and cap at MAX_ENTRIES
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full — silently drop oldest entries
    const trimmed = updated.slice(0, Math.floor(MAX_ENTRIES / 2));
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return trimmed;
    } catch {
      // give up silently
    }
  }
  return updated;
}

/**
 * Deletes a history entry by ID.
 */
export function deleteHistoryEntry(id: string): AnalysisHistoryEntry[] {
  const history = loadHistory();
  const updated = history.filter((e) => e.id !== id);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

/**
 * Clears all history.
 */
export function clearHistory(): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

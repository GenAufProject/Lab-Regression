import { LearningProgress, LessonCategory } from '../../types';

/**
 * Phase 5 — Progress Store (spec §18, §19).
 *
 * Lightweight localStorage-backed progress tracking. No backend, no cloud,
 * no user accounts (spec §30).
 *
 * Spec §18: "Track locally: completed lessons, completed practice questions,
 * quiz scores, mastered topics."
 * Spec §19: "Keep the mastery calculation simple and transparent. Do not
 * claim that this represents scientifically validated competency."
 *
 * The store is a thin abstraction over localStorage so the rest of the
 * app never touches localStorage directly. This makes it easy to test
 * (by injecting a mock storage) and easy to migrate to a different
 * persistence layer in the future.
 *
 * Spec §29: corrupted local progress is handled gracefully — if the
 * stored JSON is invalid, the store resets to the default empty progress
 * rather than crashing.
 */

const STORAGE_KEY = 'reglab_learning_progress_v1';

const DEFAULT_PROGRESS: LearningProgress = {
  completedLessons: [],
  completedQuestions: [],
  topicScores: {},
  totalCorrect: 0,
  totalAttempted: 0,
};

/**
 * The storage interface. Defaults to global localStorage in browsers.
 * Tests can inject a mock.
 */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): ProgressStorage {
  if (typeof localStorage !== 'undefined') return localStorage;
  // SSR / test fallback — in-memory map
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

let storage: ProgressStorage = getDefaultStorage();

/**
 * Inject a custom storage implementation (for tests).
 */
export function setProgressStorage(s: ProgressStorage): void {
  storage = s;
}

/**
 * Resets to the default storage (localStorage in browser).
 */
export function resetProgressStorage(): void {
  storage = getDefaultStorage();
}

/**
 * Loads the learning progress from storage.
 * Spec §29: returns DEFAULT_PROGRESS if storage is corrupted or empty.
 */
export function loadProgress(): LearningProgress {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    // Validate shape — if any required field is missing or wrong type,
    // fall back to default rather than crashing.
    if (!isValidProgress(parsed)) return { ...DEFAULT_PROGRESS };
    return parsed as LearningProgress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Saves the learning progress to storage.
 * Spec §18: persists via the project's existing localStorage approach.
 */
export function saveProgress(progress: LearningProgress): void {
  try {
    const toSave: LearningProgress = {
      ...progress,
      lastActivityAt: new Date().toISOString(),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Storage full or unavailable — silently ignore (educational app,
    // progress tracking is non-critical).
  }
}

/**
 * Marks a lesson as completed.
 * Returns the updated progress (does not mutate the input).
 */
export function markLessonCompleted(
  progress: LearningProgress,
  lessonId: string
): LearningProgress {
  if (progress.completedLessons.includes(lessonId)) return progress;
  const updated: LearningProgress = {
    ...progress,
    completedLessons: [...progress.completedLessons, lessonId],
  };
  saveProgress(updated);
  return updated;
}

/**
 * Marks a practice question as completed (answered correctly at least once).
 * Also updates the topic score and totals.
 */
export function markQuestionCompleted(
  progress: LearningProgress,
  questionId: string,
  category: LessonCategory | 'general',
  isCorrect: boolean
): LearningProgress {
  const alreadyCompleted = progress.completedQuestions.includes(questionId);
  const updated: LearningProgress = {
    ...progress,
    completedQuestions: alreadyCompleted
      ? progress.completedQuestions
      : [...progress.completedQuestions, questionId],
    totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
    totalAttempted: progress.totalAttempted + 1,
  };
  // Update topic score (simple transparent ratio — spec §19)
  if (category !== 'general') {
    const prev = updated.topicScores[category] ?? 0;
    // Recompute from completed questions in this category
    // (simplified: incrementally move toward 1.0 with each correct answer)
    if (isCorrect) {
      updated.topicScores[category] = Math.min(1, prev + 0.1);
    }
  }
  saveProgress(updated);
  return updated;
}

/**
 * Resets all progress (used by the "Reset Progress" button in the UI).
 */
export function resetProgress(): LearningProgress {
  const empty = { ...DEFAULT_PROGRESS };
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return empty;
}

/**
 * Returns the mastery percentage for a topic (spec §19).
 * Simple transparent calculation: the topic score (in [0, 1]) × 100.
 * Returns 0 if the topic has no score yet.
 *
 * NOTE: this is NOT a scientifically validated competency measure.
 */
export function getTopicMastery(
  progress: LearningProgress,
  category: LessonCategory
): number {
  const score = progress.topicScores[category];
  if (typeof score !== 'number' || !isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score)) * 100;
}

/**
 * Returns the overall mastery percentage across all topics.
 */
export function getOverallMastery(progress: LearningProgress): number {
  const categories: LessonCategory[] = [
    'regression-fundamentals',
    'ols',
    'diagnostics',
    'transformations',
    'pk',
  ];
  const scores = categories.map((c) => getTopicMastery(progress, c));
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / categories.length;
}

// ===========================================================================
// Internal: validate the shape of a parsed progress object (spec §29)
// ===========================================================================

function isValidProgress(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  if (!Array.isArray(p.completedLessons)) return false;
  if (!Array.isArray(p.completedQuestions)) return false;
  if (typeof p.topicScores !== 'object' || p.topicScores === null) return false;
  if (typeof p.totalCorrect !== 'number') return false;
  if (typeof p.totalAttempted !== 'number') return false;
  return true;
}

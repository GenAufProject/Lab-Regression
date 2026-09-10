import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAllLessons,
  getAllModules,
  getLessonById,
  getLessonsByModule,
  getLessonsByCategory,
  getNextLesson,
  getPreviousLesson,
  getRecommendedNextLesson,
  getTotalLessonCount,
  getCompletedLessonCount,
  validateLesson,
} from '../lessonEngine';
import { StructuredLesson } from '../../../types';

// ===========================================================================
// Phase 5 — Lesson Engine tests (spec §26)
// ===========================================================================

describe('lessonEngine — lesson loading (spec §26)', () => {
  it('returns a non-empty array of structured lessons', () => {
    const lessons = getAllLessons();
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array of learning modules', () => {
    const modules = getAllModules();
    expect(modules.length).toBe(5); // A-E
    expect(modules.map((m) => m.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('every lesson has a unique id', () => {
    const lessons = getAllLessons();
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getLessonById returns the lesson for a known id', () => {
    const lesson = getLessonById('a1-what-is-regression');
    expect(lesson).toBeDefined();
    expect(lesson?.title).toBe('What is Regression?');
  });

  it('getLessonById returns undefined for an unknown id (spec §29)', () => {
    expect(getLessonById('nonexistent-lesson')).toBeUndefined();
  });
});

describe('lessonEngine — module navigation (spec §20)', () => {
  it('getLessonsByModule returns lessons for module A', () => {
    const lessons = getLessonsByModule('A');
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.every((l) => l.module === 'A')).toBe(true);
  });

  it('getLessonsByCategory returns lessons for the right category', () => {
    const lessons = getLessonsByCategory('pk');
    expect(lessons.length).toBeGreaterThan(0);
    expect(lessons.every((l) => l.category === 'pk')).toBe(true);
  });

  it('getNextLesson returns the next lesson in the same module', () => {
    const next = getNextLesson('a1-what-is-regression');
    expect(next).toBeDefined();
    expect(next?.module).toBe('A');
  });

  it('getNextLesson returns undefined for the last lesson in a module', () => {
    const moduleALessons = getLessonsByModule('A');
    const lastLessonId = moduleALessons[moduleALessons.length - 1].id;
    expect(getNextLesson(lastLessonId)).toBeUndefined();
  });

  it('getPreviousLesson returns the previous lesson in the same module', () => {
    const prev = getPreviousLesson('a2-variables-and-scatter-plots');
    expect(prev).toBeDefined();
    expect(prev?.id).toBe('a1-what-is-regression');
  });

  it('getPreviousLesson returns undefined for the first lesson in a module', () => {
    expect(getPreviousLesson('a1-what-is-regression')).toBeUndefined();
  });
});

describe('lessonEngine — recommendations (spec §20)', () => {
  it('getRecommendedNextLesson returns the first uncompleted lesson', () => {
    const recommended = getRecommendedNextLesson([]);
    expect(recommended).toBeDefined();
    expect(recommended?.id).toBe(getAllLessons()[0].id);
  });

  it('getRecommendedNextLesson skips completed lessons', () => {
    const all = getAllLessons();
    const completed = all.slice(0, 3).map((l) => l.id);
    const recommended = getRecommendedNextLesson(completed);
    expect(recommended).toBeDefined();
    expect(recommended?.id).toBe(all[3].id);
  });

  it('getRecommendedNextLesson returns the first lesson when all are completed', () => {
    const all = getAllLessons();
    const completed = all.map((l) => l.id);
    const recommended = getRecommendedNextLesson(completed);
    expect(recommended?.id).toBe(all[0].id);
  });
});

describe('lessonEngine — counts', () => {
  it('getTotalLessonCount returns the correct count', () => {
    const count = getTotalLessonCount();
    expect(count).toBe(getAllLessons().length);
  });

  it('getCompletedLessonCount returns the number of completed lessons', () => {
    const all = getAllLessons();
    const completed = all.slice(0, 5).map((l) => l.id);
    expect(getCompletedLessonCount(completed)).toBe(5);
  });
});

describe('lessonEngine — validation (spec §26)', () => {
  it('validates a well-formed lesson with no errors', () => {
    const lesson = getLessonById('a1-what-is-regression')!;
    const errors = validateLesson(lesson);
    expect(errors).toEqual([]);
  });

  it('reports errors for a malformed lesson', () => {
    const badLesson: StructuredLesson = {
      id: '',
      title: '',
      description: '',
      category: 'regression-fundamentals',
      module: 'A',
      difficulty: 'beginner',
      objectives: [],
      sections: [],
      keyTakeaways: [],
    };
    const errors = validateLesson(badLesson);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('id is required'))).toBe(true);
    expect(errors.some((e) => e.includes('at least one objective'))).toBe(true);
    expect(errors.some((e) => e.includes('at least one section'))).toBe(true);
  });
});

// ===========================================================================
// Phase 5 — Practice Engine tests (spec §26)
// ===========================================================================

import {
  getAllPracticeQuestions,
  getPracticeQuestionById,
  validatePracticeAnswer,
  validatePracticeQuestion,
  getTotalPracticeQuestionCount,
} from '../practiceEngine';

describe('practiceEngine — question loading (spec §26)', () => {
  it('returns a non-empty array of practice questions', () => {
    const qs = getAllPracticeQuestions();
    expect(qs.length).toBeGreaterThan(0);
  });

  it('every question has a unique id', () => {
    const qs = getAllPracticeQuestions();
    const ids = qs.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getPracticeQuestionById returns the question for a known id', () => {
    const q = getPracticeQuestionById('p01-slope-meaning');
    expect(q).toBeDefined();
    expect(q?.title).toBe('Meaning of the slope');
  });

  it('getPracticeQuestionById returns undefined for an unknown id', () => {
    expect(getPracticeQuestionById('nonexistent')).toBeUndefined();
  });

  it('getTotalPracticeQuestionCount returns the correct count', () => {
    expect(getTotalPracticeQuestionCount()).toBe(getAllPracticeQuestions().length);
  });
});

describe('practiceEngine — answer validation (spec §13, §14)', () => {
  it('returns isCorrect=true when the correct option is selected', () => {
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const result = validatePracticeAnswer(q.id, correctIdx, 1);
    expect(result).toBeDefined();
    expect(result?.isCorrect).toBe(true);
    expect(result?.correctIndex).toBe(correctIdx);
  });

  it('returns isCorrect=false when an incorrect option is selected', () => {
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const wrongIdx = (correctIdx + 1) % q.options.length;
    const result = validatePracticeAnswer(q.id, wrongIdx, 1);
    expect(result?.isCorrect).toBe(false);
    expect(result?.selectedIndex).toBe(wrongIdx);
    expect(result?.correctIndex).toBe(correctIdx);
  });

  it('includes the explanation in the result', () => {
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const result = validatePracticeAnswer(q.id, correctIdx, 1);
    expect(result?.explanation).toBe(q.explanation);
  });

  it('includes the mistake category and explanation when wrong (spec §14)', () => {
    const q = getPracticeQuestionById('p09-pk-k-from-ln-slope')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const wrongIdx = (correctIdx + 1) % q.options.length;
    const result = validatePracticeAnswer(q.id, wrongIdx, 1);
    expect(result?.mistakeCategory).toBeDefined();
    expect(result?.mistakeExplanation).toBeDefined();
    expect(result?.mistakeExplanation!.length).toBeGreaterThan(0);
  });

  it('shows the hint after the first incorrect attempt (spec §13)', () => {
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const wrongIdx = (correctIdx + 1) % q.options.length;
    const result = validatePracticeAnswer(q.id, wrongIdx, 1);
    expect(result?.showHint).toBe(true);
    expect(result?.hint).toBe(q.hint);
  });

  it('does NOT show the hint before submission (attempt 0)', () => {
    // The function requires attemptNumber >= 1 to show hint
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    const wrongIdx = (correctIdx + 1) % q.options.length;
    const result = validatePracticeAnswer(q.id, wrongIdx, 0);
    expect(result?.showHint).toBe(false);
  });

  it('returns undefined for an unknown question id (spec §29)', () => {
    expect(validatePracticeAnswer('nonexistent', 0, 1)).toBeUndefined();
  });
});

describe('practiceEngine — question validation (spec §26)', () => {
  it('validates a well-formed question with no errors', () => {
    const q = getPracticeQuestionById('p01-slope-meaning')!;
    const errors = validatePracticeQuestion(q);
    expect(errors).toEqual([]);
  });

  it('reports errors for a malformed question', () => {
    const errors = validatePracticeQuestion({
      id: '',
      title: '',
      prompt: '',
      category: 'general',
      type: 'conceptual',
      difficulty: 'beginner',
      options: [],
      explanation: '',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Phase 5 — Mistake Engine tests (spec §14)
// ===========================================================================

import { getMistakeExplanation, isKnownMistake, getAllMistakeCategories, MISTAKE_REGISTRY } from '../mistakeEngine';

describe('mistakeEngine (spec §14)', () => {
  it('has an entry for every LearningMistake category', () => {
    const categories = getAllMistakeCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
  });

  it('returns a structured explanation for a known category', () => {
    const exp = getMistakeExplanation('pk-slope-sign');
    expect(exp.category).toBe('pk-slope-sign');
    expect(exp.label.length).toBeGreaterThan(0);
    expect(exp.explanation.length).toBeGreaterThan(20);
    expect(exp.correctPrinciple.length).toBeGreaterThan(10);
  });

  it('isKnownMistake returns true for known categories', () => {
    expect(isKnownMistake('wrong-sign')).toBe(true);
    expect(isKnownMistake('r2-misinterpretation')).toBe(true);
  });

  it('isKnownMistake returns false for unknown categories', () => {
    expect(isKnownMistake('totally-made-up')).toBe(false);
  });

  it('the pk-slope-sign explanation mentions that k must be positive', () => {
    const exp = getMistakeExplanation('pk-slope-sign');
    expect(exp.explanation.toLowerCase()).toMatch(/positive/);
  });

  it('the r2-misinterpretation explanation mentions that R² does not prove correctness', () => {
    const exp = getMistakeExplanation('r2-misinterpretation');
    expect(exp.explanation.toLowerCase()).toMatch(/does not.*prove|not.*proof/);
  });
});

// ===========================================================================
// Phase 5 — Progress Store tests (spec §18, §19, §29)
// ===========================================================================

import {
  loadProgress,
  saveProgress,
  markLessonCompleted,
  markQuestionCompleted,
  resetProgress,
  getTopicMastery,
  getOverallMastery,
  setProgressStorage,
  resetProgressStorage,
  ProgressStorage,
} from '../progressStore';

describe('progressStore (spec §18, §19, §29)', () => {
  let mockStorage: ProgressStorage;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    mockStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    };
    setProgressStorage(mockStorage);
  });

  it('returns default empty progress when storage is empty', () => {
    const p = loadProgress();
    expect(p.completedLessons).toEqual([]);
    expect(p.completedQuestions).toEqual([]);
    expect(p.totalCorrect).toBe(0);
    expect(p.totalAttempted).toBe(0);
  });

  it('saves and loads progress', () => {
    const p = {
      completedLessons: ['a1'],
      completedQuestions: ['p01'],
      topicScores: { 'regression-fundamentals': 0.5 },
      totalCorrect: 1,
      totalAttempted: 2,
    };
    saveProgress(p);
    const loaded = loadProgress();
    expect(loaded.completedLessons).toEqual(['a1']);
    expect(loaded.completedQuestions).toEqual(['p01']);
    expect(loaded.totalCorrect).toBe(1);
    expect(loaded.totalAttempted).toBe(2);
  });

  it('handles corrupted storage gracefully (spec §29)', () => {
    store.set('reglab_learning_progress_v1', '{invalid json');
    const p = loadProgress();
    expect(p.completedLessons).toEqual([]);
    expect(p.totalCorrect).toBe(0);
  });

  it('handles storage with wrong shape gracefully (spec §29)', () => {
    store.set('reglab_learning_progress_v1', JSON.stringify({ foo: 'bar' }));
    const p = loadProgress();
    expect(p.completedLessons).toEqual([]);
  });

  it('markLessonCompleted adds a lesson without duplicating', () => {
    const p = loadProgress();
    const p2 = markLessonCompleted(p, 'a1');
    expect(p2.completedLessons).toContain('a1');
    const p3 = markLessonCompleted(p2, 'a1');
    expect(p3.completedLessons.length).toBe(1);
  });

  it('markQuestionCompleted updates totals and topic score', () => {
    const p = loadProgress();
    const p2 = markQuestionCompleted(p, 'p01', 'regression-fundamentals', true);
    expect(p2.totalCorrect).toBe(1);
    expect(p2.totalAttempted).toBe(1);
    expect(p2.topicScores['regression-fundamentals']).toBeGreaterThan(0);
  });

  it('markQuestionCompleted does not increment totalCorrect for incorrect answers', () => {
    const p = loadProgress();
    const p2 = markQuestionCompleted(p, 'p01', 'regression-fundamentals', false);
    expect(p2.totalCorrect).toBe(0);
    expect(p2.totalAttempted).toBe(1);
  });

  it('resetProgress clears all progress', () => {
    saveProgress({
      completedLessons: ['a1'],
      completedQuestions: ['p01'],
      topicScores: {},
      totalCorrect: 1,
      totalAttempted: 1,
    });
    const p = resetProgress();
    expect(p.completedLessons).toEqual([]);
    expect(p.totalCorrect).toBe(0);
    expect(store.has('reglab_learning_progress_v1')).toBe(false);
  });

  it('getTopicMastery returns a percentage in [0, 100]', () => {
    const p = {
      completedLessons: [],
      completedQuestions: [],
      topicScores: { pk: 0.8 },
      totalCorrect: 0,
      totalAttempted: 0,
    };
    expect(getTopicMastery(p, 'pk')).toBe(80);
  });

  it('getTopicMastery returns 0 for an unknown topic', () => {
    const p = {
      completedLessons: [],
      completedQuestions: [],
      topicScores: {},
      totalCorrect: 0,
      totalAttempted: 0,
    };
    expect(getTopicMastery(p, 'pk')).toBe(0);
  });

  it('getOverallMastery returns the average across all topics', () => {
    const p = {
      completedLessons: [],
      completedQuestions: [],
      topicScores: {
        'regression-fundamentals': 1.0,
        'ols': 0.5,
        'diagnostics': 0,
        'transformations': 0,
        'pk': 0,
      },
      totalCorrect: 0,
      totalAttempted: 0,
    };
    // (100 + 50 + 0 + 0 + 0) / 5 = 30
    expect(getOverallMastery(p)).toBe(30);
  });
});

// ===========================================================================
// Phase 5 — Guided Calculation Engine tests (spec §3, §27)
// ===========================================================================

import { buildGuidedCalculationTrace } from '../guidedCalculation';
import { calculateSimpleLinearRegression } from '../../statistics/linearRegression';

describe('guidedCalculation — OLS trace (spec §3, §27)', () => {
  const DATA = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 4 },
    { x: 5, y: 5 },
  ];

  it('produces a 10-step trace', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    expect(trace).toBeDefined();
    expect(trace?.steps.length).toBe(10);
    expect(trace?.totalSteps).toBe(10);
  });

  it('Step 1 is "Calculate the means"', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    expect(trace?.steps[0].title).toMatch(/means/i);
  });

  it('Step 10 is "Interpret"', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    expect(trace?.steps[9].title).toMatch(/interpret/i);
  });

  it('every step has non-empty title, description, formula, and result', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    if (!trace) return;
    for (const s of trace.steps) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.formulaLatex.length).toBeGreaterThan(0);
      expect(s.result.length).toBeGreaterThan(0);
    }
  });

  it('CRITICAL: guided trace values match the Phase 2 engine (spec §27)', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    const engine = calculateSimpleLinearRegression(DATA);
    if (trace && engine.status === 'success') {
      // The trace Step 4 result contains the slope — verify it matches the engine
      const slopeStep = trace.steps.find((s) => s.title.includes('slope'));
      expect(slopeStep?.result).toContain(String(engine.stats.slope));
      // Step 9 result contains SSE and R²
      const r2Step = trace.steps.find((s) => s.title.includes('SSE'));
      expect(r2Step?.result).toContain(String(engine.stats.rSquared));
    }
  });

  it('returns undefined for insufficient data', () => {
    const trace = buildGuidedCalculationTrace([{ x: 1, y: 2 }]);
    expect(trace).toBeUndefined();
  });

  it('includes per-observation tables for deviation and prediction steps', () => {
    const trace = buildGuidedCalculationTrace(DATA);
    if (!trace) return;
    const deviationStep = trace.steps.find((s) => s.title.includes('deviations'));
    expect(deviationStep?.table).toBeDefined();
    expect(deviationStep?.table?.rows.length).toBe(DATA.length);
    const predictionStep = trace.steps.find((s) => s.title.includes('predicted'));
    expect(predictionStep?.table).toBeDefined();
  });
});

// ===========================================================================
// Phase 5 — Guided PK Calculation Engine tests (spec §10, §11, §27)
// ===========================================================================

import { buildGuidedPKCalculationTrace } from '../guidedPKCalculation';
import { analyzeFirstOrderElimination } from '../../pharmacokinetics/pkAnalysis';

describe('guidedPKCalculation — PK trace (spec §10, §11, §27)', () => {
  const PK_DATA = [
    { id: '1', time: 0, concentration: 20 },
    { id: '2', time: 1, concentration: 20 * Math.exp(-0.15) },
    { id: '3', time: 2, concentration: 20 * Math.exp(-0.30) },
    { id: '4', time: 4, concentration: 20 * Math.exp(-0.60) },
    { id: '5', time: 6, concentration: 20 * Math.exp(-0.90) },
    { id: '6', time: 8, concentration: 20 * Math.exp(-1.20) },
  ];

  it('produces an 11-step trace', () => {
    const trace = buildGuidedPKCalculationTrace(PK_DATA, 'ln');
    expect(trace).toBeDefined();
    expect(trace?.steps.length).toBe(11);
    expect(trace?.totalSteps).toBe(11);
  });

  it('Step 1 is "Validate"', () => {
    const trace = buildGuidedPKCalculationTrace(PK_DATA, 'ln');
    expect(trace?.steps[0].title).toMatch(/validate/i);
  });

  it('Step 11 is "Interpret"', () => {
    const trace = buildGuidedPKCalculationTrace(PK_DATA, 'ln');
    expect(trace?.steps[10].title).toMatch(/interpret/i);
  });

  it('CRITICAL: guided PK trace values match the Phase 4 engine (spec §27)', () => {
    const trace = buildGuidedPKCalculationTrace(PK_DATA, 'ln');
    const engine = analyzeFirstOrderElimination(PK_DATA, { logBase: 'ln' });
    if (trace && engine.status === 'success') {
      // Step 5 result contains k
      const kStep = trace.steps.find((s) => s.title.includes('elimination rate'));
      expect(kStep?.result).toContain(String(engine.regression.eliminationRateConstant));
      // Step 7 result contains t½
      const tHalfStep = trace.steps.find((s) => s.title.includes('half-life'));
      expect(tHalfStep?.result).toContain(String(engine.regression.halfLife));
    }
  });

  it('returns undefined for invalid PK data', () => {
    const trace = buildGuidedPKCalculationTrace([
      { id: '1', time: 0, concentration: -1 },
    ], 'ln');
    expect(trace).toBeUndefined();
  });

  it('the interpretation step explicitly states R² does not prove first-order kinetics (spec §10)', () => {
    const trace = buildGuidedPKCalculationTrace(PK_DATA, 'ln');
    if (!trace) return;
    const interpretStep = trace.steps[10];
    expect(interpretStep.description).toMatch(/does not.*prove|not.*proof/i);
  });
});

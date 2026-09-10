import { PracticeAnswerResult, PracticeQuestionV2 } from '../../types';
import { PRACTICE_QUESTIONS_V2 } from '../../data/questions';
import { getMistakeExplanation } from './mistakeEngine';

/**
 * Phase 5 — Practice Engine (spec §12, §13, §14).
 *
 * Pure logic layer for practice-question validation. No React, no DOM.
 *
 * Spec §13: "Do NOT reveal the answer before submission."
 * Spec §13: After incorrect submission, show "Not quite." + explanation +
 *   the conceptual mistake (via the mistake engine).
 * Spec §14: Mistakes are categorized so the explanation can be
 *   context-sensitive.
 * Spec §27: The practice engine does NOT perform statistical calculations.
 *   Questions that reference numeric values (slope, k, t½, AUC) use
 *   pre-computed values from the Phase 2-4 engines in the question data.
 */

/**
 * Returns all practice questions (spec §12).
 */
export function getAllPracticeQuestions(): PracticeQuestionV2[] {
  return PRACTICE_QUESTIONS_V2;
}

/**
 * Returns a practice question by ID, or undefined if not found (spec §29).
 */
export function getPracticeQuestionById(id: string): PracticeQuestionV2 | undefined {
  return PRACTICE_QUESTIONS_V2.find((q) => q.id === id);
}

/**
 * Returns practice questions filtered by category.
 */
export function getPracticeQuestionsByCategory(
  category: PracticeQuestionV2['category']
): PracticeQuestionV2[] {
  return PRACTICE_QUESTIONS_V2.filter((q) => q.category === category);
}

/**
 * Returns practice questions filtered by difficulty.
 */
export function getPracticeQuestionsByDifficulty(
  difficulty: PracticeQuestionV2['difficulty']
): PracticeQuestionV2[] {
  return PRACTICE_QUESTIONS_V2.filter((q) => q.difficulty === difficulty);
}

/**
 * Validates a practice answer (spec §13, §14).
 *
 * Returns a structured PracticeAnswerResult that the UI uses to show:
 *   - "Correct." + explanation (if correct)
 *   - "Not quite." + explanation + mistake-category explanation + hint (if wrong)
 *
 * The result NEVER reveals the correct answer text before submission — it
 * only returns the correctIndex (which the UI uses to highlight the right
 * option AFTER the learner has submitted).
 *
 * Spec §14: if the question has a `mistakeCategory`, the mistake engine
 * provides a context-sensitive explanation for the most-common wrong answer.
 *
 * @param questionId  The practice question ID.
 * @param selectedIndex  The index of the option the learner selected.
 * @param attemptNumber  The 1-based attempt number (1 = first try). Used to
 *   decide whether to show the hint (shown after the first incorrect attempt).
 */
export function validatePracticeAnswer(
  questionId: string,
  selectedIndex: number,
  attemptNumber: number = 1
): PracticeAnswerResult | undefined {
  const question = getPracticeQuestionById(questionId);
  if (!question) return undefined;

  const correctIndex = question.options.findIndex((o) => o.isCorrect);
  if (correctIndex < 0) return undefined; // malformed question

  const isCorrect = selectedIndex === correctIndex;
  const showHint = !isCorrect && attemptNumber >= 1 && !!question.hint;

  const mistakeExplanation = !isCorrect && question.mistakeCategory
    ? getMistakeExplanation(question.mistakeCategory).explanation
    : undefined;

  return {
    isCorrect,
    selectedIndex,
    correctIndex,
    explanation: question.explanation,
    mistakeCategory: !isCorrect ? question.mistakeCategory : undefined,
    mistakeExplanation,
    showHint,
    hint: showHint ? question.hint : undefined,
  };
}

/**
 * Returns the total number of practice questions.
 */
export function getTotalPracticeQuestionCount(): number {
  return PRACTICE_QUESTIONS_V2.length;
}

/**
 * Validates that a practice question is well-formed (spec §26).
 * Used by tests to catch data-entry errors.
 */
export function validatePracticeQuestion(question: PracticeQuestionV2): string[] {
  const errors: string[] = [];
  if (!question.id) errors.push('Question id is required');
  if (!question.title) errors.push('Question title is required');
  if (!question.prompt) errors.push('Question prompt is required');
  if (!question.explanation) errors.push('Question explanation is required');
  if (!question.options || question.options.length < 2) {
    errors.push('Question must have at least 2 options');
  }
  const correctCount = question.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    errors.push(`Question must have exactly 1 correct option (found ${correctCount})`);
  }
  return errors;
}

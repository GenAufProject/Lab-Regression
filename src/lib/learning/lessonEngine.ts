import { LearningModule, StructuredLesson, LessonCategory } from '../../types';
import { STRUCTURED_LESSONS } from '../../data/lessons';
import { LEARNING_MODULES } from '../../data/lessons/modules';

/**
 * Phase 5 — Lesson Engine (spec §2, §26).
 *
 * Pure data-access layer for structured lessons. No React, no DOM, no I/O.
 * Provides:
 *   - lesson loading by ID
 *   - module loading by ID
 *   - lessons-by-module lookup
 *   - lessons-by-category lookup
 *   - next/previous lesson navigation within a module
 *   - validation (returns undefined for unknown IDs rather than throwing)
 *
 * Spec §29: invalid lesson IDs return undefined (graceful handling — the UI
 * shows a "lesson not found" message rather than crashing).
 *
 * Spec §27: the lesson engine does NOT perform statistical calculations.
 * It only loads structured content. All math is delegated to the Phase 2-4
 * engines via the guided-calculation helpers.
 */

/**
 * Returns all structured lessons (spec §2).
 */
export function getAllLessons(): StructuredLesson[] {
  return STRUCTURED_LESSONS;
}

/**
 * Returns all learning modules (spec §1).
 */
export function getAllModules(): LearningModule[] {
  return LEARNING_MODULES;
}

/**
 * Returns a lesson by ID, or undefined if not found (spec §29).
 */
export function getLessonById(id: string): StructuredLesson | undefined {
  return STRUCTURED_LESSONS.find((l) => l.id === id);
}

/**
 * Returns a module by ID, or undefined if not found.
 */
export function getModuleById(id: string): LearningModule | undefined {
  return LEARNING_MODULES.find((m) => m.id === id);
}

/**
 * Returns all lessons in a given module.
 */
export function getLessonsByModule(moduleLetter: 'A' | 'B' | 'C' | 'D' | 'E'): StructuredLesson[] {
  return STRUCTURED_LESSONS.filter((l) => l.module === moduleLetter);
}

/**
 * Returns all lessons in a given category.
 */
export function getLessonsByCategory(category: LessonCategory): StructuredLesson[] {
  return STRUCTURED_LESSONS.filter((l) => l.category === category);
}

/**
 * Returns the next lesson in the same module, or undefined if this is the last.
 * Used for "Continue Learning" navigation (spec §20).
 */
export function getNextLesson(currentLessonId: string): StructuredLesson | undefined {
  const current = getLessonById(currentLessonId);
  if (!current) return undefined;
  const moduleLessons = getLessonsByModule(current.module);
  const idx = moduleLessons.findIndex((l) => l.id === currentLessonId);
  if (idx < 0 || idx >= moduleLessons.length - 1) return undefined;
  return moduleLessons[idx + 1];
}

/**
 * Returns the previous lesson in the same module, or undefined if this is the first.
 */
export function getPreviousLesson(currentLessonId: string): StructuredLesson | undefined {
  const current = getLessonById(currentLessonId);
  if (!current) return undefined;
  const moduleLessons = getLessonsByModule(current.module);
  const idx = moduleLessons.findIndex((l) => l.id === currentLessonId);
  if (idx <= 0) return undefined;
  return moduleLessons[idx - 1];
}

/**
 * Returns the first lesson that has not been completed (by ID set).
 * Used by the Learning Dashboard "Continue Learning" feature (spec §20).
 * If all lessons are completed, returns the first lesson of the first module.
 */
export function getRecommendedNextLesson(completedLessonIds: string[]): StructuredLesson | undefined {
  const completed = new Set(completedLessonIds);
  for (const lesson of STRUCTURED_LESSONS) {
    if (!completed.has(lesson.id)) return lesson;
  }
  return STRUCTURED_LESSONS[0];
}

/**
 * Returns the total number of lessons across all modules.
 */
export function getTotalLessonCount(): number {
  return STRUCTURED_LESSONS.length;
}

/**
 * Returns the number of completed lessons.
 */
export function getCompletedLessonCount(completedLessonIds: string[]): number {
  const completed = new Set(completedLessonIds);
  return STRUCTURED_LESSONS.filter((l) => completed.has(l.id)).length;
}

/**
 * Validates that a lesson has the minimum required fields.
 * Used by tests to catch data-entry errors (spec §26).
 */
export function validateLesson(lesson: StructuredLesson): string[] {
  const errors: string[] = [];
  if (!lesson.id) errors.push('Lesson id is required');
  if (!lesson.title) errors.push('Lesson title is required');
  if (!lesson.description) errors.push('Lesson description is required');
  if (!lesson.objectives || lesson.objectives.length === 0) {
    errors.push('Lesson must have at least one objective');
  }
  if (!lesson.sections || lesson.sections.length === 0) {
    errors.push('Lesson must have at least one section');
  }
  if (!lesson.keyTakeaways || lesson.keyTakeaways.length === 0) {
    errors.push('Lesson must have at least one key takeaway');
  }
  // Validate question sections have a correct answer index
  lesson.sections.forEach((s, i) => {
    if (s.type === 'question') {
      if (s.correctAnswer < 0 || s.correctAnswer >= s.options.length) {
        errors.push(`Section ${i + 1} (question): correctAnswer out of range`);
      }
    }
  });
  return errors;
}

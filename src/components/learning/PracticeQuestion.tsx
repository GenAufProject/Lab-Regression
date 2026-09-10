import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { PracticeQuestionV2 } from '../../types';
import { validatePracticeAnswer } from '../../lib/learning/practiceEngine';
import { getMistakeExplanation } from '../../lib/learning/mistakeEngine';
import { MathFormula } from '../common/MathFormula';

interface PracticeQuestionProps {
  question: PracticeQuestionV2;
  onAnswered?: (questionId: string, isCorrect: boolean) => void;
  onNext?: () => void;
  isLast?: boolean;
}

/**
 * Phase 5 — Practice Question UI (spec §13, §14).
 *
 * Spec §13: "Do NOT reveal the answer before submission."
 * Spec §13: After incorrect submission, show "Not quite." + explanation +
 *   the conceptual mistake (via the mistake engine).
 * Spec §14: Mistakes are categorized for context-sensitive explanations.
 */
export const PracticeQuestion: React.FC<PracticeQuestionProps> = ({
  question,
  onAnswered,
  onNext,
  isLast,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof validatePracticeAnswer> | undefined>();

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    const r = validatePracticeAnswer(question.id, selectedIdx, attempt);
    setResult(r);
    setSubmitted(true);
    if (r?.isCorrect) {
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
    }
    onAnswered?.(question.id, r?.isCorrect ?? false);
  };

  const handleRetry = () => {
    setSubmitted(false);
    setSelectedIdx(null);
    setAttempt((a) => a + 1);
    setResult(undefined);
  };

  const correctIdx = question.options.findIndex((o) => o.isCorrect);
  const mistakeExp = result?.mistakeCategory
    ? getMistakeExplanation(result.mistakeCategory)
    : undefined;

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
        <span className="font-bold text-teal-700 uppercase">{question.category}</span>
        <span>•</span>
        <span className="capitalize">{question.type}</span>
        <span>•</span>
        <span className="capitalize">{question.difficulty}</span>
        {attempt > 1 && (
          <>
            <span>•</span>
            <span className="text-amber-600">Attempt {attempt}</span>
          </>
        )}
      </div>
      <h4 className="text-base font-semibold text-neutral-900 leading-snug">
        {question.title}
      </h4>
      <p className="text-sm text-neutral-700">{question.prompt}</p>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === correctIdx;
          let style = 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-800';
          if (submitted && result) {
            if (isCorrect) {
              style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium';
            } else if (isSelected && !isCorrect) {
              style = 'bg-rose-50 border-rose-500 text-rose-950';
            } else {
              style = 'bg-neutral-50/60 border-neutral-200 text-neutral-400';
            }
          } else if (isSelected) {
            style = 'bg-teal-50 border-teal-600 text-teal-950 font-medium';
          }
          return (
            <div
              key={opt.id}
              onClick={() => !submitted && setSelectedIdx(idx)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-sm ${style}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt.text}</span>
              </div>
              {submitted && result && isCorrect && (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              )}
              {submitted && result && isSelected && !isCorrect && (
                <XCircle size={16} className="text-rose-600 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint (before submission, if available) */}
      {!submitted && question.hint && (
        <details className="text-xs text-neutral-600">
          <summary className="cursor-pointer text-teal-700 hover:text-teal-800 flex items-center gap-1.5 font-medium">
            <Lightbulb size={13} />
            Show hint
          </summary>
          <div className="mt-1.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
            {question.hint}
          </div>
        </details>
      )}

      {/* Result + explanation (after submission) */}
      {submitted && result && (
        <div className="space-y-2">
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              result.isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <HelpCircle size={14} />
              {result.isCorrect ? 'Correct.' : 'Not quite.'}
            </div>
            <p className="leading-relaxed">{result.explanation}</p>
            {question.formulaNote && (
              <div className="mt-2 bg-white border border-neutral-200 rounded p-2 text-center overflow-x-auto">
                <MathFormula math={question.formulaNote} block />
              </div>
            )}
          </div>

          {/* Mistake explanation (spec §14) */}
          {!result.isCorrect && mistakeExp && (
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs">
              <div className="font-semibold text-rose-900 mb-1 flex items-center gap-1.5">
                <Award size={13} />
                Mistake category: {mistakeExp.label}
              </div>
              <p className="text-rose-800 leading-relaxed">{mistakeExp.explanation}</p>
              <div className="mt-1.5 text-rose-700 font-medium">
                <span className="font-semibold">Correct principle: </span>
                {mistakeExp.correctPrinciple}
              </div>
            </div>
          )}

          {/* Hint after incorrect (spec §13) */}
          {!result.isCorrect && result.showHint && result.hint && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Lightbulb size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <span>{result.hint}</span>
            </div>
          )}
        </div>
      )}

      {/* Action footer */}
      <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIdx === null}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:pointer-events-none text-white font-medium px-4 py-2 rounded-lg transition-colors text-xs"
          >
            Check answer
          </button>
        ) : (
          <>
            {!result?.isCorrect && (
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs px-3 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 font-medium flex items-center gap-1"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-4 py-2 rounded-lg transition-colors text-xs"
              >
                {isLast ? 'Finish' : 'Next question'}
                <ChevronRight size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { PRACTICE_QUESTIONS } from '../../lib/data/quizQuestions';
import { QuizQuestion } from '../../types';
import { MathFormula } from '../common/MathFormula';

export const PracticeModule: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const filteredQuestions = PRACTICE_QUESTIONS.filter(
    (q) => categoryFilter === 'all' || q.category === categoryFilter
  );

  const currentQ: QuizQuestion | undefined = filteredQuestions[currentIdx];
  const correctIdx = currentQ ? currentQ.options.findIndex((o) => o.isCorrect) : -1;

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQ) return;
    setIsAnswerSubmitted(true);
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: selectedOption }));

    // If correct
    if (selectedOption === correctIdx) {
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.7 },
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < filteredQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers({});
    setQuizFinished(false);
  };

  // Calculate score
  const totalCorrect = filteredQuestions.reduce((acc, q) => {
    const qCorrectIdx = q.options.findIndex((o) => o.isCorrect);
    return userAnswers[q.id] === qCorrectIdx ? acc + 1 : acc;
  }, 0);

  const scorePercentage = Math.round((totalCorrect / (filteredQuestions.length || 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
              <Award size={18} className="text-teal-700" />
              <span>Practice & Knowledge Self-Assessment</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Scenario-based questions covering regression formulas, residual diagnostics, and pharmacokinetics.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentIdx(0);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
                setQuizFinished(false);
              }}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-medium text-neutral-700 focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Topics ({PRACTICE_QUESTIONS.length})</option>
              <option value="linear-regression">Linear Regression</option>
              <option value="r-squared">R² & Fit</option>
              <option value="residuals">Residuals & Diagnostics</option>
              <option value="transformations">Log Transformations</option>
              <option value="pk">Pharmacokinetics</option>
            </select>

            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            >
              <RefreshCw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!quizFinished && filteredQuestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-3 text-xs">
            <span className="font-mono text-neutral-500">
              Question {currentIdx + 1} of {filteredQuestions.length}
            </span>
            <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / filteredQuestions.length) * 100}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-teal-800">
              Score: {totalCorrect} / {Object.keys(userAnswers).length}
            </span>
          </div>
        )}
      </div>

      {/* Quiz Screen or Finished Card */}
      {quizFinished ? (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto">
            <Trophy size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Quiz Completed!</h3>
            <p className="text-neutral-500 text-xs mt-1">
              You scored {totalCorrect} out of {filteredQuestions.length} ({scorePercentage}%)
            </p>
          </div>

          <div className="max-w-xs mx-auto p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-950 font-medium">
            {scorePercentage >= 80 ? (
              <span>Excellent grasp of regression concepts and pharmacokinetic derivations!</span>
            ) : scorePercentage >= 60 ? (
              <span>Good effort! Review the lessons in the Learning Center to master tricky residual edge cases.</span>
            ) : (
              <span>Keep practicing! Use the step-by-step walkthroughs to reinforce core formulas.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Retake Practice Set</span>
          </button>
        </div>
      ) : currentQ ? (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <div>
            <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px] mb-1">
              <span className="font-bold text-teal-700 uppercase">{currentQ.category}</span>
              <span>•</span>
              <span className="font-medium text-neutral-600">{currentQ.title}</span>
            </div>
            <h4 className="text-base font-semibold text-neutral-900 leading-snug">
              {currentQ.prompt}
            </h4>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = selectedOption === oIdx;
              const isCorrect = opt.isCorrect;

              let optionStyle = 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-800';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium';
                } else if (isSelected && !isCorrect) {
                  optionStyle = 'bg-rose-50 border-rose-500 text-rose-950';
                } else {
                  optionStyle = 'bg-neutral-50/60 border-neutral-200 text-neutral-400';
                }
              } else if (isSelected) {
                optionStyle = 'bg-teal-50 border-teal-600 text-teal-950 font-medium';
              }

              return (
                <div
                  key={`opt-${opt.id}`}
                  onClick={() => handleSelectOption(oIdx)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span>{opt.text}</span>
                  </div>

                  {isAnswerSubmitted && isCorrect && (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrect && (
                    <XCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation Banner when answered */}
          {isAnswerSubmitted && (
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-teal-700" />
                <span>Explanation & Detailed Rationale</span>
              </div>
              <p className="text-neutral-700 leading-relaxed">
                {currentQ.explanation}
              </p>
              {currentQ.formulaNote && (
                <div className="bg-white border border-neutral-200 rounded p-2 text-center overflow-x-auto">
                  <MathFormula math={currentQ.formulaNote} block />
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
            {!isAnswerSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:pointer-events-none text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-2xs text-xs"
              >
                Check Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-4 py-2 rounded-lg transition-colors text-xs"
              >
                <span>{currentIdx < filteredQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { LessonCategory, LessonSection, StructuredLesson } from '../../types';
import { MathFormula } from '../common/MathFormula';
import {
  getAllModules,
  getLessonsByModule,
  getNextLesson,
  getPreviousLesson,
} from '../../lib/learning/lessonEngine';

interface LessonViewerProps {
  lesson: StructuredLesson;
  onNavigateLesson: (lessonId: string) => void;
  onLaunchInteractive: (componentId: string) => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  onNavigateLesson,
  onLaunchInteractive,
}) => {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [inlineAnswers, setInlineAnswers] = useState<Record<number, number>>({});
  const [inlineSubmitted, setInlineSubmitted] = useState<Record<number, boolean>>({});

  const section = lesson.sections[sectionIdx];
  const isLast = sectionIdx === lesson.sections.length - 1;
  const isFirst = sectionIdx === 0;
  const prevLesson = getPreviousLesson(lesson.id);
  const nextLesson = getNextLesson(lesson.id);

  const sectionsToShow = showAll ? lesson.sections : [section];
  const progressPct = ((sectionIdx + 1) / lesson.sections.length) * 100;

  const handleInlineSelect = (sIdx: number, optIdx: number) => {
    if (inlineSubmitted[sIdx]) return;
    setInlineAnswers((prev) => ({ ...prev, [sIdx]: optIdx }));
  };

  const handleInlineSubmit = (sIdx: number) => {
    setInlineSubmitted((prev) => ({ ...prev, [sIdx]: true }));
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-neutral-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-mono font-semibold">
            <span>MODULE {lesson.module}</span>
            <span>•</span>
            <span className="uppercase">{lesson.category}</span>
            <span>•</span>
            <span className="capitalize">{lesson.difficulty}</span>
          </div>
          {lesson.estimatedMinutes && (
            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
              <CircleDot size={11} />
              {lesson.estimatedMinutes} min
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-neutral-900">{lesson.title}</h2>
        <p className="text-xs text-neutral-500 mt-1">{lesson.description}</p>
        <div className="mt-2 p-2.5 bg-teal-50/70 border border-teal-200/60 rounded-lg text-xs text-teal-950">
          <strong>Learning objectives:</strong>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {lesson.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Progress indicator (spec §4) */}
      {!showAll && (
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-neutral-500 whitespace-nowrap">
            Step {sectionIdx + 1} of {lesson.sections.length}
          </span>
          <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sectionsToShow.map((s, idx) => {
          const actualIdx = showAll ? idx : sectionIdx;
          return (
            <SectionRenderer
              key={actualIdx}
              section={s}
              sectionIdx={actualIdx}
              selectedAnswer={inlineAnswers[actualIdx]}
              isSubmitted={inlineSubmitted[actualIdx] ?? false}
              onSelectAnswer={(optIdx) => handleInlineSelect(actualIdx, optIdx)}
              onSubmitAnswer={() => handleInlineSubmit(actualIdx)}
              onLaunchInteractive={onLaunchInteractive}
            />
          );
        })}
      </div>

      {/* Navigation controls (spec §4) */}
      <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSectionIdx(Math.max(0, sectionIdx - 1))}
            disabled={isFirst || showAll}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous section"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSectionIdx(Math.min(lesson.sections.length - 1, sectionIdx + 1))}
            disabled={isLast || showAll}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next section"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium transition-colors"
          >
            {showAll ? 'Show step-by-step' : 'Show all'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSectionIdx(0);
              setShowAll(false);
              setInlineAnswers({});
              setInlineSubmitted({});
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 font-medium transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            Restart
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {prevLesson && (
            <button
              type="button"
              onClick={() => onNavigateLesson(prevLesson.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 font-medium flex items-center gap-1"
            >
              <ChevronLeft size={12} />
              Prev lesson
            </button>
          )}
          {nextLesson && (
            <button
              type="button"
              onClick={() => onNavigateLesson(nextLesson.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium flex items-center gap-1 transition-colors"
            >
              Next lesson
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Key takeaways */}
      {showAll && (
        <div className="bg-neutral-50/80 border border-neutral-200/70 rounded-xl p-4">
          <h4 className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5 mb-2">
            <Lightbulb size={15} className="text-amber-600" />
            Key Takeaways
          </h4>
          <ul className="space-y-1.5 text-xs text-neutral-700">
            {lesson.keyTakeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Section renderer — handles each LessonSection type
// ===========================================================================

interface SectionRendererProps {
  section: LessonSection;
  sectionIdx: number;
  selectedAnswer?: number;
  isSubmitted: boolean;
  onSelectAnswer: (optIdx: number) => void;
  onSubmitAnswer: () => void;
  onLaunchInteractive: (componentId: string) => void;
}

const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  sectionIdx,
  selectedAnswer,
  isSubmitted,
  onSelectAnswer,
  onSubmitAnswer,
  onLaunchInteractive,
}) => {
  const sectionLabel = (
    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono mb-1">
      <span className="font-bold text-teal-700">§{sectionIdx + 1}</span>
      <span>•</span>
      <span className="uppercase">{section.type}</span>
    </div>
  );

  switch (section.type) {
    case 'text':
      return (
        <div>
          {sectionLabel}
          <h4 className="font-semibold text-neutral-900 text-sm mb-1.5">{section.title}</h4>
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">{section.content}</p>
        </div>
      );

    case 'formula':
      return (
        <div>
          {sectionLabel}
          <h4 className="font-semibold text-neutral-900 text-sm mb-1.5">{section.title}</h4>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 my-2 text-center">
            <div className="text-neutral-900 text-sm py-1 overflow-x-auto">
              <MathFormula math={section.formula} block />
            </div>
          </div>
          <p className="text-xs text-neutral-600 italic mt-1.5">{section.explanation}</p>
        </div>
      );

    case 'example':
      return (
        <div>
          {sectionLabel}
          <h4 className="font-semibold text-neutral-900 text-sm mb-1.5">{section.title}</h4>
          <div className="bg-teal-50/40 border border-teal-100 rounded-lg p-3 text-xs text-neutral-700 leading-relaxed">
            {section.explanation}
            {section.datasetId && (
              <div className="mt-2 text-[11px] text-teal-700 font-mono">
                Dataset: {section.datasetId}
              </div>
            )}
          </div>
        </div>
      );

    case 'interactive':
      return (
        <div>
          {sectionLabel}
          <h4 className="font-semibold text-neutral-900 text-sm mb-1.5">{section.title}</h4>
          <div className="bg-gradient-to-r from-teal-50 to-neutral-50 border border-teal-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={15} className="text-teal-700" />
              <span className="text-xs font-semibold text-teal-900">Interactive component</span>
              <code className="text-[10px] text-teal-700 font-mono bg-teal-100 px-1.5 py-0.5 rounded">
                {section.componentId}
              </code>
            </div>
            <button
              type="button"
              onClick={() => onLaunchInteractive(section.componentId)}
              className="text-xs px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp size={13} />
              Launch interactive
            </button>
          </div>
        </div>
      );

    case 'question':
      return (
        <div>
          {sectionLabel}
          <h4 className="font-semibold text-neutral-900 text-sm mb-1.5">{section.title}</h4>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2">
            <p className="text-xs sm:text-sm text-neutral-800 font-medium">{section.question}</p>
            <div className="space-y-1.5">
              {section.options.map((opt, optIdx) => {
                const isSelected = selectedAnswer === optIdx;
                const isCorrect = optIdx === section.correctAnswer;
                let style = 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700';
                if (isSubmitted) {
                  if (isCorrect) {
                    style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-rose-50 border-rose-500 text-rose-950';
                  } else {
                    style = 'bg-neutral-50 border-neutral-200 text-neutral-400';
                  }
                } else if (isSelected) {
                  style = 'bg-teal-50 border-teal-600 text-teal-950 font-medium';
                }
                return (
                  <div
                    key={optIdx}
                    onClick={() => onSelectAnswer(optIdx)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${style}`}
                  >
                    <span className="font-mono font-semibold mr-2">
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    {opt}
                  </div>
                );
              })}
            </div>
            {!isSubmitted ? (
              <button
                type="button"
                onClick={onSubmitAnswer}
                disabled={selectedAnswer === undefined}
                className="text-xs px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:pointer-events-none text-white font-medium transition-colors"
              >
                Check answer
              </button>
            ) : (
              <div className="p-2.5 bg-white border border-neutral-200 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <HelpCircle size={13} className="text-teal-700" />
                  {selectedAnswer === section.correctAnswer ? (
                    <span className="text-emerald-700">Correct.</span>
                  ) : (
                    <span className="text-amber-700">Not quite.</span>
                  )}
                </div>
                <p className="text-neutral-700 leading-relaxed">{section.explanation}</p>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};

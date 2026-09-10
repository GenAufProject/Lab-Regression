import React from 'react';
import { LessonCategory } from '../../types';
import { getTopicMastery } from '../../lib/learning/progressStore';

interface MasteryIndicatorProps {
  topicScores: Partial<Record<LessonCategory, number>>;
  totalCorrect: number;
  totalAttempted: number;
}

const TOPIC_LABELS: { category: LessonCategory; label: string }[] = [
  { category: 'regression-fundamentals', label: 'Regression Fundamentals' },
  { category: 'ols', label: 'OLS Calculation' },
  { category: 'diagnostics', label: 'Diagnostics' },
  { category: 'transformations', label: 'Transformations' },
  { category: 'pk', label: 'Pharmacokinetics' },
];

/**
 * Phase 5 — Mastery Indicator (spec §19).
 *
 * Simple transparent progress bars per topic. NOT a scientifically
 * validated competency measure (spec §19).
 */
export const MasteryIndicator: React.FC<MasteryIndicatorProps> = ({
  topicScores,
  totalCorrect,
  totalAttempted,
}) => {
  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-neutral-900 text-sm">Topic Mastery</h4>
        <span className="text-[11px] text-neutral-500 font-mono">
          {totalCorrect}/{totalAttempted} correct
        </span>
      </div>
      <div className="space-y-2.5">
        {TOPIC_LABELS.map(({ category, label }) => {
          const pct = getTopicMastery({ topicScores, completedLessons: [], completedQuestions: [], totalCorrect, totalAttempted }, category);
          return (
            <div key={category}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-700 font-medium">{label}</span>
                <span className="text-neutral-500 font-mono">{pct.toFixed(0)}%</span>
              </div>
              <div className="bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-teal-500' : pct >= 25 ? 'bg-amber-500' : 'bg-rose-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-neutral-400 italic">
        Educational progress indicator only — not a validated competency measure.
      </div>
    </div>
  );
};

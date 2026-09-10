import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  GraduationCap,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { LearningProgress } from '../../types';
import {
  getCompletedLessonCount,
  getRecommendedNextLesson,
  getTotalLessonCount,
} from '../../lib/learning/lessonEngine';
import {
  loadProgress,
  resetProgress,
} from '../../lib/learning/progressStore';
import { MasteryIndicator } from './MasteryIndicator';

interface LearningDashboardProps {
  onNavigateLesson: (lessonId: string) => void;
  onNavigateSection: (section: 'learn' | 'practice' | 'reference') => void;
}

/**
 * Phase 5 — Learning Dashboard (spec §20).
 *
 * Shows: continue learning, completed lessons, progress, practice score,
 * recommended next lesson, formula reference, quick practice.
 */
export const LearningDashboard: React.FC<LearningDashboardProps> = ({
  onNavigateLesson,
  onNavigateSection,
}) => {
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress());

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const recommended = getRecommendedNextLesson(progress.completedLessons);
  const completedCount = getCompletedLessonCount(progress.completedLessons);
  const totalCount = getTotalLessonCount();
  const overallPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleReset = () => {
    if (window.confirm('Reset all learning progress? This cannot be undone.')) {
      const empty = resetProgress();
      setProgress(empty);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-teal-200 uppercase tracking-wider">
              Learning Dashboard
            </div>
            <h2 className="text-xl font-bold mt-0.5">Continue your learning journey</h2>
            <p className="text-xs text-teal-100 mt-1">
              {completedCount} of {totalCount} lessons completed ·{' '}
              {progress.totalCorrect}/{progress.totalAttempted} practice questions correct
            </p>
          </div>
          <GraduationCap size={36} className="text-teal-300" />
        </div>
      </div>

      {/* Continue Learning */}
      {recommended && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Compass size={16} className="text-teal-700" />
            <h3 className="font-semibold text-neutral-900 text-sm">Recommended Next</h3>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-neutral-900 text-sm">{recommended.title}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Module {recommended.module} · {recommended.difficulty} ·{' '}
                {recommended.estimatedMinutes ?? '—'} min
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateLesson(recommended.id)}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors shadow-xs"
            >
              Start
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Progress + Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overall progress */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-teal-700" />
            <h3 className="font-semibold text-neutral-900 text-sm">Lesson Progress</h3>
          </div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-neutral-700 font-medium">Overall completion</span>
            <span className="text-neutral-500 font-mono">
              {completedCount}/{totalCount} ({overallPct.toFixed(0)}%)
            </span>
          </div>
          <div className="bg-neutral-100 rounded-full h-3 overflow-hidden mb-4">
            <div
              className="bg-teal-600 h-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('learn')}
            className="w-full text-xs px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen size={13} />
            Browse all lessons
          </button>
        </div>

        {/* Mastery */}
        <MasteryIndicator
          topicScores={progress.topicScores}
          totalCorrect={progress.totalCorrect}
          totalAttempted={progress.totalAttempted}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onNavigateSection('practice')}
          className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs hover:border-teal-300 transition-colors text-left"
        >
          <TrendingUp size={20} className="text-teal-700 mb-2" />
          <div className="font-semibold text-neutral-900 text-sm">Practice Questions</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {progress.totalCorrect} correct / {progress.totalAttempted} attempted
          </div>
        </button>
        <button
          type="button"
          onClick={() => onNavigateSection('reference')}
          className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs hover:border-teal-300 transition-colors text-left"
        >
          <FileText size={20} className="text-teal-700 mb-2" />
          <div className="font-semibold text-neutral-900 text-sm">Formula Reference</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Searchable formula library
          </div>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs hover:border-rose-300 transition-colors text-left"
        >
          <RotateCcw size={20} className="text-rose-500 mb-2" />
          <div className="font-semibold text-neutral-900 text-sm">Reset Progress</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Clear all completed lessons and scores
          </div>
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { BookOpen, GraduationCap, Layers, ListOrdered } from 'lucide-react';
import { StructuredLesson } from '../../types';
import {
  getAllModules,
  getLessonById,
  getLessonsByModule,
} from '../../lib/learning/lessonEngine';
import { LessonViewer } from './LessonViewer';
import { GuidedCalculation } from './GuidedCalculation';
import { SAMPLE_DATASETS } from '../../lib/data/sampleDatasets';
import { DataPoint } from '../../types';

interface LearningCenterProps {
  initialLessonId?: string;
  onNavigateSection: (section: string) => void;
}

/**
 * Phase 5 — Learning Center (spec §1, §2).
 *
 * Shows the five-module curriculum and a lesson viewer.
 * Replaces the Phase 1-4 LearningCenter with the structured-lesson model.
 *
 * The existing flat LESSONS array (learningContent.ts) is preserved for
 * backward compatibility but no longer rendered here — the new
 * StructuredLesson model in data/lessons/ is the canonical content.
 */
export const LearningCenter: React.FC<LearningCenterProps> = ({
  initialLessonId,
  onNavigateSection,
}) => {
  const modules = getAllModules();
  const [activeLessonId, setActiveLessonId] = useState<string>(
    initialLessonId ?? modules[0].lessonIds[0]
  );
  const [expandedModule, setExpandedModule] = useState<string>(modules[0].id);

  const activeLesson = getLessonById(activeLessonId);
  const interactiveData: DataPoint[] = React.useMemo(() => {
    // Use the calibration-curve dataset for interactive guided calculation
    const preset = SAMPLE_DATASETS.find((p) => p.id === 'strong-positive') ?? SAMPLE_DATASETS[0];
    return preset.data.map((d, i) => ({ id: `pt-${i + 1}`, x: d.x, y: d.y }));
  }, []);

  const handleLaunchInteractive = (componentId: string) => {
    // Map component IDs to nav sections
    if (componentId.includes('pk') || componentId.includes('curve')) {
      onNavigateSection('pk');
    } else if (componentId.includes('outlier') || componentId.includes('playground') || componentId.includes('scatter')) {
      onNavigateSection('simulator');
    } else if (componentId.includes('residual')) {
      onNavigateSection('regression');
    } else {
      onNavigateSection('regression');
    }
  };

  if (!activeLesson) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-xs text-neutral-500">
        Lesson not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-teal-700" />
            <div>
              <h3 className="font-semibold text-neutral-900 text-sm">Learning Center</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Structured curriculum across 5 modules — from regression basics to pharmacokinetics.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Module sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          {modules.map((m) => {
            const isExpanded = expandedModule === m.id;
            const lessons = getLessonsByModule(m.letter);
            return (
              <div
                key={m.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? 'border-teal-300 shadow-xs' : 'border-neutral-200/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedModule(m.id)}
                  className="w-full text-left p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-700 text-white font-mono font-bold flex items-center justify-center text-xs">
                      {m.letter}
                    </span>
                    <div>
                      <div className="font-semibold text-neutral-900 text-xs">{m.title}</div>
                      <div className="text-[10px] text-neutral-500">{lessons.length} lessons</div>
                    </div>
                  </div>
                  <Layers size={14} className="text-neutral-400" />
                </button>
                {isExpanded && (
                  <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                    {lessons.map((l) => {
                      const isActive = activeLessonId === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left p-2.5 text-xs transition-colors ${
                            isActive
                              ? 'bg-teal-50 text-teal-900 font-semibold'
                              : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-neutral-400 font-mono text-[10px] mt-0.5">
                              {l.module}{lessons.indexOf(l) + 1}
                            </span>
                            <span className="flex-1">{l.title}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5 ml-6 capitalize">
                            {l.difficulty} · {l.estimatedMinutes ?? '—'} min
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lesson viewer (8 cols) */}
        <div className="lg:col-span-8">
          <LessonViewer
            lesson={activeLesson}
            onNavigateLesson={setActiveLessonId}
            onLaunchInteractive={handleLaunchInteractive}
          />

          {/* Inline Guided Calculation for interactive sections */}
          {activeLesson.sections.some((s) => s.type === 'interactive' && s.componentId === 'guided-ols-calculation') && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500">
                <ListOrdered size={14} className="text-teal-700" />
                <span>Interactive: Guided OLS Calculation (live, from your current dataset)</span>
              </div>
              <GuidedCalculation
                data={interactiveData}
                xLabel="Study Time"
                yLabel="Exam Score"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

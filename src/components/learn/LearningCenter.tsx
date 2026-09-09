import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle, Lightbulb, Sparkles } from 'lucide-react';
import { LESSONS, Lesson } from '../../lib/data/learningContent';
import { MathFormula } from '../common/MathFormula';
import { AppNavSection } from '../../types';

interface LearningCenterProps {
  onNavigateToSection: (section: AppNavSection) => void;
}

export const LearningCenter: React.FC<LearningCenterProps> = ({ onNavigateToSection }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeLesson, setActiveLesson] = useState<Lesson>(LESSONS[0]);

  const categories = [
    { id: 'all', label: 'All Lessons (19)' },
    { id: 'core', label: 'Core Regression' },
    { id: 'diagnostics', label: 'Diagnostics & Residuals' },
    { id: 'transformations', label: 'Log Transformations' },
    { id: 'pk', label: 'Pharmacokinetics' },
  ];

  const filteredLessons = LESSONS.filter(
    (l) => selectedCategory === 'all' || l.category === selectedCategory
  );

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
              <BookOpen size={18} className="text-teal-700" />
              <span>Interactive Learning Curriculum</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              19 comprehensive statistical and pharmacokinetic lessons designed for students and educators.
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  selectedCategory === c.id
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lesson List (4 cols) */}
        <div className="lg:col-span-4 space-y-2 max-h-[700px] overflow-y-auto pr-1">
          {filteredLessons.map((lesson) => {
            const isSelected = activeLesson.id === lesson.id;
            return (
              <div
                key={lesson.id}
                onClick={() => setActiveLesson(lesson)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-500 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span className="font-mono text-[10px] font-bold">Lesson {lesson.number}</span>
                  <span className="capitalize text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                    {lesson.category}
                  </span>
                </div>
                <div className="font-semibold text-neutral-900 mb-1">{lesson.title}</div>
                <p className="text-neutral-500 text-[11px] line-clamp-2 leading-relaxed">
                  {lesson.summary}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Lesson Reader (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-mono font-semibold mb-1">
              <span>LESSON {activeLesson.number}</span>
              <span>•</span>
              <span className="uppercase">{activeLesson.category}</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900">{activeLesson.title}</h2>
            <div className="mt-2 p-2.5 bg-teal-50/70 border border-teal-200/60 rounded-lg text-xs text-teal-950">
              <strong>Learning Objective:</strong> {activeLesson.objective}
            </div>
          </div>

          {/* Body paragraphs */}
          <div className="space-y-3 text-xs sm:text-sm text-neutral-700 leading-relaxed">
            {activeLesson.content.map((p, idx) => (
              <p key={`p-${idx}`}>{p}</p>
            ))}
          </div>

          {/* Formula block if present */}
          {activeLesson.formulaLatex && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 my-3 text-center">
              <span className="text-[11px] text-neutral-500 font-mono block mb-1">
                Core Mathematical Formula
              </span>
              <div className="text-neutral-900 text-sm py-1 overflow-x-auto">
                <MathFormula math={activeLesson.formulaLatex} block />
              </div>
              {activeLesson.formulaMeaning && (
                <div className="text-xs text-neutral-600 mt-1 italic">
                  {activeLesson.formulaMeaning}
                </div>
              )}
            </div>
          )}

          {/* Key Takeaways */}
          <div className="bg-neutral-50/80 border border-neutral-200/70 rounded-xl p-4">
            <h4 className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5 mb-2">
              <CheckCircle size={15} className="text-teal-700" />
              <span>Key Takeaways</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-700">
              {activeLesson.keyTakeaways.map((item, i) => (
                <li key={`takeaway-${i}`} className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive CTA */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <Lightbulb size={15} className="text-amber-600" />
              <span>{activeLesson.interactiveTip || 'Put theory into practice in the interactive lab.'}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeLesson.category === 'pk') {
                  onNavigateToSection('pk');
                } else if (activeLesson.category === 'transformations') {
                  onNavigateToSection('transformations');
                } else {
                  onNavigateToSection('regression');
                }
              }}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <span>Launch Interactive Lab</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

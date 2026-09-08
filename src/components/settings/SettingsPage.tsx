import React from 'react';
import { Award, Check, Monitor, RotateCcw, Settings2, Sliders } from 'lucide-react';
import { UserPreferences } from '../../types';

interface SettingsPageProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onResetPreferences: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  preferences,
  onUpdatePreferences,
  onResetPreferences,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 size={18} className="text-teal-700" />
          <h2 className="text-base font-bold text-neutral-900">Lab Preferences & Settings</h2>
        </div>
        <p className="text-xs text-neutral-500">
          Customize numerical precision, presentation mode for classrooms, and confidence intervals.
        </p>
      </div>

      {/* Settings form */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-xs space-y-5 text-xs">
        {/* Decimal Precision */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <label className="font-semibold text-neutral-900 block mb-0.5">Decimal Precision</label>
            <p className="text-neutral-500 text-[11px]">
              Controls the number of decimal digits displayed across statistical output tables and formula cards.
            </p>
          </div>

          <div className="flex items-center gap-1">
            {[2, 3, 4, 5].map((dec) => (
              <button
                key={`dec-${dec}`}
                type="button"
                onClick={() => onUpdatePreferences({ decimals: dec })}
                className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all ${
                  preferences.decimals === dec
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {dec}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Level */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <label className="font-semibold text-neutral-900 block mb-0.5">Confidence Level (1 - α)</label>
            <p className="text-neutral-500 text-[11px]">
              Sets the critical t-distribution boundary for slope, intercept, and mean confidence bands.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { val: 0.9, label: '90%' },
              { val: 0.95, label: '95% (Standard)' },
              { val: 0.99, label: '99%' },
            ].map((ci) => (
              <button
                key={`ci-${ci.val}`}
                type="button"
                onClick={() => onUpdatePreferences({ confidenceLevel: ci.val })}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  preferences.confidenceLevel === ci.val
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {ci.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Presentation Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <label className="font-semibold text-neutral-900 block mb-0.5 flex items-center gap-1.5">
              <Monitor size={14} className="text-teal-700" />
              <span>Teacher Presentation Mode</span>
            </label>
            <p className="text-neutral-500 text-[11px]">
              Optimizes the workspace for projectors and large classroom displays with enlarged graph markers and high contrast text.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.presentationMode}
              onChange={(e) => onUpdatePreferences({ presentationMode: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* Reset Actions */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-neutral-500 text-[11px]">
            Preferences are saved automatically in your browser session.
          </span>

          <button
            type="button"
            onClick={onResetPreferences}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Pedagogical Statement Card */}
      <div className="bg-teal-900 text-white rounded-xl p-5 shadow-xs space-y-2 text-xs">
        <h3 className="text-sm font-bold flex items-center gap-1.5 text-teal-200">
          <Award size={16} />
          <span>About Regression & Pharmacokinetics Lab</span>
        </h3>
        <p className="text-teal-100 leading-relaxed">
          This educational software was constructed to bridge abstract mathematical regression formulas with physical,
          biological, and pharmacokinetic intuition. By interactively calculating every intermediate sum of squares,
          graphing residual diagnostics, and demonstrating the log-linear transformation of first-order drug decay,
          students can develop deep conceptual mastery.
        </p>
        <p className="text-teal-300 text-[11px] pt-1">
          Designed for university biostatistics, analytical chemistry, pharmacology, and clinical pharmacokinetics coursework.
        </p>
      </div>
    </div>
  );
};

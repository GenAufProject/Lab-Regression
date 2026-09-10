import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart2,
  Binary,
  BookOpen,
  Compass,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Settings2,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { AppNavSection, DataPoint, DatasetPreset, UserPreferences } from './types';
import { SAMPLE_DATASETS } from './lib/data/sampleDatasets';
import { calculateSimpleLinearRegression } from './lib/statistics/linearRegression';

// Components
import { DataInput } from './components/data/DataInput';
import { InteractiveScatterPlot } from './components/charts/InteractiveScatterPlot';
import { ResidualPlot } from './components/charts/ResidualPlot';
import { RegressionSummary } from './components/regression/RegressionSummary';
import { CalculationSteps } from './components/regression/CalculationSteps';
import { InterpretationCards } from './components/regression/InterpretationCards';
import { TransformationModule } from './components/transformations/TransformationModule';
import { RegressionPlayground } from './components/simulator/RegressionPlayground';
import { PKWorkspace } from './components/pk/PKWorkspace';
import { LearningCenter as NewLearningCenter } from './components/learning/LearningCenter';
import { LearningDashboard } from './components/learning/LearningDashboard';
import { PracticeQuestion } from './components/learning/PracticeQuestion';
import { FormulaReference as NewFormulaReference } from './components/learning/FormulaReference';
import { SettingsPage } from './components/settings/SettingsPage';
import { EducationalDisclaimer } from './components/common/EducationalDisclaimer';
import { PRACTICE_QUESTIONS_V2 } from './data/questions';
import { loadProgress, markQuestionCompleted, saveProgress } from './lib/learning/progressStore';
import { LearningProgress } from './types';

// Default initial dataset: Calibration Curve
const DEFAULT_PRESET = SAMPLE_DATASETS[0];

const INITIAL_DATA_POINTS: DataPoint[] = DEFAULT_PRESET.data.map((d, idx) => ({
  id: `pt-${idx + 1}`,
  x: d.x,
  y: d.y,
}));

const DEFAULT_PREFERENCES: UserPreferences = {
  decimals: 3,
  confidenceLevel: 0.95,
  showEquation: true,
  showConfidenceBand: true,
  showPredictionBand: true,
  showResidualLines: true,
  presentationMode: false,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<AppNavSection>(() => {
    const saved = localStorage.getItem('reglab_section');
    return (saved as AppNavSection) || 'regression';
  });

  const [dataPoints, setDataPoints] = useState<DataPoint[]>(() => {
    try {
      const saved = localStorage.getItem('reglab_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_DATA_POINTS;
  });

  const [xLabel, setXLabel] = useState<string>(DEFAULT_PRESET.xLabel);
  const [yLabel, setYLabel] = useState<string>(DEFAULT_PRESET.yLabel);
  const [xUnit, setXUnit] = useState<string>(DEFAULT_PRESET.xUnit || '');
  const [yUnit, setYUnit] = useState<string>(DEFAULT_PRESET.yUnit || '');

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('reglab_prefs');
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PREFERENCES;
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('reglab_section', activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('reglab_data', JSON.stringify(dataPoints));
  }, [dataPoints]);

  useEffect(() => {
    localStorage.setItem('reglab_prefs', JSON.stringify(preferences));
  }, [preferences]);

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updated }));
  };

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const handlePresetSelect = (preset: DatasetPreset) => {
    setXLabel(preset.xLabel);
    setYLabel(preset.yLabel);
    setXUnit(preset.xUnit || '');
    setYUnit(preset.yUnit || '');
  };

  const handleLabelChange = (newXLabel: string, newYLabel: string, newXUnit: string, newYUnit: string) => {
    setXLabel(newXLabel);
    setYLabel(newYLabel);
    setXUnit(newXUnit);
    setYUnit(newYUnit);
  };

  // Compute primary regression for the regression lab
  const regressionResult = useMemo(() => {
    return calculateSimpleLinearRegression(dataPoints, preferences.confidenceLevel);
  }, [dataPoints, preferences.confidenceLevel]);

  const stats = regressionResult.status === 'success' ? regressionResult.stats : null;

  // Navigation Items — Phase 5: 'learn' now shows the new structured LearningCenter,
  // 'dashboard' shows the LearningDashboard, 'reference' shows the new FormulaReference,
  // and 'practice' shows the new PracticeQuestion (V2). The old components are preserved
  // but no longer wired to the main nav.
  const navItems: { id: AppNavSection; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'learn', label: 'Lessons', icon: <BookOpen size={16} /> },
    { id: 'regression', label: 'Regression Lab', icon: <TrendingUp size={16} /> },
    { id: 'transformations', label: 'Transformations', icon: <Binary size={16} /> },
    { id: 'simulator', label: 'Simulator', icon: <Sliders size={16} /> },
    { id: 'pk', label: 'PK Studio', icon: <FlaskConical size={16} /> },
    { id: 'practice', label: 'Practice', icon: <Award size={16} /> },
    { id: 'reference', label: 'Formulas', icon: <FileText size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 size={16} /> },
  ];

  return (
    <div className={`min-h-screen bg-neutral-100/70 text-neutral-900 font-sans antialiased flex flex-col ${preferences.presentationMode ? 'text-base' : 'text-sm'}`}>
      {/* App Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Branding */}
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => setActiveSection('regression')}
            >
              <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center text-white shadow-2xs">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-neutral-900 text-base leading-tight tracking-tight">
                    Regression Lab
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    Stats & PK
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 hidden md:block">
                  Interactive Statistics & Pharmacokinetics Studio
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 overflow-x-auto py-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-teal-700 text-white shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {/* VIEW 1: REGRESSION LAB */}
        {activeSection === 'regression' && (
          <div className="space-y-4">
            <EducationalDisclaimer />

            {/* Top Row: Data Entry & Main Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Paired Data Input (5 cols) */}
              <div className="lg:col-span-5">
                <DataInput
                  data={dataPoints}
                  onChange={setDataPoints}
                  onPresetSelect={handlePresetSelect}
                  xLabel={xLabel}
                  yLabel={yLabel}
                  xUnit={xUnit}
                  yUnit={yUnit}
                  onLabelChange={handleLabelChange}
                />
              </div>

              {/* Right Column: Key Results & Equation Card (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {stats ? (
                  <RegressionSummary
                    stats={stats}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    decimals={preferences.decimals}
                  />
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-xs text-neutral-500">
                    Please provide at least 2 valid paired data points to compute OLS regression.
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row: Interactive Scatter Plot + Residual Diagnostic Plot */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <InteractiveScatterPlot
                    stats={stats}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    xUnit={xUnit}
                    yUnit={yUnit}
                    showConfidenceBand={preferences.showConfidenceBand}
                    showPredictionBand={preferences.showPredictionBand}
                    showResidualLines={preferences.showResidualLines}
                    height={380}
                  />
                </div>
                <div className="lg:col-span-5">
                  <ResidualPlot
                    stats={stats}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    height={380}
                  />
                </div>
              </div>
            )}

            {/* Bottom Row: 10-Step Derivation & Interpretation Cards */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <CalculationSteps
                    stats={stats}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    decimals={preferences.decimals}
                  />
                </div>
                <div className="lg:col-span-5">
                  <InterpretationCards
                    stats={stats}
                    xLabel={xLabel}
                    yLabel={yLabel}
                    xUnit={xUnit}
                    yUnit={yUnit}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TRANSFORMATIONS */}
        {activeSection === 'transformations' && (
          <TransformationModule
            data={dataPoints}
            xLabel={xLabel}
            yLabel={yLabel}
            xUnit={xUnit}
            yUnit={yUnit}
          />
        )}

        {/* VIEW 3: SIMULATOR PLAYGROUND */}
        {activeSection === 'simulator' && <RegressionPlayground />}

        {/* VIEW 4: PHARMACOKINETICS WORKSPACE */}
        {activeSection === 'pk' && <PKWorkspace />}

        {/* VIEW 5: LEARNING CENTER (Phase 5 — structured lessons) */}
        {activeSection === 'learn' && (
          <NewLearningCenter onNavigateSection={(s) => setActiveSection(s as AppNavSection)} />
        )}

        {/* VIEW 6: PRACTICE MODE (Phase 5 — PracticeQuestion V2) */}
        {activeSection === 'practice' && (
          <PracticeCarousel />
        )}

        {/* VIEW 7: FORMULA REFERENCE (Phase 5 — searchable) */}
        {activeSection === 'reference' && <NewFormulaReference />}

        {/* VIEW 8: SETTINGS */}
        {activeSection === 'settings' && (
          <SettingsPage
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onResetPreferences={handleResetPreferences}
          />
        )}

        {/* VIEW 9: LEARNING DASHBOARD (Phase 5) */}
        {activeSection === 'dashboard' && (
          <LearningDashboard
            onNavigateLesson={(lessonId) => {
              setActiveSection('learn');
              // The LearningCenter will pick up the lesson via its initial state;
              // for simplicity we just navigate to the lessons tab.
            }}
            onNavigateSection={(s) => setActiveSection(s as AppNavSection)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4 text-xs text-neutral-500 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-teal-700" />
            <span className="font-medium text-neutral-700">Regression Lab</span>
            <span>— Educational Statistics & Pharmacokinetics Studio</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            For educational, analytical, and training purposes only. Not for clinical diagnostic dosing.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===========================================================================
// Phase 5 — Practice Carousel (inline component)
//
// Wraps the PracticeQuestion V2 component with question navigation and
// progress tracking. Uses the progress store to persist scores.
// ===========================================================================
function PracticeCarousel() {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress());

  const questions = PRACTICE_QUESTIONS_V2;
  const q = questions[idx];
  const isLast = idx === questions.length - 1;

  const handleAnswered = (questionId: string, isCorrect: boolean) => {
    const updated = markQuestionCompleted(progress, questionId, q.category, isCorrect);
    setProgress(updated);
    saveProgress(updated);
  };

  const handleNext = () => {
    if (!isLast) setIdx((i) => i + 1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-500">
            Question {idx + 1} of {questions.length}
          </span>
          <span className="font-mono font-semibold text-teal-800">
            Score: {progress.totalCorrect} / {progress.totalAttempted}
          </span>
        </div>
        <div className="mt-2 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-teal-600 h-full transition-all"
            style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
      {q && (
        <PracticeQuestion
          question={q}
          onAnswered={handleAnswered}
          onNext={handleNext}
          isLast={isLast}
        />
      )}
    </div>
  );
}

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EducationalDisclaimerProps {
  compact?: boolean;
}

export const EducationalDisclaimer: React.FC<EducationalDisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-amber-50/80 border border-amber-200/70 px-2.5 py-1.5 rounded-md">
        <ShieldAlert size={14} className="text-amber-600 shrink-0" />
        <span>For education and research training only. Not intended for individual clinical dosing decisions.</span>
      </div>
    );
  }

  return (
    <aside
      aria-label="Educational Disclaimer"
      className="flex items-start gap-3 p-3.5 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-950"
    >
      <ShieldAlert size={18} className="text-amber-700 mt-0.5 shrink-0" />
      <div>
        <span className="font-semibold text-amber-900 block mb-0.5">Educational and Training Tool Only</span>
        <p className="text-amber-900/90 leading-relaxed">
          The models, simulations, and pharmacokinetic equations presented here are designed strictly for statistical education,
          academic demonstration, and laboratory training. This software is not certified as medical device software and must never
          be used as the sole basis for patient-specific therapeutic drug monitoring, clinical dosing decisions, or medical prescriptions.
        </p>
      </div>
    </aside>
  );
};

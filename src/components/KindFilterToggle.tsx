'use client';

import React from 'react';

interface KindFilterToggleProps {
  showAll: boolean;
  onChange: (showAll: boolean) => void;
  isNight: boolean;
}

export const KindFilterToggle: React.FC<KindFilterToggleProps> = ({ showAll, onChange, isNight }) => (
  <label
    className={`flex cursor-pointer items-start gap-2.5 font-sans ${isNight ? 'text-stone-200' : 'text-slate-900'}`}
    title="Search and saved posts always show everything"
  >
    <input
      type="checkbox"
      checked={!showAll}
      onChange={(e) => onChange(!e.target.checked)}
      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-700"
    />
    <span>
      <span className="block text-xs font-semibold">Engineering posts only</span>
      <span className={`block text-[11px] leading-snug ${isNight ? 'text-stone-400' : 'text-slate-600'}`}>
        Hides announcements, hiring and marketing
      </span>
    </span>
  </label>
);

'use client';

import React from 'react';

interface KindFilterToggleProps {
  showAll: boolean;
  onChange: (showAll: boolean) => void;
}

export const KindFilterToggle: React.FC<KindFilterToggleProps> = ({ showAll, onChange }) => (
  <label className="fixed bottom-6 left-6 z-50 flex max-w-xs cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 font-sans text-slate-900 shadow-lg">
    <input
      type="checkbox"
      checked={!showAll}
      onChange={(e) => onChange(!e.target.checked)}
      className="h-4 w-4 flex-shrink-0 accent-indigo-600"
    />
    <span>
      <span className="block text-xs font-semibold">Engineering posts only</span>
      <span className="block text-[11px] leading-snug text-slate-600">
        Hides announcements, hiring and marketing posts. Search and bookmarks always show everything.
      </span>
    </span>
  </label>
);

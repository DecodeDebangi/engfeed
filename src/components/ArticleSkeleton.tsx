import React from 'react';

export const ArticleSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-800" />
          <div className="space-y-1">
            <div className="w-24 h-3 bg-slate-800 rounded" />
            <div className="w-16 h-2 bg-slate-850 rounded" />
          </div>
        </div>
        <div className="w-6 h-6 bg-slate-800 rounded-lg" />
      </div>

      <div className="space-y-2">
        <div className="w-full h-5 bg-slate-800 rounded" />
        <div className="w-3/4 h-5 bg-slate-800 rounded" />
      </div>

      <div className="space-y-1.5">
        <div className="w-full h-3 bg-slate-850 rounded" />
        <div className="w-full h-3 bg-slate-850 rounded" />
        <div className="w-2/3 h-3 bg-slate-850 rounded" />
      </div>

      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="w-20 h-3 bg-slate-800 rounded" />
        <div className="w-16 h-3 bg-slate-800 rounded" />
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sparkles, BookOpen, Layers, LayoutGrid, Zap, ChevronUp } from 'lucide-react';

export type UiStyleMode = 'editorial' | 'glass' | 'material' | 'brutalist';

interface FloatingUiSwitcherProps {
  currentStyle: UiStyleMode;
  onStyleChange: (style: UiStyleMode) => void;
}

const UI_OPTIONS: {
  id: UiStyleMode;
  name: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    id: 'editorial',
    name: 'Editorial Minimalist',
    badge: 'Reader Choice',
    desc: 'Warm paper & night ink, serif headlines, 65ch optimal width.',
    icon: BookOpen,
    accentColor: 'bg-amber-800 text-amber-100',
  },
  {
    id: 'glass',
    name: 'Glassmorphism Dark',
    badge: 'Modern Dark',
    desc: 'Translucent glass panels, vibrant neon glows, dark obsidian.',
    icon: Sparkles,
    accentColor: 'bg-indigo-600 text-indigo-100',
  },
  {
    id: 'material',
    name: 'Material Design 3',
    badge: 'Google MD3',
    desc: 'Soft rounded cards, pill chips, elevated surfaces.',
    icon: Layers,
    accentColor: 'bg-blue-600 text-blue-100',
  },
  {
    id: 'brutalist',
    name: 'Neo-Brutalist',
    badge: 'High Contrast',
    desc: 'Bold 4px black borders, yellow markers, retro monospace.',
    icon: Zap,
    accentColor: 'bg-yellow-400 text-black font-bold',
  },
];

export const FloatingUiSwitcher: React.FC<FloatingUiSwitcherProps> = ({
  currentStyle,
  onStyleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeOption = UI_OPTIONS.find((opt) => opt.id === currentStyle) || UI_OPTIONS[0];

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms grace period so fast mouse movement never drops open popover
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 font-sans group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible Hover Bridge + Floating Options Dropdown Menu */}
      <div
        className={`absolute bottom-full right-0 pb-3 w-80 transition-all duration-200 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Select UI Design
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              4 Styles Available
            </span>
          </div>

          <div className="space-y-1.5">
            {UI_OPTIONS.map((opt) => {
              const isSelected = currentStyle === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onStyleChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 border ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/60 shadow-sm'
                      : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {opt.name}
                      </span>
                      {isSelected && (
                        <span className="flex-shrink-0 p-0.5 rounded-full bg-amber-500 text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Trigger Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-3 bg-slate-950/90 hover:bg-slate-900 text-white rounded-full border border-slate-700/90 shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 group-hover:border-amber-500/60"
      >
        <div className="relative flex items-center justify-center">
          <Palette className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span className="text-slate-400">UI Mode:</span>
          <span className="text-amber-300 font-semibold">{activeOption.name}</span>
        </div>

        <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};

'use client';

import React from 'react';
import { BookOpen, Search, Bookmark, RefreshCw, LayoutGrid, List, Sun, Moon, Sparkles, X } from 'lucide-react';

interface EditorialNavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeView: 'all' | 'bookmarks';
  setActiveView: (view: 'all' | 'bookmarks') => void;
  layoutMode: 'grid' | 'list';
  setLayoutMode: (mode: 'grid' | 'list') => void;
  themeMode: 'paper' | 'night';
  setThemeMode: (theme: 'paper' | 'night') => void;
  onOpenSyncModal: () => void;
  totalArticles: number;
  totalCompanies: number;
  bookmarksCount: number;
  isSyncing: boolean;
}

export const EditorialNavbar: React.FC<EditorialNavbarProps> = ({
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
  layoutMode,
  setLayoutMode,
  themeMode,
  setThemeMode,
  onOpenSyncModal,
  totalArticles,
  totalCompanies,
  bookmarksCount,
  isSyncing,
}) => {
  const isNight = themeMode === 'night';

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${
        isNight
          ? 'bg-[#141517]/95 border-stone-800 text-stone-100'
          : 'bg-white/95 border-stone-200 text-slate-900 shadow-sm'
      } backdrop-blur-md px-4 lg:px-8 py-3.5`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Editorial Logo & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isNight ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-950 text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-serif font-bold tracking-tight ${isNight ? 'text-stone-100' : 'text-slate-950'}`}>
                  EngFeed <span className={`text-xs font-sans font-bold italic ${isNight ? 'text-amber-400' : 'text-amber-900'}`}>Editorial</span>
                </h1>
              </div>
              <p className={`text-xs font-sans flex items-center gap-2 ${isNight ? 'text-stone-400' : 'text-slate-600 font-medium'}`}>
                <span>{totalCompanies > 0 ? `${totalCompanies} Engineering Blogs` : 'Loading...'}</span>
                <span>•</span>
                <span className={`font-bold ${isNight ? 'text-amber-400' : 'text-amber-900'}`}>{totalArticles.toLocaleString()} Posts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Minimalist Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 ${isNight ? 'text-stone-500' : 'text-slate-500'}`} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search engineering posts by keyword or topic..."
            className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs font-medium placeholder-slate-500 transition-all border focus:outline-none ${
              isNight
                ? 'bg-[#1d1f23] border-stone-800 text-stone-100 focus:border-amber-500/50'
                : 'bg-stone-100 border-stone-300 text-slate-900 focus:border-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isNight ? 'text-stone-400 hover:text-stone-100' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Editorial Control Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Feed vs Bookmarks */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isNight ? 'bg-[#1d1f23] border-stone-800' : 'bg-stone-100 border-stone-300'
            }`}
          >
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-1.5 text-xs font-sans font-bold rounded-lg transition-all ${
                activeView === 'all'
                  ? isNight
                    ? 'bg-stone-800 text-stone-100 shadow-sm'
                    : 'bg-slate-950 text-white shadow-sm'
                  : isNight
                  ? 'text-stone-400 hover:text-stone-100'
                  : 'text-slate-600 hover:text-slate-950 font-semibold'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveView('bookmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-bold rounded-lg transition-all ${
                activeView === 'bookmarks'
                  ? isNight
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-950 text-white shadow-sm'
                  : isNight
                  ? 'text-stone-400 hover:text-stone-100'
                  : 'text-slate-600 hover:text-slate-950 font-semibold'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
              {bookmarksCount > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isNight ? 'bg-slate-900 text-amber-300' : 'bg-amber-100 text-amber-950 font-bold'}`}>
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Grid vs List View Toggle */}
          <div
            className={`hidden sm:flex items-center p-1 rounded-xl border ${
              isNight ? 'bg-[#1d1f23] border-stone-800' : 'bg-stone-100 border-stone-300'
            }`}
          >
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'grid'
                  ? isNight ? 'bg-stone-800 text-amber-400' : 'bg-slate-950 text-white shadow-sm'
                  : isNight ? 'text-stone-400 hover:text-stone-100' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'list'
                  ? isNight ? 'bg-stone-800 text-amber-400' : 'bg-slate-950 text-white shadow-sm'
                  : isNight ? 'text-stone-400 hover:text-stone-100' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Compact Editorial List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Mode Switcher */}
          <button
            onClick={() => setThemeMode(isNight ? 'paper' : 'night')}
            className={`p-2 rounded-xl border transition-all ${
              isNight
                ? 'bg-[#1d1f23] border-stone-800 text-amber-400 hover:bg-stone-800'
                : 'bg-stone-100 border-stone-300 text-slate-800 hover:bg-stone-200'
            }`}
            title={isNight ? 'Switch to Warm Paper Theme' : 'Switch to Night Ink Theme'}
          >
            {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sync Trigger */}
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-bold rounded-xl border transition-all ${
              isNight
                ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400'
                : 'bg-slate-950 text-white border-slate-950 hover:bg-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>

        </div>

      </div>
    </header>
  );
};

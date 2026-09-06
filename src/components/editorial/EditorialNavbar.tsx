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
          : 'bg-[#fcfbf9]/95 border-stone-200/80 text-stone-900'
      } backdrop-blur-md px-4 lg:px-8 py-3.5`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Editorial Logo & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isNight ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-stone-900 text-stone-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold tracking-tight">
                  EngFeed <span className="text-xs font-sans font-normal text-amber-600 italic">Editorial</span>
                </h1>
              </div>
              <p className="text-xs font-sans text-stone-500 flex items-center gap-2">
                <span>{totalCompanies > 0 ? `${totalCompanies} Engineering Blogs` : 'Loading...'}</span>
                <span>•</span>
                <span className="font-medium text-amber-700">{totalArticles.toLocaleString()} Posts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Minimalist Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-stone-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search engineering posts by keyword or topic..."
            className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs font-sans placeholder-stone-400 transition-all border focus:outline-none ${
              isNight
                ? 'bg-[#1d1f23] border-stone-800 text-stone-100 focus:border-amber-500/50'
                : 'bg-[#f4f0ea] border-stone-200 text-stone-900 focus:border-stone-400'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700"
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
              isNight ? 'bg-[#1d1f23] border-stone-800' : 'bg-[#f4f0ea] border-stone-200'
            }`}
          >
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-1.5 text-xs font-sans font-semibold rounded-lg transition-all ${
                activeView === 'all'
                  ? isNight
                    ? 'bg-stone-800 text-stone-100 shadow-sm'
                    : 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveView('bookmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded-lg transition-all ${
                activeView === 'bookmarks'
                  ? isNight
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
              {bookmarksCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-900/60 text-amber-200">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Grid vs List View Toggle */}
          <div
            className={`hidden sm:flex items-center p-1 rounded-xl border ${
              isNight ? 'bg-[#1d1f23] border-stone-800' : 'bg-[#f4f0ea] border-stone-200'
            }`}
          >
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'grid'
                  ? isNight ? 'bg-stone-800 text-amber-400' : 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'list'
                  ? isNight ? 'bg-stone-800 text-amber-400' : 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-400 hover:text-stone-700'
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
                : 'bg-[#f4f0ea] border-stone-200 text-stone-700 hover:bg-stone-200'
            }`}
            title={isNight ? 'Switch to Warm Paper Theme' : 'Switch to Night Ink Theme'}
          >
            {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sync Trigger */}
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold rounded-xl border transition-all ${
              isNight
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/40'
                : 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
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

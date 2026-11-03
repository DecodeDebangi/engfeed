'use client';

import React from 'react';
import { ADMIN_SYNC_ENABLED } from '@/lib/utils';
import { Rss, Search, Bookmark, RefreshCw, Layers, X, Sparkles } from 'lucide-react';

interface MaterialNavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeView: 'all' | 'bookmarks';
  setActiveView: (view: 'all' | 'bookmarks') => void;
  onOpenSyncModal: () => void;
  totalArticles: number;
  totalCompanies: number;
  bookmarksCount: number;
  isSyncing: boolean;
}

export const MaterialNavbar: React.FC<MaterialNavbarProps> = ({
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
  onOpenSyncModal,
  totalArticles,
  totalCompanies,
  bookmarksCount,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 text-white shadow-md border-b border-slate-800 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Material Top Bar Brand */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                  EngFeed
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  MATERIAL YOU
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                <span>{totalCompanies > 0 ? `${totalCompanies} Engineering Blogs` : 'Loading sources...'}</span>
                <span>•</span>
                <span className="text-indigo-300 font-semibold">{totalArticles.toLocaleString()} Articles</span>
              </p>
            </div>
          </div>
        </div>

        {/* Material Rounded Search Input */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles across Netflix, Meta, Cloudflare, Stripe..."
            className="w-full pl-11 pr-10 py-2.5 bg-slate-800/90 text-white placeholder-slate-400 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-slate-800 transition-all shadow-inner border border-slate-700/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Material Action Chips */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-800/90 border border-slate-700/60 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setActiveView('all')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeView === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Feed</span>
            </button>
            <button
              onClick={() => setActiveView('bookmarks')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeView === 'bookmarks'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarks</span>
              {bookmarksCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-indigo-900 text-indigo-200 text-[10px] font-bold rounded-full">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Material Sync FAB Button */}
          {ADMIN_SYNC_ENABLED && (
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
          </button>
          )}
        </div>

      </div>
    </header>
  );
};

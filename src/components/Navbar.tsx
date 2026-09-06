'use client';

import React from 'react';
import { Rss, Search, Bookmark, RefreshCw, Zap, Layers, X } from 'lucide-react';

interface NavbarProps {
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

export const Navbar: React.FC<NavbarProps> = ({
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
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Brand Logo & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Rss className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  EngFeed
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{totalCompanies > 0 ? `${totalCompanies} Top Tech Blogs` : 'Loading blogs...'}</span>
                <span>•</span>
                <span className="text-indigo-400 font-mono font-medium">{totalArticles.toLocaleString()} Articles</span>
              </p>
            </div>
          </div>

          {/* Sync Trigger for Mobile */}
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800/60 rounded-lg border border-slate-700/50"
            title="Sync Feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles across Netflix, Meta, Cloudflare, Uber..."
            className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Tab buttons */}
          <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800/90 rounded-xl">
            <button
              onClick={() => setActiveView('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeView === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Feed</span>
            </button>
            <button
              onClick={() => setActiveView('bookmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeView === 'bookmarks'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarks</span>
              {bookmarksCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-900/80 text-indigo-300 text-[10px] font-mono font-bold rounded-full">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Sync Trigger Desktop */}
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-900 border border-slate-700/60 rounded-xl transition-all shadow-sm hover:shadow-indigo-500/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>{isSyncing ? 'Syncing Feeds...' : 'Force Sync RSS'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};

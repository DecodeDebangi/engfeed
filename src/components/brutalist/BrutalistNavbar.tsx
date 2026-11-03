'use client';

import React from 'react';
import { ADMIN_SYNC_ENABLED } from '@/lib/utils';
import { Rss, Search, Bookmark, RefreshCw, Layers, X } from 'lucide-react';

interface BrutalistNavbarProps {
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

export const BrutalistNavbar: React.FC<BrutalistNavbarProps> = ({
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
    <header className="sticky top-0 z-40 w-full bg-yellow-300 border-b-4 border-black px-4 lg:px-8 py-3.5 shadow-[0_4px_0_0_#000]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-black text-yellow-300 border-2 border-black flex items-center justify-center font-mono font-black shadow-[3px_3px_0px_0px_#fff]">
              <Rss className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-mono font-black tracking-tighter text-black uppercase">
                  EngFeed
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-black text-yellow-300 border border-black rounded-none shadow-[2px_2px_0px_0px_#000]">
                  BRUTALIST
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-black flex items-center gap-2">
                <span>{totalCompanies > 0 ? `${totalCompanies} SOURCES` : 'LOADING...'}</span>
                <span>•</span>
                <span className="bg-white text-black px-1.5 py-0.2 border border-black">{totalArticles.toLocaleString()} POSTS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-black stroke-[3]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH NETFLIX, META, CLOUDFLARE, STRIPE..."
            className="w-full pl-9 pr-8 py-2 bg-white border-3 border-black text-xs font-mono font-bold text-black placeholder-slate-600 focus:outline-none focus:bg-amber-50 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-black font-bold"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Tab Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-black border-2 border-black uppercase transition-all ${
                activeView === 'all'
                  ? 'bg-black text-yellow-300 shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-white text-black hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 stroke-[3]" />
              <span>All Feed</span>
            </button>

            <button
              onClick={() => setActiveView('bookmarks')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-black border-2 border-black uppercase transition-all ${
                activeView === 'bookmarks'
                  ? 'bg-pink-500 text-white shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-white text-black hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 stroke-[3]" />
              <span>Saved</span>
              {bookmarksCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-black text-white text-[10px] font-mono">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Sync Trigger */}
          {ADMIN_SYNC_ENABLED && (
          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black bg-cyan-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[3] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          )}

        </div>

      </div>
    </header>
  );
};


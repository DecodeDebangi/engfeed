'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { SidebarFilters, CompanyOption } from './SidebarFilters';
import { ArticleCard, ArticleItem } from './ArticleCard';
import { ArticleSkeleton } from './ArticleSkeleton';
import { ReaderModal } from './ReaderModal';
import { SyncProgressModal } from './SyncProgressModal';
import { Layers, Bookmark, Search, RefreshCw, ChevronLeft, ChevronRight, Inbox, Sparkles } from 'lucide-react';

export const EngFeedDashboard: React.FC<{ showAllKinds?: boolean }> = ({ showAllKinds = false }) => {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'bookmarks'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Modal States
  const [activeArticleForReader, setActiveArticleForReader] = useState<ArticleItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global Stats
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalCompanies: 0,
    bookmarksCount: 0,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on search change
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch registered companies list
  useEffect(() => {
    setCurrentPage(1);
  }, [showAllKinds]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/companies');
      const json = await res.json();
      if (json.success) {
        setCompanies(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  }, []);

  // Fetch articles feed
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '18');
      if (showAllKinds) params.set('kinds', 'all');

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedTag) params.set('tag', selectedTag);
      if (selectedCompanySlug) params.set('company', selectedCompanySlug);
      if (activeView === 'bookmarks') params.set('bookmarked', 'true');

      const res = await fetch(`/api/articles?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        setArticles(json.data);
        setPagination({
          totalCount: json.pagination.totalCount,
          totalPages: json.pagination.totalPages,
          hasNextPage: json.pagination.hasNextPage,
          hasPrevPage: json.pagination.hasPrevPage,
        });

        setStats((prev) => ({
          ...prev,
          totalArticles: json.pagination.totalCount,
          ...(activeView === 'bookmarks' ? { bookmarksCount: json.pagination.totalCount } : {}),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedTag, selectedCompanySlug, activeView, showAllKinds]);

  // Fetch user bookmarks count & global stats
  const fetchGlobalStats = useCallback(async () => {
    try {
      const [statsRes, bookmarksRes] = await Promise.all([
        fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/bookmarks?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
      ]);

      if (statsRes.success) {
        setStats((prev) => ({
          ...prev,
          totalCompanies: statsRes.stats.totalCompanies,
        }));
      }

      if (bookmarksRes.success) {
        setStats((prev) => ({
          ...prev,
          bookmarksCount: bookmarksRes.data.length,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchGlobalStats();
  }, [fetchCompanies, fetchGlobalStats]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle bookmark toggle
  const handleToggleBookmark = async (articleId: string, markAsBookmarked?: boolean) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, markAsBookmarked }),
      });
      const data = await res.json();

      if (data.success) {
        setArticles((prev) => {
          if (activeView === 'bookmarks' && !data.bookmarked) {
            return prev.filter((a) => a.id !== articleId);
          }
          return prev.map((a) => (a.id === articleId ? { ...a, isBookmarked: data.bookmarked } : a));
        });

        if (activeArticleForReader && activeArticleForReader.id === articleId) {
          setActiveArticleForReader((prev) => (prev ? { ...prev, isBookmarked: data.bookmarked } : null));
        }

        setStats((prev) => ({
          ...prev,
          bookmarksCount: data.bookmarked
            ? prev.bookmarksCount + 1
            : Math.max(0, prev.bookmarksCount - 1),
        }));
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    }
  };

  const handleToggleRead = async (articleId: string, markAsRead?: boolean) => {
    try {
      const res = await fetch('/api/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, markAsRead }),
      });
      const data = await res.json();

      if (data.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, isRead: data.isRead } : a))
        );
        if (activeArticleForReader && activeArticleForReader.id === articleId) {
          setActiveArticleForReader((prev) => (prev ? { ...prev, isRead: data.isRead } : null));
        }
      }
    } catch (err) {
      console.error('Read toggle error:', err);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedCompanySlug(null);
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-indigo-500 selection:text-white">
      
      {/* Header Navigation */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view === 'bookmarks') {
            setSelectedCategory(null);
            setSelectedTag(null);
            setSelectedCompanySlug(null);
            setSearchQuery('');
            setDebouncedSearch('');
          }
          setCurrentPage(1);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        totalArticles={stats.totalArticles}
        totalCompanies={stats.totalCompanies}
        bookmarksCount={stats.bookmarksCount}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filter Panel */}
        <SidebarFilters
          selectedCategory={selectedCategory}
          setSelectedCategory={(cat) => {
            setSelectedCategory(cat);
            setCurrentPage(1);
          }}
          selectedTag={selectedTag}
          setSelectedTag={(tag) => {
            setSelectedTag(tag);
            setCurrentPage(1);
          }}
          selectedCompanySlug={selectedCompanySlug}
          setSelectedCompanySlug={(slug) => {
            setSelectedCompanySlug(slug);
            setCurrentPage(1);
          }}
          companies={companies}
          onResetFilters={handleResetFilters}
        />

        {/* Content Feed Section */}
        <section className="flex-1 flex flex-col min-w-0 space-y-6">
          
          {/* Active Filter Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {activeView === 'bookmarks' ? (
                  <>
                    <Bookmark className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                    <span>Your Bookmarked Engineering Articles</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>
                      {selectedCompanySlug
                        ? `Engineering Feed: ${companies.find((c) => c.slug === selectedCompanySlug)?.name || selectedCompanySlug}`
                        : selectedTag
                        ? `Topic: ${selectedTag}`
                        : 'Real-Time Top Tech Engineering Feed'}
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {articles.length} of {pagination.totalCount.toLocaleString()} curated posts from top engineering teams.
              </p>
            </div>

            {/* Quick Action */}
            <div className="text-xs text-slate-500 font-mono">
              Page {currentPage} of {pagination.totalPages || 1}
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ArticleSkeleton key={idx} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpenReader={setActiveArticleForReader}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleRead={handleToggleRead}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center border border-slate-800 space-y-4 my-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                <Inbox className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-slate-200">No Articles Found</h3>
                <p className="text-xs text-slate-400">
                  We couldn't find any engineering articles matching your current search or selected filters.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-xs text-slate-400 font-medium">
                Page {currentPage} of {pagination.totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

      </main>

      {/* Reader Mode Overlay Modal */}
      <ReaderModal
        article={activeArticleForReader}
        onClose={() => setActiveArticleForReader(null)}
        onToggleBookmark={handleToggleBookmark}
        onToggleRead={handleToggleRead}
      />

      {/* Live Sync Progress Modal */}
      <SyncProgressModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onRefreshData={() => {
          fetchArticles();
          fetchGlobalStats();
        }}
      />

    </div>
  );
};

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { SidebarFilters, CompanyOption } from './SidebarFilters';
import { ArticleCard, ArticleItem } from './ArticleCard';
import { ArticleSkeleton } from './ArticleSkeleton';
import { ReaderModal } from './ReaderModal';
import { SyncProgressModal } from './SyncProgressModal';
import { Layers, Bookmark, Search, RefreshCw, ChevronLeft, ChevronRight, Inbox, Sparkles } from 'lucide-react';

export const EngFeedDashboard: React.FC = () => {
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

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedTag) params.set('tag', selectedTag);
      if (selectedCompanySlug) params.set('company', selectedCompanySlug);
      if (activeView === 'bookmarks') params.set('bookmarked', 'true');

      const res = await fetch(`/api/articles?${params.toString()}`);
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
        }));
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedTag, selectedCompanySlug, activeView]);

  // Fetch user bookmarks count & global stats
  const fetchGlobalStats = useCallback(async () => {
    try {
      const [statsRes, bookmarksRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/bookmarks').then((r) => r.json()),
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
  const handleToggleBookmark = async (articleId: string) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();

      if (data.success) {
        // Update local article bookmark state
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, isBookmarked: data.bookmarked } : a))
        );
        fetchGlobalStats();
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
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
                  {activeView === 'bookmarks'
                    ? 'You have not saved any bookmarks yet. Click the bookmark icon on any article card to save it here.'
                    : 'No articles matched your selected filters or search query. Try clearing filters or searching another keyword.'}
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md"
              >
                Reset Filters & Search
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || loading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span>Page {currentPage} of {pagination.totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || loading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1"
              >
                <span>Next</span>
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

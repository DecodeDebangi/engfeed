'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EditorialNavbar } from './EditorialNavbar';
import { EditorialSidebarFilters } from './EditorialSidebarFilters';
import { EditorialArticleCard } from './EditorialArticleCard';
import { EditorialReaderModal } from './EditorialReaderModal';
import { ArticleSkeleton } from '../ArticleSkeleton';
import { SyncProgressModal } from '../SyncProgressModal';
import { ArticleItem } from '../ArticleCard';
import { CompanyOption } from '../SidebarFilters';
import { BookOpen, Bookmark, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export const EditorialEngFeedDashboard: React.FC = () => {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Editorial Theme & Layout State
  const [themeMode, setThemeMode] = useState<'paper' | 'night'>('paper');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

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

  const isNight = themeMode === 'night';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
  }, [currentPage, debouncedSearch, selectedTag, selectedCompanySlug, activeView]);

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
      console.error('Bookmark error:', err);
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
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isNight ? 'bg-[#121315] text-stone-100' : 'bg-[#f7f6f2] text-slate-900'
      }`}
    >
      {/* Editorial Navbar */}
      <EditorialNavbar
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
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        totalArticles={stats.totalArticles}
        totalCompanies={stats.totalCompanies}
        bookmarksCount={stats.bookmarksCount}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <EditorialSidebarFilters
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
          themeMode={themeMode}
        />

        {/* Feed Section */}
        <section className="flex-1 flex flex-col min-w-0 space-y-6">
          
          {/* Active Banner */}
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-colors ${
              isNight
                ? 'bg-[#18191c] border-stone-800'
                : 'bg-white border-stone-200 shadow-sm'
            }`}
          >
            <div>
              <h2 className={`text-base font-serif font-bold flex items-center gap-2 ${isNight ? 'text-stone-100' : 'text-slate-950 font-bold'}`}>
                {activeView === 'bookmarks' ? (
                  <>
                    <Bookmark className="w-4 h-4 text-amber-600 fill-amber-600" />
                    <span>Saved Reading List</span>
                  </>
                ) : (
                  <>
                    <BookOpen className={`w-4 h-4 ${isNight ? 'text-amber-400' : 'text-amber-900'}`} />
                    <span>
                      {selectedCompanySlug
                        ? `Feed: ${companies.find((c) => c.slug === selectedCompanySlug)?.name || selectedCompanySlug}`
                        : selectedTag
                        ? `Topic: ${selectedTag}`
                        : 'Real-Time Engineering Feed'}
                    </span>
                  </>
                )}
              </h2>
              <p className={`text-xs font-sans mt-0.5 ${isNight ? 'text-stone-400' : 'text-slate-700 font-medium'}`}>
                Showing {articles.length} of {pagination.totalCount.toLocaleString()} curated posts from top engineering teams.
              </p>
            </div>

            <div className={`text-xs font-sans font-mono ${isNight ? 'text-stone-400' : 'text-slate-700 font-semibold'}`}>
              Page {currentPage} of {pagination.totalPages || 1}
            </div>
          </div>

          {/* Cards Grid / List */}
          {loading ? (
            <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-3'}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <ArticleSkeleton key={idx} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-3'}>
              {articles.map((article) => (
                <EditorialArticleCard
                  key={article.id}
                  article={article}
                  layoutMode={layoutMode}
                  themeMode={themeMode}
                  onOpenReader={setActiveArticleForReader}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleRead={handleToggleRead}
                />
              ))}
            </div>
          ) : (
            <div
              className={`p-12 text-center flex flex-col items-center justify-center space-y-4 my-8 rounded-2xl border ${
                isNight
                  ? 'bg-[#18191c] border-stone-800 text-stone-300'
                  : 'bg-white border-stone-200 text-slate-800 shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isNight ? 'bg-stone-800' : 'bg-stone-100'}`}>
                <Inbox className={`w-6 h-6 ${isNight ? 'text-stone-400' : 'text-slate-600'}`} />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className={`text-base font-serif font-bold ${isNight ? 'text-stone-100' : 'text-slate-950'}`}>No Posts Found</h3>
                <p className={`text-xs ${isNight ? 'text-stone-400' : 'text-slate-600 font-medium'}`}>
                  {activeView === 'bookmarks'
                    ? 'You have not saved any bookmarks yet.'
                    : 'No engineering posts matched your active filters or search query.'}
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-sans font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-stone-200/60 dark:border-stone-800">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || loading}
                className={`px-4 py-2 text-xs font-sans font-semibold rounded-xl border transition-all disabled:opacity-40 flex items-center gap-1 ${
                  isNight
                    ? 'bg-[#18191c] border-stone-800 text-stone-200 hover:bg-stone-800'
                    : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-100 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-sans text-stone-500 font-mono">
                Page {currentPage} of {pagination.totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || loading}
                className={`px-4 py-2 text-xs font-sans font-semibold rounded-xl border transition-all disabled:opacity-40 flex items-center gap-1 ${
                  isNight
                    ? 'bg-[#18191c] border-stone-800 text-stone-200 hover:bg-stone-800'
                    : 'bg-white border-stone-200 text-stone-800 hover:bg-stone-100 shadow-sm'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </section>

      </main>

      {/* Reader Modal */}
      <EditorialReaderModal
        article={activeArticleForReader}
        onClose={() => setActiveArticleForReader(null)}
        onToggleBookmark={handleToggleBookmark}
        onToggleRead={handleToggleRead}
      />

      {/* Sync Modal */}
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrutalistNavbar } from './BrutalistNavbar';
import { BrutalistSidebarFilters } from './BrutalistSidebarFilters';
import { BrutalistArticleCard } from './BrutalistArticleCard';
import { BrutalistReaderModal } from './BrutalistReaderModal';
import { ArticleSkeleton } from '../ArticleSkeleton';
import { SyncProgressModal } from '../SyncProgressModal';
import { ArticleItem } from '../ArticleCard';
import { CompanyOption } from '../SidebarFilters';
import { Layers, Bookmark, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export const BrutalistEngFeedDashboard: React.FC = () => {
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

  const handleToggleBookmark = async (articleId: string) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();

      if (data.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, isBookmarked: data.bookmarked } : a))
        );
        fetchGlobalStats();
      }
    } catch (err) {
      console.error('Bookmark error:', err);
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
    <div className="min-h-screen flex flex-col bg-amber-50 text-black font-mono selection:bg-yellow-300 selection:text-black">
      
      {/* Brutalist Top Navbar */}
      <BrutalistNavbar
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

      {/* Main Grid Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Brutalist Sidebar */}
        <BrutalistSidebarFilters
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

        {/* Main Feed Content */}
        <section className="flex-1 flex flex-col min-w-0 space-y-6">
          
          {/* Active Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border-4 border-black p-4 shadow-[5px_5px_0px_0px_#000]">
            <div>
              <h2 className="text-base font-black text-black uppercase flex items-center gap-2">
                {activeView === 'bookmarks' ? (
                  <>
                    <Bookmark className="w-4 h-4 fill-black" />
                    <span>SAVED BOOKMARKS ({stats.bookmarksCount})</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>
                      {selectedCompanySlug
                        ? `FEED: ${companies.find((c) => c.slug === selectedCompanySlug)?.name || selectedCompanySlug}`
                        : selectedTag
                        ? `TOPIC: ${selectedTag}`
                        : 'REAL-TIME ENGINEERING FEED'}
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                SHOWING {articles.length} OF {pagination.totalCount.toLocaleString()} ARTICLES
              </p>
            </div>

            <div className="text-xs font-black bg-yellow-300 text-black px-2 py-1 border border-black shadow-[2px_2px_0px_0px_#000]">
              PAGE {currentPage} / {pagination.totalPages || 1}
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ArticleSkeleton key={idx} />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {articles.map((article) => (
                <BrutalistArticleCard
                  key={article.id}
                  article={article}
                  onOpenReader={setActiveArticleForReader}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border-4 border-black p-12 text-center flex flex-col items-center justify-center space-y-4 my-8 shadow-[8px_8px_0px_0px_#000]">
              <div className="w-14 h-14 bg-yellow-300 text-black border-2 border-black flex items-center justify-center">
                <Inbox className="w-7 h-7 stroke-[3]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-black uppercase text-black">NO ARTICLES MATCHED</h3>
                <p className="text-xs font-bold text-slate-700">
                  {activeView === 'bookmarks'
                    ? 'NO BOOKMARKS SAVED YET. CLICK SAVE BUTTON ON ANY CARD.'
                    : 'TRY CLEARING FILTERS OR SEARCHING ANOTHER KEYWORD.'}
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-black text-black bg-cyan-300 hover:bg-cyan-200 border-2 border-black shadow-[3px_3px_0px_0px_#000] uppercase"
              >
                RESET FILTERS
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t-4 border-black">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || loading}
                className="px-4 py-2 text-xs font-black text-black bg-white hover:bg-yellow-200 border-2 border-black shadow-[3px_3px_0px_0px_#000] uppercase disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
                <span>PREV</span>
              </button>

              <div className="text-xs font-black text-black bg-white px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                PAGE {currentPage} OF {pagination.totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || loading}
                className="px-4 py-2 text-xs font-black text-black bg-white hover:bg-yellow-200 border-2 border-black shadow-[3px_3px_0px_0px_#000] uppercase disabled:opacity-40 flex items-center gap-1"
              >
                <span>NEXT</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          )}

        </section>

      </main>

      {/* Brutalist Reader View Modal */}
      <BrutalistReaderModal
        article={activeArticleForReader}
        onClose={() => setActiveArticleForReader(null)}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Sync Progress Modal */}
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

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, Clock, Check, Copy, Type, ArrowUpRight, Share2 } from 'lucide-react';
import { ArticleItem } from './ArticleCard';
import { formatDateFull } from '@/lib/utils';

interface ReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  article,
  onClose,
  onToggleBookmark,
}) => {
  const [fullArticleData, setFullArticleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!article) return;

    setIsBookmarked(article.isBookmarked || false);
    setLoading(true);

    // Fetch full article detail (including sanitized HTML)
    fetch(`/api/articles/${article.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setFullArticleData(json.data);
          setIsBookmarked(json.data.isBookmarked);
        }
      })
      .catch((err) => console.error('Failed to load full article content:', err))
      .finally(() => setLoading(false));

    // Handle Escape key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [article, onClose]);

  // Track scroll reading progress inside modal container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      const progress = (target.scrollTop / totalHeight) * 100;
      setScrollProgress(progress);
    }
  };

  const handleCopyLink = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookmarkToggle = async () => {
    if (!article) return;
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    try {
      await onToggleBookmark(article.id);
    } catch (err) {
      setIsBookmarked(!nextState);
    }
  };

  if (!article) return null;

  const fontClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      
      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-600 z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] glass-panel border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex-shrink-0">
          
          {/* Company identity */}
          <div className="flex items-center gap-3">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-7 h-7 rounded-lg object-cover bg-slate-800 border border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                {article.company.name}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Reader Mode • {article.readTime} min read
              </span>
            </div>
          </div>

          {/* Controls: Font size, Bookmark, Copy Link, Close */}
          <div className="flex items-center gap-2">
            
            {/* Font Size Adjuster */}
            <div className="hidden sm:flex items-center bg-slate-800/70 border border-slate-700/60 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${fontSize === 'sm' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${fontSize === 'md' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${fontSize === 'lg' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                A+
              </button>
            </div>

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-xl border transition-all ${
                isBookmarked
                  ? 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border-slate-700/60'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-400' : ''}`} />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60 rounded-xl transition-all"
              title="Copy Article URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Open External Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-all"
            >
              <span>Original Post</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl border border-slate-700 transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Article Content */}
        <div
          onScroll={handleScroll}
          ref={contentRef}
          className="overflow-y-auto px-6 md:px-12 py-8 space-y-6 custom-scrollbar"
        >
          {/* Article Header */}
          <div className="border-b border-slate-800 pb-6 space-y-3">
            {/* Tech Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 leading-tight tracking-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>Published {formatDateFull(article.publishedAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} min read
              </span>
            </div>
          </div>

          {/* Reader Body Content */}
          {loading ? (
            <div className="py-12 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-full" />
              <div className="h-4 bg-slate-800 rounded w-5/6" />
              <div className="h-4 bg-slate-800 rounded w-4/6" />
              <div className="h-32 bg-slate-850 rounded-xl" />
            </div>
          ) : (
            <div
              className={`prose-custom ${fontClasses[fontSize]}`}
              dangerouslySetInnerHTML={{
                __html: fullArticleData?.content || article.summary || '<p>No content available.</p>',
              }}
            />
          )}

          {/* Bottom Footer Action */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Read cleanly on EngFeed Reader Mode from <strong className="text-slate-300">{article.company.name}</strong>
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>Visit full blog post on {article.company.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

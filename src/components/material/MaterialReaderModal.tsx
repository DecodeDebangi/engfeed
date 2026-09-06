'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, Clock, Check, Copy, ArrowUpRight } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatDateFull } from '@/lib/utils';

interface MaterialReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const MaterialReaderModal: React.FC<MaterialReaderModalProps> = ({
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

    fetch(`/api/articles/${article.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setFullArticleData(json.data);
          setIsBookmarked(json.data.isBookmarked);
        }
      })
      .catch((err) => console.error('Failed to load article detail:', err))
      .finally(() => setLoading(false));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [article, onClose]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      setScrollProgress((target.scrollTop / totalHeight) * 100);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      
      {/* Top Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-indigo-600 z-50 transition-all duration-150 rounded-r-full"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Material Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-7 h-7 rounded-full object-cover bg-slate-100 border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {article.company.name}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Material Reader • {article.readTime} min read
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Font size picker */}
            <div className="hidden sm:flex items-center bg-slate-200/70 rounded-full p-1 text-xs font-bold">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded-full transition-colors ${fontSize === 'sm' ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded-full transition-colors ${fontSize === 'md' ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded-full transition-colors ${fontSize === 'lg' ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}
              >
                A+
              </button>
            </div>

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-full transition-all ${
                isBookmarked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-700' : ''}`} />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full transition-all"
              title="Copy Article Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-sm transition-all"
            >
              <span>Original Post</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Article Body */}
        <div
          onScroll={handleScroll}
          ref={contentRef}
          className="overflow-y-auto px-6 md:px-12 py-8 space-y-6 custom-scrollbar"
        >
          <div className="border-b border-slate-100 pb-6 space-y-3">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span>Published {formatDateFull(article.publishedAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {article.readTime} min read
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded-full w-full" />
              <div className="h-4 bg-slate-100 rounded-full w-5/6" />
              <div className="h-4 bg-slate-100 rounded-full w-4/6" />
            </div>
          ) : (
            <div
              className={`prose-custom text-slate-800 ${fontClasses[fontSize]}`}
              dangerouslySetInnerHTML={{
                __html: fullArticleData?.content || article.summary || '<p>No content available.</p>',
              }}
            />
          )}

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-medium text-slate-500">
              Material Reader Mode from <strong className="text-slate-800">{article.company.name}</strong>
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all flex items-center gap-1.5"
            >
              <span>Visit original post on {article.company.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

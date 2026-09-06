'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, Clock, Check, Copy, ArrowUpRight, Type, Sun, Moon } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatDateFull } from '@/lib/utils';

interface EditorialReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const EditorialReaderModal: React.FC<EditorialReaderModalProps> = ({
  article,
  onClose,
  onToggleBookmark,
}) => {
  const [fullArticleData, setFullArticleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'night'>('paper');
  const [readerFont, setReaderFont] = useState<'serif' | 'sans'>('serif');
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

  const themeBgClasses = {
    paper: 'bg-[#fdfbf7] text-stone-900 border-stone-300',
    sepia: 'bg-[#f5ebd6] text-stone-900 border-amber-300',
    night: 'bg-[#121315] text-stone-100 border-stone-800',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/75 backdrop-blur-sm animate-fadeIn">
      
      {/* Top Reading Progress Line */}
      <div
        className="fixed top-0 left-0 h-1 bg-amber-600 z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Main Modal Surface */}
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] ${themeBgClasses[readerTheme]} rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-200`}
      >
        
        {/* Editorial Modal Top Bar */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0 font-sans ${
            readerTheme === 'night'
              ? 'bg-[#18191c] border-stone-800 text-stone-200'
              : 'bg-[#f4f0ea] border-stone-200/80 text-stone-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-7 h-7 rounded-lg object-cover bg-stone-100 border border-stone-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-xs font-serif font-bold block">
                {article.company.name}
              </span>
              <span className="text-[10px] text-stone-500 block">
                Editorial Reader • {article.readTime} min read
              </span>
            </div>
          </div>

          {/* Reader Controls: Theme (Paper/Sepia/Night), Font (Serif/Sans), Size, Bookmark, Close */}
          <div className="flex items-center gap-2">
            
            {/* Reading Theme Selector */}
            <div className="hidden md:flex items-center p-1 rounded-lg bg-stone-200/60 dark:bg-stone-800 text-xs font-medium">
              <button
                onClick={() => setReaderTheme('paper')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'paper' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}
                title="Paper Theme"
              >
                Paper
              </button>
              <button
                onClick={() => setReaderTheme('sepia')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'sepia' ? 'bg-[#f5ebd6] text-stone-900 shadow-sm' : 'text-stone-600'}`}
                title="Sepia Theme"
              >
                Sepia
              </button>
              <button
                onClick={() => setReaderTheme('night')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'night' ? 'bg-[#121315] text-white shadow-sm' : 'text-stone-600'}`}
                title="Night Theme"
              >
                Night
              </button>
            </div>

            {/* Font Family Toggle */}
            <div className="hidden sm:flex items-center p-1 rounded-lg bg-stone-200/60 dark:bg-stone-800 text-xs font-medium">
              <button
                onClick={() => setReaderFont('serif')}
                className={`px-2 py-0.5 rounded-md font-serif ${readerFont === 'serif' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600'}`}
              >
                Serif
              </button>
              <button
                onClick={() => setReaderFont('sans')}
                className={`px-2 py-0.5 rounded-md font-sans ${readerFont === 'sans' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600'}`}
              >
                Sans
              </button>
            </div>

            {/* Font Size Adjuster */}
            <div className="hidden sm:flex items-center p-1 rounded-lg bg-stone-200/60 dark:bg-stone-800 text-xs font-bold">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded ${fontSize === 'sm' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded ${fontSize === 'md' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded ${fontSize === 'lg' ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-600'}`}
              >
                A+
              </button>
            </div>

            {/* Bookmark */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-700 dark:fill-amber-400' : ''}`} />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-2 text-stone-500 hover:text-stone-800 rounded-xl transition-all"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition-all"
            >
              <span>Original</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Article Column */}
        <div
          onScroll={handleScroll}
          ref={contentRef}
          className="overflow-y-auto px-6 md:px-16 py-10 space-y-6 custom-scrollbar"
        >
          {/* Header Area */}
          <div className="border-b border-stone-200/60 dark:border-stone-800 pb-6 space-y-4 max-w-2xl mx-auto">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 font-sans">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-4xl font-serif font-bold leading-tight tracking-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-3 text-xs font-sans text-stone-500">
              <span>Published {formatDateFull(article.publishedAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} min read
              </span>
            </div>
          </div>

          {/* Body Content */}
          {loading ? (
            <div className="py-12 space-y-4 max-w-2xl mx-auto animate-pulse">
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-full" />
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-5/6" />
              <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-4/6" />
            </div>
          ) : (
            <div
              className={`prose-custom ${readerFont === 'serif' ? 'font-serif' : 'font-sans'} max-w-2xl mx-auto ${fontClasses[fontSize]}`}
              dangerouslySetInnerHTML={{
                __html: fullArticleData?.content || article.summary || '<p>No content available.</p>',
              }}
            />
          )}

          <div className="pt-8 border-t border-stone-200/60 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans max-w-2xl mx-auto">
            <p className="text-xs text-stone-500">
              Reading in Editorial Mode from <strong className="font-semibold">{article.company.name}</strong>
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-200/60 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-all flex items-center gap-1.5"
            >
              <span>Read on {article.company.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, Clock, Check, Copy, ArrowUpRight, Type, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatDateFull } from '@/lib/utils';

interface EditorialReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  onToggleBookmark: (articleId: string, markAsBookmarked?: boolean) => Promise<void>;
  onToggleRead?: (articleId: string, markAsRead?: boolean) => Promise<void>;
}

export const EditorialReaderModal: React.FC<EditorialReaderModalProps> = ({
  article,
  onClose,
  onToggleBookmark,
  onToggleRead,
}) => {
  const [fullArticleData, setFullArticleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'night'>('paper');
  const [readerFont, setReaderFont] = useState<'serif' | 'sans'>('serif');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const openedArticleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!article) return;

    if (openedArticleIdRef.current !== article.id) {
      openedArticleIdRef.current = article.id;
      setIsBookmarked(article.isBookmarked || false);
      setIsRead(article.isRead || false);

      if (onToggleRead && !article.isRead) {
        setIsRead(true);
        onToggleRead(article.id, true).catch(() => {});
      }
    }

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

  const handleReadToggle = async () => {
    if (!article || !onToggleRead) return;
    const nextState = !isRead;
    setIsRead(nextState);
    try {
      await onToggleRead(article.id, nextState);
    } catch (err) {
      setIsRead(!nextState);
    }
  };

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
      await onToggleBookmark(article.id, nextState);
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
    paper: 'bg-[#fdfbf7] text-slate-950 border-stone-300',
    sepia: 'bg-[#f5ebd6] text-[#2e2315] border-amber-300/80',
    night: 'bg-[#121315] text-stone-100 border-stone-800',
  };

  const proseClassMap = {
    paper: 'prose-paper',
    sepia: 'prose-sepia',
    night: 'prose-night',
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
            <div className={`hidden md:flex items-center p-1 rounded-lg text-xs font-semibold ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`}>
              <button
                onClick={() => setReaderTheme('paper')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'paper' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-700'}`}
                title="Paper Theme"
              >
                Paper
              </button>
              <button
                onClick={() => setReaderTheme('sepia')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'sepia' ? 'bg-[#f5ebd6] text-amber-950 shadow-sm font-bold' : 'text-slate-700'}`}
                title="Sepia Theme"
              >
                Sepia
              </button>
              <button
                onClick={() => setReaderTheme('night')}
                className={`px-2 py-0.5 rounded-md ${readerTheme === 'night' ? 'bg-[#121315] text-white shadow-sm font-bold' : 'text-slate-700'}`}
                title="Night Theme"
              >
                Night
              </button>
            </div>

            {/* Font Family Toggle */}
            <div className={`hidden sm:flex items-center p-1 rounded-lg text-xs font-semibold ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`}>
              <button
                onClick={() => setReaderFont('serif')}
                className={`px-2 py-0.5 rounded-md font-serif ${readerFont === 'serif' ? (readerTheme === 'night' ? 'bg-stone-100 text-stone-900' : 'bg-slate-950 text-white') : 'text-slate-700'}`}
              >
                Serif
              </button>
              <button
                onClick={() => setReaderFont('sans')}
                className={`px-2 py-0.5 rounded-md font-sans ${readerFont === 'sans' ? (readerTheme === 'night' ? 'bg-stone-100 text-stone-900' : 'bg-slate-950 text-white') : 'text-slate-700'}`}
              >
                Sans
              </button>
            </div>

            {/* Font Size Adjuster */}
            <div className={`hidden sm:flex items-center p-1 rounded-lg text-xs font-bold ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`}>
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded ${fontSize === 'sm' ? (readerTheme === 'night' ? 'bg-stone-100 text-stone-900' : 'bg-slate-950 text-white') : 'text-slate-700'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded ${fontSize === 'md' ? (readerTheme === 'night' ? 'bg-stone-100 text-stone-900' : 'bg-slate-950 text-white') : 'text-slate-700'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded ${fontSize === 'lg' ? (readerTheme === 'night' ? 'bg-stone-100 text-stone-900' : 'bg-slate-950 text-white') : 'text-slate-700'}`}
              >
                A+
              </button>
            </div>

            {/* Read / Unread toggle */}
            {onToggleRead && (
              <button
                onClick={handleReadToggle}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  isRead
                    ? readerTheme === 'night'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title={isRead ? 'Mark as Unread' : 'Mark as Read'}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline">{isRead ? 'Read' : 'Mark Read'}</span>
              </button>
            )}

            {/* Bookmark */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? readerTheme === 'night'
                    ? 'bg-amber-900/40 text-amber-400'
                    : 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? (readerTheme === 'night' ? 'fill-amber-400' : 'fill-amber-900') : ''}`} />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-2 text-stone-500 hover:text-stone-900 rounded-xl transition-all"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
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
          <div className={`border-b pb-6 space-y-4 max-w-2xl mx-auto ${readerTheme === 'night' ? 'border-stone-800' : 'border-stone-300'}`}>
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 font-sans">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                      readerTheme === 'night'
                        ? 'bg-stone-800 text-stone-300 border-stone-700'
                        : 'bg-stone-200 text-slate-800 border-stone-300'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-4xl font-serif font-bold leading-tight tracking-tight">
              {article.title}
            </h1>

            <div className={`flex items-center gap-3 text-xs font-sans font-medium ${readerTheme === 'night' ? 'text-stone-400' : 'text-slate-600'}`}>
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
              <div className={`h-4 rounded w-full ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`} />
              <div className={`h-4 rounded w-5/6 ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`} />
              <div className={`h-4 rounded w-4/6 ${readerTheme === 'night' ? 'bg-stone-800' : 'bg-stone-200'}`} />
            </div>
          ) : (
            <div
              className={`${proseClassMap[readerTheme]} ${readerFont === 'serif' ? 'font-serif' : 'font-sans'} max-w-2xl mx-auto ${fontClasses[fontSize]}`}
              dangerouslySetInnerHTML={{
                __html: fullArticleData?.content || article.summary || '<p>No content available.</p>',
              }}
            />
          )}

          <div className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-sans max-w-2xl mx-auto ${readerTheme === 'night' ? 'border-stone-800' : 'border-stone-300'}`}>
            <p className={`text-xs ${readerTheme === 'night' ? 'text-stone-400' : 'text-slate-700 font-medium'}`}>
              Reading in Editorial Mode from <strong className="font-semibold">{article.company.name}</strong>
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                readerTheme === 'night'
                  ? 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                  : 'bg-stone-200 text-slate-900 hover:bg-stone-300'
              }`}
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

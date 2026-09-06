'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, Clock, Check, Copy, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatDateFull } from '@/lib/utils';

interface BrutalistReaderModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
  onToggleRead?: (articleId: string, markAsRead?: boolean) => Promise<void>;
}

export const BrutalistReaderModal: React.FC<BrutalistReaderModalProps> = ({
  article,
  onClose,
  onToggleBookmark,
  onToggleRead,
}) => {
  const [fullArticleData, setFullArticleData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 font-mono animate-fadeIn">
      
      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-2 bg-lime-400 border-b-2 border-black z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Main Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-amber-50 border-4 border-black shadow-[12px_12px_0px_0px_#000] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-yellow-300 border-b-4 border-black flex-shrink-0">
          
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 text-xs font-black bg-black text-yellow-300 border border-black uppercase">
              {article.company.name}
            </span>
            <span className="text-xs font-bold text-black uppercase">
              BRUTALIST READER • {article.readTime}M READ
            </span>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Font size toggles */}
            <div className="hidden sm:flex items-center bg-white border-2 border-black p-0.5 text-xs font-bold">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 transition-colors ${fontSize === 'sm' ? 'bg-black text-white' : 'text-black'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 transition-colors ${fontSize === 'md' ? 'bg-black text-white' : 'text-black'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 transition-colors ${fontSize === 'lg' ? 'bg-black text-white' : 'text-black'}`}
              >
                A+
              </button>
            </div>

            {/* Read / Unread toggle */}
            {onToggleRead && (
              <button
                onClick={handleReadToggle}
                className={`p-1.5 border-2 border-black font-bold transition-all flex items-center gap-1 text-xs uppercase ${
                  isRead ? 'bg-emerald-400 text-black' : 'bg-white text-black hover:bg-slate-100'
                }`}
                title={isRead ? 'MARK AS UNREAD' : 'MARK AS READ'}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span className="hidden md:inline">{isRead ? 'READ' : 'MARK READ'}</span>
              </button>
            )}

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-1.5 border-2 border-black font-bold transition-all ${
                isBookmarked ? 'bg-pink-400 text-white' : 'bg-white text-black hover:bg-slate-100'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-4 h-4 stroke-[3] ${isBookmarked ? 'fill-white' : ''}`} />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-1.5 bg-white text-black hover:bg-slate-100 border-2 border-black font-bold transition-all"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3] text-emerald-600" /> : <Copy className="w-4 h-4 stroke-[3]" />}
            </button>

            {/* Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-black bg-cyan-300 hover:bg-cyan-200 border-2 border-black shadow-[2px_2px_0px_0px_#000] uppercase"
            >
              <span>Original</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 bg-black text-white border-2 border-black font-bold transition-all ml-1"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          onScroll={handleScroll}
          ref={contentRef}
          className="overflow-y-auto px-6 md:px-12 py-8 space-y-6 custom-scrollbar"
        >
          <div className="border-b-4 border-black pb-6 space-y-3">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-xs font-black bg-pink-300 text-black border border-black uppercase"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-black text-black leading-tight uppercase tracking-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
              <span>PUBLISHED {formatDateFull(article.publishedAt)}</span>
              <span>•</span>
              <span>{article.readTime} MIN READ</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 space-y-4 font-mono font-bold animate-pulse">
              <div className="h-4 bg-slate-300 border border-black w-full" />
              <div className="h-4 bg-slate-300 border border-black w-5/6" />
              <div className="h-4 bg-slate-300 border border-black w-4/6" />
            </div>
          ) : (
            <div
              className={`prose-custom font-sans font-medium text-slate-900 ${fontClasses[fontSize]}`}
              dangerouslySetInnerHTML={{
                __html: fullArticleData?.content || article.summary || '<p>No content available.</p>',
              }}
            />
          )}

          <div className="pt-8 border-t-4 border-black flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <p className="text-xs font-bold text-black uppercase">
              READING FROM <strong className="bg-yellow-300 px-1 border border-black">{article.company.name}</strong>
            </p>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-black text-black bg-white hover:bg-yellow-200 border-2 border-black shadow-[3px_3px_0px_0px_#000] uppercase flex items-center gap-1.5"
            >
              <span>Open on {article.company.name}</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[3]" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

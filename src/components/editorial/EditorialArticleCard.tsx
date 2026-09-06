'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatRelativeDate } from '@/lib/utils';

interface EditorialArticleCardProps {
  article: ArticleItem;
  layoutMode: 'grid' | 'list';
  themeMode: 'paper' | 'night';
  onOpenReader: (article: ArticleItem) => void;
  onToggleBookmark: (articleId: string, markAsBookmarked?: boolean) => Promise<void>;
  onToggleRead?: (articleId: string) => Promise<void>;
}

export const EditorialArticleCard: React.FC<EditorialArticleCardProps> = ({
  article,
  layoutMode,
  themeMode,
  onOpenReader,
  onToggleBookmark,
  onToggleRead,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isRead, setIsRead] = useState(article.isRead || false);
  const [isTogglingRead, setIsTogglingRead] = useState(false);

  React.useEffect(() => {
    setIsBookmarked(article.isBookmarked || false);
  }, [article.isBookmarked]);

  React.useEffect(() => {
    setIsRead(article.isRead || false);
  }, [article.isRead]);

  const isNight = themeMode === 'night';

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarking(true);
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      await onToggleBookmark(article.id, nextState);
    } catch (err) {
      setIsBookmarked(!nextState);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleReadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleRead) return;
    setIsTogglingRead(true);
    const nextState = !isRead;
    setIsRead(nextState);

    try {
      await onToggleRead(article.id);
    } catch (err) {
      setIsRead(!nextState);
    } finally {
      setIsTogglingRead(false);
    }
  };

  // Compact List View Layout
  if (layoutMode === 'list') {
    return (
      <article
        onClick={() => onOpenReader(article)}
        className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isNight
            ? 'bg-[#18191c] border-stone-800 hover:bg-[#202226]'
            : 'bg-white border-stone-200 hover:border-stone-400 hover:bg-stone-50/70 shadow-sm'
        }`}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-serif font-bold ${
                isNight ? 'text-amber-400' : 'text-amber-900'
              }`}
            >
              {article.company.name}
            </span>
            <span className={isNight ? 'text-stone-700' : 'text-stone-300'}>•</span>
            <span className={`text-[11px] font-sans ${isNight ? 'text-stone-400' : 'text-stone-600 font-medium'}`}>
              {formatRelativeDate(article.publishedAt)}
            </span>
          </div>

          <h3
            className={`text-base font-serif font-bold leading-snug transition-colors ${
              isNight
                ? 'text-stone-100 group-hover:text-amber-400'
                : 'text-slate-900 group-hover:text-amber-900'
            }`}
          >
            {article.title}
          </h3>

          <p className={`text-xs font-sans line-clamp-2 ${isNight ? 'text-stone-400' : 'text-slate-700'}`}>
            {article.summary}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {article.tags && article.tags.length > 0 && (
            <span
              className={`hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-sans font-semibold rounded-md border ${
                isNight
                  ? 'bg-stone-800 text-stone-300 border-stone-700'
                  : 'bg-stone-100 text-slate-800 border-stone-300'
              }`}
            >
              {article.tags[0]}
            </span>
          )}

          <span className={`text-xs font-sans flex items-center gap-1 ${isNight ? 'text-stone-400' : 'text-stone-600 font-medium'}`}>
            <Clock className="w-3 h-3" />
            {article.readTime} min
          </span>

          <button
            onClick={handleBookmarkClick}
            disabled={isBookmarking}
            className={`p-1.5 rounded-lg transition-all ${
              isBookmarked
                ? isNight
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                : isNight
                ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? (isNight ? 'fill-amber-400' : 'fill-amber-900') : ''}`} />
          </button>
        </div>
      </article>
    );
  }

  // Grid Card Layout
  return (
    <article
      onClick={() => onOpenReader(article)}
      className={`group p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
        isNight
          ? 'bg-[#18191c] border-stone-800 hover:border-stone-700 hover:bg-[#1d1f23]'
          : 'bg-white border-stone-200 hover:border-stone-400 hover:bg-stone-50/50 shadow-sm hover:shadow-md'
      }`}
    >
      <div>
        {/* Header Metadata */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-7 h-7 rounded-lg object-cover bg-stone-100 border border-stone-200/80"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span
                className={`text-xs font-serif font-bold block leading-tight ${
                  isNight ? 'text-amber-400' : 'text-amber-900'
                }`}
              >
                {article.company.name}
              </span>
              <span
                className={`text-[10px] font-sans block truncate ${
                  isNight ? 'text-stone-400' : 'text-stone-600 font-medium'
                }`}
              >
                {article.company.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onToggleRead && (
              <button
                onClick={handleReadClick}
                disabled={isTogglingRead}
                className={`p-2 rounded-xl transition-all ${
                  isRead
                    ? isNight
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isNight
                    ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title={isRead ? 'Mark as Unread' : 'Mark as Read'}
              >
                <CheckCircle2 className={`w-4 h-4 ${isRead ? (isNight ? 'text-emerald-400' : 'text-emerald-700') : ''}`} />
              </button>
            )}

            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? isNight
                    ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                  : isNight
                  ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? (isNight ? 'fill-amber-400' : 'fill-amber-900') : ''}`} />
            </button>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`p-2 rounded-xl transition-all ${
                isNight
                  ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
              title="Open Original Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Headline - FULL TITLE UNTRIMMED */}
        <h3
          className={`text-base font-serif font-bold leading-snug mb-2.5 transition-colors ${
            isNight
              ? 'text-stone-100 group-hover:text-amber-400'
              : 'text-slate-950 group-hover:text-amber-900'
          }`}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        <p
          className={`text-xs font-sans line-clamp-3 leading-relaxed mb-4 ${
            isNight ? 'text-stone-300' : 'text-slate-700 font-normal'
          }`}
        >
          {article.summary}
        </p>
      </div>

      {/* Footer Info */}
      <div
        className={`pt-3.5 border-t flex flex-col gap-2.5 font-sans ${
          isNight ? 'border-stone-800' : 'border-stone-200'
        }`}
      >
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                  isNight
                    ? 'bg-stone-800 text-stone-300 border-stone-700'
                    : 'bg-stone-100 text-slate-800 border-stone-300'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className={`flex items-center justify-between text-[11px] font-sans ${isNight ? 'text-stone-400' : 'text-stone-600 font-medium'}`}>
          <span className="flex items-center gap-1">
            <Clock className={`w-3 h-3 ${isNight ? 'text-stone-400' : 'text-stone-500'}`} />
            {article.readTime} min read
          </span>
          <span>{formatRelativeDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
};

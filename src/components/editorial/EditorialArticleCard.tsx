'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatRelativeDate } from '@/lib/utils';

interface EditorialArticleCardProps {
  article: ArticleItem;
  layoutMode: 'grid' | 'list';
  themeMode: 'paper' | 'night';
  onOpenReader: (article: ArticleItem) => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const EditorialArticleCard: React.FC<EditorialArticleCardProps> = ({
  article,
  layoutMode,
  themeMode,
  onOpenReader,
  onToggleBookmark,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const isNight = themeMode === 'night';

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarking(true);
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      await onToggleBookmark(article.id);
    } catch (err) {
      setIsBookmarked(!nextState);
    } finally {
      setIsBookmarking(false);
    }
  };

  // Compact List View Layout
  if (layoutMode === 'list') {
    return (
      <article
        onClick={() => onOpenReader(article)}
        className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isNight
            ? 'bg-[#18191c] border-stone-800/80 hover:bg-[#202226]'
            : 'bg-[#fcfbf9] border-stone-200/90 hover:bg-stone-100/70 shadow-sm'
        }`}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif font-bold text-amber-700 dark:text-amber-400">
              {article.company.name}
            </span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span className="text-[11px] font-sans text-stone-500">
              {formatRelativeDate(article.publishedAt)}
            </span>
          </div>

          <h3 className="text-base font-serif font-bold group-hover:text-amber-800 dark:group-hover:text-amber-400 leading-snug line-clamp-1 transition-colors">
            {article.title}
          </h3>

          <p className="text-xs font-sans text-stone-500 line-clamp-1">
            {article.summary}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {article.tags && article.tags.length > 0 && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-sans font-medium rounded-md bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {article.tags[0]}
            </span>
          )}

          <span className="text-xs text-stone-400 font-sans flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {article.readTime} min
          </span>

          <button
            onClick={handleBookmarkClick}
            disabled={isBookmarking}
            className={`p-1.5 rounded-lg transition-all ${
              isBookmarked
                ? 'bg-amber-600/20 text-amber-600'
                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/50'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600' : ''}`} />
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
          ? 'bg-[#18191c] border-stone-800/80 hover:border-stone-700 hover:bg-[#1d1f23]'
          : 'bg-[#fcfbf9] border-stone-200/90 hover:border-stone-300 hover:bg-white shadow-sm hover:shadow-md'
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
                className="w-7 h-7 rounded-lg object-cover bg-stone-100 border border-stone-200/60"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-serif font-bold text-amber-800 dark:text-amber-400 block truncate">
                {article.company.name}
              </span>
              <span className="text-[10px] text-stone-400 font-sans block truncate">
                {article.company.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? 'bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/50'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-700 dark:fill-amber-400' : ''}`} />
            </button>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-all"
              title="Open Original Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Headline */}
        <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 leading-snug line-clamp-2 mb-2.5 transition-colors">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs font-sans text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed mb-4">
          {article.summary}
        </p>
      </div>

      {/* Footer Info */}
      <div className="pt-3.5 border-t border-stone-200/60 dark:border-stone-800 flex flex-col gap-2.5 font-sans">
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium bg-stone-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-stone-400" />
            {article.readTime} min read
          </span>
          <span>{formatRelativeDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
};

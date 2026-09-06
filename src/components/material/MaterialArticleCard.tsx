'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatRelativeDate } from '@/lib/utils';

interface MaterialArticleCardProps {
  article: ArticleItem;
  onOpenReader: (article: ArticleItem) => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const MaterialArticleCard: React.FC<MaterialArticleCardProps> = ({
  article,
  onOpenReader,
  onToggleBookmark,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked || false);
  const [isBookmarking, setIsBookmarking] = useState(false);

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

  return (
    <article
      onClick={() => onOpenReader(article)}
      className="group bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-out relative overflow-hidden"
    >
      <div>
        {/* Header Badges & Actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-8 h-8 rounded-full object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block leading-tight">
                {article.company.name}
              </span>
              <span className="text-[10px] font-medium text-slate-500 block truncate">
                {article.company.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking}
              className={`p-2 rounded-full transition-all ${
                isBookmarked
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-700' : ''}`} />
            </button>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
              title="Open Original Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-2.5">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4 font-normal">
          {article.summary}
        </p>
      </div>

      {/* Footer Info & Tags */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-2.5">
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-slate-500" />
            {article.readTime} min read
          </span>
          <span>{formatRelativeDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
};

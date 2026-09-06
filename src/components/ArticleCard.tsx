'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink, BookOpen, Building2, CheckCircle2, Check } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  summary: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  isBookmarked?: boolean;
  isRead?: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    category: string;
    websiteUrl: string;
  };
}

interface ArticleCardProps {
  article: ArticleItem;
  onOpenReader: (article: ArticleItem) => void;
  onToggleBookmark: (articleId: string, markAsBookmarked?: boolean) => Promise<void>;
  onToggleRead?: (articleId: string) => Promise<void>;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
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

  return (
    <article
      onClick={() => onOpenReader(article)}
      className={`group glass-card rounded-2xl p-5 flex flex-col justify-between cursor-pointer border relative overflow-hidden transition-all ${
        isRead
          ? 'border-slate-800/50 opacity-75 hover:opacity-100 hover:border-emerald-500/40 bg-slate-900/40'
          : 'border-slate-800/80 hover:border-indigo-500/40'
      }`}
    >
      {/* Top Company Badge & Actions */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          {/* Company Tag */}
          <div className="flex items-center gap-2.5 min-w-0">
            {article.company.logoUrl ? (
              <img
                src={article.company.logoUrl}
                alt={article.company.name}
                className="w-7 h-7 rounded-lg object-cover bg-slate-800 border border-slate-700/60"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {article.company.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate block">
                  {article.company.name}
                </span>
                {isRead && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md">
                    Read
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                {article.company.category}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onToggleRead && (
              <button
                onClick={handleReadClick}
                disabled={isTogglingRead}
                className={`p-2 rounded-xl transition-all ${
                  isRead
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 border border-transparent'
                }`}
                title={isRead ? 'Mark as Unread' : 'Mark as Read'}
              >
                <CheckCircle2 className={`w-4 h-4 ${isRead ? 'text-emerald-400' : ''}`} />
              </button>
            )}

            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking}
              className={`p-2 rounded-xl transition-all ${
                isBookmarked
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-indigo-400' : ''}`} />
            </button>
            
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-all"
              title="Open Original Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug mb-2.5">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
          {article.summary}
        </p>
      </div>

      {/* Footer Info: Tags, Published Date & Read Time */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-2.5">
        {/* Tech tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium bg-slate-900/90 text-slate-300 border border-slate-800 rounded-md"
              >
                {tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                +{article.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{article.readTime} min read</span>
          </div>
          <span>{formatRelativeDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
};

'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink, ArrowUpRight } from 'lucide-react';
import { ArticleItem } from '../ArticleCard';
import { formatRelativeDate } from '@/lib/utils';

interface BrutalistArticleCardProps {
  article: ArticleItem;
  onOpenReader: (article: ArticleItem) => void;
  onToggleBookmark: (articleId: string) => Promise<void>;
}

export const BrutalistArticleCard: React.FC<BrutalistArticleCardProps> = ({
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
      className="group bg-white border-4 border-black p-5 flex flex-col justify-between cursor-pointer shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] transition-all font-mono"
    >
      <div>
        {/* Header Badges & Company Tag */}
        <div className="flex items-center justify-between gap-3 mb-3.5 border-b-2 border-black pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-yellow-300 text-black border border-black shadow-[1px_1px_0px_0px_#000]">
              {article.company.name}
            </span>
            <span className="text-[10px] font-bold text-slate-600 truncate">
              {article.company.category}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleBookmarkClick}
              disabled={isBookmarking}
              className={`p-1.5 border-2 border-black font-bold transition-all ${
                isBookmarked
                  ? 'bg-pink-400 text-white shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-slate-100 text-black hover:bg-yellow-200 shadow-[1px_1px_0px_0px_#000]'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
            >
              <Bookmark className={`w-3.5 h-3.5 stroke-[3] ${isBookmarked ? 'fill-white' : ''}`} />
            </button>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 bg-slate-100 text-black hover:bg-cyan-300 border-2 border-black shadow-[1px_1px_0px_0px_#000] transition-all"
              title="Open Original Post"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[3]" />
            </a>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-black text-black group-hover:underline underline-offset-4 leading-tight mb-2.5 uppercase">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed mb-4 font-sans font-medium">
          {article.summary}
        </p>
      </div>

      {/* Footer Info & Tags */}
      <div className="pt-3 border-t-2 border-black flex flex-col gap-2.5">
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.2 text-[10px] font-black bg-cyan-200 text-black border border-black uppercase"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-bold text-black pt-1">
          <span className="bg-slate-100 px-1.5 border border-black flex items-center gap-1">
            <Clock className="w-3 h-3 stroke-[3]" />
            {article.readTime}M READ
          </span>
          <span className="uppercase text-[10px] bg-lime-200 px-1.5 border border-black">
            {formatRelativeDate(article.publishedAt)}
          </span>
        </div>
      </div>
    </article>
  );
};

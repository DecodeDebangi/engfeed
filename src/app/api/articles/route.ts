import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { getVisitorId } from '@/lib/visitor';
import { ENGINEERING_ONLY } from '@/lib/article-filters';

export const dynamic = 'force-dynamic';


/**
 * Add this visitor's bookmarks and read marks to a page of articles. The list itself is the same
 * for everyone, so it can be cached once rather than per visitor.
 */
async function withVisitorState<T extends { data: { id: string }[] }>(payload: T, userId: string) {
  const articleIds = payload.data.map((article) => article.id);
  const where = { userId, articleId: { in: articleIds } };
  const select = { articleId: true };
  const [bookmarks, reads] = await Promise.all([
    db.userBookmark.findMany({ where, select }),
    db.userRead.findMany({ where, select }),
  ]);
  const bookmarked = new Set(bookmarks.map((bookmark) => bookmark.articleId));
  const read = new Set(reads.map((entry) => entry.articleId));

  return {
    ...payload,
    data: payload.data.map((article) => ({
      ...article,
      isBookmarked: bookmarked.has(article.id),
      isRead: read.has(article.id),
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const companySlug = searchParams.get('company') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
    const userId = getVisitorId(request);
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';
    const showAllKinds = searchParams.get('kinds') === 'all';

    // Construct Redis Cache Key based on query params
    const cacheKey = `api:articles:p${page}:l${limit}:c${companySlug || 'all'}:t${tag || 'all'}:s${search || 'none'}:sort${sort}:k${showAllKinds}`;

    // Check Redis cache first (skip for bookmarked query to guarantee instant updates)
    if (!bookmarkedOnly) {
      try {
        const cached = await redis?.get(cacheKey);
        if (cached) {
          return NextResponse.json(await withVisitorState(JSON.parse(cached), userId), {
            headers: {
              'X-Cache': 'HIT',
              'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
          });
        }
      } catch (cacheErr) {
        console.warn('Redis cache read warning:', cacheErr);
      }
    }

    const skip = (page - 1) * limit;

    // Build Prisma filter clauses
    const whereClause: any = {};

    if (companySlug) {
      whereClause.company = { slug: companySlug };
    }

    if (tag) {
      whereClause.tags = { has: tag };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (bookmarkedOnly) {
      whereClause.bookmarks = {
        some: { userId },
      };
    }

    // Hide non-engineering posts by default, but never something the user searched for or saved.
    // Unclassified articles stay visible, so the feed still works without an LLM.
    if (!showAllKinds && !search && !bookmarkedOnly) {
      whereClause.AND = [ENGINEERING_ONLY];
    }

    // Query DB for articles and total count
    const [articles, totalCount] = await Promise.all([
      db.article.findMany({
        where: whereClause,
        orderBy: { publishedAt: sort },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          url: true,
          summary: true,
          publishedAt: true,
          readTime: true,
          tags: true,
          kind: true,
          viewsCount: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              category: true,
              websiteUrl: true,
            },
          },
        },
      }),
      db.article.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const responsePayload = {
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Store in Redis cache for 60 seconds (skip for bookmarked query)
    if (!bookmarkedOnly) {
      try {
        await redis?.setex(cacheKey, 60, JSON.stringify(responsePayload));
      } catch (cacheErr) {
        console.warn('Redis cache write warning:', cacheErr);
      }
    }

    return NextResponse.json(await withVisitorState(responsePayload, userId), {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles', details: error.message },
      { status: 500 }
    );
  }
}

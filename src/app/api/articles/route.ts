import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const companySlug = searchParams.get('company') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
    const userId = searchParams.get('userId') || 'default-user';
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';

    // Construct Redis Cache Key based on query params
    const cacheKey = `api:articles:p${page}:l${limit}:c${companySlug || 'all'}:t${tag || 'all'}:s${search || 'none'}:sort${sort}:bm${bookmarkedOnly}:u${userId}`;

    // Check Redis cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'public, max-age=60, s-maxage=120',
          },
        });
      }
    } catch (cacheErr) {
      console.warn('Redis cache read warning:', cacheErr);
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
          bookmarks: {
            where: { userId },
            select: { id: true },
          },
          reads: {
            where: { userId },
            select: { id: true },
          },
        },
      }),
      db.article.count({ where: whereClause }),
    ]);

    // Format response payload
    const formattedArticles = articles.map((art) => ({
      ...art,
      isBookmarked: art.bookmarks.length > 0,
      isRead: art.reads.length > 0,
      bookmarks: undefined,
      reads: undefined,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const responsePayload = {
      success: true,
      data: formattedArticles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Store in Redis cache for 60 seconds
    try {
      await redis.setex(cacheKey, 60, JSON.stringify(responsePayload));
    } catch (cacheErr) {
      console.warn('Redis cache write warning:', cacheErr);
    }

    return NextResponse.json(responsePayload, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
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

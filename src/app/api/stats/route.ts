import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'api:stats:global';

    try {
      const cached = await redis?.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    } catch (cacheErr) {
      console.warn('Redis read warning:', cacheErr);
    }

    const [totalArticles, classifiedArticles, totalCompanies, latestArticle, categoriesGroup] = await Promise.all([
      db.article.count(),
      db.article.count({ where: { kind: { not: null } } }),
      db.company.count(),
      db.article.findFirst({
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      }),
      db.company.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
    ]);

    const categories = categoriesGroup.map((c) => ({
      name: c.category,
      companiesCount: c._count._all,
    }));

    const payload = {
      success: true,
      stats: {
        totalArticles,
        classifiedArticles,
        totalCompanies,
        lastSyncedAt: latestArticle?.publishedAt || new Date(),
        categories,
      },
    };

    try {
      await redis?.setex(cacheKey, 120, JSON.stringify(payload));
    } catch (cacheErr) {
      console.warn('Redis write warning:', cacheErr);
    }

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}

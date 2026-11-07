import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'api:companies:list';

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

    const companies = await db.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        rssUrl: true,
        websiteUrl: true,
        category: true,
        description: true,
        updatedAt: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    const formatted = companies.map(c => ({
      ...c,
      articlesCount: c._count.articles,
      _count: undefined,
    }));

    const responsePayload = {
      success: true,
      data: formatted,
    };

    try {
      await redis?.setex(cacheKey, 300, JSON.stringify(responsePayload));
    } catch (cacheErr) {
      console.warn('Redis write warning:', cacheErr);
    }

    return NextResponse.json(responsePayload, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies', details: error.message },
      { status: 500 }
    );
  }
}

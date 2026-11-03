import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVisitorId } from '@/lib/visitor';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const userId = getVisitorId(request);

    const bookmarks = await db.userBookmark.findMany({
      where: { userId },
      include: {
        article: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                category: true,
              },
            },
            reads: {
              where: { userId },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const articles = bookmarks.map((b) => ({
      ...b.article,
      isBookmarked: true,
      isRead: (b.article as any).reads?.length > 0,
      reads: undefined,
      bookmarkedAt: b.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: articles,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching user bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookmarks', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, markAsBookmarked } = body;
    const userId = getVisitorId(request);

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'articleId parameter is required' },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check existing bookmark
    const existing = await db.userBookmark.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    let isBookmarked = false;

    if (typeof markAsBookmarked === 'boolean') {
      if (markAsBookmarked) {
        if (!existing) {
          await db.userBookmark.create({
            data: { userId, articleId },
          });
        }
        isBookmarked = true;
      } else {
        if (existing) {
          await db.userBookmark.delete({
            where: { id: existing.id },
          });
        }
        isBookmarked = false;
      }
    } else {
      if (existing) {
        // Remove bookmark
        await db.userBookmark.delete({
          where: { id: existing.id },
        });
        isBookmarked = false;
      } else {
        // Create bookmark
        await db.userBookmark.create({
          data: {
            userId,
            articleId,
          },
        });
        isBookmarked = true;
      }
    }

    return NextResponse.json(
      {
        success: true,
        bookmarked: isBookmarked,
        articleId,
        message: isBookmarked ? 'Article bookmarked successfully' : 'Article bookmark removed',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle bookmark', details: error.message },
      { status: 500 }
    );
  }
}

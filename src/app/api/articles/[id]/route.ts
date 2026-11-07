import { NextRequest, NextResponse } from 'next/server';
import { getVisitorId } from '@/lib/visitor';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = getVisitorId(request);
    const { id: articleId } = await params;

    // Find article by id or slug
    const article = await db.article.findFirst({
      where: {
        OR: [{ id: articleId }, { slug: articleId }],
      },
      include: {
        company: true,
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
        reads: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Increment view count asynchronously
    db.article.update({
      where: { id: article.id },
      data: { viewsCount: { increment: 1 } },
    }).catch(err => console.warn('View count increment error:', err));

    return NextResponse.json({
      success: true,
      data: {
        ...article,
        isBookmarked: article.bookmarks.length > 0,
        isRead: article.reads.length > 0,
        bookmarks: undefined,
        reads: undefined,
      },
    });
  } catch (error: any) {
    console.error('Error fetching article detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article detail', details: error.message },
      { status: 500 }
    );
  }
}

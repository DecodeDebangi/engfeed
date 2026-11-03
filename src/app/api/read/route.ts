import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVisitorId } from '@/lib/visitor';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, markAsRead } = body;
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

    // Check existing read status
    const existing = await db.userRead.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    let isRead = false;

    if (markAsRead === true) {
      if (!existing) {
        await db.userRead.create({
          data: { userId, articleId },
        });
      }
      isRead = true;
    } else if (markAsRead === false) {
      if (existing) {
        await db.userRead.delete({
          where: { id: existing.id },
        });
      }
      isRead = false;
    } else {
      // Toggle logic
      if (existing) {
        await db.userRead.delete({
          where: { id: existing.id },
        });
        isRead = false;
      } else {
        await db.userRead.create({
          data: { userId, articleId },
        });
        isRead = true;
      }
    }

    return NextResponse.json(
      {
        success: true,
        isRead,
        articleId,
        message: isRead ? 'Article marked as read' : 'Article marked as unread',
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error toggling read status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update read status', details: error.message },
      { status: 500 }
    );
  }
}

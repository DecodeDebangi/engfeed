import { NextRequest, NextResponse } from 'next/server';
import { syncAllFeeds, syncCompanyFeed } from '@/lib/ingestion';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get('key');
    const adminKey = process.env.ADMIN_API_KEY || 'engfeed_secret_admin_key_2026';

    const providedKey = authHeader ? authHeader.replace('Bearer ', '').trim() : keyParam;

    // Secure authorization check
    if (providedKey !== adminKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Admin API Key' },
        { status: 401 }
      );
    }

    const companyId = searchParams.get('companyId');

    let results;
    if (companyId) {
      const res = await syncCompanyFeed(companyId);
      results = [res];
    } else {
      results = await syncAllFeeds();
    }

    const totalNewArticles = results.reduce((acc, curr) => acc + curr.newArticlesInserted, 0);

    return NextResponse.json({
      success: true,
      message: 'RSS sync triggered and completed successfully',
      stats: {
        totalFeedsProcessed: results.length,
        totalNewArticlesInserted: totalNewArticles,
      },
      details: results,
    });
  } catch (error: any) {
    console.error('Error triggering RSS sync:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger RSS sync', details: error.message },
      { status: 500 }
    );
  }
}

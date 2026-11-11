import { NextRequest } from 'next/server';
import { buildRssFeed, RSS_HEADERS } from '@/lib/rss-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const xml = await buildRssFeed({ siteUrl: origin, selfUrl: `${origin}/feed.xml` });
  return new Response(xml, { headers: RSS_HEADERS });
}

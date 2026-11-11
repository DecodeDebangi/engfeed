import { NextRequest } from 'next/server';
import { buildRssFeed, RSS_HEADERS } from '@/lib/rss-feed';
import { TECH_TAGS } from '@/lib/rss-parser';
import { topicSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// /feed/databases.xml: the engineering feed for one topic
export async function GET(request: NextRequest, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const tag = TECH_TAGS.find((t) => `${topicSlug(t)}.xml` === topic);
  if (!tag) {
    return new Response(`Unknown topic. Try one of: ${TECH_TAGS.map((t) => `${topicSlug(t)}.xml`).join(', ')}`, {
      status: 404,
    });
  }

  const { origin } = new URL(request.url);
  const xml = await buildRssFeed({ siteUrl: origin, selfUrl: `${origin}/feed/${topic}`, tag });
  return new Response(xml, { headers: RSS_HEADERS });
}

import { db } from './db';
import { ENGINEERING_ONLY } from './article-filters';

const FEED_SIZE = 50;

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

/**
 * An RSS 2.0 feed of the latest engineering posts, optionally for one topic
 */
export async function buildRssFeed({ siteUrl, selfUrl, tag }: { siteUrl: string; selfUrl: string; tag?: string }) {
  const articles = await db.article.findMany({
    where: { AND: [ENGINEERING_ONLY, ...(tag ? [{ tags: { has: tag } }] : [])], publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: 'desc' },
    take: FEED_SIZE,
    select: {
      id: true,
      title: true,
      url: true,
      summary: true,
      publishedAt: true,
      tags: true,
      company: { select: { name: true, websiteUrl: true } },
    },
  });

  const title = tag ? `EngFeed: ${tag}` : 'EngFeed: engineering posts';
  const description = `The latest ${tag ? `${tag} ` : ''}posts from 80 company engineering blogs, with announcements, hiring and marketing filtered out.`;

  const items = articles
    .map(
      (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <guid isPermaLink="false">${article.id}</guid>
      <pubDate>${article.publishedAt.toUTCString()}</pubDate>
      <source url="${escapeXml(article.company.websiteUrl)}">${escapeXml(article.company.name)}</source>
      <description>${escapeXml(article.summary)}</description>
${article.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join('\n')}
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// Vercel's CDN caches the feed, so readers polling it don't wake the database every time
export const RSS_HEADERS = {
  'Content-Type': 'application/rss+xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
};

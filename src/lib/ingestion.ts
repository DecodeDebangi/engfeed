import { FeedStatus } from '@prisma/client';
import { db } from './db';
import { redis } from './redis';
import { discoverFeed } from './feed-discovery';
import { parseFeed } from './rss-parser';

export interface IngestionResult {
  companyName: string;
  totalParsed: number;
  newArticlesInserted: number;
  skippedDuplicates: number;
  error?: string;
}

// Consecutive failed polls before a feed counts as broken rather than temporarily down
const BROKEN_FEED_THRESHOLD = 5;

/**
 * Invalidate Redis API caches after articles change
 */
export async function invalidateArticleCache() {
  try {
    const keys = await redis.keys('api:articles:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (cacheErr) {
    console.warn('Redis cache invalidation warning:', cacheErr);
  }
}

/**
 * Ingest and sync articles for a single company feed.
 * Throws if the feed can't be fetched; callers decide when that counts as a failed poll.
 */
export async function syncCompanyFeed(companyId: string): Promise<IngestionResult> {
  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return {
      companyName: 'Unknown',
      totalParsed: 0,
      newArticlesInserted: 0,
      skippedDuplicates: 0,
      error: 'Company not found',
    };
  }

  if (company.feedStatus === FeedStatus.RETIRED) {
    return {
      companyName: company.name,
      totalParsed: 0,
      newArticlesInserted: 0,
      skippedDuplicates: 0,
      error: 'Feed is retired',
    };
  }

  console.log(`📡 Polling RSS feed for ${company.name} (${company.rssUrl})...`);
  const feed = await parseFeed(company.rssUrl, {
    etag: company.etag,
    lastModified: company.lastModified,
  });
  const fetchedAt = new Date();
  const healthyFeed = {
    feedStatus: FeedStatus.ACTIVE,
    consecutiveFailures: 0,
    lastError: null,
    suggestedRssUrl: null,
    lastFetchedAt: fetchedAt,
    lastSuccessAt: fetchedAt,
  };

  if (feed.notModified) {
    await db.company.update({ where: { id: company.id }, data: healthyFeed });
    return {
      companyName: company.name,
      totalParsed: 0,
      newArticlesInserted: 0,
      skippedDuplicates: 0,
    };
  }

  const parsedArticles = feed.articles;
  let newInserted = 0;
  let skippedDuplicates = 0;
  let insertErrors = 0;

  for (const article of parsedArticles) {
    try {
      // Check if article already exists by URL or guidHash
      const existing = await db.article.findFirst({
        where: {
          OR: [{ url: article.url }, { guidHash: article.guidHash }],
        },
      });

      if (existing) {
        skippedDuplicates++;
        continue;
      }

      await db.article.create({
        data: {
          companyId: company.id,
          title: article.title,
          slug: article.slug,
          url: article.url,
          guidHash: article.guidHash,
          summary: article.summary,
          content: article.content,
          publishedAt: article.publishedAt,
          readTime: article.readTime,
          tags: article.tags,
        },
      });

      newInserted++;
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint violation (duplicate link/hash)
        skippedDuplicates++;
      } else {
        insertErrors++;
        console.error(`⚠️ Error inserting article "${article.title}" for ${company.name}:`, err.message);
      }
    }
  }

  // Keep the old cache headers if an insert failed, so the next poll gets the full feed and retries it
  await db.company.update({
    where: { id: company.id },
    data: {
      ...healthyFeed,
      ...(insertErrors === 0 ? { etag: feed.etag, lastModified: feed.lastModified } : {}),
    },
  });

  if (newInserted > 0) {
    await invalidateArticleCache();
  }

  return {
    companyName: company.name,
    totalParsed: parsedArticles.length,
    newArticlesInserted: newInserted,
    skippedDuplicates,
  };
}

/**
 * Record a failed poll, marking the feed as failing or, after repeated failures, broken
 */
export async function recordFeedFailure(companyId: string, message: string): Promise<string> {
  const company = await db.company.update({
    where: { id: companyId },
    data: {
      consecutiveFailures: { increment: 1 },
      lastError: message,
      lastFetchedAt: new Date(),
    },
    select: { name: true, consecutiveFailures: true, websiteUrl: true, rssUrl: true, rssUrlPinned: true },
  });

  await db.company.update({
    where: { id: companyId },
    data: {
      feedStatus: company.consecutiveFailures >= BROKEN_FEED_THRESHOLD ? FeedStatus.BROKEN : FeedStatus.FAILING,
    },
  });

  if (company.consecutiveFailures === BROKEN_FEED_THRESHOLD) {
    await rediscoverFeed(companyId, company);
  }

  return company.name;
}

/**
 * Look for a replacement when a feed breaks. A discovered feed is switched automatically;
 * a pinned one was chosen by hand, so the replacement is only suggested.
 */
async function rediscoverFeed(
  companyId: string,
  company: { name: string; websiteUrl: string; rssUrl: string; rssUrlPinned: boolean }
) {
  const found = await discoverFeed(company.websiteUrl);
  if (!found || found === company.rssUrl) return;

  try {
    if (company.rssUrlPinned) {
      await db.company.update({ where: { id: companyId }, data: { suggestedRssUrl: found } });
      console.log(`💡 ${company.name}: its pinned feed is broken. Possible replacement: ${found}`);
    } else {
      await db.company.update({
        where: { id: companyId },
        data: { rssUrl: found, etag: null, lastModified: null },
      });
      console.log(`🔁 ${company.name}: switched to rediscovered feed ${found}`);
    }
  } catch (err: any) {
    if (err.code !== 'P2002') throw err;
    console.warn(`⚠️ ${company.name}: rediscovered feed ${found} already belongs to another company`);
  }
}

/**
 * Sync one feed without retries: a failure is recorded and reported in the result instead of thrown
 */
export async function syncCompanyFeedOnce(companyId: string): Promise<IngestionResult> {
  try {
    return await syncCompanyFeed(companyId);
  } catch (err: any) {
    console.error(`❌ Failed to sync feed for company ${companyId}:`, err.message);
    return {
      companyName: await recordFeedFailure(companyId, err.message),
      totalParsed: 0,
      newArticlesInserted: 0,
      skippedDuplicates: 0,
      error: err.message,
    };
  }
}

/**
 * Ingest and sync all company feeds stored in the database
 */
export async function syncAllFeeds(): Promise<IngestionResult[]> {
  const companies = await db.company.findMany({
    where: { feedStatus: { not: FeedStatus.RETIRED } },
    select: { id: true },
  });

  console.log(`🚀 Starting batch RSS ingestion for ${companies.length} engineering blogs...`);

  const results: IngestionResult[] = [];

  for (const company of companies) {
    results.push(await syncCompanyFeedOnce(company.id));
  }

  const totalNew = results.reduce((acc, curr) => acc + curr.newArticlesInserted, 0);
  console.log(`✅ Batch sync finished! ${totalNew} new articles stored across ${companies.length} blogs.`);

  return results;
}

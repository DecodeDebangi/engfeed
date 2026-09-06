import { db } from './db';
import { redis } from './redis';
import { parseFeed } from './rss-parser';

export interface IngestionResult {
  companyName: string;
  totalParsed: number;
  newArticlesInserted: number;
  skippedDuplicates: number;
  error?: string;
}

/**
 * Ingest and sync articles for a single company feed
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

  console.log(`📡 Polling RSS feed for ${company.name} (${company.rssUrl})...`);
  const parsedArticles = await parseFeed(company.rssUrl);

  let newInserted = 0;
  let skippedDuplicates = 0;

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
        console.error(`⚠️ Error inserting article "${article.title}" for ${company.name}:`, err.message);
      }
    }
  }

  // Update company updatedAt timestamp
  await db.company.update({
    where: { id: company.id },
    data: { updatedAt: new Date() },
  });

  // Invalidate Redis API caches when new articles are inserted
  if (newInserted > 0) {
    try {
      const keys = await redis.keys('api:articles:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (cacheErr) {
      console.warn('Redis cache invalidation warning:', cacheErr);
    }
  }

  return {
    companyName: company.name,
    totalParsed: parsedArticles.length,
    newArticlesInserted: newInserted,
    skippedDuplicates,
  };
}

/**
 * Ingest and sync all company feeds stored in the database
 */
export async function syncAllFeeds(): Promise<IngestionResult[]> {
  const companies = await db.company.findMany({
    select: { id: true, name: true },
  });

  console.log(`🚀 Starting batch RSS ingestion for ${companies.length} engineering blogs...`);

  const results: IngestionResult[] = [];

  for (const company of companies) {
    try {
      const res = await syncCompanyFeed(company.id);
      results.push(res);
    } catch (err: any) {
      results.push({
        companyName: company.name,
        totalParsed: 0,
        newArticlesInserted: 0,
        skippedDuplicates: 0,
        error: err.message,
      });
    }
  }

  const totalNew = results.reduce((acc, curr) => acc + curr.newArticlesInserted, 0);
  console.log(`✅ Batch sync finished! ${totalNew} new articles stored across ${companies.length} blogs.`);

  return results;
}

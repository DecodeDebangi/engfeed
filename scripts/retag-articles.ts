import { db } from '../src/lib/db';
import { redis } from '../src/lib/redis';
import { cleanHtmlContent, extractTechTags } from '../src/lib/rss-parser';

const BATCH_SIZE = 500;

// Recompute keyword tags after the tagging rules change. Articles the LLM has classified keep their tags.
async function main() {
  let cursor: string | undefined;
  let total = 0;
  let changed = 0;

  while (true) {
    const articles = await db.article.findMany({
      where: { kind: null },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, title: true, content: true, tags: true },
    });
    if (articles.length === 0) break;

    for (const article of articles) {
      const tags = extractTechTags(article.title, cleanHtmlContent(article.content).cleanText);
      if (tags.join() !== article.tags.join()) {
        await db.article.update({ where: { id: article.id }, data: { tags } });
        changed++;
      }
    }

    total += articles.length;
    cursor = articles[articles.length - 1].id;
    console.log(`🏷️ Processed ${total} articles (${changed} changed)...`);
  }

  const keys = (await redis?.keys('api:*')) ?? [];
  if (keys.length > 0) await redis?.del(...keys);

  console.log(`✅ Retagged ${changed} of ${total} articles.`);
}

main()
  .catch((e) => {
    console.error('❌ Retag failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

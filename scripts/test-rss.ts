import { syncAllFeeds } from '../src/lib/ingestion';
import { db } from '../src/lib/db';

async function main() {
  console.log('🧪 Testing EngFeed RSS Ingestion Worker on Live Feeds...');

  const startTime = Date.now();
  const results = await syncAllFeeds();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n========================================`);
  console.log(`⏱️ Ingestion finished in ${duration} seconds`);
  console.log(`========================================\n`);

  const totalArticles = await db.article.count();
  const companies = await db.company.count();

  console.log(`📊 Current Database Stats:`);
  console.log(`- Total Companies: ${companies}`);
  console.log(`- Total Ingested Articles: ${totalArticles}\n`);

  // Sample sample articles
  const sampleArticles = await db.article.findMany({
    take: 5,
    orderBy: { publishedAt: 'desc' },
    include: { company: true },
  });

  console.log('📰 Top 5 Latest Ingested Articles:');
  sampleArticles.forEach((art, idx) => {
    console.log(`\n${idx + 1}. [${art.company.name}] ${art.title}`);
    console.log(`   URL: ${art.url}`);
    console.log(`   Read Time: ${art.readTime} min | Tags: [${art.tags.join(', ')}]`);
    console.log(`   Published: ${art.publishedAt.toISOString()}`);
    console.log(`   Summary: ${art.summary.substring(0, 100)}...`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

import { db } from '../src/lib/db';

// Report feeds that are failing, plus healthy feeds with no recent posts
const STALE_AFTER_DAYS = 180;

async function main() {
  const companies = await db.company.findMany({
    orderBy: [{ consecutiveFailures: 'desc' }, { name: 'asc' }],
    include: { articles: { take: 1, orderBy: { publishedAt: 'desc' }, select: { publishedAt: true } } },
  });

  const staleBefore = Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const retired = companies.filter((company) => company.feedStatus === 'RETIRED');
  const unhealthy = companies.filter((company) => company.feedStatus === 'FAILING' || company.feedStatus === 'BROKEN');
  const stale = companies.filter((company) => {
    const latest = company.articles[0]?.publishedAt;
    return company.feedStatus === 'ACTIVE' && (!latest || latest.getTime() < staleBefore);
  });
  const neverPolled = companies.filter((company) => !company.lastFetchedAt);

  console.log(`📊 ${companies.length} feeds: ${companies.length - unhealthy.length - retired.length} active, ${unhealthy.length} failing or broken, ${retired.length} retired, ${neverPolled.length} not polled yet\n`);

  console.log('❌ Failing or broken:');
  for (const company of unhealthy) {
    console.log(`- [${company.feedStatus}] ${company.name} (${company.consecutiveFailures}x): ${company.lastError}\n  ${company.rssUrl}`);
    if (company.suggestedRssUrl) console.log(`  💡 Possible replacement: ${company.suggestedRssUrl}`);
  }

  console.log(`\n💤 Active, but nothing published in ${STALE_AFTER_DAYS} days:`);
  for (const company of stale) {
    const latest = company.articles[0]?.publishedAt;
    console.log(`- ${company.name}: ${latest ? latest.toISOString().slice(0, 10) : 'no articles'}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Feed health report failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

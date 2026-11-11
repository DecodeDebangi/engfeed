import { classifyPendingArticles } from '../src/lib/classifier';
import { db } from '../src/lib/db';
import { fetchMissingBodies } from '../src/lib/full-text';
import { syncAllFeeds } from '../src/lib/ingestion';

// One scheduled pass, run by GitHub Actions: sync every feed, fetch article text for excerpt-only posts,
// then classify what's pending.
// This replaces the long-running worker on hosts like Vercel that can't keep one alive.
async function main() {
  const results = await syncAllFeeds();
  const failed = results.filter((result) => result.error);
  console.log(`📡 ${results.length} feeds polled, ${failed.length} failed.`);
  for (const result of failed) {
    console.log(`- ${result.companyName}: ${result.error}`);
  }

  const bodies = await fetchMissingBodies();
  console.log(
    `📄 Article text: ${bodies.improved} fetched, ${bodies.noGain} no longer than the feed, ${bodies.blocked} blocked by robots.txt, ${bodies.failed} failed, ${bodies.remaining} still to do.`
  );

  const classified = await classifyPendingArticles();
  console.log(`🧠 Classified ${classified.classified} articles (${classified.invalid} unusable answers, ${classified.remaining} still pending).`);
  if (classified.stoppedBecause) console.log(`⏸️ Stopped early: ${classified.stoppedBecause}`);
}

main()
  .catch((e) => {
    console.error('❌ Scheduled run failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

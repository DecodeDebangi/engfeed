import { db } from '../src/lib/db';
import { fetchMissingBodies } from '../src/lib/full-text';

// Usage: npm run fetch-bodies -- [max articles]. Fetches article text for excerpt-only posts.
async function main() {
  const limit = process.argv[2] ? Number(process.argv[2]) : undefined;
  const startTime = Date.now();
  const result = await fetchMissingBodies({ limit });
  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `📄 ${result.improved} fetched, ${result.noGain} no longer than the feed, ${result.blocked} blocked by robots.txt, ${result.failed} failed in ${seconds}s; ${result.remaining} still to do.`
  );
}

main()
  .catch((e) => {
    console.error('❌ Fetching article text failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

import { classifyPendingArticles } from '../src/lib/classifier';
import { db } from '../src/lib/db';

// Usage: npm run classify -- [max articles]. Picks up where the last run stopped, so it's safe to re-run.
async function main() {
  const limit = process.argv[2] ? Number(process.argv[2]) : undefined;
  const startTime = Date.now();
  const result = await classifyPendingArticles({ limit });
  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`🧠 Classified ${result.classified} articles in ${seconds}s (${result.invalid} unusable answers, ${result.remaining} still pending).`);
  if (result.stoppedBecause) console.log(`⏸️ Stopped early: ${result.stoppedBecause}`);
}

main()
  .catch((e) => {
    console.error('❌ Classification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

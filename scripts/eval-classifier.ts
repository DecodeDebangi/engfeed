import fs from 'fs';
import path from 'path';
import { classifyBatch, Classification } from '../src/lib/classifier';

// Scores the configured LLM against hand-labelled real articles. Nothing is written to the database.
interface GoldArticle {
  company: string;
  title: string;
  excerpt: string;
  kind: string;
  debatable: boolean;
}

const gold: GoldArticle[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), process.argv[2] || 'scripts/classifier-gold.json'), 'utf8'));
const batchSize = Number(process.env.LLM_BATCH_SIZE) || 1;

async function main() {
  const predictions: (Classification | null)[] = [];
  const startTime = Date.now();

  for (let i = 0; i < gold.length; i += batchSize) {
    const batch = gold.slice(i, i + batchSize);
    const results = await classifyBatch(batch.map(({ company, title, excerpt }) => ({ company, title, excerpt }))).catch((err) => {
      console.error(`\n⚠️ ${err.message}`);
      return batch.map(() => null);
    });
    predictions.push(...results);
    process.stdout.write(`\r${predictions.length}/${gold.length}`);
  }

  const seconds = (Date.now() - startTime) / 1000;
  const scored = gold.map((article, i) => ({ ...article, predicted: predictions[i]?.kind ?? null, tags: predictions[i]?.tags ?? [] }));
  const accuracy = (rows: typeof scored) => `${rows.filter((r) => r.predicted === r.kind).length}/${rows.length}`;

  const engineering = scored.filter((r) => r.kind === 'ENGINEERING');
  const wronglyHidden = engineering.filter((r) => r.predicted !== 'ENGINEERING' && r.predicted !== null);
  const shown = scored.filter((r) => r.predicted === 'ENGINEERING');
  const wronglyShown = shown.filter((r) => r.kind !== 'ENGINEERING');

  console.log(`\n\n⏱️ ${seconds.toFixed(0)}s, ${(seconds / gold.length).toFixed(1)}s per article (batch size ${batchSize})`);
  console.log(`🎯 Exact kind: ${accuracy(scored)} overall, ${accuracy(scored.filter((r) => !r.debatable))} excluding debatable labels`);
  console.log(`🙈 Engineering posts wrongly hidden: ${wronglyHidden.length}/${engineering.length}`);
  console.log(`📣 Shown as engineering but aren't: ${wronglyShown.length}/${shown.length}`);
  console.log(`❓ Unusable answers: ${scored.filter((r) => r.predicted === null).length}`);

  console.log('\nDisagreements:');
  for (const r of scored.filter((row) => row.predicted !== row.kind)) {
    console.log(`- ${r.debatable ? '(debatable) ' : ''}label ${r.kind} / model ${r.predicted}: ${r.title.substring(0, 70)}`);
  }

  console.log('\nSample tags:');
  for (const r of scored.slice(0, 12)) {
    console.log(`- [${r.tags.join(', ')}] ${r.title.substring(0, 60)}`);
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Eval failed:', e.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));

import fs from 'fs';
import path from 'path';
import { classifyBatch, Classification } from '../src/lib/classifier';
import { db } from '../src/lib/db';
import { fetchArticleText } from '../src/lib/full-text';

// Scores the configured LLM against labelled real articles. Nothing is written to the database.
// Usage: npm run eval:classify -- [file] [--full-text]. With --full-text, excerpt-only posts are given the
// start of their article page, as the classifier now sees them; fetched text is cached in .cache/.
interface GoldArticle {
  company: string;
  title: string;
  excerpt: string;
  kind: string;
  debatable: boolean;
}

const args = process.argv.slice(2);
const useFullText = args.includes('--full-text');
const goldFile = args.find((arg) => !arg.startsWith('--')) || 'scripts/classifier-gold.json';
const gold: GoldArticle[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), goldFile), 'utf8'));
const EXCERPT_CHARS = 1500;
const CACHE_FILE = path.join(process.cwd(), '.cache/eval-bodies.json');

/**
 * The text the classifier would see for a gold article once its page has been fetched
 */
async function withFullText(articles: GoldArticle[]): Promise<{ inputs: string[]; fetched: number }> {
  const cache: Record<string, string | null> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
  let fetched = 0;
  const inputs: string[] = [];

  for (const article of articles) {
    if (!(article.title in cache)) {
      const stored = await db.article.findFirst({ where: { title: article.title }, select: { url: true, content: true } });
      const result = stored && stored.content.length < 1500 ? await fetchArticleText(stored.url) : null;
      cache[article.title] = result?.text && result.text.length >= article.excerpt.length + 200 ? result.text : null;
    }
    const text = cache[article.title];
    if (text) fetched++;
    inputs.push((text ?? article.excerpt).substring(0, EXCERPT_CHARS));
  }

  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  return { inputs, fetched };
}
const batchSize = Number(process.env.LLM_BATCH_SIZE) || 1;

async function main() {
  const predictions: (Classification | null)[] = [];
  const { inputs, fetched } = useFullText ? await withFullText(gold) : { inputs: gold.map((g) => g.excerpt), fetched: 0 };
  if (useFullText) console.log(`📄 Full article text used for ${fetched} of ${gold.length} articles`);
  const startTime = Date.now();

  for (let i = 0; i < gold.length; i += batchSize) {
    const batch = gold.slice(i, i + batchSize);
    const results = await classifyBatch(batch.map(({ company, title }, j) => ({ company, title, excerpt: inputs[i + j] }))).catch((err) => {
      console.error(`\n⚠️ ${err.message}`);
      return batch.map(() => null);
    });
    predictions.push(...results);
    process.stdout.write(`\r${predictions.length}/${gold.length}`);
  }

  const seconds = (Date.now() - startTime) / 1000;
  const scored = gold.map((article, i) => ({
    ...article,
    predicted: predictions[i]?.kind ?? null,
    confident: predictions[i]?.confident ?? false,
    tags: predictions[i]?.tags ?? [],
  }));
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

  // What the site actually hides: only posts confidently labelled as something other than engineering
  const isHidden = (r: (typeof scored)[number]) => r.predicted !== null && r.predicted !== 'ENGINEERING' && r.confident;
  const hiddenEngineering = engineering.filter(isHidden);
  const visible = scored.filter((r) => !isHidden(r));
  console.log(`\nWith the confidence rule (hide only confident non-engineering labels), ${scored.filter((r) => r.predicted && !r.confident).length} answers unsure:`);
  console.log(`🙈 Engineering posts hidden: ${hiddenEngineering.length}/${engineering.length}${hiddenEngineering.length ? ` (${hiddenEngineering.filter((r) => r.debatable).length} debatable)` : ''}`);
  console.log(`📣 Visible posts that aren't engineering: ${visible.filter((r) => r.kind !== 'ENGINEERING').length}/${visible.length}`);
  console.log(`🔒 Non-engineering posts hidden: ${scored.filter((r) => r.kind !== 'ENGINEERING' && isHidden(r)).length}/${scored.filter((r) => r.kind !== 'ENGINEERING').length}`);

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
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

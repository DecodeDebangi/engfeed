import http from 'http';
import { AddressInfo } from 'net';
import { classifyBatch, classifyPendingArticles } from '../src/lib/classifier';
import { db } from '../src/lib/db';

const TEST_SLUG = 'test-classify-temp-feed';

// Stands in for the LLM. Runs are scoped to a temporary company, so real articles are never touched.
type Mode = 'good' | 'fenced' | 'garbage' | 'unknown-values' | 'rate-limited' | 'overloaded' | 'server-error';
let mode: Mode = 'good';

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    if (mode === 'rate-limited' || mode === 'overloaded' || mode === 'server-error') {
      res.writeHead(mode === 'rate-limited' ? 429 : mode === 'overloaded' ? 503 : 500);
      res.end('{}');
      return;
    }
    const { posts } = JSON.parse(JSON.parse(raw).messages[1].content);
    const json = JSON.stringify({
      results: posts.map((post: { i: number }) =>
              mode === 'unknown-values'
                ? { i: post.i, kind: 'NONSENSE', tags: ['Databases'] }
                : { i: post.i, kind: 'ANNOUNCEMENT', tags: ['Databases', 'Made Up Tag', 'Databases'] }
            ),
    });
    const content = mode === 'garbage' ? 'Sorry, I cannot do that.' : mode === 'fenced' ? `Here you go:\n\`\`\`json\n${json}\n\`\`\`` : json;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
});

let failures = 0;

function check(name: string, passed: boolean, detail?: unknown) {
  if (!passed) failures++;
  console.log(`${passed ? '✅' : '❌'} ${name}${passed ? '' : ` -> ${JSON.stringify(detail)}`}`);
}

async function main() {
  await db.company.deleteMany({ where: { slug: TEST_SLUG } });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  const { id: companyId } = await db.company.create({
    data: {
      name: 'Test Classify Temp Feed',
      slug: TEST_SLUG,
      rssUrl: `http://127.0.0.1:${port}/feed`,
      websiteUrl: 'https://test-classify.invalid',
      category: 'Test',
    },
  });
  await db.article.create({
    data: {
      companyId,
      title: 'A test post',
      slug: 'test-classify-post',
      url: 'https://test-classify.invalid/post',
      guidHash: 'test-classify-post',
      summary: 'Summary',
      content: '<p>Body</p>',
      publishedAt: new Date(),
      tags: ['Engineering'],
    },
  });
  const article = () => db.article.findFirstOrThrow({ where: { companyId } });
  const run = () => classifyPendingArticles({ companyId });

  try {
    delete process.env.LLM_MODEL;
    let result = await run();
    check('without LLM_MODEL the run skips and says why', result.classified === 0 && result.stoppedBecause === 'LLM_MODEL is not set', result);

    process.env.LLM_MODEL = 'test-model';
    process.env.LLM_BATCH_SIZE = '1';
    process.env.LLM_MIN_INTERVAL_MS = '0';
    process.env.LLM_BASE_URL = `http://127.0.0.1:${port}`;

    mode = 'rate-limited';
    result = await run();
    let state = await article();
    check('HTTP 429 stops the run and says why', result.stoppedBecause === 'Rate limit or quota reached (HTTP 429)', result);
    check('HTTP 429 does not count against the article', state.classifyAttempts === 0 && state.kind === null, state);

    mode = 'overloaded';
    result = await run();
    state = await article();
    check('HTTP 503 stops the run and says why', result.stoppedBecause?.startsWith('HTTP 503') === true, result);
    check('HTTP 503 does not count against the article', state.classifyAttempts === 0 && state.kind === null, state);

    mode = 'server-error';
    result = await run();
    state = await article();
    check('HTTP 500 counts against the article without stopping the run', result.invalid === 3 && !result.stoppedBecause && state.classifyAttempts === 3, { result, state });
    await db.article.updateMany({ where: { companyId }, data: { classifyAttempts: 0 } });

    // Five articles, all failing with a 500: the run must give up rather than burn every article's attempts
    const extraIds = await Promise.all(
      Array.from({ length: 7 }, (_, i) =>
        db.article.create({
          data: {
            companyId,
            title: `Extra ${i}`,
            slug: `test-classify-extra-${i}`,
            url: `https://test-classify.invalid/extra-${i}`,
            guidHash: `test-classify-extra-${i}`,
            summary: 'Summary',
            content: '<p>Body</p>',
            publishedAt: new Date(),
            tags: [],
          },
        })
      )
    );
    result = await run();
    check('repeated failures stop the run and say why', result.stoppedBecause === '5 batches in a row gave no usable answer' && result.invalid === 5, result);
    await db.article.deleteMany({ where: { id: { in: extraIds.map((extra) => extra.id) } } });
    await db.article.updateMany({ where: { companyId }, data: { classifyAttempts: 0 } });

    process.env.LLM_BASE_URL = 'http://127.0.0.1:1';
    result = await run();
    check('an unreachable LLM stops the run', result.stoppedBecause?.startsWith('Could not reach') === true, result);
    process.env.LLM_BASE_URL = `http://127.0.0.1:${port}`;

    mode = 'garbage';
    result = await run();
    state = await article();
    check('non-JSON answers count as unusable', result.invalid >= 1 && state.kind === null, { result, state });

    mode = 'unknown-values';
    const [unknown] = await classifyBatch([{ company: 'c', title: 't', excerpt: 'e' }]);
    check('an unknown kind is rejected', unknown === null, unknown);

    mode = 'fenced';
    const [fenced] = await classifyBatch([{ company: 'c', title: 't', excerpt: 'e' }]);
    check('an answer wrapped in a code fence still parses', fenced?.kind === 'ANNOUNCEMENT', fenced);

    mode = 'good';
    const [good] = await classifyBatch([{ company: 'c', title: 't', excerpt: 'e' }]);
    check('unknown tags are dropped and duplicates removed', good?.tags.join() === 'Databases', good);

    await db.article.updateMany({ where: { companyId }, data: { classifyAttempts: 0 } });
    result = await run();
    state = await article();
    check('a good answer is stored', state.kind === 'ANNOUNCEMENT' && state.tags.join() === 'Databases' && !!state.classifiedAt, state);
    check('a classified article is not pending', result.remaining === 0, result);

    await db.article.updateMany({ where: { companyId }, data: { kind: null, classifyAttempts: 0 } });
    mode = 'garbage';
    for (let i = 0; i < 3; i++) await run();
    result = await run();
    check('an article stops being retried after three unusable answers', result.classified + result.invalid === 0 && result.remaining === 0, result);
  } finally {
    await db.company.delete({ where: { id: companyId } });
    server.close();
  }

  console.log(failures === 0 ? '\n✅ All classifier checks passed' : `\n❌ ${failures} classifier checks failed`);
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    failures++;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

import http from 'http';
import { AddressInfo } from 'net';
import { db } from '../src/lib/db';
import { fetchMissingBodies } from '../src/lib/full-text';

const TEST_SLUG = 'test-full-text-temp-feed';
const PARAGRAPH = 'We moved our queue from Redis lists to Postgres and measured the effect on tail latency under load. ';
const PAGES: Record<string, { type: string; body: string; status?: number }> = {
  '/robots.txt': { type: 'text/plain', body: 'User-agent: *\nDisallow: /private/\n' },
  '/long': {
    type: 'text/html',
    body: `<html><head><title>Long post</title><script>globalThis.ran = 1; var secret = "SCRIPT-TEXT";</script></head>
      <body><nav>Home | Blog | Careers</nav><article><h1>Moving our queue</h1>${`<p>${PARAGRAPH.repeat(4)}</p>`.repeat(20)}</article>
      <footer>© Example Inc</footer></body></html>`,
  },
  '/short': { type: 'text/html', body: '<html><body><article><p>Short.</p></article></body></html>' },
  '/private/post': { type: 'text/html', body: `<html><body><article><p>${PARAGRAPH.repeat(40)}</p></article></body></html>` },
  '/data.json': { type: 'application/json', body: '{"not":"html"}' },
};

const server = http.createServer((req, res) => {
  const page = PAGES[req.url ?? ''];
  if (!page) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(page.status ?? 200, { 'Content-Type': page.type });
  res.end(page.body);
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
  const base = `http://127.0.0.1:${port}`;

  const { id: companyId } = await db.company.create({
    data: { name: 'Test Full Text Temp Feed', slug: TEST_SLUG, rssUrl: `${base}/feed`, websiteUrl: base, category: 'Test' },
  });
  const make = (path: string, content = '<p>Excerpt only.</p>') =>
    db.article.create({
      data: {
        companyId,
        title: path,
        slug: `test-full-text${path.replace(/\W/g, '-')}`,
        url: `${base}${path}`,
        guidHash: `test-full-text${path}`,
        summary: 'Excerpt only.',
        content,
        publishedAt: new Date(),
        tags: [],
        classifierVersion: 2,
      },
    });
  const long = await make('/long');
  const short = await make('/short');
  const blocked = await make('/private/post');
  const missing = await make('/missing');
  const json = await make('/data.json');
  const alreadyFull = await make('/long?full', `<p>${PARAGRAPH.repeat(30)}</p>`);
  const get = (id: string) => db.article.findUniqueOrThrow({ where: { id } });

  try {
    const first = await fetchMissingBodies({ companyId });
    check('one run reports each outcome', first.improved === 1 && first.blocked === 1 && first.failed === 1 && first.noGain === 2, first);

    const longState = await get(long.id);
    check('a long page gives article text, capped at 4,000 characters', !!longState.bodyText && longState.bodyText.length > 1000 && longState.bodyText.length <= 4000, longState.bodyText?.length);
    check('the text is the article, without scripts, navigation or footer', !!longState.bodyText?.startsWith('Moving our queue') && !/SCRIPT-TEXT|Careers|Example Inc/.test(longState.bodyText ?? ''), longState.bodyText?.slice(0, 80));
    check('a post with new text is queued to be classified again', longState.classifierVersion === 0 && !!longState.bodyFetchedAt, longState.classifierVersion);

    const shortState = await get(short.id);
    check('a page no longer than the feed keeps no text and is not retried', !shortState.bodyText && !!shortState.bodyFetchedAt && shortState.classifierVersion === 2, shortState);
    const blockedState = await get(blocked.id);
    check('a page disallowed by robots.txt is not fetched or retried', !blockedState.bodyText && !!blockedState.bodyFetchedAt, blockedState);
    const jsonState = await get(json.id);
    check('a non-HTML response is skipped', !jsonState.bodyText && !!jsonState.bodyFetchedAt, jsonState);
    const missingState = await get(missing.id);
    check('a failed fetch is retried later', missingState.bodyFetchAttempts === 1 && !missingState.bodyFetchedAt, missingState);
    const fullState = await get(alreadyFull.id);
    check('a post whose feed already has the full text is left alone', !fullState.bodyFetchedAt && fullState.bodyFetchAttempts === 0, fullState);

    await fetchMissingBodies({ companyId });
    const third = await fetchMissingBodies({ companyId });
    check('a failing page is given up on after two tries', third.failed === 0 && third.remaining === 0 && (await get(missing.id)).bodyFetchAttempts === 2, third);
  } finally {
    await db.company.delete({ where: { id: companyId } });
    server.close();
  }

  console.log(failures === 0 ? '\n✅ All full-text checks passed' : `\n❌ ${failures} full-text checks failed`);
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

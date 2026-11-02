import http from 'http';
import { AddressInfo } from 'net';
import { Queue } from 'bullmq';
import { db } from '../src/lib/db';
import { createRssWorker, rssQueue } from '../src/lib/queue';
import { redis } from '../src/lib/redis';
import { discoverFeed, findLogo } from '../src/lib/feed-discovery';
import { syncCompanyFeedOnce } from '../src/lib/ingestion';

const TEST_SLUG = 'test-sync-temp-feed';
const TEST_QUEUE_NAME = 'rss-ingestion-test-queue';
const ETAG = '"test-etag-v1"';
const FEED_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title>
  <item>
    <title>Scaling Postgres</title>
    <link>https://test-sync.invalid/scaling-postgres</link>
    <guid>test-sync-1</guid>
    <pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate>
    <description>A test post.</description>
  </item>
</channel></rss>`;

type Mode = 'ok' | 'error' | 'not-a-feed';
let mode: Mode = 'ok';
let requests: http.IncomingMessage[] = [];

const server = http.createServer((req, res) => {
  requests.push(req);
  if (req.url === '/site') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><head>
      <link rel="alternate" type="application/rss+xml" href="/comments/feed">
      <link rel="alternate" type="application/rss+xml" href="/moved-feed">
      <link rel="icon" href="/icon.png">
    </head></html>`);
  } else if (req.url === '/icon.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end('png');
  } else if (req.url === '/broken-feed') {
    res.writeHead(404);
    res.end();
  } else if (req.url === '/moved-feed' || req.url === '/comments/feed') {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
    res.end(FEED_XML);
  } else if (mode === 'error') {
    res.writeHead(500);
    res.end();
  } else if (mode === 'not-a-feed') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html><body>Blog has moved</body></html>');
  } else if (req.headers['if-none-match'] === ETAG) {
    res.writeHead(304);
    res.end();
  } else {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml', ETag: ETAG });
    res.end(FEED_XML);
  }
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

  const { id } = await db.company.create({
    data: {
      name: 'Test Sync Temp Feed',
      slug: TEST_SLUG,
      rssUrl: `http://127.0.0.1:${port}/feed`,
      websiteUrl: 'https://test-sync.invalid',
      category: 'Test',
    },
  });
  const company = () => db.company.findUniqueOrThrow({ where: { id } });

  try {
    const first = await syncCompanyFeedOnce(id);
    let state = await company();
    check('first poll inserts the article', first.newArticlesInserted === 1, first);
    check('first poll stores the ETag and marks the feed active', state.etag === ETAG && state.feedStatus === 'ACTIVE' && !!state.lastSuccessAt, state);

    requests = [];
    const second = await syncCompanyFeedOnce(id);
    check('second poll sends If-None-Match', requests[0]?.headers['if-none-match'] === ETAG, requests[0]?.headers);
    check('304 response parses nothing and is not an error', second.totalParsed === 0 && !second.error, second);

    mode = 'error';
    const failed = await syncCompanyFeedOnce(id);
    state = await company();
    check('HTTP 500 is reported in the result', failed.error === 'HTTP 500 Internal Server Error', failed);
    check('HTTP 500 marks the feed failing', state.feedStatus === 'FAILING' && state.consecutiveFailures === 1, state);

    mode = 'not-a-feed';
    const notFeed = await syncCompanyFeedOnce(id);
    check('an HTML page with status 200 counts as a failure', !!notFeed.error, notFeed);

    mode = 'ok';
    await syncCompanyFeedOnce(id);
    state = await company();
    check('recovery resets the feed to active', state.feedStatus === 'ACTIVE' && state.consecutiveFailures === 0 && state.lastError === null, state);

    mode = 'error';
    for (let i = 0; i < 5; i++) await syncCompanyFeedOnce(id);
    state = await company();
    check('five failures in a row mark the feed broken', state.feedStatus === 'BROKEN' && state.consecutiveFailures === 5, state);

    mode = 'ok';
    await syncCompanyFeedOnce(id);

    // A feed moves: the old URL fails, and the site's page advertises a new one
    const siteUrl = `http://127.0.0.1:${port}/site`;
    const brokenUrl = `http://127.0.0.1:${port}/broken-feed`;
    const movedUrl = `http://127.0.0.1:${port}/moved-feed`;
    const breakFeed = async (rssUrlPinned: boolean) => {
      await db.company.update({
        where: { id },
        data: { websiteUrl: siteUrl, rssUrl: brokenUrl, rssUrlPinned, suggestedRssUrl: null, consecutiveFailures: 0, feedStatus: 'ACTIVE' },
      });
      for (let i = 0; i < 5; i++) await syncCompanyFeedOnce(id);
      return company();
    };

    state = await breakFeed(true);
    check('a broken pinned feed keeps its URL and gets a suggestion', state.rssUrl === brokenUrl && state.suggestedRssUrl === movedUrl, state);

    state = await breakFeed(false);
    check('a broken discovered feed switches to the new URL', state.rssUrl === movedUrl && !state.etag, state);

    const recovered = await syncCompanyFeedOnce(id);
    state = await company();
    check('the switched feed then recovers', !recovered.error && state.feedStatus === 'ACTIVE' && state.suggestedRssUrl === null, { recovered, state });

    const page = await discoverFeed(siteUrl);
    check('discovery ignores comment feeds', page === movedUrl, page);
    const logo = await findLogo(siteUrl);
    check('discovery finds the site icon', logo === `http://127.0.0.1:${port}/icon.png`, logo);
    check('discovery returns null when there is no feed', (await discoverFeed(`http://127.0.0.1:1/nothing`)) === null);

    await db.company.update({ where: { id }, data: { feedStatus: 'RETIRED' } });
    requests = [];
    const retired = await syncCompanyFeedOnce(id);
    check('a retired feed is not fetched', requests.length === 0 && retired.error === 'Feed is retired', retired);

    await db.company.update({ where: { id }, data: { feedStatus: 'ACTIVE', rssUrl: `http://127.0.0.1:${port}/feed`, etag: null, consecutiveFailures: 0 } });
    mode = 'error';

    console.log('\n⏳ Running a failing job through the real worker (about 15s of retry backoff)...');
    // Its own queue, so a real scheduled sync coming due can't poll this feed and skew the counts
    const testQueue = new Queue(TEST_QUEUE_NAME, { connection: redis, defaultJobOptions: rssQueue.defaultJobOptions });
    const worker = createRssWorker(TEST_QUEUE_NAME);
    requests = [];
    const job = await testQueue.add('sync-single-feed', { companyId: id }, { jobId: `test-sync-${Date.now()}` });
    await new Promise<void>((resolve) => {
      worker.on('failed', (failedJob) => {
        if (failedJob && failedJob.id === job.id && failedJob.attemptsMade >= 3) resolve();
      });
    });
    await worker.close();
    state = await company();
    check('worker retries a failing feed three times', requests.length === 3, requests.length);
    check('those retries count as one failed poll', state.consecutiveFailures === 1, state.consecutiveFailures);
    await testQueue.obliterate({ force: true });
    await testQueue.close();
  } finally {
    await db.company.delete({ where: { id } });
    server.close();
  }

  console.log(failures === 0 ? '\n✅ All sync checks passed' : `\n❌ ${failures} sync checks failed`);
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

import { GET as getArticles } from '../src/app/api/articles/route';
import { GET as getArticleById } from '../src/app/api/articles/[id]/route';
import { GET as getCompanies } from '../src/app/api/companies/route';
import { GET as getBookmarks, POST as toggleBookmark } from '../src/app/api/bookmarks/route';
import { POST as triggerSync } from '../src/app/api/admin/trigger-sync/route';
import { GET as getStats } from '../src/app/api/stats/route';
import { GET as getFeed } from '../src/app/feed.xml/route';
import { GET as getTopicFeed } from '../src/app/feed/[topic]/route';
import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';
import { redis } from '../src/lib/redis';

// Exercises the API routes against temporary blogs and articles, so it works on an empty database
// and never touches real data.
const RUN = Date.now().toString(36);
const ACTIVE_SLUG = `test-api-${RUN}`;
const RETIRED_SLUG = `test-api-retired-${RUN}`;
const BASE = 'http://localhost:3000';

let failures = 0;

function check(name: string, passed: boolean, detail?: unknown) {
  if (!passed) failures++;
  console.log(`${passed ? '✅' : '❌'} ${name}${passed ? '' : ` -> ${JSON.stringify(detail)}`}`);
}

const get = (path: string, visitor?: string) =>
  new NextRequest(`${BASE}${path}`, visitor ? { headers: { cookie: `engfeed_visitor=${visitor}` } } : undefined);

async function main() {
  // Header counts and the blog list are cached; clear them so the temporary blogs are seen
  await redis?.del('api:stats:global', 'api:companies:list');

  const statsBefore = await (await getStats(get('/api/stats'))).json();

  const company = await db.company.create({
    data: { name: `Test API ${RUN}`, slug: ACTIVE_SLUG, rssUrl: `https://test-api.invalid/${RUN}/feed`, websiteUrl: 'https://test-api.invalid', category: 'Test' },
  });
  const retired = await db.company.create({
    data: {
      name: `Test API retired ${RUN}`,
      slug: RETIRED_SLUG,
      rssUrl: `https://test-api.invalid/${RUN}/retired`,
      websiteUrl: 'https://test-api.invalid',
      category: 'Test',
      feedStatus: 'RETIRED',
    },
  });
  // Newest-but-not-future dates, so the posts head the RSS feed
  const article = (title: string, kind: 'ENGINEERING' | 'ANNOUNCEMENT' | null, minutesAgo: number, summary = `${title} summary`) =>
    db.article.create({
      data: {
        companyId: company.id,
        title: `${title} ${RUN}`,
        slug: `test-api-${title.toLowerCase().replace(/\W+/g, '-')}-${RUN}`,
        url: `https://test-api.invalid/${RUN}/${title.toLowerCase().replace(/\W+/g, '-')}`,
        guidHash: `test-api-${title}-${RUN}`,
        summary,
        content: `<p>${title} body</p>`,
        publishedAt: new Date(Date.now() - minutesAgo * 60_000),
        tags: ['Databases'],
        kind,
      },
    });
  const engineering = await article('Engineering post', 'ENGINEERING', 1);
  const announcement = await article('Announcement post', 'ANNOUNCEMENT', 2);
  const unclassified = await article('Unclassified post', null, 3);
  // For search: one mentions caching in its title, the other only in its summary
  const cachingTitle = await article('How we built a caching layer', 'ENGINEERING', 600);
  const cachingSummary = await article('Weekly roundup', 'ENGINEERING', 5, 'Notes on caching, queues and other things');

  try {
    // Articles
    const list = (query: string) => getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&${query}`)).then((r) => r.json());
    const defaultList = await list('limit=10');
    const searchIds = async (q: string) => (await list(`limit=10&search=${encodeURIComponent(q)}`)).data.map((a: { id: string }) => a.id);
    const ids = (data: { data: { id: string }[] }) => data.data.map((a) => a.id).sort();
    check(
      'the feed hides posts classified as non-engineering',
      !ids(defaultList).includes(announcement.id) && [engineering, unclassified, cachingTitle, cachingSummary].every((a) => ids(defaultList).includes(a.id)),
      ids(defaultList)
    );
    check('kinds=all shows every post', (await list('limit=10&kinds=all')).data.length === 5);
    check('search shows hidden kinds too', (await list(`search=Announcement`)).data.some((a: { id: string }) => a.id === announcement.id));
    check('the newest post comes first', defaultList.data[0]?.id === engineering.id, defaultList.data[0]?.title);

    // Search
    const caching = await searchIds('caching');
    check('search finds word forms: "caching" matches title and summary', caching.length === 2, caching);
    check('search ranks a title match above a newer summary-only match', caching[0] === cachingTitle.id && caching[1] === cachingSummary.id, caching);
    check('"cached" finds the same posts as "caching"', (await searchIds('cached')).length === 2);
    check('a half-typed last word matches as a prefix', (await searchIds('caching lay')).join() === cachingTitle.id);
    check('every word must match', (await searchIds('caching kubernetes')).length === 0);
    const odd = await getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&search=${encodeURIComponent(`c++ & | ! ' "):*`)}`));
    check('search input with symbols is handled safely', odd.status === 200, odd.status);
    const symbolsOnly = await getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&search=${encodeURIComponent('!!! ***')}`));
    check('a search of only symbols returns nothing rather than an error', symbolsOnly.status === 200 && (await symbolsOnly.json()).data.length === 0);
    check('a tag filter returns only posts with that tag', (await list('limit=10&tag=Security')).data.length === 0);

    if (redis) {
      const first = await getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&limit=7`));
      const second = await getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&limit=7`));
      check('a repeated request is served from the Redis cache', first.headers.get('X-Cache') === 'MISS' && second.headers.get('X-Cache') === 'HIT');
    }

    const detail = await getArticleById(get(`/api/articles/${engineering.id}`), { params: Promise.resolve({ id: engineering.id }) });
    const detailBody = await detail.json();
    check('an article opens with its content', detail.status === 200 && detailBody.data?.content?.includes('Engineering post body'), detail.status);
    const missing = await getArticleById(get('/api/articles/nope'), { params: Promise.resolve({ id: 'nope' }) });
    check('an unknown article is a 404', missing.status === 404, missing.status);

    // Bookmarks belong to the visitor
    const save = await toggleBookmark(
      new NextRequest(`${BASE}/api/bookmarks`, {
        method: 'POST',
        body: JSON.stringify({ articleId: engineering.id, markAsBookmarked: true }),
        headers: { cookie: `engfeed_visitor=visitor-a-${RUN}` },
      })
    );
    check('a visitor can save a post', (await save.json()).bookmarked === true);
    const savedA = await (await getBookmarks(get('/api/bookmarks', `visitor-a-${RUN}`))).json();
    const savedB = await (await getBookmarks(get('/api/bookmarks', `visitor-b-${RUN}`))).json();
    check("a visitor sees their saved post, and another visitor doesn't", savedA.data.length === 1 && savedB.data.length === 0, { a: savedA.data.length, b: savedB.data.length });
    const flagged = await list('limit=10');
    const asA = await getArticles(get(`/api/articles?company=${ACTIVE_SLUG}&limit=10`, `visitor-a-${RUN}`)).then((r) => r.json());
    check('the feed marks saved posts only for the visitor who saved them', asA.data.find((a: { id: string }) => a.id === engineering.id)?.isBookmarked === true && !flagged.data.some((a: { isBookmarked: boolean }) => a.isBookmarked));

    // Blogs and header totals (reading the totals above cached them, so clear that first)
    await redis?.del('api:stats:global', 'api:companies:list');
    const companies = await (await getCompanies(get('/api/companies'))).json();
    const listed = companies.data.find((c: { slug: string }) => c.slug === ACTIVE_SLUG);
    check('the blog list includes active blogs with their article count', listed?.articlesCount === 5, listed);
    check('the blog list leaves out retired blogs', !companies.data.some((c: { slug: string }) => c.slug === RETIRED_SLUG));
    const stats = await (await getStats(get('/api/stats'))).json();
    check('the header counts active blogs only', stats.stats.totalCompanies === statsBefore.stats.totalCompanies + 1, { before: statsBefore.stats.totalCompanies, after: stats.stats.totalCompanies });

    // Admin sync
    const sync = (headers: Record<string, string>) =>
      triggerSync(new NextRequest(`${BASE}/api/admin/trigger-sync?companyId=${retired.id}`, { method: 'POST', headers }));
    const savedKey = process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_API_KEY;
    check('sync is refused when no admin key is configured', (await sync({ Authorization: 'Bearer anything' })).status === 503);
    process.env.ADMIN_API_KEY = `test-admin-key-${RUN}`;
    check('sync is refused with a wrong key', (await sync({ Authorization: 'Bearer wrong' })).status === 401);
    check('sync is refused when the key is only in the URL', (await triggerSync(new NextRequest(`${BASE}/api/admin/trigger-sync?key=test-admin-key-${RUN}`, { method: 'POST' }))).status === 401);
    const allowed = await sync({ Authorization: `Bearer test-admin-key-${RUN}` });
    check('sync runs with the right key (and skips a retired blog)', allowed.status === 200 && (await allowed.json()).details?.[0]?.error === 'Feed is retired');
    if (savedKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = savedKey;

    // RSS
    const feed = await getFeed(get('/feed.xml'));
    const xml = await feed.text();
    check('the RSS feed is served as RSS', feed.status === 200 && (feed.headers.get('content-type') ?? '').includes('application/rss+xml'));
    check('the RSS feed includes engineering posts and leaves out hidden ones', xml.includes(engineering.title) && !xml.includes(announcement.title));
    check('RSS items link to the original post', xml.includes(`<link>${engineering.url}</link>`));
    const topic = await getTopicFeed(get('/feed/databases.xml'), { params: Promise.resolve({ topic: 'databases.xml' }) });
    check('a topic feed includes posts with that topic', topic.status === 200 && (await topic.text()).includes(engineering.title));
    const unknown = await getTopicFeed(get('/feed/nope.xml'), { params: Promise.resolve({ topic: 'nope.xml' }) });
    check('an unknown topic feed is a 404', unknown.status === 404);
  } finally {
    await db.company.deleteMany({ where: { slug: { in: [ACTIVE_SLUG, RETIRED_SLUG] } } });
    await redis?.del('api:stats:global', 'api:companies:list');
  }

  console.log(failures === 0 ? '\n✅ All API checks passed' : `\n❌ ${failures} API checks failed`);
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

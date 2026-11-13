import fs from 'fs';
import path from 'path';
import { assessBlog, BlogAssessment, decide } from '../src/lib/candidates/assess';
import { blogHome, looksLikeBlogPost, siteKey } from '../src/lib/candidates/site-key';
import { LlmUnavailableError } from '../src/lib/classifier';
import { db } from '../src/lib/db';
import { discoverFeed } from '../src/lib/feed-discovery';
import { parseFeed } from '../src/lib/rss-parser';
import { loadSources } from '../src/lib/sources';

// Usage: npm run discover:candidates -- [--days 90] [--top 40]
// Finds engineering blogs worth following that aren't in sources.yaml yet, from Hacker News, Lobsters,
// links inside posts already stored, and candidate-blogs.txt. Checks the top ones for an active feed,
// asks the LLM what kind of blog each is, and suggests company engineering blogs and well-known personal
// blogs (see RULES in src/lib/candidates/assess.ts). It changes nothing; you decide what to add.
const args = process.argv.slice(2);
const option = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const DAYS = option('days', 90);
const TOP = option('top', 40);
const ACTIVE_WITHIN_DAYS = 90;
const QUALIFY_CONCURRENCY = 6;

interface Evidence {
  key: string;
  home: string;
  hnPosts: number;
  hnPoints: number;
  lobstersPosts: number;
  lobstersScore: number;
  citedBy: Set<string>;
  // Distinct posts seen on Hacker News or Lobsters; the same post shared on both counts once
  storyUrls: Set<string>;
  inCandidateList: boolean;
  examples: string[];
}

const candidates = new Map<string, Evidence>();

const normalizeStoryUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();

// Assessments are cached per blog and its newest post, so a rerun only asks about blogs that changed
const CACHE_FILE = path.join(process.cwd(), '.cache/candidate-assessments.json');
const assessmentCache: Record<string, BlogAssessment | null> = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

function note(url: string, update: (e: Evidence) => void, example?: string) {
  if (!looksLikeBlogPost(url)) return;
  const key = siteKey(url);
  if (!key) return;
  const evidence =
    candidates.get(key) ??
    { key, home: blogHome(url), hnPosts: 0, hnPoints: 0, lobstersPosts: 0, lobstersScore: 0, citedBy: new Set(), storyUrls: new Set(), inCandidateList: false, examples: [] };
  update(evidence);
  if (example && evidence.examples.length < 3 && !evidence.examples.includes(example)) evidence.examples.push(example);
  candidates.set(key, evidence);
}

async function fromHackerNews(since: number) {
  let count = 0;
  for (let page = 0; page < 10; page++) {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i>${since},points>50&hitsPerPage=100&page=${page}`,
      { signal: AbortSignal.timeout(20000) }
    ).then((r) => r.json());
    for (const hit of res.hits ?? []) {
      if (!hit.url) continue;
      count++;
      note(hit.url, (e) => {
        e.storyUrls.add(normalizeStoryUrl(hit.url));
        e.hnPosts++;
        e.hnPoints += hit.points;
      }, hit.title);
    }
    if (page >= res.nbPages - 1) break;
  }
  return count;
}

async function fromLobsters() {
  let count = 0;
  for (let page = 1; page <= 10; page++) {
    const stories = await fetch(`https://lobste.rs/page/${page}.json`, { signal: AbortSignal.timeout(20000) })
      .then((r) => r.json())
      .catch(() => []);
    for (const story of stories) {
      if (!story.url) continue;
      count++;
      note(story.url, (e) => {
        e.storyUrls.add(normalizeStoryUrl(story.url));
        e.lobstersPosts++;
        e.lobstersScore += story.score;
      }, story.title);
    }
  }
  return count;
}

async function fromStoredPosts(since: Date) {
  const articles = await db.article.findMany({
    where: { publishedAt: { gte: since }, content: { contains: 'href="http' } },
    select: { content: true, url: true, company: { select: { name: true } } },
  });
  for (const article of articles) {
    const ownKey = siteKey(article.url);
    for (const [, href] of article.content.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (siteKey(href) === ownKey) continue;
      note(href, (e) => e.citedBy.add(article.company.name));
    }
  }
  return articles.length;
}

function fromCandidateList() {
  const file = path.join(process.cwd(), 'candidate-blogs.txt');
  if (!fs.existsSync(file)) return 0;
  const urls = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const url of urls) {
    const key = siteKey(url);
    if (!key) continue;
    const evidence =
      candidates.get(key) ??
      { key, home: url.replace(/\/$/, ''), hnPosts: 0, hnPoints: 0, lobstersPosts: 0, lobstersScore: 0, citedBy: new Set(), storyUrls: new Set(), inCandidateList: false, examples: [] };
    evidence.inCandidateList = true;
    candidates.set(key, evidence);
  }
  return urls.length;
}

const score = (e: Evidence) =>
  e.hnPoints / 100 + e.lobstersScore / 20 + e.hnPosts + e.lobstersPosts + 3 * e.citedBy.size + (e.inCandidateList ? 1 : 0);

async function qualify(e: Evidence) {
  const feedUrl = (await discoverFeed(e.home)) ?? (e.home !== new URL(e.home).origin ? await discoverFeed(new URL(e.home).origin) : null);
  const none = { feedUrl, title: undefined as string | undefined, newest: null as Date | null, postsLastYear: 0, recent: [] as string[], posts: [] as { title: string; summary: string }[] };
  if (!feedUrl) return { ...none, feedUrl: null };
  try {
    const feed = await parseFeed(feedUrl);
    const articles = feed.notModified ? [] : feed.articles;
    const dates = articles.map((a) => a.publishedAt).sort((a, b) => b.getTime() - a.getTime());
    const yearAgo = Date.now() - 365 * 86400_000;
    const newestFirst = [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    return {
      feedUrl,
      title: feed.notModified ? undefined : feed.title,
      newest: dates[0] ?? null,
      postsLastYear: dates.filter((d) => d.getTime() > yearAgo).length,
      recent: newestFirst.slice(0, 3).map((a) => a.title),
      posts: newestFirst.slice(0, 10).map((a) => ({ title: a.title, summary: a.summary })),
    };
  } catch {
    return none;
  }
}

async function main() {
  const since = new Date(Date.now() - DAYS * 86400_000);
  const counts = {
    hackerNews: await fromHackerNews(Math.floor(since.getTime() / 1000)),
    lobsters: await fromLobsters(),
    storedPosts: await fromStoredPosts(since),
    candidateList: fromCandidateList(),
  };

  // Anything already followed or retired, by any of its URLs, is skipped
  const known = new Set<string>();
  const companies = await db.company.findMany({ select: { websiteUrl: true, rssUrl: true } });
  for (const url of [...companies.flatMap((c) => [c.websiteUrl, c.rssUrl]), ...loadSources().flatMap((s) => [s.websiteUrl, s.rssUrl ?? ''])]) {
    const key = siteKey(url);
    if (key) known.add(key);
  }

  const ranked = [...candidates.values()].filter((e) => !known.has(e.key)).sort((a, b) => score(b) - score(a));
  console.log(
    `Sources: ${counts.hackerNews} Hacker News stories and ${counts.lobsters} Lobsters stories from the last ${DAYS} days, links in ${counts.storedPosts} stored posts, ${counts.candidateList} URLs in candidate-blogs.txt.`
  );
  console.log(`${candidates.size} blogs found, ${candidates.size - ranked.length} already followed or retired. Checking the top ${Math.min(TOP, ranked.length)} for a working feed...\n`);

  const top = ranked.slice(0, TOP);
  const results: { e: Evidence; q: Awaited<ReturnType<typeof qualify>> }[] = [];
  const queue = [...top];
  await Promise.all(
    Array.from({ length: QUALIFY_CONCURRENCY }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) results.push({ e, q: await qualify(e) });
    })
  );
  results.sort((a, b) => score(b.e) - score(a.e));

  // Cheap checks first; the LLM is asked only about blogs that pass them
  const categories = [...new Set(loadSources().map((s) => s.category)), 'Personal Blogs'];
  const activeSince = Date.now() - ACTIVE_WITHIN_DAYS * 86400_000;
  const decided: { e: Evidence; q: (typeof results)[number]['q']; assessment: BlogAssessment | null; suggest: boolean; reason: string }[] = [];
  let llmStopped: string | undefined;

  for (const { e, q } of results) {
    if (!q.feedUrl) continue;
    const signals = {
      appearances: e.storyUrls.size,
      citedBy: e.citedBy.size,
      postsLastYear: q.postsLastYear,
      activeRecently: !!q.newest && q.newest.getTime() > activeSince,
    };
    const precheck = decide(signals, { kind: 'COMPANY_ENGINEERING', owner: '', engineeringPosts: 1, postsJudged: 1, category: '' });
    let assessment: BlogAssessment | null = null;
    const cacheKey = `${e.key}@${q.newest?.toISOString().slice(0, 10)}`;
    if (precheck.suggest && cacheKey in assessmentCache) {
      assessment = assessmentCache[cacheKey];
    } else if (precheck.suggest && !llmStopped) {
      try {
        assessment = await assessBlog({ name: q.title ?? e.key, url: e.home, posts: q.posts }, categories);
        assessmentCache[cacheKey] = assessment;
      } catch (err) {
        if (!(err instanceof LlmUnavailableError)) throw err;
        llmStopped = err.message;
      }
    }
    const verdict = precheck.suggest ? decide(signals, assessment) : precheck;
    decided.push({ e, q, assessment, ...verdict });
  }

  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(assessmentCache, null, 1));

  const describe = ({ e, q, assessment, reason }: (typeof decided)[number]) => {
    const signals = [
      e.storyUrls.size ? `${e.storyUrls.size} distinct posts on HN/Lobsters` : '',
      e.hnPosts ? `HN ${e.hnPosts} / ${e.hnPoints} pts` : '',
      e.lobstersPosts ? `Lobsters ${e.lobstersPosts} / ${e.lobstersScore} pts` : '',
      e.citedBy.size ? `cited by ${e.citedBy.size} followed blogs (${[...e.citedBy].slice(0, 3).join(', ')})` : '',
      e.inCandidateList ? 'in candidate-blogs.txt' : '',
    ].filter(Boolean).join('; ');
    console.log(`- ${assessment?.owner || q.title || e.key} | ${e.home}`);
    console.log(`    ${reason}${assessment ? ` | ${assessment.category}` : ''}`);
    console.log(`    evidence: ${signals}`);
    console.log(`    feed: ${q.feedUrl} | newest ${q.newest?.toISOString().slice(0, 10) ?? '?'} | ${q.postsLastYear} posts in the last year`);
    if (q.recent.length) console.log(`    recent: ${q.recent.map((t) => `"${t.slice(0, 60)}"`).join(' · ')}`);
  };

  const suggested = decided.filter((d) => d.suggest);
  console.log(`=== SUGGESTED (${suggested.length})`);
  suggested.forEach(describe);
  console.log(`\n=== NOT SUGGESTED (${decided.length - suggested.length})`);
  decided.filter((d) => !d.suggest).forEach(describe);
  const noFeed = results.filter((r) => !r.q.feedUrl);
  console.log(`\n=== NO FEED FOUND (${noFeed.length}): ${noFeed.map((r) => r.e.home).join(', ')}`);
  if (llmStopped) console.log(`\n⏸️ Stopped asking the LLM: ${llmStopped}. The rest are marked "not assessed"; run again later.`);

  if (suggested.length) {
    console.log('\n=== sources.yaml snippet for the suggested ones (delete any you don\'t want)');
    for (const { e, q, assessment } of suggested) {
      const slug = e.key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      console.log(`\n- name: ${q.title ?? e.key}\n  slug: ${slug}\n  websiteUrl: ${e.home}\n  category: ${assessment?.category ?? 'TODO'}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Candidate discovery failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });

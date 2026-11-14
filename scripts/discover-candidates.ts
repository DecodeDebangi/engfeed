import fs from 'fs';
import path from 'path';
import { assessBlog, BlogAssessment, decide } from '../src/lib/candidates/assess';
import { blogHome, looksLikeBlogPost, siteKey } from '../src/lib/candidates/site-key';
import { appendSources, blogSection, carryOver, entriesYaml, loadRejectedList, pullRequestBody, Suggestion, suggestionPullRequests, toSourceEntry } from '../src/lib/candidates/suggestions';
import { parse } from 'yaml';
import type { FeedSource } from '../src/lib/sources';
import { LlmUnavailableError } from '../src/lib/classifier';
import { db } from '../src/lib/db';
import { discoverFeed } from '../src/lib/feed-discovery';
import { parseFeed } from '../src/lib/rss-parser';
import { loadSources } from '../src/lib/sources';

// Usage: npm run discover:candidates -- [--days 90] [--top 40] [--apply]
// Finds engineering blogs worth following that aren't in sources.yaml yet, from Hacker News, Lobsters,
// links inside posts already stored, and candidate-blogs.txt. Checks the top ones for an active feed,
// asks the LLM what kind of blog each is, and suggests company engineering blogs and well-known personal
// blogs (see RULES in src/lib/candidates/assess.ts). Blogs in rejected-candidates.yaml, or in a closed
// suggestion PR (when GITHUB_TOKEN and GITHUB_REPOSITORY are set), are never suggested.
// It changes nothing unless --apply is given; then it adds the suggestions to sources.yaml and writes the
// pull request description to .cache/blog-suggestions.md, as the weekly suggest-blogs workflow does. If a
// suggestion PR is open, the entries still on its branch are carried over, so the new suggestions join it.
const args = process.argv.slice(2);
const option = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const DAYS = option('days', 90);
const TOP = option('top', 40);
const APPLY = args.includes('--apply');
const PR_BODY_FILE = path.join(process.cwd(), '.cache/blog-suggestions.md');
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

  // Anything already followed or retired, by any of its URLs, is skipped, and so is anything rejected
  const known = new Set<string>();
  const companies = await db.company.findMany({ select: { websiteUrl: true, rssUrl: true, slug: true } });
  for (const url of [...companies.flatMap((c) => [c.websiteUrl, c.rssUrl]), ...loadSources().flatMap((s) => [s.websiteUrl, s.rssUrl ?? ''])]) {
    const key = siteKey(url);
    if (key) known.add(key);
  }
  // An open suggestion PR's remaining entries are carried over, so they aren't suggested twice; an entry
  // deleted from its branch counts as rejected, like every blog a closed PR suggested that isn't followed
  const prs = await suggestionPullRequests();
  const carried = prs?.open ? carryOver(parse(prs.open.sourcesYaml) as FeedSource[], prs.open.body, siteKey) : { keys: [], kept: [] };
  carried.kept.forEach(({ key }) => known.add(key));
  const rejectedList = loadRejectedList();
  const rejectedInPrs = new Set([...(prs?.suggestedKeys ?? [])].filter((key) => !known.has(key)));
  const rejected = new Set([...rejectedList, ...rejectedInPrs].filter((key) => !known.has(key)));

  const ranked = [...candidates.values()].filter((e) => !known.has(e.key) && !rejected.has(e.key)).sort((a, b) => score(b) - score(a));
  console.log(
    `Sources: ${counts.hackerNews} Hacker News stories and ${counts.lobsters} Lobsters stories from the last ${DAYS} days, links in ${counts.storedPosts} stored posts, ${counts.candidateList} URLs in candidate-blogs.txt.`
  );
  console.log(
    `${candidates.size} blogs found, ${candidates.size - ranked.length} already followed, retired or rejected ` +
      `(${rejected.size} rejected: ${rejectedList.size} in rejected-candidates.yaml, ${prs ? `${rejectedInPrs.size} skipped in suggestion PRs` : 'suggestion PRs not checked without GITHUB_TOKEN'}). ` +
      (prs?.open ? `Open suggestion PR #${prs.open.number} still proposes ${carried.kept.length}, which will be kept. ` : '') +
      `Checking the top ${Math.min(TOP, ranked.length)} for a working feed...\n`
  );

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

  const evidenceText = (e: Evidence) =>
    [
      e.storyUrls.size ? `${e.storyUrls.size === 1 ? '1 post' : `${e.storyUrls.size} distinct posts`} on HN/Lobsters` : '',
      e.hnPosts ? `HN ${e.hnPosts} / ${e.hnPoints} pts` : '',
      e.lobstersPosts ? `Lobsters ${e.lobstersPosts} / ${e.lobstersScore} pts` : '',
      e.citedBy.size ? `cited by ${e.citedBy.size} followed blogs (${[...e.citedBy].slice(0, 3).join(', ')})` : '',
      e.inCandidateList ? 'in candidate-blogs.txt' : '',
    ].filter(Boolean).join('; ');
  const describe = ({ e, q, assessment, reason }: (typeof decided)[number]) => {
    console.log(`- ${assessment?.owner || q.title || e.key} | ${e.home}`);
    console.log(`    ${reason}${assessment ? ` | ${assessment.category}` : ''}`);
    console.log(`    evidence: ${evidenceText(e)}`);
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

  if (!suggested.length) {
    if (APPLY && fs.existsSync(PR_BODY_FILE)) fs.rmSync(PR_BODY_FILE);
    return;
  }

  const suggestions: Suggestion[] = suggested.map(({ e, q, assessment, reason }) => ({
    key: e.key,
    name: assessment?.name || assessment?.owner || q.title || e.key,
    websiteUrl: e.home,
    category: assessment?.category ?? 'Personal Blogs',
    description: assessment?.description,
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    evidence: evidenceText(e),
    feedUrl: q.feedUrl!,
    postsLastYear: q.postsLastYear,
    recent: q.recent,
  }));
  // Slugs must not clash with any followed, retired or carried-over blog
  const taken = new Set([...companies.map((c) => c.slug), ...loadSources().map((s) => s.slug), ...carried.kept.map((c) => c.entry.slug)]);
  const entries = suggestions.map((s) => toSourceEntry(s, taken));
  if (!APPLY) {
    console.log("\n=== sources.yaml entries for the suggested ones (delete any you don't want), or rerun with --apply\n");
    console.log(entriesYaml(entries));
    return;
  }
  // The branch is rebuilt from this checkout each time, so it never conflicts with main
  const sourcesFile = path.join(process.cwd(), 'sources.yaml');
  fs.writeFileSync(sourcesFile, appendSources(fs.readFileSync(sourcesFile, 'utf8'), [...carried.kept.map((c) => c.entry), ...entries]));
  loadSources(); // fails loudly if the file no longer parses
  // Kept generic: the error text can include the LLM's address, which is a secret
  const note = llmStopped ? "The LLM stopped part-way this run, so some blogs weren't assessed; they'll be checked next week." : undefined;
  const sections = [...carried.kept.map((c) => c.section), ...suggestions.map(blogSection)];
  const keys = [...new Set([...carried.keys, ...suggestions.map((s) => s.key)])];
  fs.writeFileSync(PR_BODY_FILE, pullRequestBody(sections, keys, note));
  console.log(
    `\n✍️ Added ${entries.length} to sources.yaml (${entries.map((e) => e.slug).join(', ')})` +
      (carried.kept.length ? ` after the ${carried.kept.length} carried over from PR #${prs!.open!.number}` : '') +
      ` and wrote ${path.relative(process.cwd(), PR_BODY_FILE)}.`
  );
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

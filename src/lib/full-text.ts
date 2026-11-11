import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import robotsParser from 'robots-parser';
import { db } from './db';
import { cleanHtmlContent, FEED_REQUEST_HEADERS } from './rss-parser';

// Many feeds carry only an excerpt, so the classifier sees little more than a title. For those posts, fetch
// the article page and keep the start of its text. Only plain text is kept, capped in length, and it's used
// for classification only: the site never shows it, and the reader links to the original post.
const BODY_MAX_CHARS = 4000;
const EXCERPT_ONLY_BELOW = 1500; // feed content (HTML) shorter than this is treated as an excerpt
const MIN_GAIN_CHARS = 200;
const PAGE_TIMEOUT_MS = 12000;
const MAX_PAGE_BYTES = 3_000_000;
const MAX_FETCH_ATTEMPTS = 2;
const FETCH_CONCURRENCY = 5;
const DEFAULT_MAX_PER_RUN = 300;
const ROBOTS_USER_AGENT = 'EngFeed-Bot';

export type BodyFetchStatus = 'ok' | 'blocked' | 'not-html' | 'no-text' | 'failed';

const robotsCache = new Map<string, Promise<ReturnType<typeof robotsParser> | null>>();

/**
 * Whether robots.txt lets us fetch this URL. A missing or unreadable robots.txt allows it, as is standard.
 */
async function isAllowedByRobots(url: string): Promise<boolean> {
  const origin = new URL(url).origin;
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    robotsCache.set(
      origin,
      fetch(robotsUrl, { headers: FEED_REQUEST_HEADERS, signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) })
        .then(async (res) => (res.ok ? robotsParser(robotsUrl, await res.text()) : null))
        .catch(() => null)
    );
  }
  const robots = await robotsCache.get(origin);
  return robots?.isAllowed(url, ROBOTS_USER_AGENT) ?? true;
}

/**
 * Fetch an article page and extract the start of its main text with Mozilla Readability
 */
export async function fetchArticleText(url: string): Promise<{ status: BodyFetchStatus; text?: string }> {
  if (!(await isAllowedByRobots(url))) return { status: 'blocked' };

  let html: string;
  let finalUrl: string;
  try {
    const res = await fetch(url, {
      headers: { ...FEED_REQUEST_HEADERS, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (!res.ok) return { status: 'failed' };
    if (!(res.headers.get('content-type') || '').includes('html')) return { status: 'not-html' };
    if (Number(res.headers.get('content-length')) > MAX_PAGE_BYTES) return { status: 'not-html' };
    html = (await res.text()).slice(0, MAX_PAGE_BYTES);
    finalUrl = res.url;
  } catch {
    return { status: 'failed' };
  }

  // jsdom here never runs the page's scripts or loads its resources; it only parses the HTML
  const dom = new JSDOM(html, { url: finalUrl, virtualConsole: new VirtualConsole() });
  try {
    const text = new Readability(dom.window.document).parse()?.textContent?.replace(/\s+/g, ' ').trim();
    return text ? { status: 'ok', text: text.slice(0, BODY_MAX_CHARS) } : { status: 'no-text' };
  } catch {
    return { status: 'no-text' };
  } finally {
    dom.window.close();
  }
}

export interface BodyFetchRunResult {
  improved: number;
  noGain: number;
  blocked: number;
  failed: number;
  remaining: number;
}

/**
 * Fetch article pages for the newest excerpt-only posts, up to the per-run limit. A post whose text gets
 * longer is queued to be classified again with it.
 */
export async function fetchMissingBodies(
  { limit, companyId }: { limit?: number; companyId?: string } = {}
): Promise<BodyFetchRunResult> {
  const maxPerRun = limit ?? (Number(process.env.BODY_MAX_PER_RUN) || DEFAULT_MAX_PER_RUN);
  const company = companyId ?? null;
  const pending = () => db.$queryRaw<{ id: string; url: string; content: string }[]>`
    SELECT id, url, content FROM "Article"
    WHERE "bodyFetchedAt" IS NULL AND "bodyFetchAttempts" < ${MAX_FETCH_ATTEMPTS}
      AND length(content) < ${EXCERPT_ONLY_BELOW} AND (${company}::text IS NULL OR "companyId" = ${company})
    ORDER BY "publishedAt" DESC LIMIT ${maxPerRun}`;

  const result: BodyFetchRunResult = { improved: 0, noGain: 0, blocked: 0, failed: 0, remaining: 0 };
  const queue = await pending();

  await Promise.all(
    Array.from({ length: FETCH_CONCURRENCY }, async () => {
      for (let article = queue.shift(); article; article = queue.shift()) {
        const { status, text } = await fetchArticleText(article.url);

        if (status === 'failed') {
          await db.article.update({ where: { id: article.id }, data: { bodyFetchAttempts: { increment: 1 } } });
          result.failed++;
          continue;
        }

        const gained = text && text.length >= cleanHtmlContent(article.content).cleanText.length + MIN_GAIN_CHARS;
        await db.article.update({
          where: { id: article.id },
          data: gained
            ? { bodyText: text, bodyFetchedAt: new Date(), classifierVersion: 0, classifyAttempts: 0 }
            : { bodyFetchedAt: new Date() },
        });
        if (gained) result.improved++;
        else if (status === 'blocked') result.blocked++;
        else result.noGain++;
      }
    })
  );

  const [{ count }] = await db.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "Article"
    WHERE "bodyFetchedAt" IS NULL AND "bodyFetchAttempts" < ${MAX_FETCH_ATTEMPTS}
      AND length(content) < ${EXCERPT_ONLY_BELOW} AND (${company}::text IS NULL OR "companyId" = ${company})`;
  result.remaining = Number(count);
  return result;
}

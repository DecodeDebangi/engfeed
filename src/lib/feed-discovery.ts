import * as cheerio from 'cheerio';
import { FEED_REQUEST_HEADERS, parseFeed } from './rss-parser';

const PAGE_TIMEOUT_MS = 12000;
const COMMON_FEED_PATHS = ['feed', 'feed.xml', 'rss', 'rss.xml', 'atom.xml', 'index.xml', 'blog/feed', 'blog/rss.xml'];

/**
 * Fetch a site's page, returning null rather than throwing, since discovery can carry on without it
 */
async function loadPage(websiteUrl: string): Promise<{ $: cheerio.CheerioAPI; url: string } | null> {
  try {
    const res = await fetch(websiteUrl, {
      headers: { ...FEED_REQUEST_HEADERS, Accept: 'text/html,application/xhtml+xml,*/*' },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return { $: cheerio.load(await res.text()), url: res.url };
  } catch {
    return null;
  }
}

async function isUsableFeed(url: string): Promise<boolean> {
  try {
    const feed = await parseFeed(url);
    return !feed.notModified && feed.articles.length > 0;
  } catch {
    return false;
  }
}

/**
 * Find a working RSS/Atom feed for a website: first the feeds its page advertises, then common paths
 */
export async function discoverFeed(websiteUrl: string): Promise<string | null> {
  const page = await loadPage(websiteUrl);
  const candidates: string[] = [];

  page?.$('link[rel="alternate"]').each((_, el) => {
    const type = page.$(el).attr('type') || '';
    const href = page.$(el).attr('href');
    if (href && /rss|atom/i.test(type) && !/comments/i.test(href)) {
      candidates.push(new URL(href, page.url).toString());
    }
  });

  const base = (page?.url || websiteUrl).replace(/\/?$/, '/');
  for (const path of COMMON_FEED_PATHS) {
    candidates.push(new URL(path, base).toString());
    candidates.push(new URL(`/${path}`, base).toString());
  }

  for (const candidate of Array.from(new Set(candidates))) {
    if (await isUsableFeed(candidate)) return candidate;
  }
  return null;
}

async function isImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': FEED_REQUEST_HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    return res.ok && (res.headers.get('content-type') || '').startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Find a site's own icon, preferring the larger touch icon over the favicon
 */
export async function findLogo(websiteUrl: string): Promise<string | null> {
  const page = await loadPage(websiteUrl);
  const candidates: string[] = [];

  if (page) {
    for (const selector of ['link[rel="apple-touch-icon"]', 'link[rel="icon"]', 'link[rel="shortcut icon"]']) {
      const href = page.$(selector).first().attr('href');
      if (href) candidates.push(new URL(href, page.url).toString());
    }
  }
  candidates.push(new URL('/favicon.ico', page?.url || websiteUrl).toString());

  for (const candidate of candidates) {
    if (await isImage(candidate)) return candidate;
  }
  return null;
}

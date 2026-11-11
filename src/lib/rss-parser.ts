import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description', 'summary', 'pubDate', 'dc:date'],
  },
});

export const FEED_REQUEST_HEADERS = {
  'User-Agent': 'EngFeed-Bot/1.0 (+https://engfeed.com; engineering blog aggregator)',
  'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
};
const FEED_TIMEOUT_MS = 12000;

// Keywords match whole words, with an optional plural "s". All-lowercase keywords ignore case;
// any keyword with a capital is case-sensitive, so "Go", "Rust" and "REST API" don't match ordinary English.
const TAG_KEYWORDS: Record<string, string[]> = {
  'AI & ML': ['AI', 'ML', 'artificial intelligence', 'machine learning', 'LLM', 'GPT', 'neural network', 'deep learning', 'transformer', 'RAG', 'vector database', 'embedding'],
  'Infrastructure': ['infrastructure', 'kubernetes', 'k8s', 'docker', 'terraform', 'AWS', 'cloud', 'GCP', 'azure', 'ebpf', 'edge computing', 'serverless'],
  'Distributed Systems': ['distributed', 'consensus', 'Raft', 'sharding', 'microservice', 'event-driven', 'kafka', 'pubsub', 'pub/sub', 'replication', 'scalability'],
  'Databases': ['postgres', 'postgresql', 'mysql', 'redis', 'mongodb', 'SQL', 'database', 'cockroachdb', 'dynamodb', 'ORM', 'prisma'],
  'Backend': ['backend', 'API', 'graphql', 'REST API', 'RESTful', 'node.js', 'Express.js', 'python', 'golang', 'Go', 'Rust', 'java', 'kotlin', 'c++'],
  'Frontend': ['frontend', 'front-end', 'React', 'next.js', 'typescript', 'javascript', 'CSS', 'tailwind', 'webassembly', 'wasm', 'web performance', 'DOM'],
  'Security': ['security', 'vulnerability', 'vulnerabilities', 'encryption', 'authentication', 'authorization', 'oauth', 'JWT', 'zero trust', 'cybersecurity', 'CVE'],
  'DevOps': ['devops', 'ci/cd', 'deployment', 'CI pipeline', 'observability', 'grafana', 'prometheus', 'datadog', 'tracing', 'logging'],
  'Mobile': ['mobile', 'iOS', 'android', 'Swift', 'kotlin', 'react native', 'flutter'],
  'Fintech': ['fintech', 'payment', 'Stripe', 'ledger', 'blockchain', 'crypto', 'banking'],
};

export const TECH_TAGS = Object.keys(TAG_KEYWORDS);
export const FALLBACK_TAG = 'Engineering';

const TAG_PATTERNS: [string, RegExp[]][] = Object.entries(TAG_KEYWORDS).map(([tag, keywords]) => [
  tag,
  keywords.map((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return new RegExp(`(?<![\\w+#])${escaped}s?(?![\\w+])`, kw === kw.toLowerCase() ? 'gi' : 'g');
  }),
]);

// A single passing mention in the body isn't enough to tag a post
const MIN_BODY_MENTIONS = 2;

export interface NormalizedArticle {
  title: string;
  slug: string;
  url: string;
  guidHash: string;
  summary: string;
  content: string;
  publishedAt: Date;
  readTime: number;
  tags: string[];
}

/**
 * Generate a URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const hash = crypto.createHash('md5').update(title).digest('hex').substring(0, 6);
  return `${base.substring(0, 60)}-${hash}`;
}

/**
 * Clean HTML content using Cheerio and sanitize-html
 */
export function cleanHtmlContent(rawHtml: string): { cleanText: string; sanitizedHtml: string } {
  if (!rawHtml) return { cleanText: '', sanitizedHtml: '' };

  const $ = cheerio.load(rawHtml);

  // Remove scripts, styles, iframes, ads, corporate sidebars
  $('script, style, iframe, noscript, svg, nav, footer, .sidebar, .ad, .advertisement').remove();

  // Extract clean text
  const cleanText = $.text().replace(/\s+/g, ' ').trim();

  // Sanitize HTML for Reader Mode
  const sanitizedHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'figure', 'figcaption'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class'],
    },
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });

  return { cleanText, sanitizedHtml };
}

/**
 * Calculate estimated reading time in minutes based on 200 WPM
 */
export function calculateReadTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Extract technology tag keywords from title and content
 */
export function extractTechTags(title: string, contentText: string): string[] {
  const tagsSet = new Set<string>();

  for (const [tag, patterns] of TAG_PATTERNS) {
    const inTitle = patterns.some((pattern) => title.search(pattern) !== -1);
    const bodyMentions = patterns.reduce((total, pattern) => total + (contentText.match(pattern)?.length ?? 0), 0);

    if (inTitle || bodyMentions >= MIN_BODY_MENTIONS) {
      tagsSet.add(tag);
    }
  }

  if (tagsSet.size === 0) {
    tagsSet.add(FALLBACK_TAG);
  }

  return Array.from(tagsSet);
}

/**
 * Generate a unique GUID hash for deduplication
 */
export function generateGuidHash(url: string, guid?: string, title?: string): string {
  const rawIdentifier = guid || url || title || Date.now().toString();
  return crypto.createHash('sha256').update(rawIdentifier).digest('hex');
}

export interface FeedCacheHeaders {
  etag?: string | null;
  lastModified?: string | null;
}

export type ParsedFeed =
  | { notModified: true }
  | { notModified: false; articles: NormalizedArticle[]; etag: string | null; lastModified: string | null };

/**
 * Fetch and parse an RSS/Atom feed. Throws if the feed can't be fetched or isn't valid,
 * so callers can tell a broken feed from a quiet one.
 */
export async function parseFeed(rssUrl: string, cache: FeedCacheHeaders = {}): Promise<ParsedFeed> {
  const res = await fetch(rssUrl, {
    headers: {
      ...FEED_REQUEST_HEADERS,
      ...(cache.etag ? { 'If-None-Match': cache.etag } : {}),
      ...(cache.lastModified ? { 'If-Modified-Since': cache.lastModified } : {}),
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  }).catch((err) => {
    // fetch only says "fetch failed"; the useful reason (DNS, TLS, refused) is on err.cause
    const reason = err.cause?.code || err.cause?.message;
    throw new Error(reason ? `${err.message}: ${reason}` : err.message);
  });

  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());

  const feed = await parser.parseString(await res.text());
  const articles: NormalizedArticle[] = [];

  for (const item of feed.items || []) {
    // Some feeds (Twilio's, for one) wrap links and titles in line breaks
    const url = (item.link || item.guid || '').trim();
    if (!url) continue;

    const title = item.title?.trim() || 'Untitled Article';
    const rawContent = item['content:encoded'] || item.content || item.description || item.summary || '';
    const { cleanText, sanitizedHtml } = cleanHtmlContent(rawContent);

    const pubDateRaw = item.pubDate || item['dc:date'] || item.isoDate;
    const publishedAt = pubDateRaw ? new Date(pubDateRaw) : new Date();

    const summaryText = cleanText.substring(0, 320) + (cleanText.length > 320 ? '...' : '');
    const readTime = calculateReadTime(cleanText);
    const tags = extractTechTags(title, cleanText);
    const guidHash = generateGuidHash(url, item.guid, title);
    const slug = generateSlug(title);

    articles.push({
      title,
      slug,
      url,
      guidHash,
      summary: summaryText || title,
      content: sanitizedHtml || rawContent || `<p>${title}</p>`,
      publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      readTime,
      tags,
    });
  }

  return {
    notModified: false,
    articles,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
  };
}

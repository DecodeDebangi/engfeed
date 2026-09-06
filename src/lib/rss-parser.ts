import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description', 'summary', 'pubDate', 'dc:date'],
  },
  headers: {
    'User-Agent': 'EngFeed-Bot/1.0 (+https://engfeed.com; engineering blog aggregator)',
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
  },
  timeout: 12000,
});

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
  const fullText = `${title} ${contentText}`.toLowerCase();
  const tagsSet = new Set<string>();

  const TAG_KEYWORDS: Record<string, string[]> = {
    'AI & ML': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'neural network', 'deep learning', 'transformer', 'rag', 'vector database', 'embeddings'],
    'Infrastructure': ['infrastructure', 'kubernetes', 'k8s', 'docker', 'terraform', 'aws', 'cloud', 'gcp', 'azure', 'ebpf', 'edge', 'serverless'],
    'Distributed Systems': ['distributed', 'consensus', 'raft', 'sharding', 'microservices', 'event-driven', 'kafka', 'pubsub', 'replication', 'scalability'],
    'Databases': ['postgres', 'postgresql', 'mysql', 'redis', 'mongodb', 'sql', 'database', 'cockroachdb', 'dynamodb', 'orm', 'prisma'],
    'Backend': ['backend', 'api', 'graphql', 'rest', 'node.js', 'express', 'python', 'golang', 'go', 'rust', 'java', 'kotlin', 'c++'],
    'Frontend': ['frontend', 'react', 'next.js', 'typescript', 'javascript', 'css', 'tailwind', 'webassembly', 'wasm', 'performance', 'dom'],
    'Security': ['security', 'vulnerability', 'encryption', 'auth', 'oauth', 'jwt', 'zero trust', 'cybersecurity', 'audit', 'cve'],
    'DevOps': ['devops', 'ci/cd', 'deployment', 'pipeline', 'observability', 'grafana', 'prometheus', 'datadog', 'tracing', 'logging'],
    'Mobile': ['mobile', 'ios', 'android', 'swift', 'kotlin', 'react native', 'flutter'],
    'Fintech': ['fintech', 'payments', 'stripe', 'ledger', 'blockchain', 'crypto', 'banking', 'clearing'],
  };

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const kw of keywords) {
      if (fullText.includes(kw)) {
        tagsSet.add(tag);
        break;
      }
    }
  }

  if (tagsSet.size === 0) {
    tagsSet.add('Engineering');
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

/**
 * Fetch and parse an RSS/Atom feed
 */
export async function parseFeed(rssUrl: string): Promise<NormalizedArticle[]> {
  try {
    const feed = await parser.parseURL(rssUrl);
    const articles: NormalizedArticle[] = [];

    for (const item of feed.items || []) {
      const url = item.link || item.guid || '';
      if (!url) continue;

      const title = item.title || 'Untitled Article';
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

  return articles;
  } catch (error: any) {
    console.error(`❌ Error parsing RSS feed [${rssUrl}]:`, error.message);
    return [];
  }
}

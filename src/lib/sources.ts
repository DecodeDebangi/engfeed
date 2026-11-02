import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

export interface FeedSource {
  name: string;
  slug: string;
  websiteUrl: string;
  category: string;
  description?: string;
  // Set this only when discovery picks the wrong feed; it pins the feed to this URL
  rssUrl?: string;
  // Set this only when the site's own icon isn't suitable
  logoUrl?: string;
}

const REQUIRED_FIELDS = ['name', 'slug', 'websiteUrl', 'category'] as const;

/**
 * Load the curated blog list from sources.yaml, the source of truth for which blogs we follow
 */
export function loadSources(filePath = path.join(process.cwd(), 'sources.yaml')): FeedSource[] {
  const sources: FeedSource[] = parse(fs.readFileSync(filePath, 'utf8'));
  const seen = new Set<string>();

  for (const source of sources) {
    for (const field of REQUIRED_FIELDS) {
      if (!source[field]) throw new Error(`Source ${JSON.stringify(source)} in ${filePath} is missing "${field}"`);
    }
    if (seen.has(source.slug)) throw new Error(`Duplicate slug "${source.slug}" in ${filePath}`);
    seen.add(source.slug);
  }

  return sources;
}

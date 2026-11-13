import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';
import type { FeedSource } from '../sources';

// Turns suggested blogs into a weekly pull request against sources.yaml. Each PR records the blogs it
// suggested in a hidden marker, so closing the PR, or deleting an entry before merging, rejects those
// blogs for good without editing any other file.

export const SUGGESTION_BRANCH = 'blog-suggestions';
const MARKER_PATTERN = /<!-- engfeed-candidates: ([^>]*) -->/;

export const candidateMarker = (keys: string[]) => `<!-- engfeed-candidates: ${keys.join(' ')} -->`;

export function keysFromMarker(body: string | null | undefined): string[] {
  const match = body?.match(MARKER_PATTERN);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // drop the accents NFKD split off, so "Ü" becomes "u"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * A slug not used by any followed or retired blog (the database keeps retired ones, and slugs are unique)
 */
export function uniqueSlug(base: string, taken: Set<string>) {
  const root = base || 'blog';
  let slug = root;
  for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
  taken.add(slug);
  return slug;
}

export interface Suggestion {
  key: string;
  name: string;
  websiteUrl: string;
  category: string;
  description?: string;
  reason: string;
  evidence: string;
  feedUrl: string;
  postsLastYear: number;
  recent: string[];
}

export function toSourceEntry(suggestion: Suggestion, taken: Set<string>): FeedSource {
  return {
    name: suggestion.name,
    slug: uniqueSlug(slugify(suggestion.name), taken),
    websiteUrl: suggestion.websiteUrl,
    category: suggestion.category,
    ...(suggestion.description ? { description: suggestion.description } : {}),
  };
}

/**
 * sources.yaml with the entries added at the end, keeping the file's comments and layout as they are
 */
export const entriesYaml = (entries: FeedSource[]) => entries.map((entry) => stringify([entry], { lineWidth: 0 }).trimEnd()).join('\n\n');

export function appendSources(yamlText: string, entries: FeedSource[]) {
  return `${yamlText.trimEnd()}\n\n${entriesYaml(entries)}\n`;
}

export function pullRequestBody(suggestions: Suggestion[], note?: string) {
  const blogs = suggestions
    .map((s) =>
      [
        `### [${s.name}](${s.websiteUrl})`,
        `${s.reason}. ${s.category}.`,
        s.description ? `> ${s.description}` : '',
        `- Seen: ${s.evidence}`,
        `- Feed: ${s.feedUrl} (${s.postsLastYear} posts in the last year)`,
        s.recent.length ? `- Recent: ${s.recent.map((t) => `"${t}"`).join(' · ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');

  return `The weekly search of Hacker News, Lobsters and links in followed blogs found ${suggestions.length === 1 ? 'one blog' : `${suggestions.length} blogs`} that ${suggestions.length === 1 ? 'fits' : 'fit'} what EngFeed follows: company engineering blogs, and personal blogs that have drawn attention more than once.

**To follow them**, merge this PR. The blogs are added to \`sources.yaml\`, and their posts appear after the next feed sync.
**To skip one**, delete its entry from \`sources.yaml\` on this branch before merging.
**To skip all**, close the PR.

Skipped blogs aren't suggested again. No new PR opens while this one is open.

${blogs}
${note ? `\n${note}\n` : ''}
${candidateMarker(suggestions.map((s) => s.key))}
`;
}

/**
 * Site keys never to suggest: the ones listed in rejected-candidates.yaml
 */
export function loadRejectedList(filePath = path.join(process.cwd(), 'rejected-candidates.yaml')): Set<string> {
  if (!fs.existsSync(filePath)) return new Set();
  const entries: { site: string }[] | null = parse(fs.readFileSync(filePath, 'utf8'));
  return new Set((entries ?? []).map((entry) => entry.site));
}

/**
 * Site keys suggested by earlier PRs that were closed. Merged ones are followed by now, so they're
 * skipped anyway; the rest were rejected. Needs GITHUB_TOKEN and GITHUB_REPOSITORY, as in GitHub Actions.
 */
export async function keysFromClosedPullRequests(): Promise<Set<string> | null> {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) return null;
  const owner = GITHUB_REPOSITORY.split('/')[0];
  const keys = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${process.env.GITHUB_API_URL || 'https://api.github.com'}/repos/${GITHUB_REPOSITORY}/pulls?state=closed&head=${owner}:${SUGGESTION_BRANCH}&per_page=100&page=${page}`,
      {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${GITHUB_TOKEN}` },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) throw new Error(`GitHub: listing closed suggestion PRs failed with HTTP ${res.status}`);
    const pulls: { body: string | null }[] = await res.json();
    for (const pull of pulls) keysFromMarker(pull.body).forEach((key) => keys.add(key));
    if (pulls.length < 100) break;
  }
  return keys;
}

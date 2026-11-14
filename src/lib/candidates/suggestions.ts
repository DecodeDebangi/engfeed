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

const BLOG_MARKER = (key: string) => `<!-- blog: ${key} -->`;
const BLOG_MARKER_PATTERN = /<!-- blog: (\S+) -->/g;
const BLOGS_END = '<!-- blogs end -->';

/**
 * One blog's part of the PR description, tagged with its site key so a later run can carry it over
 */
export function blogSection(s: Suggestion) {
  return [
    BLOG_MARKER(s.key),
    `### [${s.name}](${s.websiteUrl})`,
    `${s.reason}. ${s.category}.`,
    s.description ? `> ${s.description}` : '',
    `- Seen: ${s.evidence}`,
    `- Feed: ${s.feedUrl} (${s.postsLastYear} posts in the last year)`,
    s.recent.length ? `- Recent: ${s.recent.map((t) => `"${t}"`).join(' · ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The tagged blog sections of an earlier PR description, by site key
 */
export function sectionsFromBody(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const blogs = body.split(BLOGS_END)[0];
  const starts = [...blogs.matchAll(BLOG_MARKER_PATTERN)];
  starts.forEach((match, i) => {
    const text = blogs.slice(match.index, starts[i + 1]?.index ?? blogs.length).trim();
    sections.set(match[1], text);
  });
  return sections;
}

/**
 * What an open suggestion PR still proposes: the entries left in its sources.yaml (with any edits made
 * on the branch) and their sections. A suggested blog whose entry was deleted from the branch isn't
 * carried over, but its key stays in `keys`, so the PR keeps recording it as rejected.
 */
export function carryOver(branchSources: FeedSource[], body: string, siteKeyOf: (url: string) => string | null) {
  const keys = keysFromMarker(body);
  const sections = sectionsFromBody(body);
  const kept = branchSources.flatMap((entry) => {
    const key = siteKeyOf(entry.websiteUrl);
    if (!key || !keys.includes(key)) return [];
    // A PR opened before sections were tagged gets a short one built from its entry
    const section =
      sections.get(key) ??
      [BLOG_MARKER(key), `### [${entry.name}](${entry.websiteUrl})`, `${entry.category}.`, entry.description ? `> ${entry.description}` : '']
        .filter(Boolean)
        .join('\n');
    return [{ key, entry, section }];
  });
  return { keys, kept };
}

export function pullRequestBody(sections: string[], keys: string[], note?: string) {
  const one = sections.length === 1;
  return `The weekly search of Hacker News, Lobsters and links in followed blogs found ${one ? 'one blog' : `${sections.length} blogs`} that ${one ? 'fits' : 'fit'} what EngFeed follows: company engineering blogs, and personal blogs that have drawn attention more than once.

${one ? `**To follow it**, merge this PR. The blog is added to \`sources.yaml\`, and its posts appear after the next feed sync.
**To skip it**, close the PR.` : `**To follow them**, merge this PR. The blogs are added to \`sources.yaml\`, and their posts appear after the next feed sync.
**To skip one**, delete its entry from \`sources.yaml\` on this branch before merging.
**To skip all**, close the PR.`}

Skipped blogs aren't suggested again. While this PR is open, each weekly run adds any new suggestions to it.

${sections.join('\n\n')}
${BLOGS_END}
${note ? `\n${note}\n` : ''}
${candidateMarker(keys)}
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

const github = (path: string, accept = 'application/vnd.github+json') =>
  fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    headers: { Accept: accept, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    signal: AbortSignal.timeout(15000),
  });

/**
 * Every suggestion PR so far: the site keys each one suggested, and the open one, if any, with its
 * branch's sources.yaml. Needs GITHUB_TOKEN and GITHUB_REPOSITORY, as in GitHub Actions; null without them.
 */
export async function suggestionPullRequests(): Promise<{
  suggestedKeys: Set<string>;
  open: { number: number; body: string; sourcesYaml: string } | null;
} | null> {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) return null;
  const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
  const suggestedKeys = new Set<string>();
  let open: { number: number; body: string } | null = null;
  for (let page = 1; page <= 10; page++) {
    const res = await github(`/pulls?state=all&head=${owner}:${SUGGESTION_BRANCH}&per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`GitHub: listing suggestion PRs failed with HTTP ${res.status}`);
    const pulls: { number: number; state: string; body: string | null }[] = await res.json();
    for (const pull of pulls) {
      keysFromMarker(pull.body).forEach((key) => suggestedKeys.add(key));
      if (pull.state === 'open') open = { number: pull.number, body: pull.body ?? '' };
    }
    if (pulls.length < 100) break;
  }
  if (!open) return { suggestedKeys, open: null };

  const file = await github(`/contents/sources.yaml?ref=${SUGGESTION_BRANCH}`, 'application/vnd.github.raw');
  if (!file.ok) throw new Error(`GitHub: reading sources.yaml on ${SUGGESTION_BRANCH} failed with HTTP ${file.status}`);
  return { suggestedKeys, open: { ...open, sourcesYaml: await file.text() } };
}

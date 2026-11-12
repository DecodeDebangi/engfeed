import { db } from './db';

// Turns broken feeds into GitHub issues, so they don't go unnoticed until someone runs feeds:health.
// An issue opens when a feed turns BROKEN and closes itself when the feed recovers or is retired.
// Runs in GitHub Actions, which provides GITHUB_TOKEN and GITHUB_REPOSITORY; elsewhere it does nothing.
const LABEL = 'broken-feed';
const marker = (slug: string) => `<!-- engfeed-feed:${slug} -->`;
const MARKER_PATTERN = /<!-- engfeed-feed:([\w-]+) -->/;

export interface FeedAlertResult {
  opened: string[];
  closed: string[];
  skippedBecause?: string;
}

async function github(path: string, init: RequestInit = {}) {
  const res = await fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitHub ${init.method || 'GET'} ${path}: HTTP ${res.status}`);
  return res.json();
}

function issueBody(company: {
  slug: string;
  name: string;
  rssUrl: string;
  websiteUrl: string;
  rssUrlPinned: boolean;
  consecutiveFailures: number;
  lastError: string | null;
  lastSuccessAt: Date | null;
  suggestedRssUrl: string | null;
}) {
  return `The **${company.name}** feed has failed ${company.consecutiveFailures} polls in a row.

| | |
|---|---|
| Feed | ${company.rssUrl} |
| Website | ${company.websiteUrl} |
| Last error | \`${company.lastError ?? 'unknown'}\` |
| Last successful poll | ${company.lastSuccessAt ? company.lastSuccessAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'never'} |
| Feed URL | ${company.rssUrlPinned ? 'pinned in sources.yaml' : 'discovered automatically'} |
${company.suggestedRssUrl ? `\n**Possible replacement:** ${company.suggestedRssUrl}\n` : ''}
To fix it, set a working \`rssUrl\` for \`${company.slug}\` in \`sources.yaml\`, or remove the entry to retire the blog (its articles stay). \`npm run feeds:discover -- ${company.websiteUrl}\` shows what discovery finds. This issue closes itself when the feed works again or the blog is retired.

${marker(company.slug)}`;
}

/**
 * Open an issue for each newly broken feed and close issues for feeds that recovered or were retired
 */
export async function syncFeedAlerts({ slugs }: { slugs?: string[] } = {}): Promise<FeedAlertResult> {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) {
    return { opened: [], closed: [], skippedBecause: 'GITHUB_TOKEN or GITHUB_REPOSITORY is not set' };
  }

  const companies = await db.company.findMany({ where: slugs ? { slug: { in: slugs } } : {} });
  const bySlug = new Map(companies.map((company) => [company.slug, company]));

  const openIssues: { number: number; body: string | null }[] = await github(`/issues?state=open&labels=${LABEL}&per_page=100`);
  const issueBySlug = new Map<string, number>();
  for (const issue of openIssues) {
    const slug = issue.body?.match(MARKER_PATTERN)?.[1];
    if (slug && bySlug.has(slug)) issueBySlug.set(slug, issue.number);
  }

  const result: FeedAlertResult = { opened: [], closed: [] };

  for (const company of companies) {
    const issue = issueBySlug.get(company.slug);

    if (company.feedStatus === 'BROKEN' && !issue) {
      await github('/issues', {
        method: 'POST',
        body: JSON.stringify({ title: `Feed broken: ${company.name}`, body: issueBody(company), labels: [LABEL] }),
      });
      result.opened.push(company.name);
    } else if (issue && (company.feedStatus === 'ACTIVE' || company.feedStatus === 'RETIRED')) {
      const reason = company.feedStatus === 'ACTIVE' ? 'The feed is working again.' : 'The blog was retired, so its feed is no longer polled.';
      await github(`/issues/${issue}/comments`, { method: 'POST', body: JSON.stringify({ body: `${reason} Closing.` }) });
      await github(`/issues/${issue}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
      result.closed.push(company.name);
    }
  }

  return result;
}

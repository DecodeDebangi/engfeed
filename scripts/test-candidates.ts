import { decide, BlogAssessment, Signals } from '../src/lib/candidates/assess';
import { blogHome, looksLikeBlogPost, siteKey } from '../src/lib/candidates/site-key';

const KEYS: [string, string | null][] = [
  ['https://blogs.janestreet.com/feed.xml', 'janestreet.com'],
  ['https://blog.janestreet.com/some-post/', 'janestreet.com'],
  ['https://www.engineering.fb.com/2026/01/x', 'fb.com'],
  ['https://medium.com/airbnb-engineering/a-post-123', 'medium.com/airbnb-engineering'],
  ['https://medium.com/feed/airbnb-engineering', 'medium.com/airbnb-engineering'],
  ['https://someone.github.io/posts/x', 'someone.github.io'],
  ['https://deliveroo.engineering/2026/x', 'deliveroo.engineering'],
  ['https://tech.example.co.uk/post', 'example.co.uk'],
  ['https://github.io', null],
  ['not a url', null],
];
const BLOG_SHAPED: [string, boolean][] = [
  ['https://engineering.example.com/post', true],
  ['https://example.com/blog/how-we-scaled', true],
  ['https://medium.com/airbnb-engineering/post-1', true],
  ['https://medium.com/airbnb-engineering', false],
  ['https://example.com/pricing', false],
  ['https://github.com/org/repo', false],
  ['https://blog.example.com/', true],
];
const HOMES: [string, string][] = [
  ['https://example.com/blog/how-we-scaled', 'https://example.com/blog'],
  ['https://engineering.example.com/2026/01/post', 'https://engineering.example.com'],
  ['https://medium.com/airbnb-engineering/post-1', 'https://medium.com/airbnb-engineering'],
];

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const passed = got === want;
  if (!passed) failures++;
  console.log(`${passed ? '✅' : '❌'} ${name}${passed ? '' : ` -> got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
for (const [url, want] of KEYS) check(`siteKey ${url}`, siteKey(url), want);
for (const [url, want] of BLOG_SHAPED) check(`looksLikeBlogPost ${url}`, looksLikeBlogPost(url), want);
for (const [url, want] of HOMES) check(`blogHome ${url}`, blogHome(url), want);
const active: Signals = { appearances: 1, citedBy: 0, postsLastYear: 12, activeRecently: true };
const assessed = (kind: BlogAssessment['kind'], engineeringPosts: number): BlogAssessment => ({ kind, owner: 'x', engineeringPosts, postsJudged: 10, category: 'DevTools' });
const DECISIONS: [string, Signals, BlogAssessment | null, boolean][] = [
  ['company engineering blog, mostly engineering', active, assessed('COMPANY_ENGINEERING', 7), true],
  ['company blog, mostly not engineering', active, assessed('COMPANY_ENGINEERING', 3), false],
  ['company news blog', active, assessed('COMPANY_NEWS', 9), false],
  ['open-source project blog', active, assessed('OPEN_SOURCE_PROJECT', 9), false],
  ['personal blog with one viral post', active, assessed('PERSONAL', 9), false],
  ['well-known personal blog, mostly engineering', { ...active, appearances: 2 }, assessed('PERSONAL', 8), true],
  ['personal blog cited by a followed blog', { ...active, citedBy: 1 }, assessed('PERSONAL', 7), true],
  ['well-known personal blog, mostly not engineering', { ...active, appearances: 3 }, assessed('PERSONAL', 4), false],
  ['inactive blog', { ...active, activeRecently: false }, assessed('COMPANY_ENGINEERING', 9), false],
  ['too few posts a year', { ...active, postsLastYear: 2 }, assessed('COMPANY_ENGINEERING', 9), false],
  ['content farm', { ...active, postsLastYear: 4475 }, assessed('COMPANY_ENGINEERING', 9), false],
  ['unassessed blog', active, null, false],
];
for (const [name, signals, assessment, want] of DECISIONS) check(`decide: ${name}`, decide(signals, assessment).suggest, want);

console.log(failures === 0 ? '\n✅ All candidate checks passed' : `\n❌ ${failures} candidate checks failed`);
process.exit(failures > 0 ? 1 : 0);

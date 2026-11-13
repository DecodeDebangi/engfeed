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
console.log(failures === 0 ? '\n✅ All candidate checks passed' : `\n❌ ${failures} candidate checks failed`);
process.exit(failures > 0 ? 1 : 0);

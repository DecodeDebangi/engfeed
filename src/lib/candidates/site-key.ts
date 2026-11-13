// Groups URLs by the blog they belong to, so the same company isn't suggested twice under different
// hostnames (blogs.janestreet.com and blog.janestreet.com) and an already-followed company is recognised.

// Second-level suffixes where the company name sits one label further left
const MULTI_PART_SUFFIXES = new Set(['co.uk', 'org.uk', 'com.au', 'co.jp', 'co.in', 'com.br', 'co.nz', 'com.sg', 'co.kr']);

// Hosting platforms where each publication or person gets its own subdomain or path, so the platform
// itself isn't the blog
const SUBDOMAIN_PLATFORMS = ['github.io', 'substack.com', 'wordpress.com', 'blogspot.com', 'ghost.io', 'hashnode.dev', 'netlify.app', 'vercel.app', 'pages.dev'];
const PATH_PLATFORMS = ['medium.com', 'dev.to', 'hashnode.com'];

/**
 * The key a URL's blog is grouped under: usually the company's registrable domain (janestreet.com),
 * or the publication on a hosting platform (medium.com/airbnb-engineering, foo.github.io).
 */
export function siteKey(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const labels = host.split('.');

  for (const platform of PATH_PLATFORMS) {
    if (host === platform || host.endsWith(`.${platform}`)) {
      const first = url.pathname.split('/').filter(Boolean)[0];
      // medium.com/feed/<publication> is the feed for medium.com/<publication>
      const publication = first === 'feed' ? url.pathname.split('/').filter(Boolean)[1] : first;
      return publication ? `${platform}/${publication.toLowerCase()}` : null;
    }
  }
  for (const platform of SUBDOMAIN_PLATFORMS) {
    if (host.endsWith(`.${platform}`)) return host;
    if (host === platform) return null;
  }

  const lastTwo = labels.slice(-2).join('.');
  return labels.length > 2 && MULTI_PART_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

/**
 * Whether a link looks like a post on a blog: a blog-like subdomain (engineering.x.com, blog.x.com)
 * or a blog-like path (x.com/blog/..., x.com/engineering/...). Product pages, docs and code hosts don't.
 */
export function looksLikeBlogPost(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (/^(github|gitlab|youtube|x|twitter|linkedin|arxiv|wikipedia|news\.ycombinator|reddit)\./.test(host)) return false;
  if (/^(engineering|eng|tech|blog|blogs|developers?|dev|research|labs|code|techblog)\./.test(host)) return true;
  if (PATH_PLATFORMS.some((p) => host === p || host.endsWith(`.${p}`))) return url.pathname.split('/').filter(Boolean).length >= 2;
  return /^\/(blog|blogs|engineering|eng|tech-blog|techblog|posts|articles)\//.test(url.pathname);
}

/**
 * Where to look for a blog's feed, from one of its post URLs: the blog subdomain's root, or the
 * company site's blog section
 */
export function blogHome(input: string): string {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  if (PATH_PLATFORMS.some((p) => host === p || host.endsWith(`.${p}`))) return `${url.origin}/${segments[0]}`;
  if (/^\/(blog|blogs|engineering|eng|tech-blog|techblog|posts|articles)\//.test(url.pathname)) return `${url.origin}/${segments[0]}`;
  return url.origin;
}

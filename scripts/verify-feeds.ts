import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/rss+xml,application/atom+xml,*/*;q=0.8',
  },
  timeout: 8000,
});

const CANDIDATE_FEEDS = [
  { name: 'Netflix TechBlog', rssUrl: 'https://netflixtechblog.com/feed' },
  { name: 'Meta Engineering', rssUrl: 'https://engineering.fb.com/feed/' },
  { name: 'Cloudflare Blog', rssUrl: 'https://blog.cloudflare.com/rss/' },
  { name: 'Uber Engineering', rssUrl: 'https://www.uber.com/blog/engineering/rss/' },
  { name: 'Stripe Engineering', rssUrl: 'https://stripe.dev/blog/feed' },
  { name: 'Airbnb Tech', rssUrl: 'https://medium.com/feed/airbnb-engineering' },
  { name: 'GitHub Engineering', rssUrl: 'https://github.blog/category/engineering/feed/' },
  { name: 'Vercel Blog', rssUrl: 'https://vercel.com/atom' },
  { name: 'Figma Engineering', rssUrl: 'https://www.figma.com/blog/feed/rss.xml' },
  { name: 'Discord Engineering', rssUrl: 'https://discord.com/blog/rss.xml' },
  { name: 'Slack Engineering', rssUrl: 'https://slack.engineering/feed/' },
  { name: 'Datadog Engineering', rssUrl: 'https://www.datadoghq.com/blog/index.xml' },
  { name: 'Shopify Engineering', rssUrl: 'https://shopify.engineering/blog.atom' },
  { name: 'Spotify R&D', rssUrl: 'https://engineering.atspotify.com/feed/' },
  { name: 'DoorDash Engineering', rssUrl: 'https://doordash.engineering/feed/' },
  { name: 'LinkedIn Engineering', rssUrl: 'https://engineering.linkedin.com/blog.rss.html' },
  { name: 'Pinterest Engineering', rssUrl: 'https://medium.com/feed/pinterest-engineering' },
  { name: 'Dropbox Tech', rssUrl: 'https://dropbox.tech/feed' },
  { name: 'AWS Architecture', rssUrl: 'https://aws.amazon.com/blogs/architecture/feed/' },
  { name: 'Google Cloud', rssUrl: 'https://cloud.google.com/blog/rss' },
  { name: 'OpenAI Blog', rssUrl: 'https://openai.com/news/rss.xml' },
  { name: 'Anthropic Research', rssUrl: 'https://www.anthropic.com/rss.xml' },
  { name: 'Hugging Face Blog', rssUrl: 'https://huggingface.co/blog/feed.xml' },
  { name: 'Google DeepMind', rssUrl: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Pinecone Blog', rssUrl: 'https://www.pinecone.io/rss.xml' },
  { name: 'HashiCorp Blog', rssUrl: 'https://www.hashicorp.com/blog/feed.xml' },
  { name: 'CockroachDB Blog', rssUrl: 'https://www.cockroachlabs.com/blog/index.xml' },
  { name: 'Databricks Blog', rssUrl: 'https://www.databricks.com/feed' },
  { name: 'Supabase Blog', rssUrl: 'https://supabase.com/feed.xml' },
  { name: 'Neon Blog', rssUrl: 'https://neon.tech/blog/rss.xml' },
  { name: 'MongoDB Engineering', rssUrl: 'https://www.mongodb.com/blog/rss' },
  { name: 'Redis Blog', rssUrl: 'https://redis.io/blog/feed/' },
  { name: 'Twilio Blog', rssUrl: 'https://www.twilio.com/en-us/blog/feed' },
  { name: 'Postman Blog', rssUrl: 'https://blog.postman.com/feed/' },
  { name: 'Sentry Blog', rssUrl: 'https://blog.sentry.io/feed.xml' },
  { name: 'Grafana Labs', rssUrl: 'https://grafana.com/blog/index.xml' },
  { name: 'Honeycomb Blog', rssUrl: 'https://www.honeycomb.io/feed' },
  { name: 'Instacart Tech', rssUrl: 'https://tech.instacart.com/feed' },
  { name: 'Lyft Engineering', rssUrl: 'https://eng.lyft.com/feed' },
  { name: 'Mozilla Hacks', rssUrl: 'https://hacks.mozilla.org/feed/' },
  { name: 'React Blog', rssUrl: 'https://react.dev/rss.xml' },
  { name: 'CSS-Tricks', rssUrl: 'https://css-tricks.com/feed/' },
  { name: 'Trail of Bits', rssUrl: 'https://blog.trailofbits.com/feed/' },
  { name: 'Snyk Blog', rssUrl: 'https://snyk.io/blog/feed.xml' },
  { name: 'Auth0 Blog', rssUrl: 'https://auth0.com/blog/rss.xml' },
];

async function verify() {
  console.log('🔍 Testing candidate RSS feed URLs...\n');

  let working = 0;
  let failed = 0;

  for (const feed of CANDIDATE_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.rssUrl);
      const itemsCount = parsed.items?.length || 0;
      if (itemsCount > 0) {
        console.log(`✅ [OK] ${feed.name} -> ${itemsCount} items (${feed.rssUrl})`);
        working++;
      } else {
        console.log(`⚠️ [0 items] ${feed.name} (${feed.rssUrl})`);
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ [ERR] ${feed.name} -> ${err.message} (${feed.rssUrl})`);
      failed++;
    }
  }

  console.log(`\nResults: ${working} working, ${failed} failed`);
}

verify();

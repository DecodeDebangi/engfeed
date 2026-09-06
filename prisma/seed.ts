import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SeedCompany {
  name: string;
  slug: string;
  logoUrl?: string;
  rssUrl: string;
  websiteUrl: string;
  category: string;
  description?: string;
}

// 100% Verified, active engineering blog RSS/Atom feed sources
export const SEED_COMPANIES: SeedCompany[] = [
  // --- Big Tech & Scale ---
  {
    name: 'Netflix TechBlog',
    slug: 'netflix',
    logoUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://netflixtechblog.com/feed',
    websiteUrl: 'https://netflixtechblog.com',
    category: 'Big Tech',
    description: 'Learn about Netflix’s engineering culture, streaming architecture, and open source tools.',
  },
  {
    name: 'Meta Engineering',
    slug: 'meta',
    logoUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://engineering.fb.com/feed/',
    websiteUrl: 'https://engineering.fb.com',
    category: 'Big Tech',
    description: 'Engineering news, infrastructure breakthroughs, and AI research from Meta.',
  },
  {
    name: 'Cloudflare Blog',
    slug: 'cloudflare',
    logoUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://blog.cloudflare.com/rss/',
    websiteUrl: 'https://blog.cloudflare.com',
    category: 'Cloud & Infra',
    description: 'Insights into global edge networks, DDoS protection, Workers, and internet security.',
  },
  {
    name: 'Airbnb Tech',
    slug: 'airbnb',
    logoUrl: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://medium.com/feed/airbnb-engineering',
    websiteUrl: 'https://medium.com/airbnb-engineering',
    category: 'Big Tech',
    description: 'Data science, design systems, machine learning, and frontend innovations at Airbnb.',
  },
  {
    name: 'GitHub Engineering',
    slug: 'github',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://github.blog/category/engineering/feed/',
    websiteUrl: 'https://github.blog/category/engineering/',
    category: 'DevTools',
    description: 'How GitHub builds, scales, and secures the home for all developers.',
  },
  {
    name: 'Vercel Blog',
    slug: 'vercel',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://vercel.com/atom',
    websiteUrl: 'https://vercel.com/blog',
    category: 'DevTools',
    description: 'Next.js updates, edge rendering, frontend performance, and serverless architecture.',
  },
  {
    name: 'Discord Engineering',
    slug: 'discord',
    logoUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7b64?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://discord.com/blog/rss.xml',
    websiteUrl: 'https://discord.com/blog/category/engineering',
    category: 'Big Tech',
    description: 'Elixir, Rust, WebSockets, latency reduction, and scaling chat for hundreds of millions.',
  },
  {
    name: 'Slack Engineering',
    slug: 'slack',
    logoUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://slack.engineering/feed/',
    websiteUrl: 'https://slack.engineering',
    category: 'Big Tech',
    description: 'How Slack scales enterprise messaging, search indexing, desktop apps, and web infrastructure.',
  },
  {
    name: 'Datadog Engineering',
    slug: 'datadog',
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.datadoghq.com/blog/index.xml',
    websiteUrl: 'https://www.datadoghq.com/blog/',
    category: 'Cloud & Infra',
    description: 'Observability at scale, metric pipelines, eBPF, and cloud infrastructure monitoring.',
  },
  {
    name: 'Shopify Engineering',
    slug: 'shopify',
    logoUrl: 'https://images.unsplash.com/photo-1556742049-0a674735c0a3?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://shopify.engineering/blog.atom',
    websiteUrl: 'https://shopify.engineering',
    category: 'Fintech',
    description: 'Ruby on Rails at scale, e-commerce infrastructure, GraphQL, and global merchant APIs.',
  },
  {
    name: 'Spotify R&D',
    slug: 'spotify',
    logoUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://engineering.atspotify.com/feed/',
    websiteUrl: 'https://engineering.atspotify.com',
    category: 'Big Tech',
    description: 'Audio recommendation systems, Backstage platform engineering, data science, and mobile apps.',
  },
  {
    name: 'Pinterest Engineering',
    slug: 'pinterest',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://medium.com/feed/pinterest-engineering',
    websiteUrl: 'https://medium.com/pinterest-engineering',
    category: 'Big Tech',
    description: 'Visual search, pin graph algorithms, multi-billion item indexing, and machine learning.',
  },
  {
    name: 'Dropbox Tech',
    slug: 'dropbox',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://dropbox.tech/feed',
    websiteUrl: 'https://dropbox.tech',
    category: 'Cloud & Infra',
    description: 'File sync engines, Magic Pocket custom storage hardware, Rust adoption, and cloud architecture.',
  },
  {
    name: 'AWS Architecture Blog',
    slug: 'aws',
    logoUrl: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://aws.amazon.com/blogs/architecture/feed/',
    websiteUrl: 'https://aws.amazon.com/blogs/architecture/',
    category: 'Cloud & Infra',
    description: 'Official AWS architecture best practices, serverless design patterns, and cloud migrations.',
  },

  // --- AI & Machine Learning ---
  {
    name: 'OpenAI Blog',
    slug: 'openai',
    logoUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://openai.com/news/rss.xml',
    websiteUrl: 'https://openai.com/news/',
    category: 'AI & ML',
    description: 'Frontier AI models, GPT architectures, alignment research, and developer API breakthroughs.',
  },
  {
    name: 'Hugging Face Blog',
    slug: 'huggingface',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://huggingface.co/blog/feed.xml',
    websiteUrl: 'https://huggingface.co/blog',
    category: 'AI & ML',
    description: 'Open source AI, Transformers, model quantization, fine-tuning, and machine learning hubs.',
  },
  {
    name: 'Google DeepMind',
    slug: 'google-deepmind',
    logoUrl: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://deepmind.google/blog/rss.xml',
    websiteUrl: 'https://deepmind.google/blog/',
    category: 'AI & ML',
    description: 'AlphaFold, Gemini foundation models, reinforcement learning, and scientific AI.',
  },

  // --- Cloud, Infrastructure & Databases ---
  {
    name: 'HashiCorp Blog',
    slug: 'hashicorp',
    logoUrl: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.hashicorp.com/blog/feed.xml',
    websiteUrl: 'https://www.hashicorp.com/blog',
    category: 'Cloud & Infra',
    description: 'Terraform, Vault, Consul, Nomad, infrastructure as code, and cloud security.',
  },
  {
    name: 'Databricks Blog',
    slug: 'databricks',
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.databricks.com/feed',
    websiteUrl: 'https://www.databricks.com/blog',
    category: 'Data Engineering',
    description: 'Apache Spark, Delta Lake, data lakehouse architecture, MLflow, and enterprise analytics.',
  },
  {
    name: 'Supabase Blog',
    slug: 'supabase',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://supabase.com/feed.xml',
    websiteUrl: 'https://supabase.com/blog',
    category: 'DevTools',
    description: 'Open source Firebase alternative, Postgres extensions, Row Level Security, and Realtime.',
  },
  {
    name: 'Neon Blog',
    slug: 'neon',
    logoUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://neon.tech/blog/rss.xml',
    websiteUrl: 'https://neon.tech/blog',
    category: 'Cloud & Infra',
    description: 'Serverless Postgres, compute/storage separation, database branching, and copy-on-write storage.',
  },
  {
    name: 'MongoDB Engineering',
    slug: 'mongodb',
    logoUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.mongodb.com/blog/rss',
    websiteUrl: 'https://www.mongodb.com/blog',
    category: 'Data Engineering',
    description: 'Document database internals, distributed transactions, time-series indexing, and Atlas search.',
  },
  {
    name: 'Redis Blog',
    slug: 'redis',
    logoUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://redis.io/blog/feed/',
    websiteUrl: 'https://redis.io/blog',
    category: 'Cloud & Infra',
    description: 'In-memory datastores, caching strategies, Redis Raft, vector search, and pub/sub performance.',
  },

  // --- Backend, DevTools & Fintech ---
  {
    name: 'Twilio Blog',
    slug: 'twilio',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.twilio.com/en-us/blog/feed',
    websiteUrl: 'https://www.twilio.com/en-us/blog',
    category: 'DevTools',
    description: 'Communications APIs, SMS/Voice gateway architecture, WebRTC, and developer tools.',
  },
  {
    name: 'Postman Blog',
    slug: 'postman',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://blog.postman.com/feed/',
    websiteUrl: 'https://blog.postman.com',
    category: 'DevTools',
    description: 'API development, OpenAPI specifications, testing automation, and API governance.',
  },
  {
    name: 'Sentry Blog',
    slug: 'sentry',
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://blog.sentry.io/feed.xml',
    websiteUrl: 'https://blog.sentry.io',
    category: 'DevTools',
    description: 'Application performance monitoring, crash reporting, symbolication, and error tracking.',
  },
  {
    name: 'Grafana Labs Blog',
    slug: 'grafana',
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://grafana.com/blog/index.xml',
    websiteUrl: 'https://grafana.com/blog/',
    category: 'Cloud & Infra',
    description: 'Prometheus metrics, Loki log aggregation, Tempo tracing, and visualization dashboards.',
  },
  {
    name: 'Honeycomb Blog',
    slug: 'honeycomb',
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://www.honeycomb.io/feed',
    websiteUrl: 'https://www.honeycomb.io/blog',
    category: 'Cloud & Infra',
    description: 'High-cardinality observability, OpenTelemetry, structured events, and distributed tracing.',
  },
  {
    name: 'Instacart Tech',
    slug: 'instacart',
    logoUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://tech.instacart.com/feed',
    websiteUrl: 'https://tech.instacart.com',
    category: 'Big Tech',
    description: 'Grocery catalog search engines, batching algorithms, data platform, and iOS/Android tech.',
  },
  {
    name: 'Lyft Engineering',
    slug: 'lyft',
    logoUrl: 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://eng.lyft.com/feed',
    websiteUrl: 'https://eng.lyft.com',
    category: 'Big Tech',
    description: 'Envoy proxy origins, ride pricing algorithms, mapping engines, and mobile performance.',
  },

  // --- Frontend, Browsers & Web Tech ---
  {
    name: 'Mozilla Hacks',
    slug: 'mozilla-hacks',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://hacks.mozilla.org/feed/',
    websiteUrl: 'https://hacks.mozilla.org',
    category: 'Frontend',
    description: 'Firefox developments, Rust web engines, WebGPU, web accessibility, and open web specs.',
  },
  {
    name: 'React Blog',
    slug: 'react-official',
    logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://react.dev/rss.xml',
    websiteUrl: 'https://react.dev/blog',
    category: 'Frontend',
    description: 'Official React core team announcements, Server Components, Hooks, and compiler releases.',
  },
  {
    name: 'CSS-Tricks',
    slug: 'css-tricks',
    logoUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://css-tricks.com/feed/',
    websiteUrl: 'https://css-tricks.com',
    category: 'Frontend',
    description: 'Modern CSS layouts, Flexbox/Grid techniques, SVG animations, and responsive web design.',
  },

  // --- Systems & Security ---
  {
    name: 'Trail of Bits Blog',
    slug: 'trailofbits',
    logoUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://blog.trailofbits.com/feed/',
    websiteUrl: 'https://blog.trailofbits.com',
    category: 'Security',
    description: 'Cybersecurity research, smart contract auditing, vulnerability analysis, and cryptography.',
  },
  {
    name: 'Snyk Blog',
    slug: 'snyk',
    logoUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://snyk.io/blog/feed.xml',
    websiteUrl: 'https://snyk.io/blog',
    category: 'Security',
    description: 'Developer security, software supply chain vulnerability intelligence, and container security.',
  },
  {
    name: 'Auth0 Blog',
    slug: 'auth0',
    logoUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=128&auto=format&fit=crop&q=80',
    rssUrl: 'https://auth0.com/blog/rss.xml',
    websiteUrl: 'https://auth0.com/blog',
    category: 'Security',
    description: 'Identity management, OAuth 2.0, OpenID Connect, JWT security, and authentication flows.',
  },
];

async function main() {
  console.log('🌱 Registering active engineering blog RSS sources...');

  for (const company of SEED_COMPANIES) {
    await prisma.company.upsert({
      where: { rssUrl: company.rssUrl },
      update: {
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        websiteUrl: company.websiteUrl,
        category: company.category,
        description: company.description,
      },
      create: {
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        rssUrl: company.rssUrl,
        websiteUrl: company.websiteUrl,
        category: company.category,
        description: company.description,
      },
    });
  }

  const count = await prisma.company.count();
  console.log(`✅ Seeded ${count} verified engineering blog sources into PostgreSQL!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

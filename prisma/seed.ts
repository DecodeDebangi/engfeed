import { PrismaClient } from '@prisma/client';
import { discoverFeed, findLogo } from '../src/lib/feed-discovery';
import { FeedSource, loadSources } from '../src/lib/sources';

const prisma = new PrismaClient();

export const SEED_COMPANIES: FeedSource[] = loadSources();

const PLACEHOLDER_LOGO_HOST = 'images.unsplash.com';

async function main() {
  console.log('🌱 Registering engineering blogs from sources.yaml...');

  for (const source of SEED_COMPANIES) {
    const existing = await prisma.company.findUnique({ where: { slug: source.slug } });

    // A discovered feed stays as-is once stored, so a feed the worker has since re-discovered isn't
    // overwritten. Discover again if the entry's website changed or its pin was removed.
    const keepStoredFeed = existing && !existing.rssUrlPinned && existing.websiteUrl === source.websiteUrl;
    const rssUrl =
      source.rssUrl ??
      (keepStoredFeed ? existing.rssUrl : (await discoverFeed(source.websiteUrl)) ?? existing?.rssUrl);
    if (!rssUrl) {
      console.warn(`⚠️ Skipping ${source.name}: no feed found at ${source.websiteUrl}. Set rssUrl in sources.yaml.`);
      continue;
    }

    const keepExistingLogo = existing?.logoUrl && !existing.logoUrl.includes(PLACEHOLDER_LOGO_HOST);
    const logoUrl = source.logoUrl ?? (keepExistingLogo ? existing.logoUrl : await findLogo(source.websiteUrl));

    const fields = {
      name: source.name,
      logoUrl,
      rssUrl,
      rssUrlPinned: Boolean(source.rssUrl),
      websiteUrl: source.websiteUrl,
      category: source.category,
      description: source.description,
    };

    await prisma.company.upsert({
      where: { slug: source.slug },
      update: {
        ...fields,
        // Bring back a blog that was re-added to the list
        ...(existing?.feedStatus === 'RETIRED' ? { feedStatus: 'ACTIVE', consecutiveFailures: 0, lastError: null } : {}),
        // Cache headers belong to the old URL, so don't reuse them for a new one
        ...(existing?.rssUrl !== rssUrl ? { etag: null, lastModified: null } : {}),
      },
      create: { slug: source.slug, ...fields },
    });
  }

  const slugs = SEED_COMPANIES.map((source) => source.slug);
  const toRetire = await prisma.company.findMany({
    where: { slug: { notIn: slugs }, feedStatus: { not: 'RETIRED' } },
    select: { name: true },
  });
  await prisma.company.updateMany({
    where: { slug: { notIn: slugs }, feedStatus: { not: 'RETIRED' } },
    data: { feedStatus: 'RETIRED' },
  });
  for (const company of toRetire) {
    console.log(`📦 Retired ${company.name}: no longer in sources.yaml, so it won't be polled. Its articles are kept.`);
  }

  const count = await prisma.company.count({ where: { feedStatus: { not: 'RETIRED' } } });
  console.log(`✅ ${count} engineering blogs are being followed.`);

  try {
    const { redis } = await import('../src/lib/redis');
    const keys = await redis.keys('api:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🧹 Cleared ${keys.length} Redis cache keys.`);
    }
  } catch (err) {
    // Ignore Redis errors if Redis is unconfigured
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });


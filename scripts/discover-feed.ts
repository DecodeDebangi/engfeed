import { discoverFeed, findLogo } from '../src/lib/feed-discovery';

// Usage: npm run feeds:discover -- https://example.com/blog. Prints what a sources.yaml entry would resolve to.
async function main() {
  const websiteUrl = process.argv[2];
  if (!websiteUrl) throw new Error('Pass a website URL');

  console.log(`Feed: ${(await discoverFeed(websiteUrl)) ?? 'none found'}`);
  console.log(`Logo: ${(await findLogo(websiteUrl)) ?? 'none found'}`);
}

main()
  .catch((e) => {
    console.error('❌ Discovery failed:', e.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));

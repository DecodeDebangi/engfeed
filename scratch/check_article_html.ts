import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const article = await prisma.article.findFirst({
    where: { title: { contains: 'GPT 6' } },
  });

  if (article) {
    console.log('--- ARTICLE TITLE ---');
    console.log(article.title);
    console.log('--- ARTICLE SUMMARY ---');
    console.log(article.summary);
    console.log('--- ARTICLE CONTENT (first 500 chars) ---');
    console.log(article.content?.slice(0, 500));
  } else {
    const fallback = await prisma.article.findFirst();
    console.log('--- FALLBACK ARTICLE SUMMARY ---');
    console.log(fallback?.summary);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

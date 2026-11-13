import { db } from './db';

const MIN_PREFIX_LENGTH = 3;

/**
 * Turn what someone typed into a Postgres full-text query. Only letters and digits are kept, so any
 * input is safe. Words are stemmed ("caching" also finds "cache"), every word must match, and the last
 * one matches as a prefix so results keep up while typing, once it has 3 letters ("c" alone would match
 * nearly everything).
 */
export function toSearchQuery(input: string): string | null {
  const words = input.toLowerCase().match(/[a-z0-9]+/g);
  const last = words ? words.length - 1 : -1;
  if (!words) return null;
  return words.map((word, i) => (i === last && word.length >= MIN_PREFIX_LENGTH ? `${word}:*` : word)).join(' & ');
}

/**
 * One page of article ids matching a search, best match first (title matches outrank summary
 * matches), newest first among equals. Uses the indexed "searchVector" column; see prisma/search.sql.
 */
export async function searchArticleIds({
  query,
  companySlug,
  tag,
  bookmarkedBy,
  skip,
  take,
}: {
  query: string;
  companySlug?: string;
  tag?: string;
  bookmarkedBy?: string;
  skip: number;
  take: number;
}): Promise<{ ids: string[]; total: number }> {
  const company = companySlug ?? null;
  const tagFilter = tag ?? null;
  const visitor = bookmarkedBy ?? null;

  const [rows, [{ count }]] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM "Article" a JOIN "Company" c ON c.id = a."companyId"
      WHERE a."searchVector" @@ to_tsquery('english', ${query})
        AND (${company}::text IS NULL OR c.slug = ${company})
        AND (${tagFilter}::text IS NULL OR ${tagFilter} = ANY(a.tags))
        AND (${visitor}::text IS NULL OR EXISTS (
          SELECT 1 FROM "UserBookmark" b WHERE b."articleId" = a.id AND b."userId" = ${visitor}))
      ORDER BY ts_rank_cd(a."searchVector", to_tsquery('english', ${query})) DESC, a."publishedAt" DESC
      OFFSET ${skip} LIMIT ${take}`,
    db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM "Article" a JOIN "Company" c ON c.id = a."companyId"
      WHERE a."searchVector" @@ to_tsquery('english', ${query})
        AND (${company}::text IS NULL OR c.slug = ${company})
        AND (${tagFilter}::text IS NULL OR ${tagFilter} = ANY(a.tags))
        AND (${visitor}::text IS NULL OR EXISTS (
          SELECT 1 FROM "UserBookmark" b WHERE b."articleId" = a.id AND b."userId" = ${visitor}))`,
  ]);

  return { ids: rows.map((row) => row.id), total: Number(count) };
}

-- Full-text search for articles. Safe to run more than once; run it after `prisma db push`.
-- "searchVector" is a plain column, which Prisma manages; a trigger keeps it up to date from the title
-- (weighted highest) and summary on every insert and edit. A generated column would be simpler, but
-- Prisma then fails on every later `db push`.

CREATE OR REPLACE FUNCTION article_search_document(title text, summary text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE AS $$
    SELECT setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
           setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  $$;

CREATE OR REPLACE FUNCTION article_search_vector_update() RETURNS trigger
  LANGUAGE plpgsql AS $$
    BEGIN
      NEW."searchVector" := article_search_document(NEW.title, NEW.summary);
      RETURN NEW;
    END
  $$;

-- An earlier version made this a generated column; keep its values but make it a plain column again
ALTER TABLE "Article" ALTER COLUMN "searchVector" DROP EXPRESSION IF EXISTS;

DROP TRIGGER IF EXISTS article_search_vector ON "Article";
CREATE TRIGGER article_search_vector BEFORE INSERT OR UPDATE OF title, summary ON "Article"
  FOR EACH ROW EXECUTE FUNCTION article_search_vector_update();

UPDATE "Article" SET "searchVector" = article_search_document(title, summary) WHERE "searchVector" IS NULL;

CREATE INDEX IF NOT EXISTS "Article_searchVector_idx" ON "Article" USING GIN ("searchVector");

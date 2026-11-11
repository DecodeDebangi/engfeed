-- One-off cleanup: some feeds wrapped links and titles in whitespace before the parser trimmed them.
-- Run before deploying the trimming parser, so new posts still match stored ones by URL.
UPDATE "Article" SET url = btrim(url, E' \n\r\t') WHERE url <> btrim(url, E' \n\r\t');
UPDATE "Article" SET title = btrim(title, E' \n\r\t') WHERE title <> btrim(title, E' \n\r\t');

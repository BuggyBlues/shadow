-- Backfill slugs for servers that don't have one
-- Uses lower(name) with spaces → hyphens, with a random suffix for uniqueness
UPDATE "servers"
SET "slug" = LOWER(REPLACE("name", ' ', '-')) || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4)
WHERE "slug" IS NULL OR "slug" = '';

-- Make slug NOT NULL now that all rows have values
ALTER TABLE "servers" ALTER COLUMN "slug" SET NOT NULL;

-- Add unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS "servers_slug_unique" ON "servers" ("slug");

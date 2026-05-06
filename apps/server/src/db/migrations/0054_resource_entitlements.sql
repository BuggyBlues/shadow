-- Phase 4: remove legacy channel/app entitlement gates from the core commerce model.

ALTER TABLE "entitlements"
  ADD COLUMN IF NOT EXISTS "capability" varchar(80) DEFAULT 'use' NOT NULL;

UPDATE "entitlements"
SET
  "resource_type" = COALESCE(NULLIF("resource_type", ''), 'service'),
  "resource_id" = COALESCE(NULLIF("resource_id", ''), "product_id"::text, "id"::text),
  "capability" = COALESCE(NULLIF("capability", ''), 'use');

ALTER TABLE "entitlements"
  ALTER COLUMN "resource_type" SET DEFAULT 'service',
  ALTER COLUMN "resource_type" SET NOT NULL,
  ALTER COLUMN "resource_id" SET NOT NULL,
  ALTER COLUMN "capability" SET DEFAULT 'use',
  ALTER COLUMN "capability" SET NOT NULL;

DROP INDEX IF EXISTS "entitlements_type_idx";
ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "target_id";
ALTER TABLE "entitlements" DROP COLUMN IF EXISTS "type";
DROP TYPE IF EXISTS "entitlement_type";

CREATE INDEX IF NOT EXISTS "entitlements_resource_idx"
  ON "entitlements" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "entitlements_capability_idx"
  ON "entitlements" ("capability");

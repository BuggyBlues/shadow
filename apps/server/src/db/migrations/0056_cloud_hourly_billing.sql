-- Cloud deployment hourly billing.
ALTER TABLE "cloud_deployments"
  ADD COLUMN IF NOT EXISTS "hourly_cost" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_hourly_billed_at" timestamptz;

-- Existing deployed SaaS rows may already have paid the old one-time deploy charge.
-- Start hourly billing from the migration time instead of back-billing historical runtime.
UPDATE "cloud_deployments"
SET "last_hourly_billed_at" = now()
WHERE "saas_mode" = true
  AND "status" = 'deployed'
  AND "last_hourly_billed_at" IS NULL;

-- Phase 2: SaaS extensions for cloud_templates and cloud_deployments
-- Also adds new wallet_tx types for cloud billing

-- Extend cloud_templates with SaaS fields
ALTER TABLE "cloud_templates"
  ADD COLUMN IF NOT EXISTS "category" varchar(64),
  ADD COLUMN IF NOT EXISTS "deploy_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "rating" real,
  ADD COLUMN IF NOT EXISTS "base_cost" integer,
  ADD COLUMN IF NOT EXISTS "author_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "cloud_templates_category_idx" ON "cloud_templates"("category");
CREATE INDEX IF NOT EXISTS "cloud_templates_author_id_idx" ON "cloud_templates"("author_id");

-- Extend cloud_deployments with SaaS fields
ALTER TABLE "cloud_deployments"
  ADD COLUMN IF NOT EXISTS "template_slug" varchar(255),
  ADD COLUMN IF NOT EXISTS "resource_tier" varchar(32),
  ADD COLUMN IF NOT EXISTS "monthly_cost" integer,
  ADD COLUMN IF NOT EXISTS "saas_mode" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "cloud_deployments_saas_mode_idx" ON "cloud_deployments"("saas_mode");

-- Add cloud billing types to wallet_tx_type enum
DO $$ BEGIN
  ALTER TYPE "wallet_tx_type" ADD VALUE IF NOT EXISTS 'cloud_deploy';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "wallet_tx_type" ADD VALUE IF NOT EXISTS 'cloud_hourly';
EXCEPTION WHEN others THEN NULL; END $$;

-- Extend cloud_activity_type enum
DO $$ BEGIN
  ALTER TYPE "cloud_activity_type" ADD VALUE IF NOT EXISTS 'billing_deduct';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "cloud_activity_type" ADD VALUE IF NOT EXISTS 'template_update';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "cloud_activity_type" ADD VALUE IF NOT EXISTS 'template_approved';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "cloud_activity_type" ADD VALUE IF NOT EXISTS 'template_rejected';
EXCEPTION WHEN others THEN NULL; END $$;

-- Phase 4: offer-driven commerce delivery and paid workspace-file tickets.

DO $$ BEGIN
  CREATE TYPE "commerce_offer_origin_kind" AS ENUM ('server', 'user', 'platform');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_offer_status" AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_deliverable_kind" AS ENUM ('paid_file', 'message', 'external');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_deliverable_status" AS ENUM ('active', 'paused', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_fulfillment_destination_kind" AS ENUM ('channel', 'dm');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_fulfillment_status" AS ENUM ('pending', 'sending', 'sent', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "paid_file_grant_status" AS ENUM ('active', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "commerce_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shop_id" uuid NOT NULL REFERENCES "shops"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "origin_kind" "commerce_offer_origin_kind" DEFAULT 'server' NOT NULL,
  "origin_server_id" uuid REFERENCES "servers"("id") ON DELETE set null,
  "seller_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "seller_buddy_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "allowed_surfaces" jsonb DEFAULT '["channel","dm"]'::jsonb,
  "visibility" varchar(40) DEFAULT 'login_required' NOT NULL,
  "eligibility" jsonb DEFAULT '{}'::jsonb,
  "price_override" integer,
  "currency" "currency_type" DEFAULT 'shrimp_coin' NOT NULL,
  "starts_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "status" "commerce_offer_status" DEFAULT 'active' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "commerce_offers_shop_id_idx" ON "commerce_offers" ("shop_id");
CREATE INDEX IF NOT EXISTS "commerce_offers_product_id_idx" ON "commerce_offers" ("product_id");
CREATE INDEX IF NOT EXISTS "commerce_offers_status_idx" ON "commerce_offers" ("status");
CREATE INDEX IF NOT EXISTS "commerce_offers_seller_buddy_idx" ON "commerce_offers" ("seller_buddy_user_id");

CREATE TABLE IF NOT EXISTS "commerce_deliverables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "offer_id" uuid NOT NULL REFERENCES "commerce_offers"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "kind" "commerce_deliverable_kind" DEFAULT 'paid_file' NOT NULL,
  "resource_type" varchar(80) DEFAULT 'workspace_file' NOT NULL,
  "resource_id" text NOT NULL,
  "sender_buddy_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "delivery_timing" varchar(40) DEFAULT 'after_purchase' NOT NULL,
  "message_template_key" varchar(120),
  "status" "commerce_deliverable_status" DEFAULT 'active' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "commerce_deliverables_offer_id_idx" ON "commerce_deliverables" ("offer_id");
CREATE INDEX IF NOT EXISTS "commerce_deliverables_product_id_idx" ON "commerce_deliverables" ("product_id");
CREATE INDEX IF NOT EXISTS "commerce_deliverables_resource_idx" ON "commerce_deliverables" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "commerce_deliverables_status_idx" ON "commerce_deliverables" ("status");

ALTER TABLE "entitlements"
  ADD COLUMN IF NOT EXISTS "offer_id" uuid REFERENCES "commerce_offers"("id") ON DELETE set null;

CREATE INDEX IF NOT EXISTS "entitlements_offer_id_idx" ON "entitlements" ("offer_id");

CREATE TABLE IF NOT EXISTS "paid_file_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_id" uuid NOT NULL REFERENCES "workspace_nodes"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "entitlement_id" uuid NOT NULL REFERENCES "entitlements"("id") ON DELETE cascade,
  "status" "paid_file_grant_status" DEFAULT 'active' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "paid_file_grants_file_user_idx" ON "paid_file_grants" ("file_id", "user_id");
CREATE INDEX IF NOT EXISTS "paid_file_grants_entitlement_idx" ON "paid_file_grants" ("entitlement_id");
CREATE INDEX IF NOT EXISTS "paid_file_grants_status_idx" ON "paid_file_grants" ("status");
CREATE INDEX IF NOT EXISTS "paid_file_grants_expires_at_idx" ON "paid_file_grants" ("expires_at");

CREATE TABLE IF NOT EXISTS "commerce_fulfillment_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE set null,
  "entitlement_id" uuid REFERENCES "entitlements"("id") ON DELETE set null,
  "deliverable_id" uuid REFERENCES "commerce_deliverables"("id") ON DELETE set null,
  "buyer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "destination_kind" "commerce_fulfillment_destination_kind" NOT NULL,
  "destination_id" text NOT NULL,
  "sender_buddy_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "status" "commerce_fulfillment_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_run_at" timestamp with time zone,
  "result_message_id" text,
  "last_error_code" varchar(120),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "commerce_fulfillment_jobs_order_idx" ON "commerce_fulfillment_jobs" ("order_id");
CREATE INDEX IF NOT EXISTS "commerce_fulfillment_jobs_entitlement_idx" ON "commerce_fulfillment_jobs" ("entitlement_id");
CREATE INDEX IF NOT EXISTS "commerce_fulfillment_jobs_buyer_idx" ON "commerce_fulfillment_jobs" ("buyer_id");
CREATE INDEX IF NOT EXISTS "commerce_fulfillment_jobs_status_idx" ON "commerce_fulfillment_jobs" ("status");

-- Phase 1 commerce foundation: scoped shops, entitlement lifecycle, and notification delivery outbox.

DO $$ BEGIN
  CREATE TYPE "shop_scope_kind" AS ENUM ('server', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "product_billing_mode" AS ENUM ('one_time', 'fixed_duration', 'subscription');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "entitlement_status" AS ENUM (
    'active',
    'expired',
    'cancelled',
    'revoked',
    'renewal_failed',
    'pending_force_majeure_review'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "force_majeure_status" AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'refund_decided',
    'entitlement_revoked',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "commerce_idempotency_status" AS ENUM ('started', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM (
    'in_app',
    'socket',
    'mobile_push',
    'web_push',
    'email',
    'sms',
    'chat_system'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_delivery_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "shops"
  ADD COLUMN IF NOT EXISTS "scope_kind" "shop_scope_kind" DEFAULT 'server' NOT NULL,
  ADD COLUMN IF NOT EXISTS "owner_user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  ADD COLUMN IF NOT EXISTS "visibility" varchar(40) DEFAULT 'login_required' NOT NULL;

ALTER TABLE "shops" ALTER COLUMN "server_id" DROP NOT NULL;
ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_server_id_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "shops_scope_server_unique"
  ON "shops" ("scope_kind", "server_id");
CREATE UNIQUE INDEX IF NOT EXISTS "shops_scope_owner_unique"
  ON "shops" ("scope_kind", "owner_user_id");
CREATE INDEX IF NOT EXISTS "shops_owner_user_id_idx" ON "shops" ("owner_user_id");

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "billing_mode" "product_billing_mode" DEFAULT 'one_time' NOT NULL;

ALTER TABLE "entitlements"
  ALTER COLUMN "server_id" DROP NOT NULL;

ALTER TABLE "entitlements"
  ADD COLUMN IF NOT EXISTS "shop_id" uuid REFERENCES "shops"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "renewal_order_id" uuid REFERENCES "orders"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "scope_kind" "shop_scope_kind" DEFAULT 'server' NOT NULL,
  ADD COLUMN IF NOT EXISTS "resource_type" varchar(80),
  ADD COLUMN IF NOT EXISTS "resource_id" text,
  ADD COLUMN IF NOT EXISTS "status" "entitlement_status" DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS "next_renewal_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "cancel_reason" text,
  ADD COLUMN IF NOT EXISTS "revocation_reason" text,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS "entitlements_shop_id_idx" ON "entitlements" ("shop_id");
CREATE INDEX IF NOT EXISTS "entitlements_status_idx" ON "entitlements" ("status");
CREATE INDEX IF NOT EXISTS "entitlements_next_renewal_at_idx"
  ON "entitlements" ("next_renewal_at");

CREATE TABLE IF NOT EXISTS "entitlement_force_majeure_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entitlement_id" uuid NOT NULL REFERENCES "entitlements"("id") ON DELETE cascade,
  "requester_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reviewer_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "status" "force_majeure_status" DEFAULT 'submitted' NOT NULL,
  "reason" text NOT NULL,
  "evidence" jsonb DEFAULT '{}'::jsonb,
  "platform_decision" jsonb DEFAULT '{}'::jsonb,
  "refund_amount" integer,
  "decided_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "force_majeure_entitlement_idx"
  ON "entitlement_force_majeure_requests" ("entitlement_id");
CREATE INDEX IF NOT EXISTS "force_majeure_status_idx"
  ON "entitlement_force_majeure_requests" ("status");

CREATE TABLE IF NOT EXISTS "commerce_idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "key" varchar(200) NOT NULL,
  "action" varchar(80) NOT NULL,
  "status" "commerce_idempotency_status" DEFAULT 'started' NOT NULL,
  "reference_id" uuid,
  "response" jsonb DEFAULT '{}'::jsonb,
  "error" text,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_idempotency_keys_unique"
  ON "commerce_idempotency_keys" ("actor_user_id", "key", "action");
CREATE INDEX IF NOT EXISTS "commerce_idempotency_keys_actor_idx"
  ON "commerce_idempotency_keys" ("actor_user_id");

CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "notification_id" uuid REFERENCES "notifications"("id") ON DELETE set null,
  "kind" varchar(80) NOT NULL,
  "source" varchar(80) DEFAULT 'system' NOT NULL,
  "idempotency_key" varchar(200),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notification_events_user_idx" ON "notification_events" ("user_id");
CREATE INDEX IF NOT EXISTS "notification_events_kind_idx" ON "notification_events" ("kind");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_idempotency_unique"
  ON "notification_events" ("idempotency_key");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "notification_events"("id") ON DELETE cascade,
  "notification_id" uuid REFERENCES "notifications"("id") ON DELETE set null,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "channel" "notification_channel" NOT NULL,
  "status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
  "provider" varchar(80),
  "target" text,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "error" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz,
  "sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notification_deliveries_event_idx"
  ON "notification_deliveries" ("event_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_user_idx"
  ON "notification_deliveries" ("user_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx"
  ON "notification_deliveries" ("status");
CREATE INDEX IF NOT EXISTS "notification_deliveries_channel_idx"
  ON "notification_deliveries" ("channel");

CREATE TABLE IF NOT EXISTS "user_push_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "platform" varchar(20) NOT NULL,
  "token" text NOT NULL,
  "device_name" varchar(120),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "last_used_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_push_tokens_token_unique" ON "user_push_tokens" ("token");
CREATE INDEX IF NOT EXISTS "user_push_tokens_user_idx" ON "user_push_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "user_push_tokens_active_idx" ON "user_push_tokens" ("is_active");

CREATE TABLE IF NOT EXISTS "user_web_push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "last_used_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_web_push_subscriptions_endpoint_unique"
  ON "user_web_push_subscriptions" ("endpoint");
CREATE INDEX IF NOT EXISTS "user_web_push_subscriptions_user_idx"
  ON "user_web_push_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "user_web_push_subscriptions_active_idx"
  ON "user_web_push_subscriptions" ("is_active");

CREATE TABLE IF NOT EXISTS "notification_channel_preferences" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind" varchar(80) NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_channel_preferences_unique"
  ON "notification_channel_preferences" ("user_id", "kind", "channel");

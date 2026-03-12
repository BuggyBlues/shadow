-- Apps — server applications (zip upload or external URL)
CREATE TYPE "app_source" AS ENUM ('zip', 'url');
CREATE TYPE "app_status" AS ENUM ('draft', 'active', 'archived');

CREATE TABLE IF NOT EXISTS "apps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "publisher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel_id" uuid REFERENCES "channels"("id") ON DELETE SET NULL,

  "name" varchar(200) NOT NULL,
  "slug" varchar(200),
  "description" text,
  "icon_url" text,
  "banner_url" text,

  "source_type" "app_source" NOT NULL,
  "source_url" text NOT NULL,
  "version" varchar(50),

  "status" "app_status" NOT NULL DEFAULT 'draft',
  "is_homepage" boolean NOT NULL DEFAULT false,

  "settings" jsonb,

  "view_count" integer NOT NULL DEFAULT 0,
  "user_count" integer NOT NULL DEFAULT 0,

  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_apps_server_id" ON "apps"("server_id");
CREATE INDEX IF NOT EXISTS "idx_apps_publisher_id" ON "apps"("publisher_id");
CREATE INDEX IF NOT EXISTS "idx_apps_channel_id" ON "apps"("channel_id");
CREATE INDEX IF NOT EXISTS "idx_apps_status" ON "apps"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_apps_server_slug" ON "apps"("server_id", "slug") WHERE "slug" IS NOT NULL;

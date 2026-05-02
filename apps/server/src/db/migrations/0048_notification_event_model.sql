ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "kind" varchar(80) DEFAULT 'system' NOT NULL,
  ADD COLUMN IF NOT EXISTS "scope_server_id" uuid,
  ADD COLUMN IF NOT EXISTS "scope_channel_id" uuid,
  ADD COLUMN IF NOT EXISTS "scope_dm_channel_id" uuid,
  ADD COLUMN IF NOT EXISTS "aggregation_key" varchar(240),
  ADD COLUMN IF NOT EXISTS "aggregated_count" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_aggregated_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint

UPDATE "notifications"
SET "kind" = COALESCE(NULLIF("reference_type", ''), "type"::text, 'system')
WHERE "kind" = 'system';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_user_unread_created_idx"
  ON "notifications" ("user_id", "is_read", "last_aggregated_at", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_scope_channel_idx"
  ON "notifications" ("scope_channel_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_scope_server_idx"
  ON "notifications" ("scope_server_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_scope_dm_channel_idx"
  ON "notifications" ("scope_dm_channel_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notifications_aggregation_idx"
  ON "notifications" ("user_id", "aggregation_key", "is_read");

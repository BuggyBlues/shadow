CREATE TABLE IF NOT EXISTS "channel_join_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  CONSTRAINT "channel_join_requests_channel_id_channels_id_fk"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE cascade,
  CONSTRAINT "channel_join_requests_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "channel_join_requests_reviewed_by_users_id_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE set null,
  CONSTRAINT "channel_join_requests_channel_user_unique"
    UNIQUE ("channel_id", "user_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "channel_join_requests_channel_status_idx"
  ON "channel_join_requests" ("channel_id", "status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "channel_join_requests_user_status_idx"
  ON "channel_join_requests" ("user_id", "status");

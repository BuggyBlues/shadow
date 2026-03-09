-- Create channel_members table for per-channel membership
CREATE TABLE IF NOT EXISTS "channel_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Create unique index to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_channel_user_unique" ON "channel_members" ("channel_id", "user_id");

-- Backfill: add all existing server members to all channels in their servers
INSERT INTO "channel_members" ("channel_id", "user_id")
SELECT c.id, m.user_id
FROM channels c
JOIN members m ON m.server_id = c.server_id
ON CONFLICT DO NOTHING;

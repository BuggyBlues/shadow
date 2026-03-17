CREATE TABLE IF NOT EXISTS "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"dm_channel_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_messages_dm_channel_id_dm_channels_id_fk') THEN
    ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_dm_channel_id_dm_channels_id_fk" FOREIGN KEY ("dm_channel_id") REFERENCES "public"."dm_channels"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_messages_author_id_users_id_fk') THEN
    ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
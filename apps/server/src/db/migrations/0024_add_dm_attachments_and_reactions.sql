-- DM Attachments
CREATE TABLE IF NOT EXISTS "dm_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dm_message_id" uuid NOT NULL REFERENCES "dm_messages"("id") ON DELETE CASCADE,
  "filename" varchar(255) NOT NULL,
  "url" text NOT NULL,
  "content_type" varchar(100) NOT NULL,
  "size" integer NOT NULL,
  "width" integer,
  "height" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- DM Reactions
CREATE TABLE IF NOT EXISTS "dm_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dm_message_id" uuid NOT NULL REFERENCES "dm_messages"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "emoji" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dm_reactions_unique" UNIQUE("dm_message_id", "user_id", "emoji")
);

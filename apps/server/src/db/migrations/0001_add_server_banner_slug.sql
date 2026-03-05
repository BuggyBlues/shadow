ALTER TABLE "servers" ADD COLUMN IF NOT EXISTS "slug" varchar(100);--> statement-breakpoint
ALTER TABLE "servers" ADD COLUMN IF NOT EXISTS "banner_url" text;

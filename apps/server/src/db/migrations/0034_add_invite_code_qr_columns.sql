-- Add QR code support columns to invite_codes table
-- This migration adds columns needed for QR code functionality
-- without modifying existing columns

-- Add new columns for QR code support
ALTER TABLE "invite_codes" 
  ADD COLUMN IF NOT EXISTS "type" varchar(20) DEFAULT 'server' NOT NULL,
  ADD COLUMN IF NOT EXISTS "server_id" uuid REFERENCES "servers"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "channel_id" uuid REFERENCES "channels"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "max_uses" integer,
  ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0 NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS "idx_invite_codes_type" ON "invite_codes"("type");
CREATE INDEX IF NOT EXISTS "idx_invite_codes_server_id" ON "invite_codes"("server_id");
CREATE INDEX IF NOT EXISTS "idx_invite_codes_channel_id" ON "invite_codes"("channel_id");
CREATE INDEX IF NOT EXISTS "idx_invite_codes_user_id" ON "invite_codes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_invite_codes_expires_at" ON "invite_codes"("expires_at") WHERE "expires_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_invite_codes_valid" ON "invite_codes"("code", "is_active", "expires_at") 
  WHERE "is_active" = true AND ("expires_at" IS NULL OR "expires_at" > NOW());

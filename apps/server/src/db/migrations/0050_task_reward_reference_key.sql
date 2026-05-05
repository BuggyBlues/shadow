ALTER TABLE "user_reward_logs"
  ADD COLUMN IF NOT EXISTS "reference_key" varchar(100) DEFAULT '__none__' NOT NULL;
--> statement-breakpoint
UPDATE "user_reward_logs"
SET "reference_key" = COALESCE(NULLIF("reference_id", ''), '__none__');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_reward_reference_key_unique"
  ON "user_reward_logs" USING btree ("user_id", "reward_key", "reference_key");

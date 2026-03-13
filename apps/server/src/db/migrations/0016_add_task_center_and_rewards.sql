CREATE TABLE IF NOT EXISTS "user_task_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "task_key" varchar(64) NOT NULL,
  "cycle_key" varchar(64) DEFAULT 'once' NOT NULL,
  "reward_amount" integer DEFAULT 0 NOT NULL,
  "reward_type" varchar(32) DEFAULT 'shrimp_coin' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_reward_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "reward_key" varchar(100) NOT NULL,
  "reference_id" varchar(100),
  "amount" integer NOT NULL,
  "note" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "is_repeatable" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "user_task_claims" ADD CONSTRAINT "user_task_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_reward_logs" ADD CONSTRAINT "user_reward_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "user_task_claim_unique" ON "user_task_claims" USING btree ("user_id","task_key","cycle_key");
CREATE UNIQUE INDEX IF NOT EXISTS "user_reward_unique" ON "user_reward_logs" USING btree ("user_id","reward_key","reference_id");

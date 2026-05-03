CREATE TABLE IF NOT EXISTS "wallet_usage_accruals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "source" varchar(50) NOT NULL,
  "accrued_micros" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "wallet_usage_accruals_wallets_id_fk"
    FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "wallet_usage_accruals_wallet_source_unique"
    UNIQUE ("wallet_id", "source")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_usage_accruals_wallet_id_idx"
  ON "wallet_usage_accruals" USING btree ("wallet_id");

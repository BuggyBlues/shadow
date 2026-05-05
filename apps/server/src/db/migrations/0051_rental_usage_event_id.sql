ALTER TABLE "rental_usage_records"
  ADD COLUMN IF NOT EXISTS "usage_event_id" varchar(120);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rental_usage_records_usage_event_unique"
  ON "rental_usage_records" USING btree ("contract_id", "usage_event_id");

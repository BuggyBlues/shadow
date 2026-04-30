CREATE TABLE IF NOT EXISTS "cloud_agent_usage_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "agent_user_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "source" varchar(64) DEFAULT 'openclaw-trajectory' NOT NULL,
  "model" varchar(255),
  "total_usd" double precision,
  "input_tokens" integer,
  "output_tokens" integer,
  "cache_read_tokens" integer,
  "cache_write_tokens" integer,
  "total_tokens" integer,
  "providers" jsonb DEFAULT '[]'::jsonb,
  "raw" jsonb,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cloud_agent_usage_snapshots_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade,
  CONSTRAINT "cloud_agent_usage_snapshots_agent_user_id_users_id_fk"
    FOREIGN KEY ("agent_user_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "cloud_agent_usage_snapshots_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "cloud_agent_usage_snapshots_agent_id_unique_idx"
  ON "cloud_agent_usage_snapshots" ("agent_id");

CREATE INDEX IF NOT EXISTS "cloud_agent_usage_snapshots_owner_id_idx"
  ON "cloud_agent_usage_snapshots" ("owner_id");

CREATE INDEX IF NOT EXISTS "cloud_agent_usage_snapshots_updated_at_idx"
  ON "cloud_agent_usage_snapshots" ("updated_at");

-- Workspace node kind enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_node_kind') THEN
    CREATE TYPE "public"."workspace_node_kind" AS ENUM('dir', 'file');
  END IF;
END $$;

-- Workspaces table (one per server)
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "server_id" uuid NOT NULL REFERENCES "servers"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Workspace nodes table (files & folders tree)
CREATE TABLE IF NOT EXISTS "workspace_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "parent_id" uuid,
  "kind" "workspace_node_kind" NOT NULL,
  "name" varchar(500) NOT NULL,
  "path" text NOT NULL,
  "pos" integer DEFAULT 0 NOT NULL,
  "ext" varchar(50),
  "mime" varchar(255),
  "size_bytes" integer,
  "content_ref" text,
  "preview_url" text,
  "flags" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_workspaces_server" ON "workspaces" ("server_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_nodes_workspace" ON "workspace_nodes" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_nodes_parent" ON "workspace_nodes" ("workspace_id", "parent_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_nodes_path" ON "workspace_nodes" ("workspace_id", "path");

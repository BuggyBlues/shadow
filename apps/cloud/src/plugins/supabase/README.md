# Supabase Plugin

Supabase BackendOps supports Auth, RLS, schema design, migrations, logs, storage, edge functions, and database troubleshooting.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Yes | Yes | Supabase personal access token for management APIs and MCP workflows. |
| `SUPABASE_PROJECT_REF` | No | No | Optional default project ref. |
| `SUPABASE_DB_PASSWORD` | No | Yes | Optional database password for migration and SQL tasks. |

## Setup

1. Open Supabase account settings.
2. Create a personal access token.
3. Add the token as `SUPABASE_ACCESS_TOKEN`.
4. Copy the project ref from the Supabase project URL or settings and set `SUPABASE_PROJECT_REF` if useful.
5. Add `SUPABASE_DB_PASSWORD` only when the Buddy must run database or migration workflows.
6. Deploy the Buddy and verify `supabase --version` plus the mounted Supabase skills.

## Runtime Assets

- Installs the `supabase` CLI.
- Registers `@supabase/mcp-server-supabase`.
- Mounts official Supabase agent skills from `supabase/agent-skills`.

## References

- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Agent Skills](https://supabase.com/docs/guides/getting-started/ai-skills)
- [Supabase personal access tokens](https://supabase.com/docs/guides/platform/access-control/personal-access-tokens)
- [Supabase agent skills repository](https://github.com/supabase/agent-skills)

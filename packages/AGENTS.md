# Packages Map

Shared packages are the repo's stability layer. Prefer reusing them over cloning helpers into apps.

## Package guide

- `shared/` — cross-app types, constants, and utilities
- `sdk/` — typed TypeScript client for Shadow APIs
- `sdk-python/` — Python SDK; sync when API contracts change
- `cli/` — Shadow command-line client and CLI-focused tests
- `oauth/` — OAuth helpers and related contracts
- `ui/` — reusable UI primitives shared by app surfaces
- `openclaw-shadowob/` — OpenClaw integration package and synced skills bundle

## Important boundaries

- API shape changes must sync `packages/sdk/`, `packages/sdk-python/`, and relevant docs.
- CLI-specific end-to-end tests live separately from unit tests so they can run in their own CI lane.
- Shared utilities should be the home for reusable invariants, not ad-hoc copies inside apps.

## Read next

- `docs/development/agent-first-repo.md`
- `docs/development/test-matrix.md`
- `scripts/AGENTS.md` for consistency and repo-check scripts

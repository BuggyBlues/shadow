# Shadow — Agent Map

This repository is organized as a **map, not a manual**.
Start here, then descend into the closest sub-map before editing code.

## Start here

- `CLAUDE.md` — repository-wide delivery rules
- `docs/ARCHITECTURE.md` — system topology and major runtime boundaries
- `docs/development/agent-first-repo.md` — why this repo is organized for agent-first work
- `docs/development/test-matrix.md` — test lanes, compose entrypoints, and parallelism rules

## Progressive disclosure

- `apps/AGENTS.md` — deployable apps and UI/client boundaries
- `packages/AGENTS.md` — shared libraries, SDKs, and CLI surfaces
- `docs/AGENTS.md` — durable knowledge and engineering notes
- `scripts/AGENTS.md` — deterministic checks, release helpers, and CI utilities
- `website/AGENTS.md` — documentation site and docs-only E2E validation

## Route changes by area

- Backend/API/auth/realtime/data → `apps/server/` + `packages/sdk/` + `packages/shared/`
- User product UI → `apps/web/` and, when user-facing, `apps/mobile/`
- Admin surfaces → `apps/admin/`
- Desktop shell and Playwright flows → `apps/desktop/`
- Cloud deploy tooling and dashboard → `apps/cloud/`
- Docs/content/site chrome → `docs/` + `website/`

## Hard rules

- User-facing copy must go through i18n.
- New user-facing product features should land on both web and mobile when applicable.
- API changes must sync docs, the TypeScript SDK, and the Python SDK.
- Prefer codified checks over tribal knowledge. If you add a new repo map or test lane, update the docs and `pnpm check:agents`.
- Keep `AGENTS.md` files short and navigable; details belong in focused docs.

## CI ownership

- GitHub Actions owns validation for this repository.
- Keep docs focused on which lane covers which risk, not on local preflight command checklists.
- If a validation lane changes, update the workflow, compose entrypoint, and `docs/development/test-matrix.md` together.

If a task touches multiple boundaries, update the nearest map and the corresponding long-form doc instead of stuffing more detail into this file.

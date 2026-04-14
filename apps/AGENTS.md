# Apps Map

Use this file to pick the right app boundary before editing.

## App guide

- `server/` — Hono API, Socket.IO, Drizzle, Redis, MinIO integration
- `web/` — main React product UI for end users
- `admin/` — admin/dashboard-only web surface
- `desktop/` — Electron shell plus Playwright screenshot and demo flows
- `mobile/` — Expo client; keep user-facing behavior aligned with `web/`
- `cloud/` — Kubernetes deployment CLI + dashboard surface
- `playground/` — experiments and isolated sandboxes

## Read before changing

- System-level runtime context: `docs/ARCHITECTURE.md`
- Agent-first repo rules: `docs/development/agent-first-repo.md`
- Test routing: `docs/development/test-matrix.md`

## Change-routing hints

- Auth/session/API contract changes usually affect `server/`, `web/`, `mobile/`, and `packages/sdk/`.
- Shared UI or copy changes often affect `web/`, `mobile/`, and `packages/ui/`.
- Desktop Playwright specs reuse seeded state; CI parallelism is done by shard isolation, not by piling more workers into one stack.
- `cloud/` has three distinct lanes: unit tests, CLI integration tests, and live-infra E2E.

## Guardrails

- Do not hardcode user-facing strings.
- Keep new product behavior consistent across web and mobile unless the platform explicitly differs.
- When adding a new app or a new test lane, update this map and `docs/development/test-matrix.md`.

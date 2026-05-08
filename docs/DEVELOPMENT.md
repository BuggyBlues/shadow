# Development Guide

This guide describes the current monorepo layout, local startup options, and CI-aligned checks for
Shadow contributors.

## Prerequisites

- Node.js 22.14+
- pnpm 10+
- Docker and Docker Compose
- Optional for Shadow Cloud work: `kubectl`, a reachable Kubernetes cluster, and a kubeconfig

## Install

```bash
pnpm install
cp .env.example .env
```

The root `prepare` script also repairs the local `apps/flash` package symlink layout used by pnpm.

## Local Stack

The default Docker Compose file starts:

| Service | Port |
|---|---|
| PostgreSQL | `5432` |
| Redis | `16379` |
| MinIO API | `9000` |
| MinIO Console | `9001` |
| Server API | `3002` |
| Web | `3000` |
| Admin | `3001` |

```bash
docker compose up --build
```

For split local development:

```bash
pnpm dev:backend
pnpm dev:frontend
```

`dev:backend` runs the server and Cloud backend watchers against dockerized infrastructure.
`dev:frontend` runs web, admin, Cloud dashboard, and website frontends while the API comes from the
dockerized server.

## Package Map

| Package | Common Commands |
|---|---|
| `@shadowob/server` | `pnpm --filter @shadowob/server test`, `pnpm --filter @shadowob/server db:migrate` |
| `@shadowob/web` | `pnpm --filter @shadowob/web dev`, `pnpm --filter @shadowob/web typecheck` |
| `@shadowob/mobile` | `pnpm --filter @shadowob/mobile start`, `pnpm --filter @shadowob/mobile typecheck` |
| `@shadowob/cloud` | `pnpm --filter @shadowob/cloud test`, `pnpm --filter @shadowob/cloud console:dev` |
| `@shadowob/desktop` | `pnpm --filter @shadowob/desktop test:e2e` |
| `@shadowob/sdk` | `pnpm --filter @shadowob/sdk build`, `pnpm --filter @shadowob/sdk test` |
| `@shadowob/openclaw-shadowob` | `pnpm --filter @shadowob/openclaw-shadowob test` |
| `@shadowob/promo` | `pnpm promo:dev`, `pnpm promo:still`, `pnpm promo:render` |

## Database

Server migrations live in `apps/server/src/db/migrations`.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

When changing schema or API behavior, keep generated types, SDKs, tests, and docs in sync.

## Tests and CI Parity

Project policy is that CI-like verification should run through Docker Compose.

### Full CI Test Stack

```bash
docker compose -f docker-compose.ci-tests.yml up --build --abort-on-container-exit --exit-code-from ci-tests
```

This stack runs linting, version checks, workspace dependency checks, pre-push checks, package builds,
typechecks, database migration, and Vitest suites inside the CI container.

### CI Build Stack

```bash
docker compose -f docker-compose.ci-build.yml up --build --abort-on-container-exit --exit-code-from build-check
```

### Screenshot / E2E Stack

```bash
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from e2e-runner
```

This produces reusable product screenshots in `docs/e2e/screenshots`.

### Focused Local Checks

Focused local commands are still useful while iterating:

```bash
pnpm exec biome check --write <paths>
pnpm --filter @shadowob/server test
pnpm --filter @shadowob/web typecheck
pnpm --filter @shadowob/cloud test
pnpm promo:typecheck
```

Before relying on a result for CI, rerun the matching Docker Compose stack.

## Cloud Development Notes

Shadow Cloud lives in `apps/cloud` and includes CLI commands, a dashboard, HTTP interfaces, template
services, deployment services, runtime adapters, and Kubernetes/Pulumi infrastructure code.

Cloud deployment work usually needs:

- `KMS_MASTER_KEY`
- `KUBECONFIG_HOST_PATH`
- `KUBECONFIG`
- `KUBECONFIG_CONTEXT` when needed
- `KUBECONFIG_LOOPBACK_HOST` for local cluster loopback rewriting
- `SHADOW_SERVER_URL`
- `SHADOW_AGENT_SERVER_URL`
- `PULUMI_CONFIG_PASSPHRASE`

Read [development/cloud-saas-deployment.md](development/cloud-saas-deployment.md) before changing
Cloud deployment behavior.

## API and SDK Sync

When an API changes, update all affected surfaces:

1. API documentation and examples.
2. TypeScript SDK types and methods in `packages/sdk`.
3. Python SDK if the changed endpoint is exposed there.
4. CLI commands if the API is part of the automation surface.
5. Web and mobile consumers when user-facing behavior changes.

## UI and i18n

User-facing copy must go through the project's i18n system. Do not hardcode labels, placeholders,
errors, notifications, tooltips, or page titles in web, mobile, or website UI.

For new product features, implement the behavior on both web and mobile when the feature applies to
both platforms.

## Promo Workflow

The promotional video source is in `apps/promo`.

```bash
pnpm promo:sync-assets
pnpm promo:dev
pnpm promo:still
pnpm promo:render
```

Generated visual materials should be approved for style before they are added to the final promo
asset slots.

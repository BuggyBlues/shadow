# Test Matrix

This document defines the default test lanes for Shadow and the **safe place to add parallelism**.

All lanes below are CI-owned. They describe what GitHub Actions runs, not a required local checklist.

## Lane overview

| Lane | Scope | CI entrypoint | Parallelism model | Notes |
| --- | --- | --- | --- | --- |
| Unit tests | fast workspace unit suites (`cloud`, `web`, `mobile`, `shared`, `sdk`, `cli`, `openclaw-shadowob`) + root Vitest | `docker-compose.ci-unit.yml` → `unit-tests` | packages run in parallel inside the lane | no external services required |
| CLI integration | `packages/cli` E2E/functional coverage | `docker-compose.ci-unit.yml` → `cli-integration-tests` | own lane, independent from server | network-bound subset remains opt-in behind env flags |
| Cloud CLI integration | `apps/cloud` template/manifest CLI integration | `docker-compose.ci-unit.yml` → `cloud-cli-integration-tests` | own lane; internal tests may run concurrently | requires a built CLI dist, but no Kubernetes cluster |
| Server integration | `apps/server` Vitest suite | `docker-compose.ci-integration.yml` → `server-integration-tests` | isolated lane | needs Postgres + Redis + MinIO + DB migration |
| Desktop web E2E | Playwright browser flows in `apps/desktop/e2e/05_web` | `docker-compose.e2e.yml` → `e2e-runner` | shard across workflow jobs | each shard gets its own compose stack via `PLAYWRIGHT_SHARD` |
| Website E2E | docs-site Playwright checks | `docker-compose.ci-unit.yml` → `website-e2e` | separate lane | Playwright boots the docs dev server inside the container |

## Safe parallelism rules

### Parallelize across lanes first

If two tasks do not share runtime state, prefer separate jobs over cramming them into one long shell script.

Good examples:

- unit tests vs server integration
- cloud CLI integration vs website E2E
- desktop E2E shard 1 vs shard 2 on separate runners

### Keep shared-state suites isolated

Some suites intentionally **do not** fan out inside one runtime:

- `apps/server` tests depend on a shared Postgres/Redis/MinIO stack and migration state
- desktop web Playwright flows reuse one seeded session file and mutate overlapping app data
- cloud live-infra E2E (`apps/cloud` `test:e2e`) targets shared cluster resources and should remain sequential unless infra isolation is added

When in doubt, parallelize by **spinning another isolated stack** rather than adding more workers to one shared stack.

## Entry points to keep in sync

- package scripts in `package.json`
- compose files: `docker-compose.ci-unit.yml`, `docker-compose.ci-integration.yml`, `docker-compose.ci-tests.yml`, `docker-compose.e2e.yml`
- workflow jobs in `.github/workflows/pr-checks.yml` and `.github/workflows/post-merge.yml`

If you add a new test lane, update all three places in the same PR.

# Agent-First Repository Guide

This repository now follows a harness-engineering-inspired shape:

1. **The repo is the system of record** — if an agent needs a rule repeatedly, it should live in a versioned file or script.
2. **Maps beat manuals** — `AGENTS.md` files stay short and point to deeper sources of truth.
3. **Mechanical enforcement beats memory** — checks in `scripts/` and CI should guard important invariants.

## Map hierarchy

The navigation stack is intentionally shallow:

- `AGENTS.md` — root map and cross-repo routing
- `apps/AGENTS.md` — app boundary map
- `packages/AGENTS.md` — shared package map
- `docs/AGENTS.md` — durable knowledge tree
- `scripts/AGENTS.md` — deterministic checks and CI helpers
- `website/AGENTS.md` — docs-site map

If a future top-level directory becomes important for day-to-day work, it should earn its own `AGENTS.md` rather than bloating the root file.

## What gets codified

The repository should encode the things that are expensive to rediscover:

- how work is divided across apps and packages
- where to update docs when architecture or flows change
- which test lane owns which risk
- which checks must stay in CI

When a new workflow matters repeatedly, prefer one of these upgrades:

- a new focused doc in `docs/development/`
- a new deterministic script in `scripts/`
- a new CI lane or compose entrypoint

## Mechanical guardrails

`pnpm check:agents` verifies that the top-level repo maps and long-form docs exist and stay linked from the root `AGENTS.md`.

That rule is intentionally simple: it keeps the navigation scaffold alive without turning maps into encyclopedias.

## Feedback loops

CI is split by risk instead of forcing every test through one monolithic container:

- repo checks and typechecking
- unit tests
- CLI/cloud integration tests
- server integration tests
- desktop web E2E shards
- website E2E

These lanes are CI-owned feedback loops, not a required local checklist for opening a PR.

Independent tasks should run in parallel at the workflow level. Shared-state tasks should stay isolated in their own lane instead of blocking unrelated work.

## When to update this doc

Update this file when any of the following changes:

- a new top-level area is added
- the repo map hierarchy changes
- a new CI lane or compose entrypoint becomes part of the default workflow
- a recurring human review comment can be turned into a codified repo rule

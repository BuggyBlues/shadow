# Docs Map

The `docs/` tree is the repository's durable memory.
If knowledge matters for future humans or agents, put it here in a focused document.

## High-signal docs

- `ARCHITECTURE.md` — runtime topology and package/app boundaries
- `development/agent-first-repo.md` — repo-as-system-of-record conventions
- `development/test-matrix.md` — test grouping, compose entrypoints, and parallelism rules
- `development/github-actions-automation.md` — CI automation notes
- `e2e/` — screenshot artifacts and supporting docs for browser flows

## Writing rules

- Add maps and indexes that point to deeper docs; avoid giant instruction blobs.
- When code behavior changes, update the closest durable doc in the same PR.
- Prefer small, composable docs over one mega handbook.
- If a new top-level engineering convention appears, add it here and link it from `AGENTS.md`.

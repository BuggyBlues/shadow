# Scripts Map

The `scripts/` directory holds mechanical checks and repeatable repository tasks.

## Script groups

- Consistency checks — workspace deps, exports, SDK version alignment, i18n, staged typecheck
- Release/publish helpers — package publishing, model preset sync, deploy helpers
- E2E support — screenshot seeding, README gallery capture, demo GIF orchestration
- CI glue — pre-push checks and agent-doc validation

## Guidelines

- Prefer deterministic scripts over prose-only instructions.
- Keep scripts single-purpose and composable so CI can run them independently.
- If a new repo rule matters repeatedly, encode it here and hook it into package scripts or CI.

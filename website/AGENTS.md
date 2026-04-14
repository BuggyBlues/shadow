# Website Map

`website/` is the docs site and public-facing documentation surface.

## Main areas

- `docs/` — content pages and authored documentation
- `theme/` and `components/` — docs-site presentation and custom rendering
- `plugins/` — Rspress extensions and site-specific hooks
- `playwright.config.ts` — website E2E checks

## Rules

- Keep docs-site changes isolated from product app behavior unless a shared asset truly needs both.
- Meaningful UX or routing changes are covered by the website E2E lane in CI.
- If a docs-site convention becomes important, document it in `docs/` and link it from here.

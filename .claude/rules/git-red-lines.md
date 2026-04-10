# Git Red Line Rules

These rules MUST be enforced. Never bypass them.

## Never Push Directly to Main

- All code changes must be done inside a git worktree
- All changes must be submitted via `gh pr create` Pull Request
- Never commit or push directly on the main branch

## PR Requirements

- PR titles and descriptions must be in English
- Rebase on latest main before pushing
- Run type checks, lint, and tests before submitting

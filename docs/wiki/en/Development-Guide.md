# Development Guide

Standards, conventions, and workflow for contributing to Shadow.

## Branching Strategy

- `main` is the stable branch. **Never push directly** to `main`.
- Create feature branches from `main`:

```bash
git checkout -b feat/my-feature main
```

### Branch Naming

| Prefix     | Usage                 | Example                    |
|------------|-----------------------|----------------------------|
| `feat/`    | New feature           | `feat/voice-channels`      |
| `fix/`     | Bug fix               | `fix/login-redirect`       |
| `refactor/`| Code refactoring      | `refactor/auth-middleware`  |
| `docs/`    | Documentation         | `docs/api-reference`       |
| `chore/`   | Maintenance           | `chore/update-deps`        |

## Commit Convention

Shadow uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by Commitlint:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                                |
|------------|--------------------------------------------|
| `feat`     | A new feature                              |
| `fix`      | A bug fix                                  |
| `docs`     | Documentation only changes                 |
| `style`    | Formatting, missing semicolons, etc.       |
| `refactor` | Code change that neither fixes nor adds    |
| `perf`     | Performance improvement                    |
| `test`     | Adding or updating tests                   |
| `chore`    | Build process or tooling changes           |
| `ci`       | CI configuration                           |

### Scopes

Use app/package names: `web`, `server`, `desktop`, `mobile`, `admin`, `shared`, `ui`, `sdk`, `openclaw`, `oauth`.

Example:

```bash
git commit -m "feat(web): add voice channel UI"
git commit -m "fix(server): handle expired JWT gracefully"
```

## Code Style

Shadow uses **Biome** for both linting and formatting (replaces ESLint + Prettier):

```bash
# Check for issues
pnpm lint

# Auto-fix
pnpm lint:fix

# Format only
pnpm format
```

### Key Rules

- **No `any` type** — Use proper TypeScript types
- **No `console.log`** — Use Pino logger on the server
- **Imports** — Sorted automatically by Biome
- **Semicolons** — Omitted (Biome default)
- **Quotes** — Double quotes
- **Indentation** — Tabs

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Desktop E2E
pnpm --dir ./apps/desktop test:e2e
```

### Test Organization

- Unit tests: `packages/*/__tests__/` and `apps/*/__tests__/`
- E2E tests: `apps/desktop/e2e/`

### Writing Tests

- Use **Vitest** for unit/integration tests
- Use **Playwright** for E2E tests
- Place test files in `__tests__/` directories alongside source
- Name test files: `*.test.ts` or `*.test.tsx`

## Database Migrations

Shadow uses **Drizzle ORM** with migration files:

```bash
# Generate a migration after schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Browse the database with Drizzle Studio
pnpm db:studio
```

## Adding a New Feature

### Backend Feature

1. **Schema** — Add/modify tables in `apps/server/src/db/schema/`
2. **Migration** — Run `pnpm db:generate` to create migration files
3. **DAO** — Create data access methods in `apps/server/src/dao/`
4. **Service** — Implement business logic in `apps/server/src/services/`
5. **Validator** — Add Zod schemas in `apps/server/src/validators/`
6. **Handler** — Create HTTP route handlers in `apps/server/src/handlers/`
7. **Register** — Wire up the DI container in `apps/server/src/container.ts`
8. **Routes** — Register routes in `apps/server/src/app.ts`

### Frontend Feature

1. **Types** — Add shared types in `packages/shared/src/types/` if needed
2. **API** — Add API calls in the app's `lib/api` module
3. **Store** — Create/update Zustand stores if needed
4. **Components** — Build UI components in `components/`
5. **Page** — Create route pages in `pages/`
6. **i18n** — Add translation keys to all locale files

### WebSocket Feature

1. **Events** — Define event names in `packages/shared/src/constants/`
2. **Gateway** — Implement server-side handler in `apps/server/src/ws/`
3. **Client** — Listen for events in the frontend via Socket.IO client

## Pull Request Checklist

- [ ] Code follows project coding standards (Biome passes)
- [ ] Tests added/updated for new functionality
- [ ] Database migrations generated if schema changed
- [ ] Translation keys added to all locale files
- [ ] No `console.log` statements left in code
- [ ] Commit messages follow Conventional Commits
- [ ] PR description explains what and why

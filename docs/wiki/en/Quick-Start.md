# Quick Start

Get Shadow running locally in under 5 minutes.

## One-Command Setup

```bash
# Clone and enter the project
git clone https://github.com/buggyblues/shadow.git && cd shadow

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up postgres redis minio -d

# Start all dev servers
pnpm dev
```

## Access the Platform

| Service       | URL                    | Description                    |
|---------------|------------------------|--------------------------------|
| Web App       | http://localhost:3000   | Main user-facing application   |
| Admin Panel   | http://localhost:3001   | Admin dashboard                |
| API Server    | http://localhost:3002   | REST API + WebSocket endpoint  |
| MinIO Console | http://localhost:9001   | Object storage admin UI        |

## First Steps

### 1. Register an Account

Open http://localhost:3000 and register a new account, or use the default admin credentials:

- **Email**: `admin@shadowob.app`
- **Password**: `admin123456`

### 2. Create a Server

Click the **+** button in the left sidebar to create a new server. Give it a name and optionally upload an icon.

### 3. Create Channels

Inside your server, click the **+** button next to channel groups to create text channels.

### 4. Invite Members

Use the invite feature to generate a join link/code for other users.

### 5. Start Chatting

Select a channel and start sending messages! Shadow supports:

- **Markdown** formatting
- **File attachments** (drag & drop or click to upload)
- **Emoji reactions**
- **Threaded replies**
- **@mentions**

## Running Individual Apps

You can also run individual applications:

```bash
# Server only
pnpm --dir ./apps/server dev

# Web only
pnpm --dir ./apps/web dev

# Admin only
pnpm --dir ./apps/admin dev

# Desktop (Electron)
pnpm --dir ./apps/desktop dev

# Mobile (Expo)
pnpm --dir ./apps/mobile start
```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Desktop E2E tests (Playwright)
pnpm --dir ./apps/desktop test:e2e
```

## Useful Commands

| Command                 | Description                              |
|-------------------------|------------------------------------------|
| `pnpm dev`              | Start all dev servers in parallel        |
| `pnpm build`            | Build all packages and apps              |
| `pnpm lint`             | Lint all files with Biome                |
| `pnpm lint:fix`         | Auto-fix lint issues                     |
| `pnpm format`           | Format all files with Biome              |
| `pnpm test`             | Run all unit tests                       |
| `pnpm db:generate`      | Generate Drizzle migration files         |
| `pnpm db:migrate`       | Run database migrations                  |
| `pnpm db:studio`        | Open Drizzle Studio (DB browser)         |

## Next Steps

- [Architecture Overview](Architecture-Overview.md) — Understand the system design
- [Development Guide](Development-Guide.md) — Coding standards and conventions
- [API Reference](API-Reference.md) — REST API endpoints

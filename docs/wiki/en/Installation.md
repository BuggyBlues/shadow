# Installation

This guide walks you through setting up the Shadow development environment from scratch.

## Prerequisites

| Tool              | Version  | Installation                                                        |
|-------------------|----------|---------------------------------------------------------------------|
| **Node.js**       | ≥ 22     | [nodejs.org](https://nodejs.org/) or `nvm install 22`               |
| **pnpm**          | ≥ 10     | `corepack enable && corepack prepare pnpm@10.19.0 --activate`       |
| **Docker**        | ≥ 24     | [docker.com](https://www.docker.com/get-started/)                   |
| **Docker Compose**| ≥ 2.20   | Bundled with Docker Desktop                                         |
| **Git**           | ≥ 2.30   | [git-scm.com](https://git-scm.com/)                                |

## Clone the Repository

```bash
git clone https://github.com/BuggyBlues/shadow.git
cd shadow
```

## Install Dependencies

Shadow uses **pnpm workspaces** for monorepo management. Install all dependencies with a single command:

```bash
pnpm install
```

This installs dependencies for all apps (`web`, `server`, `admin`, `desktop`, `mobile`) and shared packages (`shared`, `ui`, `sdk`, `openclaw`, `oauth`).

## Start Infrastructure

Shadow requires PostgreSQL, Redis, and MinIO. The easiest way to run them is via Docker Compose:

```bash
docker compose up postgres redis minio -d
```

### Default Infrastructure Ports

| Service         | Port  | Credentials                       |
|-----------------|-------|-----------------------------------|
| PostgreSQL      | 5432  | `shadow` / `shadow`               |
| Redis           | 16379 | (no auth)                         |
| MinIO API       | 9000  | `minioadmin` / `minioadmin`       |
| MinIO Console   | 9001  | `minioadmin` / `minioadmin`       |

## Run Database Migrations

```bash
pnpm db:migrate
```

This runs Drizzle ORM migrations to create all required database tables. Migrations are also run automatically on server startup.

## Environment Variables

Create a `.env` file in the project root to customize configuration. The server reads environment variables with sensible defaults:

```env
# Database
DATABASE_URL=postgres://shadow:shadow@localhost:5432/shadow

# Redis
REDIS_URL=redis://localhost:16379

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=shadow

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=3002
```

## Verify Installation

```bash
pnpm dev
```

If everything is set up correctly:

- **Web App** → http://localhost:3000
- **Admin Panel** → http://localhost:3001
- **API Server** → http://localhost:3002

## Next Steps

- [Quick Start](Quick-Start.md) — Create your first server and channel
- [Development Guide](Development-Guide.md) — Learn the coding workflow
- [Architecture Overview](Architecture-Overview.md) — Understand the system design

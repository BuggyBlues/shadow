# Database Schema

Shadow uses PostgreSQL 16 with Drizzle ORM. This document covers the core table groups.

## Entity-Relationship Overview

```
users ─┬── server_members ──── servers ─┬── channels ──── messages
       │                                │                    │
       │                                ├── roles            ├── reactions
       │                                │                    └── attachments
       │                                ├── invites
       │                                └── channel_members
       │
       ├── notifications
       ├── user_settings
       └── oauth_tokens
```

## Core Communication Tables

### `users`

| Column        | Type        | Description              |
|---------------|-------------|--------------------------|
| id            | UUID (PK)   | User identifier          |
| username      | VARCHAR     | Unique username          |
| email         | VARCHAR     | Unique email             |
| password_hash | VARCHAR     | bcrypt hash              |
| display_name  | VARCHAR     | Display name             |
| avatar_url    | VARCHAR     | Avatar image URL         |
| status        | ENUM        | online/offline/idle/dnd  |
| locale        | VARCHAR     | Preferred locale         |
| created_at    | TIMESTAMP   | Registration time        |

### `servers`

| Column      | Type        | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Server identifier        |
| name        | VARCHAR     | Server name              |
| icon_url    | VARCHAR     | Server icon URL          |
| owner_id    | UUID (FK)   | Server owner → users     |
| created_at  | TIMESTAMP   | Creation time            |

### `channels`

| Column      | Type        | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Channel identifier       |
| server_id   | UUID (FK)   | Parent server → servers  |
| name        | VARCHAR     | Channel name             |
| type        | ENUM        | text/voice/announcement  |
| topic       | VARCHAR     | Channel topic            |
| position    | INTEGER     | Display order            |
| created_at  | TIMESTAMP   | Creation time            |

### `messages`

| Column      | Type        | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Message identifier       |
| channel_id  | UUID (FK)   | Channel → channels       |
| author_id   | UUID (FK)   | Author → users           |
| content     | TEXT        | Message content          |
| thread_id   | UUID (FK)   | Parent message (threads) |
| created_at  | TIMESTAMP   | Send time                |
| updated_at  | TIMESTAMP   | Last edit time           |

### `server_members`

| Column      | Type        | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Membership identifier    |
| server_id   | UUID (FK)   | Server → servers         |
| user_id     | UUID (FK)   | User → users             |
| role        | ENUM        | owner/admin/member       |
| joined_at   | TIMESTAMP   | Join time                |

### `channel_members`

| Column      | Type        | Description              |
|-------------|-------------|--------------------------|
| id          | UUID (PK)   | Membership identifier    |
| channel_id  | UUID (FK)   | Channel → channels       |
| user_id     | UUID (FK)   | User → users             |
| created_at  | TIMESTAMP   | Join time                |

## Agent Tables

### `agents`

Stores registered AI agent configurations.

### `agent_sessions`

Tracks active agent sessions per channel/thread.

## OAuth Tables

### `oauth_clients`

OAuth 2.0 client applications registered with Shadow.

### `oauth_tokens`

Active access/refresh tokens for OAuth clients.

## Commerce Tables

### `products` / `skus` / `orders`

Per-server shop system with product listings, SKU variants, and order management.

### `wallets` / `transactions`

User wallet system (虾币) for in-platform transactions.

## Migrations

Migrations are stored in `apps/server/src/db/migrations/` and managed by Drizzle ORM.

```bash
# Generate migration after schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Browse database
pnpm db:studio
```

Migrations run automatically on server startup.

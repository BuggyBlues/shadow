<!-- markdownlint-disable MD033 MD041 -->

<div align="center">
  <a href="https://shadowob.com">
    <img src="apps/web/public/Logo.svg" alt="Shadow" width="112" height="112">
  </a>

  <h1>Shadow</h1>

  <p><strong>Build AI Buddy communities and deploy Agent Teams with Shadow Cloud.</strong></p>

  <p>
    Shadow is an open-source AI Buddy social/chat platform for developers and AI Builders:
    server-channel chat, durable Buddy identities, OpenClaw integration, Shadow Cloud
    Agent Team templates, SDKs, and web/mobile clients in one monorepo.
  </p>

  <p>
    <a href="#quick-start"><strong>Quick Start</strong></a>
    &nbsp;·&nbsp;
    <a href="#what-you-can-try-after-starting"><strong>What to Try</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/AI-BUILDER.md"><strong>AI Builder Guide</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/DEVELOPMENT.md"><strong>Development</strong></a>
    &nbsp;·&nbsp;
    <a href="README.zh-CN.md"><strong>中文</strong></a>
  </p>

  <p>
    <a href="https://github.com/buggyblues/shadow/actions/workflows/release-desktop.yml"><img src="https://img.shields.io/github/actions/workflow/status/buggyblues/shadow/release-desktop.yml?style=flat-square&label=build" alt="Build"></a>
    &nbsp;
    <a href="https://github.com/buggyblues/shadow/releases/latest"><img src="https://img.shields.io/github/v/release/buggyblues/shadow?style=flat-square&label=release" alt="Release"></a>
    &nbsp;
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="License"></a>
    &nbsp;
    <a href="https://github.com/buggyblues/shadow/stargazers"><img src="https://img.shields.io/github/stars/buggyblues/shadow?style=flat-square" alt="Stars"></a>
  </p>
</div>

<p align="center">
  <img src="docs/readme/hero-agent-team-cloud.png" alt="Shadow product map: chat, AI Buddies, Agent Teams, and Cloud" width="100%">
</p>

<p align="center">
  <sub>Product map: real-time chat, Buddy membership and reply policy, Discover/OpenClaw, developer APIs, and Shadow Cloud Agent Team Store -> one-click deploy -> runtime.</sub>
</p>

## What Shadow Gives You

Shadow is a working chat product plus the runtime layer for AI Buddies. Start it locally and you can
log in, create a server, chat in channels, add AI Buddies as members, connect an OpenClaw agent,
browse Agent Team templates in Shadow Cloud, and automate the system through SDKs and CLIs.

| If you want to... | Start here |
|---|---|
| Try the product quickly | [Run the Product With Docker](#option-1-run-the-product-with-docker) |
| Build an AI Buddy workflow | [What You Can Try After Starting](#what-you-can-try-after-starting) and [docs/AI-BUILDER.md](docs/AI-BUILDER.md) |
| Extend the web or server app | `apps/web`, `apps/server`, [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Deploy Agent Teams | `apps/cloud` and [docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md) |

Most chat platforms treat AI agents as add-on bots. Shadow treats them as **Buddies**: durable
participants with identity, permissions, runtime config, online status, slash commands, and a place
to collaborate with humans.

You can use this repo to build a product where:

- humans create servers and channels,
- AI Buddies join those spaces as first-class members,
- OpenClaw agents receive remote config and respond in chat,
- Shadow Cloud provides an Agent Team Store, one-click deploy flow, and runtime monitoring,
- developers automate everything through SDKs, CLIs, and APIs.

## Quick Start

### Prerequisites

- Docker and Docker Compose v2 for the fastest product run.
- Node.js 22+ and pnpm 10+ for local development.

### Option 1: Run the Product With Docker

This is the recommended first run. It starts the web app, admin dashboard, API server, database,
Redis, and object storage.

```bash
git clone https://github.com/buggyblues/shadow.git
cd shadow
cp .env.example .env
docker compose up --build
```

Open the web app:

```text
http://localhost:3000
```

Log in with the seeded admin account:

```text
Email:    admin@shadowob.app
Password: admin123456
```

Local services:

| Service | URL | What it is |
|---|---|---|
| Web | http://localhost:3000 | Main product UI |
| Admin | http://localhost:3001 | Admin dashboard |
| API | http://localhost:3002 | REST API + Socket.IO |
| MinIO | http://localhost:9001 | Object storage console |

Expected first 5 minutes:

1. Log in at `http://localhost:3000`.
2. Create a server from the left sidebar.
3. Create a text channel and send a message.
4. Open Buddy management and create your first Buddy.
5. Open Cloud to inspect Agent Team templates and the one-click deploy flow.

### Option 2: Run in Local Dev Mode

Use this when you want hot reload and local package development. For the core app, one terminal is
enough:

```bash
pnpm install
pnpm dev
```

For Cloud dashboard and backend work, use split terminals:

```bash
# Terminal A
pnpm dev:backend

# Terminal B
pnpm dev:frontend
```

`pnpm dev` starts the server, web app, and admin app with Docker infrastructure.
`dev:backend` adds Cloud backend watchers; `dev:frontend` adds web, admin, Cloud dashboard, and
website frontends.

## What You Can Try After Starting

### 1. Create a Server and Chat

In the web app, use the **+** button in the left sidebar to create a server. Then create a text
channel and send messages. This exercises the core collaboration layer:

- servers and membership,
- channels,
- real-time Socket.IO messages,
- Markdown, reactions, attachments, threads, and notifications.

Relevant code:

- `apps/web/src/components/server`
- `apps/web/src/components/channel`
- `apps/server/src/handlers/server.handler.ts`
- `apps/server/src/ws/chat.gateway.ts`

### 2. Create an AI Buddy

Open **Buddy management** to create and manage Buddies. A Buddy is backed by an agent identity,
token, status, dashboard, and remote config.

What to look for:

- Buddy profile and bot user,
- agent token generation,
- start/stop and heartbeat status,
- Buddy dashboard and activity metrics.

Relevant code:

- `apps/web/src/pages/buddy-management.tsx`
- `apps/web/src/pages/buddy-dashboard.tsx`
- `apps/server/src/handlers/agent.handler.ts`
- `apps/server/src/services/agent.service.ts`

### 3. Connect an OpenClaw Agent

Use `packages/openclaw-shadowob` when you want an OpenClaw agent to listen to Shadow channels and
reply as a Buddy.

The integration handles:

- Shadow authentication,
- channel and DM message monitoring,
- remote agent config,
- slash command registration,
- interactive message responses,
- heartbeat and readiness.

Start here:

- `packages/openclaw-shadowob/src/monitor.ts`
- `packages/openclaw-shadowob/skills/shadowob/SKILL.md`
- [docs/AI-BUILDER.md](docs/AI-BUILDER.md)

### 4. Explore Shadow Cloud

Click the **Cloud** entry in the web sidebar, or work from the CLI:

```bash
pnpm --filter @shadowob/cloud build
node apps/cloud/dist/cli.js init --list
node apps/cloud/dist/cli.js templates get gstack-buddy > shadowob-cloud.json
node apps/cloud/dist/cli.js validate -f shadowob-cloud.json
```

Without Kubernetes configured, you can still inspect the Agent Team Store, template details, and the
Cloud UI. To actually deploy Agent Teams, configure kubeconfig and runtime environment variables:

- `KUBECONFIG_HOST_PATH`
- `KUBECONFIG`
- `KMS_MASTER_KEY`
- `SHADOW_AGENT_SERVER_URL`
- `PULUMI_CONFIG_PASSPHRASE`

Full guide: [docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md).

### 5. Automate With the SDK or CLI

TypeScript SDK:

```ts
import { ShadowClient } from '@shadowob/sdk'

const client = new ShadowClient('http://localhost:3002', process.env.SHADOWOB_TOKEN!)
const me = await client.getMe()
const agents = await client.listAgents()
console.log(me.username, agents)
```

CLI:

```bash
shadowob auth login --server-url http://localhost:3002 --token <jwt>
shadowob servers list --json
shadowob agents list --json
shadowob channels send <channel-id> --content "Hello from Shadow CLI" --json
```

Relevant code:

- `packages/sdk`
- `packages/cli`
- `packages/oauth`

## How the Repo Is Organized

| Path | Purpose |
|---|---|
| `apps/server` | Hono API, Socket.IO gateways, services, DAOs, migrations, Cloud SaaS bridge. |
| `apps/web` | Main React web app. |
| `apps/mobile` | Expo mobile client. |
| `apps/desktop` | Electron client and Playwright E2E harness. |
| `apps/cloud` | Shadow Cloud CLI, dashboard, Agent Team templates, K8s-backed deployment services, agent runtimes. |
| `apps/admin` | Admin dashboard. |
| `apps/flash` | Card runtime and playground. |
| `packages/sdk` | Typed REST and Socket.IO client. |
| `packages/cli` | `shadowob` command-line client. |
| `packages/openclaw-shadowob` | OpenClaw channel plugin for Shadow. |
| `packages/shared` | Shared types, constants, utilities. |
| `packages/ui` | Shared React UI components. |
| `packages/oauth` | OAuth SDK for external apps. |

## Common Commands

| Command | Use |
|---|---|
| `docker compose up --build` | Run the full product stack. |
| `pnpm dev:backend` | Run backend watchers and infrastructure for development. |
| `pnpm dev:frontend` | Run web/admin/cloud dashboard frontends. |
| `pnpm build:packages` | Build shared packages, SDK, OAuth, CLI, and OpenClaw plugin. |
| `pnpm --filter @shadowob/server test` | Server tests. |
| `pnpm --filter @shadowob/web typecheck` | Web typecheck. |
| `pnpm --filter @shadowob/cloud test` | Cloud unit/integration tests. |
| `pnpm db:migrate` | Run server database migrations. |

CI-like verification should use Docker Compose:

```bash
docker compose -f docker-compose.ci-tests.yml up --build --abort-on-container-exit --exit-code-from ci-tests
```

## Documentation

| Topic | Link |
|---|---|
| Build AI Buddy workflows | [docs/AI-BUILDER.md](docs/AI-BUILDER.md) |
| Local development and CI | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Cloud deployment | [docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md) |
| Agent pack flow | [docs/development/cloud-agent-pack-buddy-flow.md](docs/development/cloud-agent-pack-buddy-flow.md) |
| Connector runtime assets | [docs/development/cloud-connector-runtime-assets.md](docs/development/cloud-connector-runtime-assets.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| OAuth | [docs/oauth.md](docs/oauth.md) |

## Contributing Notes

- API changes should update docs, TypeScript SDK, and Python SDK where applicable.
- UI copy changes must go through i18n.
- Product features that apply to both web and mobile should be implemented on both surfaces.
- Tests should match CI behavior; prefer the Docker Compose test stacks for final verification.

## License

[AGPL-3.0](LICENSE)

<!-- markdownlint-disable MD033 MD041 -->

<div align="center">
  <a href="https://shadowob.com">
    <img src="apps/web/public/Logo.svg" alt="虾豆" width="112" height="112">
  </a>

  <h1>虾豆</h1>

  <p><strong>构建 AI Buddy 社区，并用 Shadow Cloud 部署 Agent Team。</strong></p>

  <p>
    虾豆是面向开发者和 AI Builder 的开源 AI Buddy 社交/聊天平台：服务器频道聊天、
    持久 Buddy 身份、OpenClaw 集成、Shadow Cloud Agent Team 模板、SDK、
    Web 和 Mobile 客户端都在同一个 monorepo 里。
  </p>

  <p>
    <a href="#快速开始"><strong>快速开始</strong></a>
    &nbsp;·&nbsp;
    <a href="#启动后能体验什么"><strong>启动后能做什么</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/AI-BUILDER.md"><strong>AI Builder 指南</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/DEVELOPMENT.md"><strong>开发指南</strong></a>
    &nbsp;·&nbsp;
    <a href="README.md"><strong>English</strong></a>
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
  <img src="docs/readme/hero-agent-team-cloud.png" alt="虾豆产品结构图：聊天、AI Buddy、Agent Team 与 Cloud" width="100%">
</p>

<p align="center">
  <sub>产品结构图：实时聊天、Buddy 成员与回复策略、Discover/OpenClaw、开发者 API，以及 Shadow Cloud 的 Agent Team Store -> 一键部署 -> 运行时。</sub>
</p>

## 虾豆提供什么

虾豆不是一个薄薄的 Agent demo，而是一套能跑起来的聊天产品加 AI Buddy 运行层。启动之后，
你可以登录、创建服务器、在频道里聊天、把 AI Buddy 作为成员加入空间、接入 OpenClaw agent、
在 Shadow Cloud 浏览 Agent Team 模板，并通过 SDK 和 CLI 自动化系统。

| 你想做什么 | 从这里开始 |
|---|---|
| 快速体验产品 | [用 Docker 跑完整产品](#方式一用-docker-跑完整产品) |
| 构建 AI Buddy 工作流 | [启动后能体验什么](#启动后能体验什么) 和 [docs/AI-BUILDER.md](docs/AI-BUILDER.md) |
| 改 Web 或服务端 | `apps/web`、`apps/server`、[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| 部署 Agent Team | `apps/cloud` 和 [docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md) |

大多数聊天平台把 AI 当成外挂 Bot。虾豆把 AI 变成 **Buddy**：有身份、有权限、有运行配置、
有在线状态、有斜杠命令，也有一个能和人协作的空间。

你可以用这个仓库构建这样的产品：

- 人创建服务器和频道；
- AI Buddy 像成员一样加入这些空间；
- OpenClaw agent 接收远程配置，并在聊天里回复；
- Shadow Cloud 提供 Agent Team Store、一键部署和运行时监控；
- 开发者通过 SDK、CLI 和 API 自动化整套系统。

## 快速开始

### 前置要求

- Docker 和 Docker Compose v2：用于最快跑起完整产品。
- Node.js 22+ 和 pnpm 10+：用于本地开发。

### 方式一：用 Docker 跑完整产品

这是第一次体验最推荐的方式。它会启动 Web、Admin、API Server、数据库、Redis 和对象存储。

```bash
git clone https://github.com/buggyblues/shadow.git
cd shadow
cp .env.example .env
docker compose up --build
```

打开 Web：

```text
http://localhost:3000
```

使用默认管理员账号登录：

```text
邮箱: admin@shadowob.app
密码: admin123456
```

本地服务入口：

| 服务 | 地址 | 用途 |
|---|---|---|
| Web | http://localhost:3000 | 主产品界面 |
| Admin | http://localhost:3001 | 管理后台 |
| API | http://localhost:3002 | REST API + Socket.IO |
| MinIO | http://localhost:9001 | 对象存储控制台 |

前 5 分钟你应该能跑通：

1. 在 `http://localhost:3000` 登录。
2. 从左侧边栏创建一个服务器。
3. 创建文字频道并发送一条消息。
4. 打开 Buddy 管理，创建第一个 Buddy。
5. 打开 Cloud，查看 Agent Team 模板和一键部署流程。

### 方式二：本地开发模式

如果你要改代码、要热更新，核心应用一个终端就够：

```bash
pnpm install
pnpm dev
```

如果要同时开发 Cloud Dashboard 和 Cloud 后端，用两个终端：

```bash
# 终端 A
pnpm dev:backend

# 终端 B
pnpm dev:frontend
```

`pnpm dev` 会拉起 Docker 基础设施，并启动 Server、Web 和 Admin。
`dev:backend` 会额外启动 Cloud 后端 watcher；`dev:frontend` 会启动 Web、Admin、Cloud Dashboard 和
Website 前端。

## 启动后能体验什么

### 1. 创建服务器并聊天

在 Web 左侧边栏点击 **+** 创建服务器。然后创建文字频道并发送消息。这里会跑通核心协作层：

- 服务器和成员关系；
- 频道；
- Socket.IO 实时消息；
- Markdown、表情回应、附件、线程、通知。

相关代码：

- `apps/web/src/components/server`
- `apps/web/src/components/channel`
- `apps/server/src/handlers/server.handler.ts`
- `apps/server/src/ws/chat.gateway.ts`

### 2. 创建 AI Buddy

进入 **Buddy 管理** 创建和管理 Buddy。一个 Buddy 背后对应 agent 身份、token、状态、Dashboard
和远程配置。

你可以看到：

- Buddy Profile 和 Bot User；
- Agent token 生成；
- start/stop 与 heartbeat 状态；
- Buddy Dashboard 和活动指标。

相关代码：

- `apps/web/src/pages/buddy-management.tsx`
- `apps/web/src/pages/buddy-dashboard.tsx`
- `apps/server/src/handlers/agent.handler.ts`
- `apps/server/src/services/agent.service.ts`

### 3. 连接 OpenClaw Agent

如果你已经有 OpenClaw agent，用 `packages/openclaw-shadowob` 把它接入 Shadow 频道，让它以
Buddy 身份监听和回复。

这个插件负责：

- Shadow 鉴权；
- 频道和私信消息监听；
- 远程 agent config；
- 斜杠命令注册；
- 交互式消息响应；
- heartbeat 和 readiness。

先看这些入口：

- `packages/openclaw-shadowob/src/monitor.ts`
- `packages/openclaw-shadowob/skills/shadowob/SKILL.md`
- [docs/AI-BUILDER.md](docs/AI-BUILDER.md)

### 4. 探索 Shadow Cloud

在 Web 左侧点击 **Cloud**，或者从 CLI 查看模板：

```bash
pnpm --filter @shadowob/cloud build
node apps/cloud/dist/cli.js init --list
node apps/cloud/dist/cli.js templates get research-team > shadowob-cloud.json
node apps/cloud/dist/cli.js validate -f shadowob-cloud.json
```

没有配置 Kubernetes 时，你仍然可以浏览 Agent Team Store、模板详情和 Cloud UI。要真正部署
Agent Team，需要配置：

- `KUBECONFIG_HOST_PATH`
- `KUBECONFIG`
- `KMS_MASTER_KEY`
- `SHADOW_AGENT_SERVER_URL`
- `PULUMI_CONFIG_PASSPHRASE`

完整指南：[docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md)。

### 5. 用 SDK 或 CLI 自动化

TypeScript SDK：

```ts
import { ShadowClient } from '@shadowob/sdk'

const client = new ShadowClient('http://localhost:3002', process.env.SHADOWOB_TOKEN!)
const me = await client.getMe()
const agents = await client.listAgents()
console.log(me.username, agents)
```

CLI：

```bash
shadowob auth login --server-url http://localhost:3002 --token <jwt>
shadowob servers list --json
shadowob agents list --json
shadowob channels send <channel-id> --content "Hello from Shadow CLI" --json
```

相关代码：

- `packages/sdk`
- `packages/cli`
- `packages/oauth`

## 仓库结构

| 路径 | 作用 |
|---|---|
| `apps/server` | Hono API、Socket.IO、Service、DAO、迁移、Cloud SaaS 桥接。 |
| `apps/web` | 主 React Web 应用。 |
| `apps/mobile` | Expo 移动端。 |
| `apps/desktop` | Electron 客户端和 Playwright E2E 入口。 |
| `apps/cloud` | Shadow Cloud CLI、Dashboard、Agent Team 模板、基于 K8s 的部署服务、agent 运行时。 |
| `apps/admin` | 管理后台。 |
| `apps/flash` | 卡片运行时和 playground。 |
| `packages/sdk` | 类型化 REST 和 Socket.IO 客户端。 |
| `packages/cli` | `shadowob` 命令行客户端。 |
| `packages/openclaw-shadowob` | Shadow 的 OpenClaw 频道插件。 |
| `packages/shared` | 共享类型、常量、工具函数。 |
| `packages/ui` | 共享 React UI 组件。 |
| `packages/oauth` | 外部应用使用的 OAuth SDK。 |

## 常用命令

| 命令 | 用途 |
|---|---|
| `docker compose up --build` | 跑完整产品栈。 |
| `pnpm dev:backend` | 开发模式启动后端 watcher 和基础设施。 |
| `pnpm dev:frontend` | 开发模式启动 Web/Admin/Cloud Dashboard 前端。 |
| `pnpm build:packages` | 构建 shared、SDK、OAuth、CLI、OpenClaw 插件。 |
| `pnpm --filter @shadowob/server test` | 服务端测试。 |
| `pnpm --filter @shadowob/web typecheck` | Web 类型检查。 |
| `pnpm --filter @shadowob/cloud test` | Cloud 测试。 |
| `pnpm db:migrate` | 执行服务端数据库迁移。 |

CI 对齐验证建议使用 Docker Compose：

```bash
docker compose -f docker-compose.ci-tests.yml up --build --abort-on-container-exit --exit-code-from ci-tests
```

## 文档

| 主题 | 链接 |
|---|---|
| 构建 AI Buddy 工作流 | [docs/AI-BUILDER.md](docs/AI-BUILDER.md) |
| 本地开发与 CI | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Cloud 部署 | [docs/development/cloud-saas-deployment.md](docs/development/cloud-saas-deployment.md) |
| Agent Pack 链路 | [docs/development/cloud-agent-pack-buddy-flow.md](docs/development/cloud-agent-pack-buddy-flow.md) |
| 架构 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| OAuth | [docs/oauth.md](docs/oauth.md) |

## 贡献说明

- 更新 API 时，需要同步文档、TypeScript SDK、Python SDK。
- UI 文案必须走 i18n。
- 同时适用于 Web 和 Mobile 的产品功能，需要保持两端行为一致。
- 测试结果要尽量和 CI 一致，最终验证优先使用 Docker Compose 测试栈。

## 许可证

[AGPL-3.0](LICENSE)

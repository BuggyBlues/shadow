# Shadow Cloud — 系统规范总览

> **Version:** 3.0-draft
> **Date:** 2026-04-10
> **Status:** RFC (Request for Comments)

---

## 本文档集包含

| 文件 | 主题 | 核心内容 |
|------|------|---------|
| [00-overview.md](./00-overview.md) | 总览 | 愿景、设计原则、改进路线、问题清单 |
| [01-configuration.md](./01-configuration.md) | 配置系统 | shadowob-cloud.json 薄编排层定义 |
| [02-cli.md](./02-cli.md) | CLI 命令行 | 所有命令的行为规范 |
| [03-runtime.md](./03-runtime.md) | 运行时架构 | 容器、K8s 资源、Pulumi IaC |
| [04-gitagent.md](./04-gitagent.md) | GitAgent 集成 | gitagent 标准适配层规范 |
| [05-provisioning.md](./05-provisioning.md) | Shadow 资源 | 服务器/频道/Buddy 供给流程 |
| [06-dashboard.md](./06-dashboard.md) | Dashboard | Web UI 功能与 API 规范 |
| [07-testing.md](./07-testing.md) | 测试策略 | 分层真实容器测试规范 |
| [08-templates.md](./08-templates.md) | 模板系统 | 预置模板规范与验证规则 |
| [09-security.md](./09-security.md) | 安全体系 | 密钥管理、Harness 隔离、沙盒、防注入 |
| [10-runtime-evolution.md](./10-runtime-evolution.md) | 运行时演进 | ACP 分析、Agent SDK 调研、多运行时策略 |

---

## 1. 产品愿景

Shadow Cloud 是一个 **CLI + IaC 工具**，让用户通过一个 JSON 配置文件，一键将 AI Agent 集群部署到 Kubernetes。

### 核心价值主张

```
一个配置文件 → 多个 AI Agent → 运行在 K8s → 连接 Shadow 平台
```

- **声明式**: 用 JSON 描述想要什么，不关心怎么做
- **GitAgent-Native**: 原生支持 [gitagent 标准](https://gitagent.sh/)，agent 定义即代码
- **多运行时**: OpenClaw gateway、Claude Code (ACP)、未来更多
- **团队协作**: 多 Agent 共享工作空间、技能、集成
- **合规就绪**: FINRA/SEC/GDPR 合规审计内置

### 目标用户

| 角色 | 场景 |
|------|------|
| 开发者 | `shadowob-cloud init` → 修改配置 → `shadowob-cloud up` |
| DevOps | 管理多环境 (dev/staging/prod) 部署 |
| 团队 Lead | 通过 Dashboard 监控 Agent 团队状态 |
| Agent 作者 | 用 gitagent 标准定义 Agent，云端一键部署 |

---

## 2. 设计原则

### 原则 1: 真实容器测试，拒绝 Mock

所有测试基于**真实容器运行**。不使用 mock kubectl / mock Docker / mock K8s API。

```
Layer 0: docker run → /health 200           ← 容器能跑
Layer 1: shadowob-cloud up → pods Ready        ← 配置 → 部署
Layer 2: POST /api/deploy → SSE → 成功       ← API → 部署
Layer 3: Playwright → 模板 → 部署 → 状态     ← 用户体验
```

每层测试通过后才能进入下一层。

### 原则 2: 最小化配置，基于开放标准组合

`shadowob-cloud.json` 是**薄编排层**，不重新发明已有标准：

- **Agent 定义** → GitAgent 仓库 (SOUL.md / RULES.md / skills/)
- **运行时配置** → OpenClaw config (gateway/plugins/channels)
- **容器标准** → Docker/OCI 镜像
- **基础设施** → K8s 原生资源 (resources/probes/volumes)

配置文件只做一件事：**把什么东西部署到哪里，用什么 Key**。

### 原则 3: 安全纵深防御

四层安全防线：

| 层面 | 关注点 |
|------|--------|
| 密钥管理 | 禁止明文 Key、K8s Secret 注入、日志脱敏、凭证轮换 |
| Harness 隔离 | 每 Agent 独立 Pod/PID/FS/Network，ACPX 权限控制 |
| 沙盒安全 | 只读 rootfs、非 root 用户、drop ALL capabilities |
| Agent 防欺骗 | 指令边界隔离、数据/指令分离、密钥不进 prompt、跨 Agent 网络隔离 |

### 原则 4: 三分钟 Quick Start

用户安装 CLI 后，只需 `.env`（LLM API Key），三分钟内启动 demo：

```bash
npm install -g @aspect/cloud
echo "LLM_API_KEY=sk-ant-xxx" > .env
shadowob-cloud init --quick
shadowob-cloud up
```

无 K8s 集群时自动用 `kind` 创建本地集群。

### 原则 5: 层次化架构，逐层验证

```
Dashboard (Layer 3)  ← React UI, 用户交互
Server API (Layer 2) ← REST + SSE, 编排
CLI + IaC  (Layer 1) ← 配置 → K8s 部署
Runtime    (Layer 0) ← 容器进程, /health
```

---

## 3. 当前核心问题清单

经过对整个代码库的深入分析，以下是按严重性排序的问题清单：

### P0 — 阻塞使用（无法跑通基础流程）

| # | 问题 | 位置 | 详情 |
|---|------|------|------|
| P0-1 | **配置 Schema 与模板不一致** | `schema.ts` vs `templates/*.json` | 模板使用 `apiType: "openai-completions"` 但 schema 定义的字段是 `api`；部分模板使用 `contextWindow` 但 schema 用 `maxTokens`；provider `id` 与 `apiType` 混用 |
| P0-2 | **测试不能独立运行** | `vitest.e2e.config.ts` | E2E 测试依赖 docker-compose + K8s 集群但没有 mock 层，且 global-setup 中 seed 脚本路径硬编码 |
| P0-3 | **`resolveConfig` 在有未设置的环境变量时崩溃** | `template.ts:25` | `resolveTemplateString` 对缺失 env var 直接 throw，但所有模板都引用 `${env:ANTHROPIC_API_KEY}` 等变量。`validate` 命令无法在没有设置这些变量的情况下完成 |
| P0-4 | **Dashboard serve 端口冲突** | `serve.ts` / `rsbuild.config.ts` | serve API 监听 3004，rsbuild proxy 也指向 3004，但 playwright.config 用 4749/4750，文档不统一 |
| P0-5 | **`generate manifests` 与 `up` 使用不同的资源生成逻辑** | `infra/index.ts` | `buildManifests()` 返回 plain objects，`createInfraProgram()` 用 Pulumi resources —— 两套逻辑可能漂移 |

### P1 — 严重但有 workaround

| # | 问题 | 位置 | 详情 |
|---|------|------|------|
| P1-1 | **配置继承 (`extends`) 只支持一层** | `parser.ts` | 不支持链式继承 `A extends B extends C`，也不支持多继承 |
| P1-2 | **gitagent 适配器自定义 YAML parser** | `adapters/gitagent.ts` | 900行代码中 300 行是手写 YAML parser，不支持 anchors/aliases/tags，容易出错 |
| P1-3 | **provider schema 字段命名混乱** | `schema.ts` line ~450 | `OpenClawProviderConfig.api` vs 模板中 `apiType`；registry provider 用 `api` 而 shadowob-cloud 模板用 `apiType: "openai-completions"` |
| P1-4 | **状态管理分散** | `utils/state.ts` + `~/.shadowob/` | Pulumi state 在 `~/.shadowob/pulumi/`，provision state 在 `.shadowob/`，settings 在 `~/.shadowob/settings.json` — 三个不同位置 |
| P1-5 | **Dashboard API 无认证** | `serve.ts` | HTTP server 没有任何 auth，SSE 流没有认证，任何人可以触发部署 |
| P1-6 | **`team.defaultModel` 与 `agent.model` 合并逻辑不明确** | `parser.ts` | `effectiveModel = agent.model ?? config.team?.defaultModel` 是全量替换而非 deep merge |

### P2 — 功能缺失

| # | 问题 | 位置 | 详情 |
|---|------|------|------|
| P2-1 | **无 `shadowob-cloud update` / rolling update** | CLI | 配置变更后只能 `down` + `up`，没有滚动更新 |
| P2-2 | **无配置 diff 预览** | CLI | `--dry-run` 只说 "would deploy"，不显示实际变更内容 |
| P2-3 | **无 Agent 健康聚合视图** | Dashboard | Dashboard 只展示 pod 状态，不检查 Agent 内部健康 |
| P2-4 | **模板 JSON 没有 JSON Schema** | `templates/` | IDE 无法提供自动补全和校验 |
| P2-5 | **缺少 `shadowob-cloud doctor` 命令** | CLI | 无法诊断 K8s 连接、Docker、Pulumi 的前置条件 |
| P2-6 | **无集成测试覆盖 `buildOpenClawConfig` → 实际 OpenClaw 启动** | tests | 单元测试验证结构正确，但不验证生成的配置能被 OpenClaw 接受 |

### P3 — 设计改进

| # | 问题 | 位置 | 详情 |
|---|------|------|------|
| P3-1 | **OpenClaw 配置类型与官方 spec 同步困难** | `schema.ts` | 1200+ 行手写的 TypeScript interfaces，与 OpenClaw 版本更新脱节 |
| P3-2 | **模板文件格式不统一** | `templates/` | 有的模板有 `description`、`tags`，有的没有；有的用 `team`，有的不用 |
| P3-3 | **Dashboard 前端代码不够模块化** | `dashboard/src/` | plain `fetch` 调用，无错误边界，SSE 实现重复 |
| P3-4 | **`entrypoint.mjs` 没有类型检查** | `images/*.mjs` | 关键的容器入口脚本是纯 JS，没有测试 |

---

## 4. 改进路线图

### Phase 0: 容器运行时验证（Layer 0 通过）

**目标**: `docker run` 每种 Agent 镜像，health check 通过

1. 修复 openclaw-runner 和 claude-runner 镜像构建
2. 编写容器 smoke test (docker run → curl /health)
3. entrypoint.mjs 改为 TypeScript + 测试覆盖 (P3-4)
4. 容器安全加固：只读 rootfs、非 root 用户、drop capabilities

### Phase 1: CLI → 真实集群（Layer 1 通过）

**目标**: `shadowob-cloud init → up → status → down` 在 kind 集群上跑通

1. 统一配置 schema 与模板字段命名 (P0-1, P1-3)
2. `validate` 命令支持 dryRun 模式 (P0-3)
3. Quick Start: `init --quick` + 自动 kind 集群创建
4. `generate manifests` 与 `up` 复用同一套资源定义 (P0-5)
5. 密钥保护: validate 拒绝明文 Key、日志脱敏
6. `doctor` 命令检查所有前置条件 (P2-5)

### Phase 2: Server API + 安全加固（Layer 2 通过）

**目标**: Dashboard API 可管理模板和部署，具备基础安全

1. Dashboard API 认证 (P1-5)
2. Agent Harness 隔离: NetworkPolicy + SecurityContext
3. K8s Secret 轮换支持
4. API 集成测试 (真实 serve → HTTP 请求 → 验证)
5. 统一状态存储路径 (P1-4)

### Phase 3: Dashboard + 生产就绪（Layer 3 通过）

**目标**: 完整的 Web UI 体验 + 生产级安全

1. Dashboard Playwright E2E (真实集群)
2. Rolling update 支持 (P2-1)
3. Config diff 预览 (P2-2)
4. Agent 健康聚合视图 (P2-3)
5. Anti-prompt-injection 加固

---

## 4. 系统边界

### Shadow Cloud 管什么

- 解析 `shadowob-cloud.json` 配置
- 生成 K8s 资源定义 (Deployments, ConfigMaps, Secrets, Services)
- 通过 Pulumi 部署到 K8s
- 通过 Shadow SDK 供给 Server/Channel/Buddy 资源
- 构建 Agent Docker 镜像
- 提供 Web Dashboard 监控部署状态

### Shadow Cloud 不管什么

- K8s 集群本身的创建/管理（用户自备）
- OpenClaw 内部的会话/消息路由逻辑
- Shadow Server 的部署和运维（依赖已有的 `apps/server`）
- Agent 的业务逻辑（由 OpenClaw skills/tools 定义）
- CI/CD pipeline（由用户自行集成）

### 运行时依赖

| 依赖 | 最低版本 | 用途 |
|------|---------|------|
| Node.js | 22 | CLI 运行时 |
| Docker | 24 | 镜像构建 |
| kubectl | 1.28 | K8s 操作 |
| Pulumi | 3.x | IaC 部署 |
| pnpm | 9.x | 开发构建 |

---

## 5. 术语表

| 术语 | 定义 |
|------|------|
| **Agent Runtime** | 运行 AI Agent 的容器进程。目前支持 `openclaw` 和 `claude-code` |
| **Agent Deployment** | shadowob-cloud.json 中 `deployments.agents[]` 的一个条目，映射为一个 K8s Deployment |
| **Configuration Preset** | `registry.configurations[]` 中定义的可复用配置片段，通过 `extends` 引用 |
| **Template** | `templates/*.template.json` 预置的完整配置文件，可通过 `init` 命令使用 |
| **Provisioning** | 通过 Shadow SDK 创建 Server、Channel、Buddy 资源的过程 |
| **GitAgent** | [gitagent.sh](https://gitagent.sh/) 开放标准，用 git 仓库定义 AI Agent |
| **SOUL.md** | gitagent 标准中定义 Agent 人格和身份的 Markdown 文件 |
| **SkillsFlow** | gitagent 标准中定义确定性多步工作流的 YAML 格式 |
| **ACP** | Agent Client Protocol — OpenClaw 运行外部编码工具 (Codex, Claude Code) 的协议 |
| **ACPX** | ACP 的运行时插件，负责管理外部 harness 进程 |
| **Shadow Server** | Shadow 平台的聊天服务器，类似 Discord server |
| **Buddy** | Shadow 平台中的 AI 助手实体，绑定到 Agent |
| **Binding** | 将 Buddy 连接到 Server/Channel 和 Agent 的路由规则 |

# Shadow Cloud — 云端 Agent 部署架构决策

> **Status:** Accepted (Amended 2026-04-10)
> **Date:** 2026-03-30
> **Author:** AI Assistant
> **Scope:** `apps/cloud` — 新模块，将 OpenClaw Agent 部署能力从桌面端迁移到云端

---

## 修订记录

| 日期 | 修订内容 |
|------|---------|
| 2026-04-10 | 追加决策 15–19，确立系统设计原则 |

---

## 决策 15：真实容器测试，拒绝 Mock

### 决定

所有测试必须基于**真实容器运行**。不使用 mock kubectl / mock Docker / mock K8s API 来测试部署流程。

### 理由

- Mock 测试无法验证用户的真实体验路径
- 容器启动、配置挂载、进程健康检查等行为只有在真实环境中才能暴露问题
- Mock 层本身会成为维护负担，且给出虚假的安全感

### 分层测试策略

```
Layer 0: 容器运行时验证
  docker run openclaw-runner → /health 返回 200
  docker run claude-runner → ACPX 初始化成功
  ↓ 这是最基础的 "能不能跑" 验证

Layer 1: 配置驱动单集群
  shadow-cloud.json → shadow-cloud up → kubectl get pods → all Ready
  ↓ 验证 "配置 → 部署" 完整路径

Layer 2: Server API 管理
  POST /api/deploy → SSE 日志 → 集群启动成功
  GET /api/deployments → 返回正确状态
  ↓ 验证 "API → 部署" 路径

Layer 3: Dashboard E2E
  浏览器打开 → 选择模板 → 部署 → 查看状态
  ↓ 验证用户交互的完整体验
```

### 实施

- 使用 [kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker) 在 CI 中运行真实 K8s 集群
- 纯函数（schema 解析、deep merge、模板变量解析）用 vitest 单元测试
- 任何涉及容器/K8s/进程的测试一律使用真实环境

---

## 决策 16：最小化配置，基于开放标准组合

### 决定

`shadow-cloud.json` 是一个**薄编排层**，不重新发明任何已有标准。配置文件只负责"把什么东西部署到哪里"，具体的 Agent 定义、运行时配置、技能声明全部委托给已有开放标准。

### 组合模型

```
shadow-cloud.json          ← 编排层：谁、在哪、用什么 Key
    │
    ├── GitAgent 仓库       ← Agent 定义：SOUL.md / RULES.md / skills/
    │   (gitagent.sh)         通过 source.repo 引用
    │
    ├── OpenClaw config     ← 运行时配置：gateway、plugins、channels
    │   (openclaw.ai)         容器内 entrypoint 自动生成
    │
    ├── Docker/OCI 镜像     ← 容器标准：Dockerfile → Registry
    │                         通过 image 字段引用
    │
    └── K8s 原生资源         ← 基础设施标准：resources, probes, volumes
                              通过 deploy 字段声明
```

### 原则

1. **不重复 OpenClaw 配置** — shadow-cloud.json 不内嵌 `openclaw.config`，只声明 agent identity、model、provider
2. **不重复 GitAgent 定义** — source 指向 git 仓库，由运行时 init container 克隆和解析
3. **不重复 K8s 规范** — 资源限制、探针、卷挂载使用 K8s 原生字段，不做包装
4. **Agent 团队 = Git 仓库 + 容器 + 编排配置的组合**

---

## 决策 17：安全纵深防御

### 决定

围绕四个层面建立安全防线：密钥管理与保护、Agent Harness 隔离、沙盒安全、Agent 防欺骗。

### 17.1 密钥管理与保护

| 层级 | 措施 |
|------|------|
| 配置文件 | 禁止明文 API Key（validate 命令强制检查），必须使用 `${env:...}` 或 `${secret:...}` |
| 运行时 | 密钥通过 K8s Secret → 环境变量注入，不写入 ConfigMap |
| 日志 | 所有输出自动脱敏（正则匹配 `sk-*`, `key-*`, Bearer token 等） |
| 状态文件 | `.shadowob/` 目录下的凭证文件设置 `0600` 权限 |
| 轮换 | 支持 `shadow-cloud rotate-keys` 触发 Secret 滚动更新 |

### 17.2 Agent Harness 隔离

**Agent Harness** = 运行 AI Agent 的受控执行环境（参考 Anthropic "Effective Harnesses for Long-Running Agents"）。

| 策略 | 实施 |
|------|------|
| 进程隔离 | 每个 Agent 运行在独立的 K8s Pod 中，拥有独立的 PID namespace |
| 文件隔离 | 每个 Agent 有独立的 `/workspace` 目录，通过 PVC 隔离 |
| 网络隔离 | K8s NetworkPolicy 限制 Agent 间通信，默认 deny-all |
| 权限控制 | OpenClaw ACPX `permissionMode` 控制文件写入和命令执行权限 |
| 资源配额 | K8s resource limits (CPU/Memory) 防止单个 Agent 耗尽集群资源 |

### 17.3 沙盒安全

```
┌─────────────────────────────────────┐
│  K8s Pod (Agent 沙盒)                │
│  ┌───────────────────────────────┐  │
│  │  Container (只读 rootfs)       │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  OpenClaw Gateway       │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │ ACPX Harness      │  │  │  │
│  │  │  │  (Claude Code等)  │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  │  r/w: /workspace, /tmp        │  │
│  │  r/o: /etc/shadow-cloud/      │  │
│  └───────────────────────────────┘  │
│  SecurityContext:                    │
│    runAsNonRoot: true                │
│    readOnlyRootFilesystem: true      │
│    allowPrivilegeEscalation: false   │
│    capabilities: drop ALL            │
└─────────────────────────────────────┘
```

### 17.4 Agent 防欺骗 (Anti-Prompt-Injection)

| 威胁 | 缓解 |
|------|------|
| 用户消息中的 prompt injection | OpenClaw 系统 prompt 中的明确指令边界 + 输入/输出分离 |
| 工作区文件中的恶意指令 | Agent 被指示不信任工作区内容作为指令来源 |
| 外部 API 响应中的注入 | 工具输出作为 data（非 instructions）传递给模型 |
| Agent 泄露密钥 | 密钥不注入到 Agent 的系统 prompt 或工具上下文中；API Key 仅作为环境变量存在于进程级 |
| 跨 Agent 攻击 | 网络隔离 + 独立工作区 + 独立 OpenClaw 实例 |

---

## 决策 18：三分钟 Quick Start

### 决定

安装 CLI 后，用户只需一个 `.env` 文件（含 LLM API Key），即可在三分钟内启动 demo 项目。

### 流程

```bash
# 1. 安装
npm install -g @aspect/cloud

# 2. 准备 .env（唯一的前置要求）
echo "LLM_API_KEY=sk-ant-xxx" > .env

# 3. 初始化 + 部署
shadow-cloud init --quick        # 选择 starter 模板，自动读取 .env
shadow-cloud up                  # 部署到默认 K8s context
# ✓ Agent phantom-core is running

# 4. 验证
shadow-cloud status              # 查看状态
shadow-cloud logs phantom-core   # 查看日志
```

### 前置条件最小化

| 必须 | 可选 |
|------|------|
| Node.js 22+ | — |
| Docker (本地 kind 集群自动创建) | 已有 K8s 集群 |
| `.env` 中的 LLM API Key | Shadow 平台账号 |

### `--quick` 模式

当用户没有 K8s 集群时，`shadow-cloud up` 自动:
1. 检测 `kubectl cluster-info` 是否可用
2. 不可用 → 提示 `shadow-cloud up --local` 使用 kind 创建本地集群
3. `kind create cluster --name shadow-cloud` → 设置 context → 继续部署

---

## 决策 19：层次化架构与逐层测试

### 决定

系统分为四个明确的层次，每层有独立的职责和测试边界。

```
┌──────────────────────────────────────────────┐
│  Layer 3: Dashboard (React Web UI)           │
│  职责: 可视化管理、模板浏览、部署触发          │
│  测试: Playwright E2E                         │
├──────────────────────────────────────────────┤
│  Layer 2: Server API (REST + SSE)            │
│  职责: 模板管理、部署编排、状态查询 API        │
│  测试: API 集成测试 (真实 serve + HTTP 请求)  │
├──────────────────────────────────────────────┤
│  Layer 1: CLI + IaC (配置 → K8s 部署)        │
│  职责: 配置解析、K8s 资源生成、Pulumi 部署    │
│  测试: CLI E2E (真实 kind 集群 + 真实部署)    │
├──────────────────────────────────────────────┤
│  Layer 0: Container Runtime (Agent 容器)     │
│  职责: OpenClaw/Claude-Code 进程运行          │
│  测试: docker run → health check 自动化验证   │
└──────────────────────────────────────────────┘
```

### 测试前进规则

- **Layer 0 必须先通过** → 才能测试 Layer 1（否则 Pod 都不能 Ready）
- **Layer 1 必须先通过** → 才能测试 Layer 2（否则 API 无法操作真实集群）
- **Layer 2 必须先通过** → 才能测试 Layer 3（否则 Dashboard 无数据）

### 每层的测试内容

**Layer 0（容器运行时）:**
```bash
docker build -t openclaw-runner images/openclaw-runner/
docker run --rm -e CONFIG='{"minimal":true}' openclaw-runner &
curl -sf http://localhost:3100/health   # 必须 200
```

**Layer 1（CLI + 集群部署）:**
```bash
shadow-cloud init --template shadow-cloud --no-interactive
shadow-cloud validate
shadow-cloud up --context kind-shadow-cloud
shadow-cloud status   # 所有 agent Ready
shadow-cloud down --yes
```

**Layer 2（Server API）:**
```bash
shadow-cloud serve --port 3004 &
curl http://localhost:3004/api/templates       # 200 + 模板列表
curl -X POST http://localhost:3004/api/deploy  # SSE 部署流
curl http://localhost:3004/api/deployments     # 部署状态
```

**Layer 3（Dashboard E2E）:**
```
Playwright → 打开 localhost:3004 → 点击模板 → 部署 → 查看状态
```

---

## 背景

Shadow Desktop (`apps/desktop`) 已实现了完整的 OpenClaw Agent 管理能力：

- **打包**：通过 `bundle-openclaw.mjs` 脚本将 OpenClaw gateway + shadowob 插件打包成自包含目录（~200MB），通过 Electron Forge `extraResource` 嵌入桌面应用
- **配置**：通过 `~/.shadowob/openclaw.json` 管理 agent、model provider、channel、skill 等配置
- **生命周期**：通过 `child_process.spawn()` 启动 gateway 进程，内置健康检查、指数退避重启机制

**目标**：将这套打包和配置能力迁移到云端，让用户通过一个 JSON 配置文件 + CLI 命令一键部署 Agent 集群到 Kubernetes。

---

## 决策总览

| # | 主题 | 决策 |
|---|------|------|
| 1 | 运行时架构 | K8s 集群部署，Pulumi IaC 管理 |
| 2 | 配置格式 | 单 JSON 文件 + `${env:VAR}` 模板语法 + init 脚本处理 |
| 3 | Dockerfile 策略 | 自定义官方镜像，放在 `cloud/images/` |
| 4 | 与 Server 关系 | 独立 SDK/CLI 工具，不直接连 Server |
| 5 | 多 Agent 部署 | 每个 Main Agent 一个容器（Agent Runtime） |
| 6 | 密钥管理 | 全覆盖：环境变量 + Docker Secrets + 外部 KMS + .env |
| 7 | 健康检查 | K8s 原生探针（liveness/readiness/startup） |
| 8 | 日志 | OpenClaw 日志文件 + 其余 stdout |
| 9 | 包结构 | 标准 Node.js 应用（package.json + tsup + src/） |
| 10 | 编排方式 | Pulumi TypeScript（不使用 docker-compose） |
| 11 | 镜像发布 | 公开 Registry（GitHub Container Registry） |
| 12 | 配置继承 | 部署前展开（语法糖），CLI 处理 extends deep merge |
| 13 | 插件集成 | shadowob 发布到 npm，镜像中 `npm install` |
| 14 | MVP 范围 | 全套：CLI + 多种镜像 + Pulumi IaC + 健康检查 + 日志 |

---

## 决策 1：运行时架构 — K8s + Pulumi

### 决定

每个 Agent 运行在 K8s 集群中的独立 Pod 内。使用 **Pulumi (TypeScript)** 作为 IaC 工具声明式管理所有 K8s 资源。

### 理由

- K8s 提供开箱即用的容器编排、自动恢复、水平扩缩容
- Pulumi TypeScript 与项目语言栈一致，可共享类型定义
- 相比 Helm/Kustomize，Pulumi 提供更好的编程能力和类型安全
- 每个 Agent 容器代表一个 **Agent Runtime**，容器内部可管理多 Agent 的协调

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                      │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Pod: phantom-core │  │ Pod: code-reviewer│             │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │             │
│  │ │  OpenClaw     │ │  │ │  Claude Code  │ │             │
│  │ │  Gateway      │ │  │ │  Runner       │ │             │
│  │ │  + shadowob   │ │  │ │              │ │             │
│  │ │  plugin       │ │  │ │  + MCP       │ │             │
│  │ └──────────────┘ │  │ └──────────────┘ │             │
│  │                  │  │                  │             │
│  │  ConfigMap       │  │  ConfigMap       │             │
│  │  Secret          │  │  Secret          │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                         │
│  ┌──────────────────┐                                   │
│  │ Shared Resources │                                   │
│  │ - Redis          │                                   │
│  │ - PV (logs)      │                                   │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘

        ▲ Managed by
        │
┌───────┴──────────┐
│  shadow-cloud    │
│  CLI (Pulumi)    │
│                  │
│  shadow-cloud up │
│  shadow-cloud    │
│    down/status   │
└──────────────────┘
```

---

## 决策 2：配置系统设计

### 决定

使用单一 JSON 配置文件（`shadow-cloud.json`）作为声明式部署清单。配置文件支持：

1. **`${env:VAR}` 模板语法** — 引用环境变量
2. **`${secret:NAME}` 语法** — 引用 K8s Secret
3. **`${file:/path}` 语法** — 引用文件内容
4. **`extends` 继承** — 在 CLI 解析阶段做 deep merge，是纯粹的语法糖

### 配置处理流程

```
shadow-cloud.json          shadow-cloud CLI
       │                         │
       ▼                         ▼
  ┌──────────┐          ┌──────────────┐
  │ 读取 JSON │──────────▶│ 展开 extends │
  └──────────┘          └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ 解析模板变量  │
                        │ ${env:...}   │
                        │ ${secret:..} │
                        └──────┬───────┘
                               │
                        ┌──────▼───────────┐
                        │ 生成 K8s 资源     │
                        │ - Deployment     │
                        │ - ConfigMap      │
                        │ - Secret         │
                        │ - Service        │
                        └──────┬───────────┘
                               │
                        ┌──────▼───────┐
                        │ Pulumi apply │
                        └──────────────┘
```

### 配置文件结构

```jsonc
{
  "version": "1.3.0",
  "environment": "production",

  // 插件配置 — 定义 Shadow 服务器和 buddy 绑定关系
  "plugins": {
    "shadowob": {
      "servers": [...],
      "buddies": [...],
      "bindings": [...]
    }
  },

  // 模型注册表 — 定义可用的模型提供商和预设配置
  "registry": {
    "providers": [...],
    "configurations": [...]    // 可继承的配置模板
  },

  // 部署清单 — 声明要部署的 agent 及其配置
  "deployments": {
    "agents": [
      {
        "id": "agent-phantom-core",
        "runtime": "openclaw",
        "image": "ghcr.io/shadowob/openclaw-runner:latest",
        "configuration": {
          "extends": "base-openclaw-chat",   // 语法糖，CLI 展开
          "openclaw": { ... }
        }
      }
    ]
  }
}
```

---

## 决策 3：Docker 镜像策略

### 决定

在 `apps/cloud/images/` 目录中维护多个 Dockerfile，构建**自定义官方镜像**。不复用桌面端的 bundle 脚本（桌面端需处理 Electron 特殊性，云端不需要）。

### 镜像清单

| 镜像名 | 用途 | 基础镜像 | 内置组件 |
|--------|------|---------|---------|
| `openclaw-runner` | OpenClaw Agent Runtime | `node:22-alpine` | openclaw + @shadowob/openclaw-shadowob |
| `claude-runner` | Claude Code Agent Runtime | `node:22-alpine` | claude-code CLI + MCP servers |

### openclaw-runner 镜像构建策略

```dockerfile
FROM node:22-alpine AS builder
# 1. npm install openclaw (全局)
# 2. npm install @shadowob/openclaw-shadowob (从 npm registry)
# 3. 配置 extensions 目录
# 4. 内置 entrypoint.mjs 初始化脚本

FROM node:22-alpine AS runner
# 复制构建产物
# 设置健康检查
# ENTRYPOINT ["node", "entrypoint.mjs"]
```

### 与桌面端对比

| 方面 | Desktop | Cloud |
|------|---------|-------|
| OpenClaw 来源 | BFS 从 pnpm virtual store 收集 | `npm install openclaw` |
| shadowob 插件 | esbuild 打包 TS 源码 | `npm install @shadowob/openclaw-shadowob` |
| 环境限制 | Electron ABI、ELECTRON_RUN_AS_NODE | 无（标准 Node.js） |
| 模块兼容 | 需要 patch ESM-only 包 | 不需要 |
| 大小优化 | 清理 dev artifacts (~500M→200M) | Docker multi-stage 自然精简 |

---

## 决策 4：Cloud 作为 SDK/CLI 工具

### 决定

`apps/cloud` 是一个 **CLI 工具**（`@shadowob/cloud`），不直接连接 Shadow Server。所有与 Shadow 的交互通过 OpenClaw 的 shadowob 插件在 Agent Runtime 内完成。

### CLI 命令设计

```
shadow-cloud <command> [options]

Commands:
  up          部署或更新 Agent 集群
  down        销毁 Agent 集群
  status      查看集群中所有 Agent 的状态
  logs        查看指定 Agent 的日志
  scale       调整 Agent 副本数
  init        生成配置文件模板
  validate    校验配置文件
  images      列出/构建/推送官方镜像

Options:
  -f, --file <path>      配置文件路径 (默认: shadow-cloud.json)
  -s, --stack <name>     Pulumi stack 名称 (默认: dev)
  -n, --namespace <ns>   K8s namespace (默认: shadow-cloud)
  --dry-run              仅预览变更，不实际部署
  --yes                  跳过确认提示
```

### 命令详解

| 命令 | 功能 | 示例 |
|------|------|------|
| `up` | 解析配置 → 展开 extends → 解析模板 → Pulumi up | `shadow-cloud up -f prod.json -s production` |
| `down` | 销毁所有部署资源 | `shadow-cloud down -s production` |
| `status` | 查询 K8s Pod/Deployment 状态 | `shadow-cloud status` |
| `logs` | 聚合 Pod 日志 (kubectl logs 封装) | `shadow-cloud logs agent-phantom-core --tail 100` |
| `scale` | 修改 Deployment replicas | `shadow-cloud scale agent-phantom-core --replicas 3` |
| `init` | 交互式生成 shadow-cloud.json 模板 | `shadow-cloud init` |
| `validate` | Zod schema 校验 + extends 检查 + 模板变量检查 | `shadow-cloud validate -f prod.json` |
| `images` | 镜像管理 (build/push/list) | `shadow-cloud images build openclaw-runner` |

---

## 决策 5：多 Agent 部署模式

### 决定

每个配置中定义的 **Main Agent** 对应一个 K8s **Deployment**（一个或多个 Pod）。每个 Pod 运行一个 Agent Runtime 容器。Runtime 内部可管理子 Agent 的协调。

### K8s 资源映射

```
shadow-cloud.json                      K8s Resources
─────────────────                      ─────────────

deployments.agents[0]          ──▶     Deployment: agent-phantom-core
  id: agent-phantom-core                 replicas: 1
  runtime: openclaw                      containers:
  image: openclaw-runner                   - image: ghcr.io/shadowob/openclaw-runner
                                         configMap: agent-phantom-core-config
                                         secret: agent-phantom-core-secrets

deployments.agents[1]          ──▶     Deployment: agent-code-reviewer
  id: agent-code-reviewer                replicas: 1
  runtime: claude-code                   containers:
  image: claude-runner                     - image: ghcr.io/shadowob/claude-runner
                                         configMap: agent-code-reviewer-config
                                         secret: agent-code-reviewer-secrets

registry.providers             ──▶     Secret: shadow-cloud-providers
                                         (API keys, base URLs)

plugins.shadowob              ──▶     ConfigMap: shadow-cloud-shadowob
                                         (server/buddy/binding 配置)
```

---

## 决策 6：密钥管理 — 多源支持

### 决定

配置模板语法支持多种密钥来源，CLI 在部署前统一解析：

| 语法 | 来源 | 示例 |
|------|------|------|
| `${env:VAR}` | 环境变量 | `${env:OPENAI_API_KEY}` |
| `${secret:k8s/name/key}` | K8s Secret | `${secret:k8s/redis-creds/password}` |
| `${file:/path}` | 文件内容 | `${file:./api-key.txt}` |
| 直接值 | 明文 (不推荐生产使用) | `"sk-abc123..."` |

### 部署时处理

1. CLI 解析配置文件中的模板语法
2. 环境变量直接读取 `process.env`
3. 文件引用读取文件内容
4. K8s Secret 引用生成 `secretKeyRef` 在 Pod spec 中
5. 明文密钥自动创建为 K8s Secret，不直接写入 ConfigMap

---

## 决策 7：健康检查 — K8s 原生探针

### 决定

利用 K8s 原生探针机制，不在应用层做额外健康检查逻辑。

### 探针配置

```yaml
# OpenClaw Runner
livenessProbe:
  httpGet:
    path: /health
    port: 3100
  initialDelaySeconds: 30
  periodSeconds: 15
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3100
  initialDelaySeconds: 10
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health
    port: 3100
  initialDelaySeconds: 5
  periodSeconds: 3
  failureThreshold: 30    # 给 OpenClaw 最多 90s 启动时间
```

### 容器 entrypoint 职责

`entrypoint.mjs` 脚本负责：
1. 读取挂载的配置（ConfigMap）
2. 解析并写入 OpenClaw 配置文件（`~/.openclaw/config.json`）
3. 安装 shadowob 插件到 extensions 目录（如未内置）
4. 启动 OpenClaw gateway 进程
5. 暴露 `/health` 端点（转发到 gateway 的健康检查）

---

## 决策 8：日志策略

### 决定

- **OpenClaw gateway** 日志写入文件（`/var/log/openclaw/`），通过 K8s Volume 可选持久化
- **entrypoint 脚本** 日志输出到 stdout/stderr，由 K8s 自动收集
- **容器日志** 通过 `shadow-cloud logs` 命令聚合查看

---

## 决策 9：`apps/cloud` 包结构

### 决定

标准 Node.js 应用结构，使用 tsup 构建。

```
apps/cloud/
├── package.json                  # @shadowob/cloud
├── tsconfig.json
├── tsup.config.ts
├── images/                       # Docker 镜像定义
│   ├── openclaw-runner/
│   │   ├── Dockerfile
│   │   └── entrypoint.mjs        # 容器初始化脚本
│   └── claude-runner/
│       ├── Dockerfile
│       └── entrypoint.mjs
├── src/
│   ├── index.ts                  # CLI 入口
│   ├── cli/                      # 命令实现
│   │   ├── up.ts
│   │   ├── down.ts
│   │   ├── status.ts
│   │   ├── logs.ts
│   │   ├── scale.ts
│   │   ├── init.ts
│   │   ├── validate.ts
│   │   └── images.ts
│   ├── config/                   # 配置解析
│   │   ├── schema.ts             # Zod schema 定义
│   │   ├── parser.ts             # JSON 解析 + extends 展开
│   │   ├── template.ts           # ${env:...} 模板引擎
│   │   └── types.ts              # TypeScript 类型
│   ├── infra/                    # Pulumi IaC
│   │   ├── index.ts              # Pulumi program 入口
│   │   ├── agent-deployment.ts   # Agent Deployment 资源
│   │   ├── config-resources.ts   # ConfigMap/Secret 资源
│   │   ├── networking.ts         # Service/Ingress 资源
│   │   └── shared.ts             # 共享基础设施 (Redis, PV)
│   └── utils/
│       ├── logger.ts
│       └── k8s-client.ts         # kubectl 封装
├── templates/                    # 配置模板
│   └── shadow-cloud.template.json
└── __tests__/
    ├── config/
    │   ├── parser.test.ts
    │   └── template.test.ts
    └── cli/
        └── validate.test.ts
```

---

## 决策 10：容器内配置初始化流程

### entrypoint.mjs 详细流程

```
容器启动
    │
    ▼
┌──────────────────────────┐
│ 1. 读取 ConfigMap         │
│    /etc/shadow-cloud/     │
│    config.json            │
└────────────┬─────────────┘
             │
    ┌────────▼────────┐
    │ 2. 读取 Secrets  │
    │    环境变量注入   │
    └────────┬────────┘
             │
    ┌────────▼──────────────┐
    │ 3. 生成 OpenClaw 配置  │
    │    ~/.openclaw/        │
    │    config.json         │
    │    - agents            │
    │    - models.providers  │
    │    - channels.shadowob │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ 4. 校验插件已安装      │
    │    extensions/shadowob │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ 5. 启动 openclaw       │
    │    gateway             │
    │    --port 3100         │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ 6. 等待 health check   │
    │    /health 返回 200    │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ 7. 保持进程，转发信号   │
    │    SIGTERM → graceful  │
    │    shutdown             │
    └────────────────────────┘
```

---

## 与桌面端对比总结

| 维度 | Desktop (`apps/desktop`) | Cloud (`apps/cloud`) |
|------|--------------------------|----------------------|
| 运行环境 | Electron (macOS/Win/Linux) | K8s Pod (Linux container) |
| 进程管理 | Electron main → child_process | K8s Deployment → Pod |
| OpenClaw 来源 | BFS bundle from pnpm store | npm install in Dockerfile |
| shadowob 插件 | esbuild 打包 TS 源码 | npm install from registry |
| 配置管理 | ~/.shadowob/openclaw.json (IPC) | ConfigMap + entrypoint 生成 |
| 健康检查 | HTTP /health per 15s + 重试 | K8s liveness/readiness probes |
| 密钥 | 明文在 config JSON | K8s Secrets + 环境变量 |
| 扩缩容 | 单实例 | K8s HPA / 手动 replicas |
| 日志 | Electron 转发到 renderer | stdout + 文件日志 |
| 编排 | 无 (单机单进程) | Pulumi TypeScript IaC |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| OpenClaw npm 包可能不稳定 | 构建失败 | 镜像锁定版本，CI 定期测试 |
| shadowob 插件未发布到 npm | 镜像构建失败 | 需先完成 `publish:packages` 流程 |
| Pulumi 学习曲线 | 开发速度 | TypeScript 降低门槛，提供模板 |
| K8s 环境差异 | 行为不一致 | 提供 kind/minikube 本地测试方案 |
| 配置格式演进 | 兼容性 | version 字段 + 迁移指南 |

---

## 参考

- [OpenClaw Desktop Integration](../../apps/desktop/src/main/openclaw/) — 桌面端实现
- [bundle-openclaw.mjs](../../apps/desktop/scripts/bundle-openclaw.mjs) — 桌面端打包脚本
- [@shadowob/openclaw-shadowob](../../packages/openclaw-shadowob/) — shadowob 插件
- [Docker Compose](../../docker-compose.yml) — 现有 Docker 部署

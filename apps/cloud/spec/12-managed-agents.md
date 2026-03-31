# Shadow Cloud — Managed Agents 平台对标分析与规范

> **Spec:** 12-managed-agents
> **Version:** 1.0-draft
> **Date:** 2026-07-15
> **Reference:** [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)

---

## 1. 概述

本文档调研 Anthropic Claude Managed Agents 平台的设计，提取其中对 shadowob-cloud 有借鉴意义的设计模式，
尤其是**安全、密钥管理、权限控制**方面，形成 shadowob-cloud 可落地的功能规范。

### 1.1 Claude Managed Agents 核心概念

| 概念 | 说明 | shadowob-cloud 对应 |
|------|------|-------------|
| **Agent** | 模型 + system prompt + tools + MCP servers + skills 的可复用、带版本配置 | `shadowob-cloud.json` 中的 `agents[]` |
| **Environment** | 容器模板（包管理、网络策略） | `shadowob-cloud.json` 中的 `runtimes` + K8s Pod spec |
| **Session** | Agent 实例在 Environment 中运行，执行具体任务 | K8s Deployment/Pod |
| **Events** | 用户与 Agent 之间的消息流（SSE） | Shadow Platform 消息通道 |
| **Vault** | 凭据（OAuth/Token）的安全存储，按 session 引用 | 尚无，需新增 |
| **Permission Policy** | 控制工具 always_allow / always_ask | ACPX `permissionMode` |
| **Skills** | 可复用的领域知识文件 | `cloud-skills` workspace |
| **Memory Store** | 跨 session 持久化知识 | 尚无，需评估 |
| **Outcomes** | 定义"完成标准" + 自动评分迭代 | 尚无，可列入 roadmap |
| **Multi-Agent** | 多 Agent 编排，coordinator + callable_agents | `buddies` 机制 |

### 1.2 优先级分类

| 优先级 | 功能 | 原因 |
|--------|------|------|
| **P0** | Vault / 密钥安全存储 | 当前密钥仅靠 `.env` + K8s Secret，缺乏统一管理 |
| **P0** | Permission Policy 细化 | 当前 ACPX 仅三档，需要 per-tool 控制 |
| **P1** | 网络隔离策略 (limited networking) | 当前仅粗粒度 deny-all / allow-443 |
| **P1** | Agent 版本管理 | Claude 的 Agent version 机制值得对标 |
| **P2** | Memory Store | 跨 Pod 持久化学习 |
| **P2** | Outcome 评估 | 自动化质量验收 |
| **P3** | Multi-Agent 编排增强 | 当前 buddies 已覆盖基础需求 |

---

## 2. 安全与密钥管理 (P0)

### 2.1 Claude 的 Vault 机制分析

Claude Managed Agents 引入了 **Vault + Credential** 两层抽象：

```
Organization
  └── Vault (per end-user)          # vlt_01ABC...
       ├── Credential (MCP OAuth)   # 绑定到 mcp_server_url
       ├── Credential (Bearer)      # 静态 token
       └── Credential (...)
```

关键设计：
- **写后不可读**：`access_token`, `refresh_token`, `client_secret` 是 write-only，API 不返回
- **自动刷新**：MCP OAuth credential 支持 `refresh` 配置，平台自动刷新 token
- **Workspace 隔离**：Vault 按 workspace 隔离，API key 级别的访问控制
- **审计友好**：archive 操作保留记录，delete 彻底删除
- **Session 级引用**：`vault_ids` 在创建 session 时传入，非 Agent 级绑定

### 2.2 shadowob-cloud 密钥管理现状

```
当前流程:
  .env 明文 → shadowob-cloud CLI 读取 → 模板替换 ${env:VAR}
  → 生成 K8s Secret YAML → Pulumi apply → etcd (base64)
  → Pod envFrom secretRef → 容器环境变量
```

**问题：**
1. `.env` 文件明文存储，仅靠文件权限保护
2. 无密钥轮换的原子性保证
3. 多 Agent 共享同一份 `.env`，无法实现最小权限
4. 不支持 OAuth token 自动刷新
5. 缺乏密钥使用审计

### 2.3 shadowob-cloud Vault 规范

#### 2.3.1 架构

```
shadowob-cloud.json
  └── vaults:
       ├── default:                    # 默认 vault
       │    ├── env:LLM_API_KEY        # 从环境变量
       │    ├── file:./secrets/token    # 从文件
       │    └── k8s:namespace/secret/key # 从已有 K8s Secret
       └── agent-specific:             # Agent 专用 vault
            └── env:AGENT_B_TOKEN
```

#### 2.3.2 配置格式

```jsonc
{
  "vaults": {
    // 全局默认密钥源
    "default": {
      "providers": {
        "anthropic": { "apiKey": "${env:ANTHROPIC_API_KEY}" },
        "openai": { "apiKey": "${env:OPENAI_API_KEY}" }
      },
      "secrets": {
        "github-token": "${env:GITHUB_TOKEN}",
        "custom-api": "${file:./secrets/custom-api.key}"
      }
    },
    // Agent 专用覆盖
    "agent-overrides": {
      "phantom-core": {
        "providers": {
          "anthropic": { "apiKey": "${env:PHANTOM_ANTHROPIC_KEY}" }
        }
      }
    }
  }
}
```

#### 2.3.3 K8s Secret 生成策略

```
Per-Agent Secret 隔离:
  Agent A → k8s Secret "xc-agent-a-secrets"
  Agent B → k8s Secret "xc-agent-b-secrets"

而非当前的:
  所有 Agent → 共享 k8s Secret "shadowob-cloud-secrets"
```

**规则：**
- 每个 Agent 生成独立的 K8s Secret
- Secret 仅包含该 Agent 实际需要的密钥子集
- `shadowob-cloud validate` 检查是否有 Agent 引用了未配置的密钥
- Secret name 格式: `xc-{agent-name}-secrets`

#### 2.3.4 密钥轮换

```bash
# 原子性密钥轮换
shadowob-cloud secrets rotate --agent phantom-core

# 流程:
# 1. 读取新的密钥源 (.env / file / vault)
# 2. 创建新的 K8s Secret (immutable, 带时间戳后缀)
# 3. 更新 Deployment 引用新 Secret
# 4. 等待新 Pod Ready
# 5. 删除旧 Secret
# 6. 记录轮换日志
```

---

## 3. 权限策略 (P0)

### 3.1 Claude 的 Permission Policy 分析

Claude 提供两级权限控制：

| 层级 | 说明 |
|------|------|
| **Toolset 级** | `default_config.permission_policy` 对整个工具集生效 |
| **Tool 级** | `configs[].permission_policy` 覆盖单个工具 |

策略类型：
- `always_allow` — 自动执行
- `always_ask` — 暂停等待确认（MCP 工具默认此行为）

特别注意：**MCP 工具默认 always_ask**，防止新增工具自动执行。

### 3.2 shadowob-cloud 权限策略增强

#### 3.2.1 Per-Tool 权限

```jsonc
{
  "agents": [{
    "name": "phantom-core",
    "permissions": {
      // 默认策略
      "default": "approve-reads",
      // Per-tool 覆盖
      "tools": {
        "bash": "always-ask",          // 高危：Shell 执行
        "file-write": "approve-reads", // 中危：文件写入
        "web-fetch": "always-allow",   // 低危：HTTP 获取
        "mcp-*": "always-ask"          // MCP 工具默认需确认
      },
      // 非交互模式降级策略
      "nonInteractive": "deny"
    }
  }]
}
```

#### 3.2.2 映射到 ACPX

| shadowob-cloud 配置 | Claude 对标 | ACPX 实际值 |
|-------------|-------------|-------------|
| `always-allow` | `always_allow` | `dangerously-skip-permissions` |
| `approve-reads` | N/A | `approve-reads` (默认) |
| `always-ask` | `always_ask` | `approve-all` |
| `deny-all` | N/A | 不启动 ACPX |

#### 3.2.3 工具白名单

```jsonc
{
  "agents": [{
    "name": "phantom-core",
    "toolPolicy": {
      // 启用的内置工具 (类似 Claude 的 agent_toolset configs)
      "builtinTools": {
        "bash": { "enabled": true, "permission": "always-ask" },
        "fileRead": { "enabled": true },
        "fileWrite": { "enabled": true },
        "webFetch": { "enabled": false },  // 禁用
        "webSearch": { "enabled": false }   // 禁用
      },
      // MCP servers 的工具策略
      "mcpTools": {
        "github": { "permission": "always-allow" },
        "*": { "permission": "always-ask" }  // 默认
      }
    }
  }]
}
```

---

## 4. 网络隔离策略 (P1)

### 4.1 Claude 的 Networking 分析

```jsonc
{
  "type": "cloud",
  "networking": {
    "type": "limited",              // unrestricted | limited
    "allowed_hosts": ["api.example.com"],
    "allow_mcp_servers": true,      // 允许 MCP server 出站
    "allow_package_managers": true   // 允许包管理器出站
  }
}
```

关键设计：
- `limited` + `allowed_hosts` 白名单机制
- MCP server 和包管理器的出站独立控制
- 不影响 web_search / web_fetch 工具的域名限制

### 4.2 shadowob-cloud NetworkPolicy 增强

当前 shadowob-cloud 网络策略 (spec/09-security §3.3) 是粗粒度 deny-all + allow 443/53。
借鉴 Claude 的设计，增加 per-agent 网络策略：

```jsonc
{
  "agents": [{
    "name": "phantom-core",
    "networking": {
      // "unrestricted" | "limited" | "deny-all"
      "type": "limited",
      "allowedHosts": [
        "api.anthropic.com",
        "api.openai.com"
      ],
      // 允许 MCP server 端点出站 (从 mcpServers[] 自动提取域名)
      "allowMcpServers": true,
      // 允许 NPM/PyPI 等包管理器
      "allowPackageManagers": false
    }
  }]
}
```

**生成的 NetworkPolicy：**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-phantom-core-netpol
spec:
  podSelector:
    matchLabels:
      shadowob-cloud/agent: phantom-core
  policyTypes: [Egress]
  egress:
    - to: []
      ports:
        - port: 53
          protocol: UDP   # DNS
    - to: []
      ports:
        - port: 443
          protocol: TCP
      # 注: K8s NetworkPolicy 不支持域名白名单
      # 需要结合 Cilium / Calico 的 CiliumNetworkPolicy
      # 或 Istio ServiceEntry 实现域名级隔离
```

> **实现说明：** 原生 K8s NetworkPolicy 仅支持 IP/CIDR 级控制。
> 域名级白名单需要 Cilium CiliumNetworkPolicy 的 `toFQDNs` 或类似方案。
> shadowob-cloud 生成器应在检测到 Cilium 时生成 `CiliumNetworkPolicy`，否则退回 IP 级控制。

---

## 5. Agent 版本管理 (P1)

### 5.1 Claude 的版本机制

- Agent 每次 update 自动 `version++`
- Session 创建时可 pin 到特定 version: `{"type": "agent", "id": "...", "version": 1}`
- 支持 `list versions` 查看变更历史
- 支持 `archive` 冻结 Agent (read-only)

### 5.2 shadowob-cloud Agent 版本规范

```jsonc
{
  "agents": [{
    "name": "phantom-core",
    "version": "1.2.0",      // 语义化版本 (新增)
    "changelog": "增加 web search 工具" // 可选变更说明
  }]
}
```

**版本管理策略：**

```bash
# 查看 Agent 部署版本历史 (从 K8s annotations 读取)
shadowob-cloud history phantom-core

# 回滚到指定版本
shadowob-cloud rollback phantom-core --to v1.1.0

# 版本信息存储在 Deployment annotations:
#   shadowob-cloud/agent-version: "1.2.0"
#   shadowob-cloud/config-hash: "sha256:abc..."
#   shadowob-cloud/deployed-at: "2026-07-15T10:00:00Z"
```

---

## 6. Skills 与 Memory (P2)

### 6.1 Claude Skills 分析

- 文件系统级知识：Agent 按需读取，不占用固定 context window
- 两种类型：Anthropic 预置 + 自定义 (custom skills)
- 每 session 最多 20 个 skills
- 版本化管理

### 6.2 shadowob-cloud 对标

shadowob-cloud 已有 `cloud-skills` workspace 机制（见 spec/04-gitagent），可增强为：

```jsonc
{
  "agents": [{
    "name": "phantom-core",
    "skills": [
      // 本地 skill (Git 仓库中的 SOUL.md / skills/)
      { "type": "local", "path": "./skills/coding-standards" },
      // 远程 skill (Git repo)
      { "type": "git", "url": "https://github.com/org/shared-skills", "ref": "v1.0" },
      // 内置 skill
      { "type": "builtin", "id": "web-research" }
    ]
  }]
}
```

### 6.3 Memory Store 评估

Claude Memory Store 的核心价值：**跨 session 知识持久化**。

shadowob-cloud 场景映射：
- K8s Pod 重启后 Agent 丢失上下文
- PVC 可保存文件，但不适合结构化知识管理
- Memory 应由 Agent runtime 自身管理 (如 Claude Code 的 CLAUDE.md)

**建议方案：**

```
Agent Pod
  └── /workspace/.memory/    # PVC 持久化
       ├── preferences.md     # 用户偏好
       ├── conventions.md     # 项目约定
       └── learnings/         # 学习记录
            ├── 2026-07-15.md
            └── ...
```

shadowob-cloud 在生成 Deployment 时确保 `/workspace` 使用持久 PVC，Agent runtime 负责管理 `.memory/` 目录。

---

## 7. Outcome 评估 (P2)

### 7.1 Claude Outcomes 分析

Claude 引入了**自动质量验收**机制：
1. 用户定义 rubric (评分标准 markdown)
2. 独立的 grader 评估产物
3. 不满足标准则自动迭代修正
4. 最多 N 次迭代 (默认 3, 最大 20)
5. 产物写入 `/mnt/session/outputs/`

### 7.2 shadowob-cloud 可借鉴方向

```jsonc
{
  "agents": [{
    "name": "code-reviewer",
    "outcomes": {
      // Agent 完成任务后的验证步骤
      "validation": {
        "type": "script",
        "command": "npm test && npm run lint",
        "maxRetries": 3
      },
      // 或：结构化评价标准
      "rubric": "./rubrics/code-review.md"
    }
  }]
}
```

> **注意：** Outcome 评估需要 Agent runtime 支持反馈循环。
> 当前 shadowob-cloud 的 ACP runtime (Claude Code 等) 已具备此能力，
> 但需要 shadowob-cloud 层面的编排支持。列入 roadmap 评估。

---

## 8. 与现有 shadowob-cloud 安全体系的整合

### 8.1 spec/09-security 增量改动

| 现有机制 | 增强内容 |
|---------|---------|
| §2 密钥管理 | 新增 Vault 分层 + per-agent Secret 隔离 |
| §3.3 网络隔离 | 新增 `networking` 配置 + per-agent NetworkPolicy |
| §3.4 ACPX 权限 | 新增 per-tool 权限 + MCP 默认 always-ask |
| §4.1 容器安全 | 无变化 |

### 8.2 配置 Schema 变更

需要在 `CloudConfig` / `AgentConfig` 中新增以下字段：

```typescript
interface AgentConfig {
  // ... 现有字段 ...

  // P0: 密钥隔离
  vault?: string               // 引用 vaults 中的 key，默认 "default"

  // P0: 细粒度权限
  permissions?: {
    default: PermissionLevel
    tools?: Record<string, PermissionLevel>
    nonInteractive?: 'deny' | 'fail'
  }

  // P1: 网络策略
  networking?: {
    type: 'unrestricted' | 'limited' | 'deny-all'
    allowedHosts?: string[]
    allowMcpServers?: boolean
    allowPackageManagers?: boolean
  }

  // P1: 版本
  version?: string
  changelog?: string
}

interface CloudConfig {
  // ... 现有字段 ...

  // P0: Vault
  vaults?: Record<string, VaultConfig>
}

type PermissionLevel = 'always-allow' | 'approve-reads' | 'always-ask' | 'deny-all'
```

### 8.3 CLI 变更

```bash
# P0: 新增命令
shadowob-cloud secrets list               # 列出各 Agent 的密钥配置
shadowob-cloud secrets rotate <agent>     # 轮换指定 Agent 的密钥
shadowob-cloud secrets validate           # 验证所有密钥引用可解析

# P1: 增强现有命令
shadowob-cloud validate                   # 新增: 检查 permissions / networking 配置
shadowob-cloud generate                   # 新增: 生成 per-agent NetworkPolicy
shadowob-cloud history <agent>            # 新增: 查看部署版本历史
shadowob-cloud rollback <agent>           # 新增: 回滚到指定版本
```

---

## 9. 实施路线

### Phase 1 — 密钥与权限 (P0)

1. `config/schema.ts` 新增 `vaults`, `permissions` 字段
2. `services/manifest.service.ts` 生成 per-agent K8s Secret
3. `interfaces/cli/validate.command.ts` 新增密钥引用检查
4. `config/template.ts` 支持 `${vault:name/key}` 模板语法
5. 更新 `spec/09-security.md` 反映新机制

### Phase 2 — 网络与版本 (P1)

1. `config/schema.ts` 新增 `networking`, `version` 字段
2. `infra/agent-deployment.ts` 生成 per-agent NetworkPolicy
3. 检测 Cilium → 生成 `CiliumNetworkPolicy` (FQDN 白名单)
4. Deployment annotations 记录版本信息
5. `shadowob-cloud history` / `shadowob-cloud rollback` CLI 命令

### Phase 3 — Memory 与 Outcome (P2)

1. 确保 PVC 配置正确支持 `.memory/` 目录
2. 评估是否需要 shadowob-cloud 层面的 Memory API
3. 探索 outcome/rubric 验证的编排实现

---

## 10. 总结

Claude Managed Agents 作为完全托管的 Agent 平台，其设计哲学是**声明式配置 + 平台托管运行时**。
shadowob-cloud 作为自托管 K8s 部署工具，借鉴其安全设计精髓（Vault 密钥隔离、per-tool 权限、域名级网络策略），
同时保持自托管的灵活性优势。

**核心收获：**
- **最小权限原则**：Claude 默认 MCP 工具 `always_ask`，shadowob-cloud 应跟进
- **密钥隔离**：per-agent Secret 而非全局共享
- **网络白名单**：`limited` + `allowed_hosts` 比 deny-all 更实用
- **版本管理**：Agent 配置变更可追溯、可回滚
- **Write-only secrets**：密钥创建后不可读取，仅可轮换

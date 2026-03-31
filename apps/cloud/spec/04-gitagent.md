# Shadow Cloud — GitAgent 集成规范

> **Spec:** 04-gitagent
> **Version:** 2.0-draft
> **Date:** 2026-04-10

---

## 1. 概述

[GitAgent](https://gitagent.sh/) 是一个开放标准，用 git 仓库中的文件定义 AI Agent。Shadow Cloud 提供一等公民级别的 GitAgent 支持：用户可以在 `shadowob-cloud.json` 中指向一个 git 仓库，Shadow Cloud 自动解析仓库中的 GitAgent 文件并映射为 OpenClaw 配置。

### 两种使用模式

| 模式 | 配置方式 | 解析时机 | 适用场景 |
|------|---------|---------|---------|
| **本地路径** | `agent.source.path: "./my-agent"` | CLI 端 (`resolveConfig`) | 开发、CI |
| **Git 仓库** | `agent.source.git.url: "https://..."` | Pod 启动时 (init container) | 生产 |

### 文件映射总览

```
gitagent repo/                    Shadow Cloud 映射
─────────────                     ────────────────
agent.yaml              ──▶      agent.model, agent.compliance, runtime config
SOUL.md                 ──▶      agent.identity.personality → systemPrompt prefix
RULES.md                ──▶      systemPrompt → hard constraints section
INSTRUCTIONS.md         ──▶      systemPrompt → standing instructions section
AGENTS.md               ──▶      systemPrompt → multi-agent coordination hints
skills/*/SKILL.md       ──▶      OpenClaw skills.load.extraDirs + skills.entries
tools/*.yaml            ──▶      (informational — tools run inside OpenClaw)
hooks/hooks.yaml        ──▶      OpenClaw lifecycle hooks
hooks/bootstrap.md      ──▶      hooks → on_start prompt
hooks/teardown.md       ──▶      hooks → on_stop prompt
skillflows/*.yaml       ──▶      agent.workflows[]
scheduler.yml           ──▶      agents.defaults.heartbeat (cron → heartbeat)
memory/MEMORY.md        ──▶      systemPrompt → memory management instructions
compliance/             ──▶      agent.compliance
```

---

## 2. 适配器架构 (`src/adapters/gitagent.ts`)

### 2.1 当前状态

适配器是一个 **900 行** 的模块，包含:
- 自定义 YAML parser (300 行)
- 文件读取函数 (200 行)
- 适配/映射函数 (400 行)

### 2.2 核心问题 (P1-2)

**自定义 YAML Parser**:
- 不支持 YAML anchors (`&`, `*`)
- 不支持 YAML aliases
- 不支持 YAML tags (`!!`)
- 不支持 multi-line block scalars（仅处理了 `|` 和 `>`，但边界 case 多）
- 对嵌套缩进的处理有边界 case

**修复方案**: 用 `yaml` npm 包替代自定义 parser。

```typescript
// Before (300 lines of custom YAML parser)
function parseYaml(content: string): Record<string, unknown> { ... }

// After (1 line)
import { parse as parseYaml } from 'yaml'
```

**注意**: `yaml` 包已在 monorepo 中其他位置使用，不会增加新依赖。

---

## 3. 文件解析规范

### 3.1 `agent.yaml`

**GitAgent 标准字段**:
```yaml
spec_version: "0.1.0"
name: code-review-agent
version: 1.0.0
description: Automated code review agent
author: gitagent-examples
license: MIT

model:
  preferred: claude-sonnet-4-5-20250929
  fallback:
    - claude-haiku-4-5-20251001
  constraints:
    temperature: 0.2
    max_tokens: 4096
    thinking_level: high

skills:
  - code-review
  - static-analysis

tools:
  - lint-check
  - complexity-analysis

runtime:
  type: acp                    # → 映射为 agent.runtime = "claude-code"
  framework: claude-code
  executor: acpx
  cwd: /workspace

compliance:
  risk_tier: standard
  frameworks: [finra]
  supervision:
    human_in_the_loop: conditional
  recordkeeping:
    audit_logging: true
    retention_period: 7y

dependencies:
  shared-tools: "github:org/shared-tools@v1.0"

agents:                        # 子 agent 列表
  - analyst
  - reporter
```

**映射到 `AgentDeployment`**:

| agent.yaml 字段 | AgentDeployment 字段 |
|---|---|
| `name` | `identity.name` |
| `description` | `description` |
| `model.preferred` | `model.preferred` |
| `model.fallback` | `model.fallbacks` |
| `model.constraints.temperature` | `model.constraints.temperature` |
| `model.constraints.max_tokens` | `model.constraints.maxTokens` |
| `model.constraints.thinking_level` | `model.constraints.thinkingLevel` |
| `compliance.risk_tier` | `compliance.riskTier` |
| `compliance.supervision.human_in_the_loop` | `compliance.humanInTheLoop` |
| `compliance.recordkeeping.audit_logging` | `compliance.auditLogging` |
| `runtime.type=acp` | 影响 OpenClaw ACP 配置 |

### 3.2 `SOUL.md`

**格式**: 自由格式 Markdown。

**解析**: 读取全部内容，作为 `agent.identity.personality`。

**最终效果**: 在 OpenClaw systemPrompt 的最前面注入:
```
[SOUL.md 内容]

[RULES.md 内容]

[INSTRUCTIONS.md 内容]

[原始 systemPrompt]
```

### 3.3 `RULES.md`

**格式**: 自由格式 Markdown。

**解析**: 读取全部内容，添加 `## Hard Constraints` 标题后注入 system prompt。

### 3.4 `INSTRUCTIONS.md`

**格式**: 自由格式 Markdown。

**解析**: 读取全部内容，添加 `## Standing Instructions` 标题后注入。

### 3.5 `skills/*/SKILL.md`

**格式**: YAML frontmatter + Markdown body。

```markdown
---
name: code-review
description: Thorough code reviews
license: MIT
compatibility: ">=0.1.0"
allowed-tools: Read Edit Grep Glob Bash
metadata:
  author: "Jane Doe"
  version: "1.0.0"
  category: "developer-tools"
---

# Instructions

Review the code for:
1. Security vulnerabilities
2. Performance issues
3. Code style consistency
```

**映射**: 
- 每个 `skills/{name}/SKILL.md` 注册为 OpenClaw 技能条目
- 技能目录加入 `skills.load.extraDirs`

### 3.6 `tools/*.yaml`

**格式**: YAML 工具定义。

```yaml
name: lint-check
description: Run linter on target files
command: eslint
args: ["--format", "json"]
```

**映射**: 工具定义传递给 OpenClaw，由 OpenClaw 的 tool system 处理。目前是 informational —— 工具在 Agent 运行时内部发现和执行。

### 3.7 `hooks/hooks.yaml`

```yaml
lifecycle:
  on_start: bootstrap
  on_stop: teardown
  on_error: alert_team

events:
  - name: new-pr
    trigger: github.pull_request.opened
    skill: code-review
```

**映射**: 
- `lifecycle.on_start` → 读取 `hooks/bootstrap.md`，注入为启动 prompt
- `lifecycle.on_stop` → 读取 `hooks/teardown.md`，用于 graceful shutdown

### 3.8 `skillflows/*.yaml` (SkillsFlow)

```yaml
name: code-review-flow
description: Full code review pipeline
triggers:
  - pull_request

steps:
  lint:
    skill: static-analysis
    inputs:
      path: ${{ trigger.changed_files }}

  review:
    agent: code-reviewer
    depends_on: [lint]
    prompt: |
      Focus on security and performance.
    inputs:
      findings: ${{ steps.lint.outputs.issues }}

  report:
    skill: review-summary
    depends_on: [review]
```

**映射**: 解析为 `AgentWorkflowDef`，存储在 `agent.workflows[]`。

### 3.9 `scheduler.yml`

```yaml
schedules:
  - name: daily-briefing
    cron: "0 9 * * *"
    skill: morning-briefing
    prompt: "Summarize overnight activity"
    enabled: true
```

**映射**: 第一个 schedule 的 cron 表达式映射为 OpenClaw `agents.defaults.heartbeat.every`。

### 3.10 `memory/MEMORY.md`

**格式**: Markdown 描述内存管理策略。

**映射**: 注入 system prompt 作为内存管理指导。

### 3.11 `compliance/regulatory-map.yaml`

```yaml
compliance:
  risk_tier: high
  frameworks:
    - finra-3110
    - sec-17a-4
  supervision:
    human_in_the_loop: always
  recordkeeping:
    audit_logging: true
    retention_period: 7y
```

**映射**: 解析为 `AgentCompliance`，merge 到 agent config。

---

## 4. System Prompt 构建

**最终 system prompt 的构成顺序**:

```
┌──────────────────────────────────────────────┐
│ 1. SOUL.md (personality / identity)          │
│    "You are Phantom, a vigilant DevOps..."   │
├──────────────────────────────────────────────┤
│ 2. ## Hard Constraints (RULES.md)            │
│    "- Never execute destructive commands..."  │
├──────────────────────────────────────────────┤
│ 3. ## Standing Instructions (INSTRUCTIONS.md)│
│    "- Always check cluster health first..."  │
├──────────────────────────────────────────────┤
│ 4. ## Memory Management (memory/MEMORY.md)   │
│    "- Use persistent memory for..."          │
├──────────────────────────────────────────────┤
│ 5. ## Multi-Agent (AGENTS.md)                │
│    "- Delegate security tasks to..."         │
├──────────────────────────────────────────────┤
│ 6. User systemPrompt                         │
│    (from identity.systemPrompt or config)    │
└──────────────────────────────────────────────┘
```

**优先级**: 
- 如果 `agent.identity.systemPrompt` 显式设置，它会替换第 6 部分
- 如果 `agent.identity.personality` 设置，它会替换第 1 部分
- GitAgent 文件提供的内容不会覆盖显式设置的字段（enrichment，不是 replacement）

---

## 5. Init Container 方案

当 `source.strategy: "init-container"` (默认):

```yaml
initContainers:
  - name: git-clone
    image: alpine/git
    command:
      - sh
      - -c
      - |
        git clone \
          --depth ${CLONE_DEPTH:-1} \
          --branch ${GIT_REF:-main} \
          ${GIT_REPO_URL} /tmp/repo
        # 如果指定了 subdir，只复制子目录
        if [ -n "${GIT_SUBDIR}" ]; then
          cp -r /tmp/repo/${GIT_SUBDIR}/* /agent/
        else
          cp -r /tmp/repo/* /agent/
        fi
    env:
      - name: GIT_REPO_URL
        value: "https://github.com/org/my-agent.git"
      - name: GIT_REF
        value: "main"
      - name: CLONE_DEPTH
        value: "1"
      - name: GIT_SUBDIR
        value: ""
    volumeMounts:
      - name: agent-source
        mountPath: /agent
```

**Private repos**: 通过 `source.git.sshKeySecret` 或 `source.git.tokenSecret` 注入凭据。

---

## 6. `enrichAgentFromGitAgent()` 函数规范

**输入**: `AgentDeployment` + `ParsedGitAgentDir`
**输出**: enriched `AgentDeployment`

**合并规则**（所有合并都是 "GitAgent 提供默认值，显式配置优先"）:

| 字段 | 合并方式 |
|------|---------|
| `identity.name` | GitAgent 值 if 未显式设置 |
| `identity.personality` | GitAgent SOUL.md if 未显式设置 |
| `model.preferred` | GitAgent agent.yaml if 未显式设置 |
| `model.fallbacks` | GitAgent agent.yaml if 未显式设置 |
| `model.constraints` | deep merge (显式值优先) |
| `compliance` | deep merge (显式值优先) |
| `workflows` | 追加（不替换） |
| `description` | GitAgent 值 if 未显式设置 |

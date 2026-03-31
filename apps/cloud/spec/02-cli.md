# Shadow Cloud — CLI 命令规范

> **Spec:** 02-cli
> **Version:** 2.0-draft
> **Date:** 2026-04-10

---

## 1. 全局选项

```
shadowob-cloud <command> [options]

Global Options:
  -f, --file <path>        配置文件路径 (默认: shadowob-cloud.json)
  -s, --stack <name>       Pulumi stack 名称 (默认: dev)
  -n, --namespace <ns>     K8s namespace 覆盖
  -v, --verbose            详细日志输出
  --version                版本号
  -h, --help               帮助信息
```

---

## 2. 命令清单

| 命令 | 分类 | 需要 K8s | 需要环境变量 | 描述 |
|------|------|---------|-------------|------|
| `init` | 配置 | No | No | 生成配置文件模板 |
| `validate` | 配置 | No | `--strict` 时需要 | 校验配置文件 |
| `generate` | 配置 | No | Yes (env refs) | 生成 K8s 清单或 OpenClaw 配置 |
| `build` | 镜像 | No | No | 构建 Agent Docker 镜像 |
| `images` | 镜像 | No | No | 管理预构建官方镜像 |
| `up` | 部署 | Yes | Yes | 部署 Agent 集群 |
| `down` | 部署 | Yes | No | 销毁 Agent 集群 |
| `status` | 运维 | Yes | No | 查看部署状态 |
| `logs` | 运维 | Yes | No | 查看 Agent 日志 |
| `scale` | 运维 | Yes | No | 调整副本数 |
| `provision` | 连接 | No (需 Shadow API) | Yes | 供给 Shadow 资源 |
| `serve` | Dashboard | No | No | 启动 Dashboard API |

---

## 3. 命令详解

### 3.1 `shadowob-cloud init`

**用途**: 从预置模板生成配置文件。

```
shadowob-cloud init [options]

Options:
  -t, --template <name>    模板名称 (从 templates/ 选择)
  -o, --output <path>      输出文件路径 (默认: shadowob-cloud.json)
  --list                   列出所有可用模板
  --force                  覆盖已存在的文件
```

**行为规范**:
1. `--list`: 读取 `templates/*.template.json`，输出模板名称、描述、Agent 数量
2. 无 `--template`: 默认在可选的模板列表中选择 `shadowob-cloud` 模板
3. 写入文件前检查目标路径是否存在（不存在 `--force` 不覆盖）
4. 成功后打印下一步指引:
   ```
   ✓ Created shadowob-cloud.json from "devops-team" template
   
   Next steps:
     1. Edit shadowob-cloud.json with your settings
     2. Set environment variables (ANTHROPIC_API_KEY, etc.)
     3. Run: shadowob-cloud validate
     4. Run: shadowob-cloud up
   ```

### 3.2 `shadowob-cloud validate`

**用途**: 验证配置文件的正确性。

```
shadowob-cloud validate [options]

Options:
  --strict                 严格模式: 检查所有 env 变量是否已设置
  --check-extends          验证所有 extends 引用可解析
  --check-bindings         验证所有 binding 引用指向有效的 buddy/server/agent
```

**验证阶段**:

| 阶段 | 默认 | `--strict` | 检查内容 |
|------|------|-----------|---------|
| 1. JSON 语法 | ✓ | ✓ | JSON.parse 成功 |
| 2. Schema 校验 | ✓ | ✓ | typia CloudConfig 类型匹配 |
| 3. extends 引用 | ✓ | ✓ | configuration 引用存在于 registry |
| 4. binding 一致性 | ✓ | ✓ | buddy/server/channel/agent 引用有效 |
| 5. template 引用收集 | ✓ | ✓ | 收集所有 ${env:...} 引用 |
| 6. env 变量解析 | ✗ | ✓ | 检查 process.env 中存在 |
| 7. 完整 resolve | ✗ | ✓ | resolveConfig 无报错 |

**退出码**:
- `0`: 验证通过
- `1`: 验证失败
- `2`: 文件不存在或不可读

**输出示例**:
```
shadowob-cloud validate

✓ JSON syntax valid
✓ Schema validation passed
✓ 2 extends references resolved
✓ 3 bindings consistent
ℹ 5 environment variable references found:
  - ${env:ANTHROPIC_API_KEY}
  - ${env:DEEPSEEK_API_KEY}
  - ${env:SLACK_BOT_TOKEN}
  - ${env:TELEGRAM_BOT_TOKEN}
  - ${env:GITHUB_TOKEN}
⚠ Run with --strict to verify all variables are set

Config valid ✓
```

### 3.3 `shadowob-cloud generate`

**用途**: 生成 K8s 清单文件或 OpenClaw 配置文件（不部署）。

```
shadowob-cloud generate <subcommand> [options]

Subcommands:
  manifests              生成 K8s YAML/JSON 清单文件
  openclaw-config        生成 per-agent OpenClaw config.json

Options:
  -o, --output <dir>       输出目录 (默认: ./generated)
  --format <yaml|json>     输出格式 (默认: yaml，仅 manifests)
```

**`generate manifests` 行为**:
1. 解析并 resolve 配置
2. 调用 `buildManifests()` 生成 plain K8s objects
3. 每个资源写为一个文件到输出目录:
   ```
   generated/
   ├── namespace.yaml
   ├── agent-phantom-core/
   │   ├── configmap.yaml
   │   ├── secret.yaml
   │   ├── deployment.yaml
   │   └── service.yaml
   └── agent-code-reviewer/
       ├── configmap.yaml
       ├── ...
   ```

**`generate openclaw-config` 行为**:
1. 对每个 agent 调用 `buildOpenClawConfig()`
2. 输出 per-agent 的 `config.json`:
   ```
   generated/
   ├── agent-phantom-core.config.json
   └── agent-code-reviewer.config.json
   ```

**当前问题 (P0-5)**:
`buildManifests()` 和 `createInfraProgram()` 是两套独立的资源构建逻辑。应该从一个共享函数生成 plain objects，然后:
- `generate manifests` 直接输出
- `up` 将 objects 包装为 Pulumi resources

### 3.4 `shadowob-cloud build`

**用途**: 为使用 `source.strategy: "build-image"` 的 Agent 构建 Docker 镜像。

```
shadowob-cloud build [agent-id...] [options]

Options:
  --push                   构建后推送到 registry
  --no-cache              不使用 Docker 缓存
  --platform <p>           目标平台 (默认: linux/amd64)
  --tag <tag>              镜像 tag 覆盖
  --output-dockerfile      仅输出 Dockerfile，不构建
```

**行为**:
1. 筛选 `source.strategy === "build-image"` 的 agents（或指定的 agent-id）
2. 对每个 agent 调用 `generateGitAgentDockerfile()` 生成 Dockerfile
3. 运行 `docker build` 构建镜像
4. `--push` 时运行 `docker push`

### 3.5 `shadowob-cloud images`

**用途**: 管理预构建的官方基础镜像 (openclaw-runner, claude-runner)。

```
shadowob-cloud images <subcommand> [options]

Subcommands:
  list                     列出可用的官方镜像
  build <name>             构建指定的官方镜像
  push <name>              推送到 registry

Options:
  --tag <tag>              版本 tag
  --platform <p>           目标平台
  --into-k8s               适配本地 K8s (Rancher Desktop)
  --push                   构建后推送
  --registry <url>         自定义 registry (默认: ghcr.io/shadowob)
```

### 3.6 `shadowob-cloud up`

**用途**: 部署或更新 Agent 集群。

```
shadowob-cloud up [options]

Options:
  --dry-run                仅预览变更
  --skip-provision         跳过 Shadow 资源供给
  --output-dir <dir>       仅输出清单文件，不部署到 K8s
  --image-pull-policy <p>  镜像拉取策略 (Always/IfNotPresent/Never)
  --k8s-shadow-url <url>   Pod 内访问 Shadow 的 URL 覆盖
  --yes                    跳过确认提示
```

**执行流程**:

```
shadowob-cloud up -f shadowob-cloud.json
       │
       ▼
┌──────────────────┐
│ 1. parseConfigFile│  读取 + typia 校验
└──────┬───────────┘
       │
┌──────▼───────────┐
│ 2. provision     │  创建 Shadow Server/Channel/Buddy
│   (可跳过)        │  保存 state 到 .shadowob/
└──────┬───────────┘
       │
┌──────▼───────────┐
│ 3. resolveConfig │  展开 extends + 模板解析
│   + buildEnvVars │  注入 provision 生成的 token
└──────┬───────────┘
       │
┌──────▼───────────┐
│ 4. Pulumi up     │  createInfraProgram() → K8s API
│   或 output YAML  │  或 buildManifests() → 文件
└──────────────────┘
```

**创建的 K8s 资源 (per agent)**:
- Namespace
- ConfigMap (config.json + env vars)
- Secret (API keys, tokens)
- Deployment (container + init containers + probes)
- Service (ClusterIP, port 3100)
- PersistentVolumeClaim (如果 workspace.enabled)

### 3.7 `shadowob-cloud down`

**用途**: 销毁 Agent 集群。

```
shadowob-cloud down [options]

Options:
  --yes                    跳过确认提示
```

**行为**:
1. 尝试通过 Pulumi 销毁 stack
2. Pulumi state 不存在时，fallback 到 `kubectl delete namespace`
3. 成功后清理本地 Pulumi state

### 3.8 `shadowob-cloud status`

```
shadowob-cloud status [options]

Options:
  --pods                   显示 Pod 详细信息
  --outputs                显示 Pulumi stack outputs
  --resources              显示已供给的 Shadow 资源 ID
```

**输出示例**:
```
Namespace: shadowob-cloud-dev

DEPLOYMENT                  READY   REPLICAS   AGE
agent-phantom-core          1/1     1          2h
agent-code-reviewer         1/1     1          2h

Status: All agents running ✓
```

### 3.9 `shadowob-cloud logs`

```
shadowob-cloud logs <agent-id> [options]

Options:
  --tail <n>               显示最后 n 行 (默认: 100)
  --follow                 持续跟踪 (默认: true)
  --all                    所有 pod 的日志
```

### 3.10 `shadowob-cloud scale`

```
shadowob-cloud scale <agent-id> --replicas <n>
```

### 3.11 `shadowob-cloud provision`

**用途**: 独立运行 Shadow 资源供给（不部署 K8s）。

```
shadowob-cloud provision [options]

Options:
  --dry-run                仅预览
  --output <path>          输出 provision state 文件
  --server-url <url>       Shadow Server URL
  --user-token <token>     认证 token
```

### 3.12 `shadowob-cloud serve`

**用途**: 启动 Dashboard REST API + 静态文件服务。

```
shadowob-cloud serve [options]

Options:
  --port <n>               API 端口 (默认: 3004)
  --host <h>               绑定地址 (默认: 127.0.0.1)
```

**API 端点**:

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/deployments` | 列出所有 deployments |
| GET | `/api/deployments/pods` | 列出所有 pods |
| GET | `/api/templates` | 列出可用模板 |
| GET | `/api/templates/:name` | 获取模板内容 |
| POST | `/api/deploy` | 触发部署 (返回 SSE 流) |
| GET | `/api/settings` | 获取 provider 设置 |
| PUT | `/api/settings` | 更新 provider 设置 |
| GET | `/api/logs/:namespace/:pod` | SSE 日志流 |

**当前问题 (P0-4)**:
端口配置不一致:
- `serve.ts` 默认 3004
- `rsbuild.config.ts` proxy → 3004
- `playwright.config.ts` 用 4749 (serve) 和 4750 (dashboard)

**修复**: 统一为 `serve --port 3004`，Dashboard dev proxy → 3004，E2E 测试也用 3004。

---

## 4. 缺失命令（提议）

### 4.1 `shadowob-cloud doctor` (P2-5)

**用途**: 检查运行环境的前置条件。

```
shadowob-cloud doctor

Checks:
  ✓ Node.js v22.5.0 >= 22.0.0
  ✓ Docker v27.0.1 available
  ✓ kubectl v1.30.0 connected to cluster
  ✓ Pulumi v3.160.0 available
  ✓ K8s cluster reachable (context: my-cluster)
  ✗ ANTHROPIC_API_KEY not set
  ✓ shadowob-cloud.json found
  
  4/5 checks passed. Set ANTHROPIC_API_KEY to proceed.
```

### 4.2 `shadowob-cloud diff` (P2-2)

**用途**: 预览配置变更对 K8s 资源的影响。

```
shadowob-cloud diff

  ~ Deployment/agent-phantom-core
    ~ spec.template.spec.containers[0].env
      + SLACK_BOT_TOKEN: ****
    ~ spec.template.spec.containers[0].image
      - ghcr.io/shadowob/openclaw-runner:1.0.0
      + ghcr.io/shadowob/openclaw-runner:1.1.0
  
  + Deployment/agent-new-monitor (new)

  Summary: 1 modified, 1 added, 0 removed
```

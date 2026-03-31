# Shadow Cloud — Deployment Bug Report

> **Date:** 2026-04-10
> **Branch:** `feat/cloud-skills-workspace`
> **Cluster:** Rancher Desktop k3s v1.34.5
> **Node.js:** v22.22.2

---

## Bug 1: `serve` 不服务 Dashboard 静态文件

**文件：** `src/cli/serve.ts`

**现象：**
```
$ curl http://localhost:4902/
{"error":"Not found"}
```

`serve` 的路由器（第 294-375 行）只处理 `/api/*` 和 `/health` 路径，没有静态文件服务逻辑。`pnpm dashboard:build` 生成的 `dashboard/dist/` 目录完全没被 `serve` 使用。

**代码分析：** `router()` 函数没有任何 static file serving 分支，`/` 直接走到第 374 行的 `jsonError(res, 404, 'Not found')`。

**影响：** 用户必须同时运行两个进程：`node dist/index.js serve` + `pnpm dashboard:preview`，而且文档中暗示 `serve` 应该提供 dashboard。

---

## Bug 2: `buildManifests` 缺少 git init-container 支持

**文件：** `src/infra/index.ts` 第 114-333 行（`buildManifests` 函数）

**现象：** `generate manifests` 命令对 `strategy: "init-container"` 的 agent 不生成 init container。对比同文件的 `createAgentDeployment` 函数（`src/infra/agent-deployment.ts` 第 160-187 行）有完整的 init container 逻辑。

**影响：** 离线生成的 manifest 和通过 Pulumi 部署的实际资源不一致。用户用 `generate manifests` 预览的结果与 `up` 部署到集群的结果不同。

**已修复：** 本次会话中已添加 init container 逻辑到 `buildManifests`。

---

## Bug 3: Manifest 文件命名约定不一致

**文件：** `src/infra/index.ts` 第 164 行

**现象：** 文件命名使用 `${name}-${kind}.json` 格式，如 `solo-assistant-deployment.json`。但原始测试文档期望的是 `Deployment-solo-assistant.json` 格式。

**代码：**
```typescript
// index.ts:164
writeFileSync(resolve(outDir, `${name}-${kind}.json`), ...)
```

**影响：** 下游脚本如果用旧命名约定查找文件会失败。

---

## Bug 4: Pulumi CLI 未列为依赖

**文件：** `src/cli/up.ts`、`src/utils/k8s-client.ts`

**现象：**
```
✗ Deployment failed: code: -2
```

`shadowob-cloud up` 通过 `@pulumi/pulumi` 的 Automation API 调用 `pulumi up`，这需要系统上安装 Pulumi CLI 二进制。但 `pulumi` 不在 `package.json` 的 `dependencies` 或 `devDependencies` 中，`engines` 也没声明。

**影响：** 新环境执行 `shadowob-cloud up` 会失败，错误信息 `code: -2` 不够明确（exit code -2 是 spawn ENOENT，但用户看到的是 "Deployment failed: code: -2" 而不是 "pulumi not found"）。

---

## Bug 5: Docker 镜像不可用

**文件：** `src/infra/agent-deployment.ts` 第 10-13 行、`src/infra/index.ts` 第 218 行

**现象：**
```
[ErrImagePull] Error response from daemon: error from registry: denied
```

默认镜像 `ghcr.io/shadowob/openclaw-runner:latest` 在 GHCR 上不存在或不可公开访问。

**同时 `images/` 目录不在工作树中：**
```bash
$ git ls-files images/
# 显示 apps/cloud/images/openclaw-runner/Dockerfile 被跟踪
$ ls images/
# ls: images/: No such file or directory
```

Dockerfile 被 git 跟踪但可能因为 `.gitignore` 或 sparse checkout 导致文件不在磁盘上。

**影响：** 即使 K8s 集群就绪，pod 也拉不到镜像，进入 `ImagePullBackOff`。

---

## Bug 6: Pod CrashLoopBackOff — OpenClaw Gateway 启动失败

**文件：** `images/openclaw-runner/entrypoint.mjs` 第 215-286 行（`startGateway` 函数）

**现象：**
```
$ kubectl get pods -n smoke-test
NAME                         READY   STATUS             RESTARTS   AGE
solo-assistant-xxx-yyy       0/1     CrashLoopBackOff   3          2m
solo-content-xxx-yyy         0/1     CrashLoopBackOff   3          2m
solo-metrics-xxx-yyy         0/1     OOMKilled          2          2m
solo-seo-xxx-yyy             0/1     OOMKilled          2          2m
solo-social-xxx-yyy          0/1     Running            0          2m
```

Pod 事件日志显示：
```
Warning  Unhealthy  Startup probe failed: HTTP probe failed with statuscode: 503
Warning  BackOff    Back-off restarting failed container openclaw
```

Pod 描述显示容器退出码 1：
```
Last State:     Terminated
  Reason:       Error
  Exit Code:    1
```

部分 pod 报 `OOMKilled`（`solo-metrics` 限制 256Mi，实际用了 191Mi；`solo-seo` 限制 256Mi，实际用了 204Mi）。说明 memory limit 设置过低。

**根因分析：**
`entrypoint.mjs` 第 274-282 行：
```javascript
proc.on('exit', (code, signal) => {
  if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
    console.log('[entrypoint] Unexpected exit, shutting down container')
    process.exit(code ?? 1)  // 这里导致容器重启
  }
})
```

OpenClaw gateway 进程用 stub API key 初始化失败后退出（exit code 1），entrypoint 检测到非正常退出就 `process.exit(1)`，K8s 看到容器退出就重启，形成 CrashLoopBackOff。

**影响：** 没有真实 API key，agent pod 永远跑不起来。这意味着整个项目的端到端测试必须有真实的 AI 服务账号。

---

## Bug 7: 资源配置 — Memory limit 过低

**文件：** `templates/solopreneur-pack.template.json` 第 173-176、214-217 行

**现象：**
```
solo-metrics: limits.memory = 256Mi → OOMKilled at 191Mi usage
solo-seo:     limits.memory = 256Mi → OOMKilled at 204Mi usage
```

256Mi 的限制对 Node.js + OpenClaw 进程来说太低。OpenClaw 需要加载 `openclaw@latest`、`@shadowob/openclaw-shadowob@latest` 及其依赖，加上运行时内存，很容易超过 256Mi。

**影响：** 即使 API key 正确，某些 agent 也可能因为内存不足被 OOMKilled。

---

## Bug 8: PVC 并发冲突

**文件：** `src/infra/index.ts` 第 140-153 行

**现象：**
```
Warning  FailedScheduling  running PreBind plugin "VolumeBinding":
  Operation cannot be fulfilled on persistentvolumeclaims "shared-workspace":
  the object has been modified; please apply your changes to the latest version and try again
```

所有 agent 的 Deployment 同时引用同一个 `shared-workspace` PVC。多个 Deployment 创建时对同一 PVC 的绑定产生竞争。

**影响：** 调度延迟，某些 pod 可能需要多次重试才能启动。虽然最终 PVC 能绑定成功，但增加了部署时间。

---

## 问题优先级

| 优先级 | Bug | 影响面 | 修复难度 |
|---|---|---|---|
| P0 | #5 Docker 镜像不可用 | 阻断所有真实部署 | 低（发布镜像）|
| P0 | #6 Pod CrashLoopBackOff | 没有真实 key 就无法运行 | 中（需要 graceful 降级或文档说明）|
| P1 | #1 serve 不服务 Dashboard | 用户需要额外启动 dashboard | 低（加静态文件路由）|
| P1 | #4 Pulumi CLI 未列为依赖 | 新用户直接失败 | 低（安装指引或 bundled）|
| P2 | #7 Memory limit 过低 | 部分 agent OOMKilled | 低（调高 limit）|
| P2 | #2 buildManifests 缺 init container | 离线/在线结果不一致 | 低（已修复）|
| P3 | #3 文件命名不一致 | 影响下游脚本 | 低（更新约定或文档）|
| P3 | #8 PVC 并发冲突 | 部署延迟 | 中（串行化或重试）|

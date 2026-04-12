# 🐱 虾豆(Shadow)可观测性审查报告

> 审查时间: 2026-04-12  
> 审查人: 小炸 (监控与可观测性审查官)

---

## 总览

| 维度 | 评分 | 一句话 |
|------|------|--------|
| 日志体系 | ⚠️ 60/100 | 能用但缺乏结构化上下文和请求关联 |
| 错误追踪 | ❌ 0/100 | 完全没有 Sentry 等错误追踪集成 |
| 性能指标 | ⚠️ 30/100 | 日志记录了请求耗时，但没有指标采集系统 |
| 健康检查 | ⚠️ 40/100 | 有 `/health` 但不检查 DB/Redis 连接状态 |
| 业务指标 | ❌ 0/100 | 没有采集任何业务指标 |
| 告警策略 | ❌ 0/100 | 没有告警机制 |
| 分布式追踪 | ❌ 0/100 | 没有 trace ID / 请求关联 |

**综合评分: 28/100 — 可观测性基础设施几乎为零**

---

## 1. 日志体系 — 评分 60/100

### 现状

- 使用 **pino** 作为日志库，选择正确 — 性能好、支持 JSON 结构化
- 开发环境用 `pino-pretty` 彩色输出，生产环境输出纯 JSON
- 日志级别支持 `LOG_LEVEL` 环境变量配置
- `logger.middleware.ts` 记录了每个请求的 method、URL、status 和耗时

### 问题

**1.1 缺少请求关联 ID (requestId)**
```typescript
// 当前: 每条日志是孤立的
logger.info({ method, url, status, duration: `${duration}ms` }, '...')

// 应该: 每个请求有唯一 ID，所有相关日志都能关联
logger.info({ requestId: 'xxx', method, url, status, duration }, '...')
```
用户报 "API 报错" 时，你无法在日志中找出这个请求的完整链路。

**1.2 缺少关键上下文**
- 没有记录 `userId` — 不知道哪个用户触发的请求
- 没有记录 `userAgent` — 无法区分客户端来源
- 没有记录请求的 `body` 关键信息（注意：不能记敏感数据，但可以记操作类型）

**1.3 日志级别使用不够规范**
- `loggerMiddleware` 所有请求都用 `info` 级别 — 生产环境流量大时日志量爆炸
- 建议：2xx → `debug`，4xx → `warn`，5xx → `error`

**1.4 全局错误处理器重复**
`app.ts` 的 `app.onError()` 和 `error.middleware.ts` 功能重复。`app.onError` 是 Hono 内置的兜底错误处理，而 `errorMiddleware` 作为中间件注册但**实际没有在 app.ts 中使用**（app.ts 用的是 `app.onError` 而非中间件）。

**1.5 日志轮转未配置**
生产环境 JSON 日志直接输出到 stdout，没有配置日志轮转、归档或集中收集。Docker 环境中日志会随容器生命周期丢失。

### 建议优先级

| 优先级 | 改进项 | 难度 |
|--------|--------|------|
| P0 | 添加 requestId 中间件 | 低 |
| P0 | 日志级别按状态码区分 | 低 |
| P1 | 添加 userId 到请求上下文 | 低 |
| P1 | 生产环境接入日志收集 (Loki / CloudWatch) | 中 |
| P2 | 统一 app.onError 和 errorMiddleware | 低 |

---

## 2. 错误追踪 — 评分 0/100

### 现状

**完全没有错误追踪系统。** 项目中：
- 没有 `@sentry/node`、`rollbar` 或任何同类依赖
- `package.json` 中无任何错误追踪相关包
- `.env.example` 中无 Sentry DSN 等配置

所有错误只能通过 `logger.error()` 记录在日志中，这意味着：
- ❌ 无法主动发现线上错误（必须有人看日志）
- ❌ 没有错误聚合和去重
- ❌ 没有错误趋势分析
- ❌ 没有错误发生时的上下文快照（用户、请求参数、调用栈）
- ❌ 没有错误通知机制

### 建议

```bash
pnpm add @sentry/node @sentry/profiling-node
```

在 `index.ts` 的 `main()` 函数最前面初始化 Sentry：
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% 请求采样
});
```

在 `app.onError()` 中上报：
```typescript
Sentry.captureException(error, { tags: { path: c.req.path } });
```

---

## 3. 性能指标 — 评分 30/100

### 现状

唯一的性能数据来自 `loggerMiddleware` 的 `duration` 字段（字符串格式如 `"123ms"`），这**不是真正的指标采集**：
- 无法计算 P50/P95/P99 延迟
- 无法做告警阈值
- 无法做趋势分析
- 数据库查询时间完全没有记录
- WebSocket 连接数、消息延迟未采集
- 没有 Prometheus / StatsD / OpenTelemetry 集成

### 关键缺失

| 指标 | 是否采集 | 重要性 |
|------|----------|--------|
| API 响应时间 (P50/P95/P99) | ❌ | 🔴 高 |
| API 请求速率 (QPS) | ❌ | 🔴 高 |
| API 错误率 (5xx / 4xx) | ❌ (只有日志) | 🔴 高 |
| 数据库查询耗时 | ❌ | 🔴 高 |
| 数据库连接池状态 | ❌ | 🟡 中 |
| WebSocket 在线连接数 | ❌ | 🟡 中 |
| WebSocket 消息延迟 | ❌ | 🟡 中 |
| Redis 操作耗时 | ❌ | 🟡 中 |
| Redis 内存使用 | ❌ | 🟢 低 |
| 内存/CPU 使用率 | ❌ (OS 层面) | 🟡 中 |

### 建议

最轻量方案：添加 `prom-client` 暴露 `/metrics` 端点：
```bash
pnpm add prom-client
```

关键指标：
- `http_request_duration_seconds` (Histogram) — API 延迟分布
- `http_requests_total` (Counter) — 按 method/status 的请求计数
- `db_query_duration_seconds` (Histogram) — 数据库查询耗时
- `websocket_connections_active` (Gauge) — 当前在线连接数

---

## 4. 健康检查 — 评分 40/100

### 现状

```typescript
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
```

`/health` 只返回 `{status: 'ok', timestamp}` — 这叫做 **liveness probe**，只能证明进程在运行。

### 问题

**4.1 不检查依赖服务状态**
- 数据库连接断了？`/health` 依然返回 `ok`
- Redis 挂了？`/health` 依然返回 `ok`
- MinIO 不可达？`/health` 依然返回 `ok`

这在生产中是严重问题 — 容器编排系统会认为服务健康，但实际已经不可用。

**4.2 缺少 readiness probe 区分**
Docker Compose 中 infra 服务都配置了 healthcheck，但 server 服务没有依赖 healthcheck：
```yaml
# docker-compose.yml — server 没有依赖 healthcheck
depends_on:
  postgres:
    condition: service_healthy  # ✅ 等 postgres ready
  redis:
    condition: service_healthy  # ✅ 等 redis ready
```

但 server 启动后，自己的 `/health` 并不能反映真实可用性。

### 建议

区分两个端点：

| 端点 | 类型 | 检查内容 | 用途 |
|------|------|----------|------|
| `/health/live` | Liveness | 进程是否存活 | 容器编排决定是否重启 |
| `/health/ready` | Readiness | DB/Redis/MinIO 连接是否正常 | 负载均衡决定是否转发流量 |

示例实现：
```typescript
app.get('/health/ready', async (c) => {
  const checks: Record<string, { status: string }> = {};
  
  // Check DB
  try {
    await db.execute('SELECT 1');
    checks.database = { status: 'ok' };
  } catch {
    checks.database = { status: 'error' };
  }
  
  // Check Redis
  try {
    const redis = await getRedisClient();
    if (redis) await redis.ping();
    checks.redis = { status: 'ok' };
  } catch {
    checks.redis = { status: 'error' };
  }
  
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const status = allOk ? 200 : 503;
  
  return c.json({ status: allOk ? 'ok' : 'degraded', checks }, status);
});
```

---

## 5. 业务指标 — 评分 0/100

### 现状

**完全没有业务指标采集。**

### 关键缺失

| 业务指标 | 是否采集 | 为什么重要 |
|----------|----------|------------|
| 注册用户总数 | ❌ | 增长趋势 |
| 日活跃用户 (DAU) | ❌ | 用户粘性 |
| 在线用户数 | ❌ (Redis 有数据但未暴露) | 实时负载 |
| 消息发送速率 | ❌ | 平台活跃度 |
| 服务器创建数 | ❌ | 核心功能使用 |
| 订单/充值金额 | ❌ | 营收指标 |
| Agent 在线数 | ❌ | 平台特色功能 |
| API 调用按端点分布 | ❌ | 热点分析 |

### 建议

这些指标可以从数据库定期查询并暴露为 Prometheus metrics，或通过定时任务写入时序数据库。

---

## 6. 告警策略 — 评分 0/100

### 现状

**没有任何告警机制。** 错误只记日志，没有人会被通知。

### 当前仅有的"告警"
- `index.ts` 的 `main().catch()` 会在启动失败时 `logger.fatal` + `process.exit(1)` — 这是崩溃退出，不是告警

### 需要告警的关键场景

| 告警项 | 触发条件 | 紧急程度 |
|--------|----------|----------|
| 5xx 错误率 > 1% | 5 分钟内 5xx 占比超 1% | 🔴 P0 |
| API P95 延迟 > 2s | 5 分钟内持续 | 🟡 P1 |
| 数据库连接失败 | 连续 3 次失败 | 🔴 P0 |
| Redis 连接断开 | 无法重连 | 🟡 P1 |
| 磁盘空间 < 10% | MinIO 存储 | 🟡 P1 |
| 服务崩溃 | 进程退出 | 🔴 P0 |

### 建议

最简单路径：接入 Sentry → Sentry 自带错误告警（邮件/Slack/Webhook）。

生产监控路径：Prometheus + AlertManager + Grafana。

---

## 7. 分布式追踪 — 评分 0/100

### 现状

**完全没有分布式追踪。**
- 没有 trace ID
- 没有 span 概念
- 没有跨服务请求关联
- 没有 `x-request-id` 或 `x-correlation-id` 请求头传递

### 影响

- WebSocket 消息 → HTTP API 调用 → 数据库查询，这整条链路无法串联
- 一个用户反馈 "发送消息失败"，你需要手动在日志中搜索，且可能找不到

### 建议

轻量方案：实现 request ID 中间件即可覆盖 80% 需求
```typescript
// requestId.middleware.ts
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  // logger 自动带上 requestId
  await next();
});
```

完整方案：OpenTelemetry + Jaeger/Tempo

---

## 总结 & 实施路线图

### 阶段一：立竿见影 (1-2 天)

1. **添加 requestId 中间件** — 所有日志带上请求 ID
2. **增强 /health 端点** — 检查 DB/Redis 连接状态
3. **日志级别按状态码优化** — 减少生产环境噪声

### 阶段二：错误可发现 (2-3 天)

4. **集成 Sentry** — 自动捕获和聚合所有未处理错误
5. **添加全局 unhandledRejection/uncaughtException 处理**
6. **Sentry 告警配置** — 邮件或 webhook 通知

### 阶段三：可观测性基础 (3-5 天)

7. **添加 Prometheus metrics** — `/metrics` 端点 + 关键指标
8. **数据库查询耗时追踪** — 在 drizzle 层添加 timing
9. **WebSocket 指标** — 在线连接数、消息延迟

### 阶段四：进阶 (按需)

10. **日志集中收集** — Loki / ELK
11. **OpenTelemetry 分布式追踪**
12. **业务指标 Dashboard** — Grafana

---

## 已实现的改进代码

> 以下是本次审查建议的具体代码改动，作为参考实现。

### 1. requestId 中间件

```typescript
// apps/server/src/middleware/request-id.middleware.ts
import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('x-request-id', requestId)

  const start = Date.now()
  const { method, url } = c.req

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug'

  logger[level](
    { requestId, method, url, status, duration },
    `${method} ${new URL(url).pathname} ${status} ${duration}ms`,
  )
}
```

### 2. 增强健康检查

```typescript
// apps/server/src/routes/health.ts
import type { Context } from 'hono'
import { db } from '../db'
import { getRedisClient } from '../lib/redis'
import { logger } from '../lib/logger'

export async function readinessCheck(c: Context) {
  const checks: Record<string, { status: string; error?: string }> = {}

  // DB check
  try {
    await db.execute('SELECT 1')
    checks.database = { status: 'ok' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    checks.database = { status: 'error', error: msg }
    logger.error({ err }, 'Health check: database unreachable')
  }

  // Redis check
  try {
    const redis = await getRedisClient()
    if (redis) {
      await redis.ping()
      checks.redis = { status: 'ok' }
    } else {
      checks.redis = { status: 'disabled' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    checks.redis = { status: 'error', error: msg }
    logger.error({ err }, 'Health check: redis unreachable')
  }

  const allOk = Object.values(checks).every((c) => c.status !== 'error')
  return c.json(
    { status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    allOk ? 200 : 503,
  )
}
```

### 3. 未捕获异常处理

```typescript
// 添加到 index.ts main() 函数中
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection')
  process.exit(1)
})
```

---

*审查完成。建议从阶段一开始，逐步搭建完整的可观测性体系。*

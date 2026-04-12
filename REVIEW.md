# WebSocket 架构扩展性审查报告

> 审查日期: 2026-04-12
> 审查人: 小炸 🐱
> 审查范围: `apps/server/src/ws/*.gateway.ts`, `apps/server/src/index.ts`, `apps/server/src/lib/redis.ts`

---

## 1. 🔴 Redis Adapter 缺失 — 多实例部署致命问题

**严重等级: 高 (P0)**

### 现状

当前 Socket.IO 服务器没有使用 `@socket.io/redis-adapter`。所有消息广播（`io.to(...).emit()`）仅在单进程内存中完成。

```typescript
// apps/server/src/index.ts — Socket.IO 初始化
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
  transports: ['websocket', 'polling'],
  pingInterval: 15000,
  pingTimeout: 10000,
})
// ❌ 没有 io.adapter(createAdapter(pubClient, subClient))
```

### 影响

当部署多个 Server 实例时（比如 K8s 副本数 > 1）：
- **消息丢失**：用户在实例 A 发送的消息，无法广播到实例 B 上的用户
- **房间隔离**：`socket.join()` 只在本地实例生效，跨实例的房间成员不可见
- **通知遗漏**：`io.to('user:xxx').emit()` 只会通知在同一个实例上连接的用户

这是**水平扩展的最大障碍**。不修复的话，多实例部署会导致严重的消息丢失。

### 修复方案

```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()
await Promise.all([pubClient.connect(), subClient.connect()])
io.adapter(createAdapter(pubClient, subClient))
```

### 建议优先级

- **P0**: 安装 `@socket.io/redis-adapter` 并集成
- 可以利用现有的 Redis 客户端（`apps/server/src/lib/redis.ts`），但需要额外创建 pub/sub 客户端对

---

## 2. 🟡 房间管理 — 基本可用，但存在扩展性隐患

**严重等级: 中 (P1)**

### 现状分析

| 房间类型 | 加入验证 | 离开处理 | 潜在问题 |
|---------|---------|---------|---------|
| `channel:{id}` | 有（memberDao 验证） | 有（显式 leave） | ✅ 合理 |
| `dm:{id}` | 有（participant 验证） | 有（显式 leave） | ✅ 合理 |
| `user:{id}` | 无（自动 join） | 无显式清理 | ⚠️ Socket.IO 自动清理 |
| `thread:{id}` | 无验证 | 无 | ⚠️ 可能被滥用 |
| `app:channel` | 有（appId 查 channelId） | 有 | ✅ 合理 |

### 发现的问题

#### 2.1 Thread 房间无权限验证

```typescript
// chat.gateway.ts — 发消息时自动加入 thread 房间
if (data.threadId) {
  io.to(`thread:${data.threadId}`).emit('message:new', message)
}
```

没有 `thread:join` 事件，发消息时直接向 thread 房间广播。这意味着：
- 用户即使不是 thread 成员，只要知道 threadId 就能收到消息
- 恶意用户可能通过猜测 threadId 窃听消息

**建议**: 新增 `thread:join` 事件，验证 thread 成员资格后再 join。

#### 2.2 大房间广播无优化

当前所有 `io.to(room).emit()` 都是全量广播。对于大频道（比如 1000+ 成员）：
- **无分页/分批**：一次性向所有房间成员发送
- **无消息限流**：高频打字指示器（`message:typing`）可能产生大量网络流量
- **Presence 广播效率**：`broadcastPresenceToRooms()` 串行遍历所有 channel 和 DM 房间

```typescript
// presence.gateway.ts — 串行 for 循环
for (const channelId of channelIds) {
  io.to(`channel:${channelId}`).emit('presence:change', payload)
}
```

**建议**:
- 对 typing 等高频事件做节流（客户端侧 300ms 节流）
- 大房间广播考虑使用 Socket.IO 的 `broadcast` 标志优化

---

## 3. 🟢 连接管理 — 基础配置合理，但缺乏精细化控制

**严重等级: 中 (P1)**

### 现有配置

```typescript
pingInterval: 15000,  // ✅ 每 15s 发 ping（比默认 25s 更积极）
pingTimeout: 10000,   // ✅ 等待 pong 超时 10s（比默认 20s 更快检测断线）
transports: ['websocket', 'polling']  // ✅ 支持降级
```

### 缺失的配置

| 配置项 | 当前 | 建议值 | 说明 |
|--------|------|--------|------|
| `maxHttpBufferSize` | 默认 1MB | 按需调整 | 防止大消息 DoS |
| `connectTimeout` | 默认 45s | 20s | 快速失败 |
| `allowEIO3` | 默认 false | false ✅ | 不需要兼容老客户端 |
| 单用户最大连接数 | 无限制 | 3-5 | 防止恶意多开 |
| 全局最大连接数 | 无限制 | 视服务器而定 | 防止连接耗尽 |

### 断线重连

Socket.IO 客户端默认自动重连，但服务端没有：
- **重连时的房间恢复**：用户重连后需要重新 join 所有房间，没有自动恢复机制
- **重连风暴防护**：大量用户同时重连时（比如服务器重启后），没有 rate limit

**建议**:
```typescript
// 服务端增加
const io = new SocketIOServer(server, {
  maxHttpBufferSize: 1e6,       // 1MB 上限
  connectTimeout: 20000,        // 20s 连接超时
  cors: { /* ... */ },
})
```

---

## 4. 🟡 内存泄漏风险 — 基本安全，但有潜在问题

**严重等级: 中低 (P2)**

### 好的实践

- Socket.IO 自动在 disconnect 时清理房间成员 ✅
- 所有事件监听器使用 `socket.on()` 而非 `io.on()` ✅（监听器绑定到 socket 实例，disconnect 时自动移除）

### 发现的问题

#### 4.1 Presence Gateway 中的双触发

```typescript
// presence.gateway.ts — 在线状态被记录了两次！

// 第一次：监听 'connect' 事件（可能不会触发，因为 socket 已连接）
socket.on('connect', async () => { ... })

// 第二次：IIFE 立即执行（一定会执行）
;(async () => { ... })()
```

这两个逻辑是重复的，且 `socket.on('connect')` 在 Socket.IO 中**不会在已连接的 socket 上触发**（`connect` 是客户端事件，在服务端 `connection` 之后不会再次触发）。

**影响**: 虽然功能正确（IIFE 兜底了），但代码冗余且有误导性。

**建议**: 移除 `socket.on('connect')` 监听，只保留 IIFE 逻辑。

#### 4.2 未捕获的异步错误

多处使用 `void` fire-and-forget 调用：

```typescript
void userDao.updateStatus(userId, 'online')
void broadcastPresenceToRooms(io, container, userId, { userId, status: 'online' })
```

这些异步操作如果抛出异常，错误会被静默吞掉。虽然不会导致内存泄漏，但会导致：
- 用户状态不一致
- 难以排查的 bug

**建议**: 至少加 `.catch()` 记录错误日志。

#### 4.3 Bot 自动加入 DM 房间

```typescript
// chat.gateway.ts — Bot 连接时自动加入所有 DM 房间
if (currentUser?.isBot) {
  const dmChs = await dmService.getUserChannels(userId)
  for (const ch of dmChs) {
    await socket.join(`dm:${ch.id}`)
  }
}
```

如果 Bot 有大量 DM 频道，会在连接时产生大量 `join` 操作。这本身不会泄漏（disconnect 时自动清理），但可能：
- 连接耗时增加
- 如果 `getUserChannels` 返回大量数据，一次性 join 可能阻塞

---

## 5. 🔴 消息队列 — 无背压机制，高并发场景有风险

**严重等级: 高 (P0 for scaling)**

### 现状

- **无消息队列**：消息直接通过 `io.to().emit()` 发送
- **无背压（backpressure）机制**：客户端慢消费时，消息可能在 Node.js 内存中堆积
- **无消息持久化**：WebSocket 消息不持久化，断线即丢失
- **无消息重试**：发送失败后无重试机制

### 具体问题

#### 5.1 消息发送无确认

```typescript
// chat.gateway.ts — 发消息后直接广播，无确认
const message = await messageService.send(data.channelId, userId, { /* ... */ })
io.to(`channel:${data.channelId}`).emit('message:new', message)
// ❌ 没有确认客户端是否收到
```

#### 5.2 高频事件无限流

```typescript
socket.on('message:typing', ({ channelId }) => {
  // 客户端每按一个键就触发一次，无限流
  socket.to(`channel:${channelId}`).emit('message:typing', { /* ... */ })
})
```

#### 5.3 消息发送中的 DAO 调用阻塞

`message:send` 处理函数中串行执行了多个数据库查询和写操作：
1. 验证成员资格 → 2. 发送消息 → 3. 自动创建 thread → 4. 广播 → 5. 创建回复通知 → 6. 解析 @mention → 7. 为每个 mention 创建通知

整个过程是串行的，如果有 10 个 @mention，就是 N+1 查询。高并发时可能成为瓶颈。

### 修复建议

```typescript
// 1. 添加背压感知发送
function safeEmit(socket: Socket, event: string, data: unknown): boolean {
  const buffered = (socket as any).client?.writeBuffer?.length ?? 0
  if (buffered > 100) {
    logger.warn({ socketId: socket.id, buffered }, 'Client buffer full, dropping message')
    return false
  }
  socket.emit(event, data)
  return true
}

// 2. 消息发送确认（可选）
io.to(`channel:${data.channelId}`).emit('message:new', message, (ack) => {
  // Socket.IO 支持 emit 的 ack 回调，但只能用于单个 socket
  // 对 room 广播不支持 ack
})

// 3. 对于关键消息（如通知），使用 Redis 队列保证投递
// 参考：BullMQ / ioredis + 消费端确认
```

---

## 6. 🟢 Presence 系统 — 已按房间优化，仍有改进空间

**严重等级: 低 (P2)**

### 现有优势

- 已从 `io.emit()` 优化为按房间广播 ✅
- 使用 Redis Set 跟踪在线 socket ✅
- 使用 `sCard` 判断用户是否首次上线/最后下线 ✅
- Activity 状态使用 Redis TTL 自动过期 ✅

### 可改进之处

#### 6.1 广播仍然是串行的

```typescript
for (const channelId of channelIds) {
  io.to(`channel:${channelId}`).emit('presence:change', payload)
}
```

如果用户加入了 50 个频道，就是 50 次独立的 `emit` 调用。加入 Redis adapter 后，这些会变成 Redis Pub/Sub 消息。

**建议**: 可以考虑批量合并，或者使用 Redis Pub/Sub 直接发布（跳过 Socket.IO 的 room 机制）：

```typescript
// 使用 Redis Pub/Sub 直接发布，由每个实例监听并本地广播
await redis.publish('presence:change', JSON.stringify(payload))
```

#### 6.2 没有 Presence 批量查询

客户端可能需要查询多个用户的在线状态，当前只能通过逐个查询 Redis key 实现。

**建议**: 使用 `mget` 或 pipeline 批量查询。

#### 6.3 `forceDisconnectUser` 不通知其他实例

```typescript
export async function forceDisconnectUser(userId: string, io: Server, ...) {
  // 只清理 Redis 和更新数据库
  // ❌ 没有通过 Redis adapter 通知其他实例 disconnect 该用户的 socket
}
```

---

## 7. 🔴 单进程限制 — 水平扩展方案

**严重等级: 高 (P0)**

### 当前架构

```
Client → Socket.IO → 单进程 Node.js Server
                        ├── Hono HTTP API
                        ├── Socket.IO WebSocket
                        └── App Proxy WebSocket
```

整个服务运行在单进程，受限于 Node.js 单线程事件循环。

### 水平扩展方案

#### 方案 A: Socket.IO Redis Adapter + 多进程 (推荐)

```
              ┌─────────┐
    Client ──►│  NGINX  │  (sticky sessions 或 IP hash)
              └────┬────┘
          ┌────────┼────────┐
          ▼        ▼        ▼
      ┌──────┐ ┌──────┐ ┌──────┐
      │Node-1│ │Node-2│ │Node-3│
      └──┬───┘ └──┬───┘ └──┬───┘
         └────────┼────────┘
                  ▼
          ┌──────────────┐
          │    Redis     │  ← Socket.IO Adapter
          │  (Pub/Sub)   │
          └──────────────┘
```

**关键配置**:
```typescript
// nginx.conf
upstream websocket {
    ip_hash;  # 或使用 sticky cookie
    server node1:3002;
    server node2:3002;
    server node3:3002;
}
```

**注意事项**:
- WebSocket 连接需要 sticky sessions（同一次连接保持在同一实例）
- Socket.IO 的 Redis adapter 会自动处理跨实例广播
- 如果使用 `ip_hash`，NAT 后面的多个用户可能被分配到同一实例（负载均衡不均）
- 更好的方案是使用 Socket.IO 的 `sticky-session` 包或基于 cookie 的粘性路由

#### 方案 B: PM2 Cluster Mode

```typescript
// ecosystem.config.js
module.exports = {
  apps: [{
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
  }]
}
```

PM2 cluster 模式下，Node.js 的 cluster 模块会自动处理端口共享，但 **Socket.IO 在 cluster 模式下需要额外的 sticky-session 配置**，且 PM2 cluster 不支持 WebSocket 的原生 sticky sessions。

**不推荐**，除非有运维团队深度定制。

#### 方案 C: K8s + Socket.IO Redis Adapter (生产推荐)

```yaml
# k8s deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shadow-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: server
        image: shadow-server:latest
        ports:
        - containerPort: 3002
        env:
        - name: REDIS_URL
          value: redis://redis-service:6379
```

---

## 总结 & 修复优先级

| # | 问题 | 严重等级 | 影响 | 工作量 |
|---|------|---------|------|--------|
| 1 | 缺少 Redis Adapter | P0 | 多实例部署消息丢失 | 2h |
| 2 | Thread 房间无权限验证 | P1 | 潜在信息泄露 | 1h |
| 3 | 缺少背压/限流机制 | P1 | 高并发时内存增长/服务降级 | 4h |
| 4 | 大房间广播无优化 | P1 | 大频道性能问题 | 3h |
| 5 | Presence 双触发代码冗余 | P2 | 代码混乱，不影响功能 | 0.5h |
| 6 | fire-and-forget 无错误处理 | P2 | 静默错误，难以排查 | 1h |
| 7 | 缺少连接数限制 | P2 | 潜在 DoS | 1h |
| 8 | 单进程限制 | P0 | 无法水平扩展 | 见方案 A |

### 修复路线图

**Phase 1 — 必须做（让多实例部署成为可能）**:
1. 集成 `@socket.io/redis-adapter`
2. 配置生产级 Socket.IO 参数
3. 添加 Nginx sticky sessions 或改用 cookie-based routing

**Phase 2 — 应该做（提升可靠性）**:
1. Thread 房间权限验证
2. 背压感知消息发送
3. 高频事件限流（typing 等）

**Phase 3 — 可以做（锦上添花）**:
1. Presence 广播批量优化
2. 消息投递确认机制
3. 连接数限制

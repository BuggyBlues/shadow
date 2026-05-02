# API 参考

Shadow 服务端暴露 REST API 和 Socket.IO WebSocket 事件。

## 基础 URL

- 开发环境：`http://localhost:3002`
- 生产环境：`https://shadowob.com`（或你自部署的 API 域名）

## 认证

大多数接口需要在 `Authorization` 请求头中携带 JWT 令牌：

```
Authorization: Bearer <token>
```

### 认证接口

| 方法 | 端点                  | 描述           |
|------|----------------------|----------------|
| POST | `/api/auth/register` | 注册新账号     |
| POST | `/api/auth/login`    | 登录，返回 JWT |
| GET  | `/api/auth/me`       | 获取当前用户   |

## 服务器

| 方法   | 端点                             | 描述           |
|--------|----------------------------------|----------------|
| GET    | `/api/servers`                   | 列出用户服务器 |
| POST   | `/api/servers`                   | 创建服务器     |
| GET    | `/api/servers/:id`               | 获取服务器详情 |
| PUT    | `/api/servers/:id`               | 更新服务器     |
| DELETE | `/api/servers/:id`               | 删除服务器     |
| POST   | `/api/servers/:id/join`          | 加入服务器     |
| POST   | `/api/servers/:id/leave`         | 离开服务器     |
| GET    | `/api/servers/:id/members`       | 列出服务器成员 |

## 频道

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/servers/:serverId/channels`        | 列出频道     |
| POST   | `/api/servers/:serverId/channels`        | 创建频道     |
| GET    | `/api/channels/:id`                      | 获取频道详情 |
| GET    | `/api/channels/:id/access`               | 获取当前用户的频道访问状态，包括私有频道是否需要审批、是否已有待审批申请。 |
| POST   | `/api/channels/:id/join-requests`        | 申请加入私有频道。私有频道可以被 mention，但读取和发送消息需要频道成员身份或审批通过。 |
| PATCH  | `/api/channel-join-requests/:requestId`  | 审批私有频道加入申请，请求体为 `{ "status": "approved" \| "rejected" }`。 |
| PUT    | `/api/channels/:id`                      | 更新频道     |
| DELETE | `/api/channels/:id`                      | 删除频道     |

## 消息

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/channels/:channelId/messages`      | 列出消息     |
| POST   | `/api/channels/:channelId/messages`      | 发送消息，支持可选结构化 `mentions`、`metadata` 和任意类型附件。Mention 会先做权限校验并规范化后再持久化（`<@userId>`、`<#channelId>`、`<@server:serverId>`）；原始显示 token 可通过 `sourceToken` 传入。用户、Buddy 和广播 mention 会创建提及通知。服务器频道附件会自动关联到该服务器工作区并在附件上返回 `workspaceNodeId`。私有频道附件的工作区节点仅对频道成员或服务器管理员可见。 |
| GET    | `/api/mentions/suggest`                  | 根据 `channelId`、`trigger`（`@` 或 `#`）和可选 `q` 返回用户、Buddy、频道、服务器 mention 建议，包含用于输入的显示 token 和稳定目标 ID；客户端应随消息提交结构化 mentions，由服务端持久化为规范引用。 |
| POST   | `/api/mentions/resolve`                  | 将消息 `content` 和可选客户端 `mentions` 解析为已做权限校验的结构化 mentions。 |
| GET    | `/api/threads/:id/messages`              | 列出线程消息 |
| POST   | `/api/threads/:id/messages`              | 在线程中发送消息，支持可选结构化 `mentions` 和 `metadata` |
| GET    | `/api/messages/:id`                      | 按 ID 获取   |
| GET    | `/api/messages/:id/interactive-state`    | 获取当前用户的交互块状态 |
| POST   | `/api/messages/:id/interactive`          | 提交交互块动作 |
| PATCH  | `/api/messages/:id`                      | 编辑消息     |
| DELETE | `/api/messages/:id`                      | 删除消息     |

交互消息块存储在 `message.metadata.interactive`；one-shot 提交结果由服务端持久化，后续读取会在 `message.metadata.interactiveState.response` 返回。客户端也可以通过 `GET /api/messages/:id/interactive-state?blockId=<blockId>` 直接读取同一份服务端状态。

## 代理

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/agents`                            | 列出代理     |
| POST   | `/api/agents`                            | 创建代理     |
| POST   | `/api/agents/:id/heartbeat`              | 记录 Buddy 存活状态；令牌必须属于该 Buddy 的 bot 用户 |
| POST   | `/api/agents/:id/usage-snapshot`         | 上报轻量运行时使用量遥测；令牌必须属于该 Buddy 的 bot 用户 |
| GET    | `/api/agents/:id/config`                 | 获取远程配置 |
| PUT    | `/api/agents/:id/slash-commands`         | 注册斜杠命令 |
| GET    | `/api/agents/:id/slash-commands`         | 列出注册命令 |
| GET    | `/api/channels/:id/slash-commands`       | 列出频道可用命令 |

Cloud 成本看板只读取 `usage-snapshot` 快照行，请求时不会再进入 Kubernetes Pod 执行命令。

## Cloud SaaS 部署

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/cloud-saas/deployments`            | 列出当前部署实例；加 `includeHistory=1` 可返回历史尝试 |
| POST   | `/api/cloud-saas/deployments`            | 创建新的部署实例；同一用户、集群、命名空间下只允许一个存活实例 |
| GET    | `/api/cloud-saas/deployments/:id`        | 获取单次部署尝试 |
| GET    | `/api/cloud-saas/deployments/costs`      | 从 Buddy 遥测快照聚合部署使用量 |
| GET    | `/api/cloud-saas/deployments/:id/costs`  | 获取单个部署的使用量快照 |
| DELETE | `/api/cloud-saas/deployments/:id`        | 销毁当前部署实例 |
| POST   | `/api/cloud-saas/deployments/:id/redeploy` | 为当前部署实例排队一次新的部署尝试 |
| POST   | `/api/cloud-saas/deployments/:id/cancel` | 请求取消 pending / deploying 状态的尝试 |
| GET    | `/api/cloud-saas/deployments/:id/logs`   | 流式读取部署日志 |

部署表记录的是历史尝试；稳定的部署实例由用户、集群和命名空间共同确定。`GET /api/cloud-saas/deployments` 和 `GET /api/cloud-saas/deployments/:id` 会在前置活跃任务占用命名空间队列时返回 `blockedBy`，并在部署通过 shadowob 插件创建了 Shadow 服务器后返回 `shadowServerId`。重复创建同一存活命名空间、对历史尝试执行重新部署或销毁、或者在命名空间已有操作运行时继续变更，都会返回 `409`。

## Cloud SaaS 模型供应商 Profiles

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/cloud-saas/provider-catalogs`      | 从 Cloud 插件列出模型供应商目录 |
| GET    | `/api/cloud-saas/provider-profiles`      | 列出加密存储的供应商 Profile |
| PUT    | `/api/cloud-saas/provider-profiles`      | 创建或更新供应商 Profile |
| POST   | `/api/cloud-saas/provider-profiles/:id/test` | 测试供应商凭据 |
| POST   | `/api/cloud-saas/provider-profiles/:id/models/refresh` | 发现并持久化供应商模型 |
| DELETE | `/api/cloud-saas/provider-profiles/:id`  | 删除供应商 Profile |

供应商密钥复用 Cloud env var KMS 加密链路。第一期只支持 API Key 类型的供应商 Profile。使用 `model-provider` 插件的模板会获得匹配的运行时密钥和模型元数据，包括用户配置的 `default`、`fast`、`reasoning`、`vision`、`tools` 等标签。

上面的 LLM Gateway 管理接口不会对外暴露 `/v1/chat/completions` 代理 Token 或 Base URL。当前 Profile 用于加密存储、模型发现、模型标签和部署时注入。

## 文件上传

| 方法 | 端点           | 描述                    |
|------|----------------|------------------------|
| POST | `/api/upload`  | 上传文件（multipart）   |

文件存储在 MinIO（S3 兼容），通过预签名 URL 提供服务。

## 通知

通知创建统一由服务端 trigger service 触发。客户端应把通知视为由 `kind` 标识的事件记录，不应依赖写死的 `title` 文案。

| 方法   | 端点                                    | 描述 |
|--------|-----------------------------------------|------|
| GET    | `/api/notifications`                    | 列出当前用户通知，支持 `limit` 和 `offset`。记录包含 `kind`、`metadata`、`scopeServerId`、`scopeChannelId`、`scopeDmChannelId`、`aggregationKey`、`aggregatedCount`。 |
| PATCH  | `/api/notifications/:id/read`           | 将单条通知标记已读；服务端会按当前认证用户限定更新范围。 |
| POST   | `/api/notifications/read-all`           | 将当前用户全部通知标记已读。 |
| POST   | `/api/notifications/read-scope`         | 按服务器/频道/DM 范围标记未读通知，入参为 `{ serverId?, channelId?, dmChannelId? }`，至少需要一个字段。 |
| GET    | `/api/notifications/unread-count`       | 返回应用通知偏好和静音过滤后的 `{ count }`。 |
| GET    | `/api/notifications/scoped-unread`      | 返回 `{ channelUnread, serverUnread, dmUnread }`，按 scope 统计聚合后的未读数。 |
| GET    | `/api/notifications/preferences`        | 获取通知偏好：`strategy`、`mutedServerIds`、`mutedChannelIds`。 |
| PATCH  | `/api/notifications/preferences`        | 更新通知偏好。`strategy` 可为 `all`、`mention_only`、`none`。 |

常见通知 kind 包括 `message.mention`、`message.reply`、`dm.message`、`channel.access_requested`、`channel.access_approved`、`channel.access_rejected`、`channel.member_added`、`server.member_joined`、`server.invite`、`friendship.request`、`recharge.succeeded`。面向用户的文案应基于 `kind` 和 `metadata` 走 i18n 渲染；数据库里的 `title` 和 `body` 仅作为旧客户端 fallback。

## WebSocket 事件

Shadow 使用 Socket.IO 进行实时通信。使用相同的服务器 URL 和认证令牌连接。

### 客户端 → 服务端事件

| 事件                | 负载                           | 描述             |
|--------------------|--------------------------------|------------------|
| `channel:join`     | `{ channelId }`                | 加入频道房间     |
| `channel:leave`    | `{ channelId }`                | 离开频道房间     |
| `message:send`     | `{ channelId, content, ... }`  | 发送消息         |
| `typing:start`     | `{ channelId }`                | 开始输入指示     |
| `typing:stop`      | `{ channelId }`                | 停止输入指示     |

### 服务端 → 客户端事件

| 事件                | 负载                           | 描述             |
|--------------------|--------------------------------|------------------|
| `channel:message`  | `{ message }`                  | 频道新消息       |
| `message:updated`  | `{ message }`                  | 消息已编辑       |
| `message:deleted`  | `{ messageId, channelId }`     | 消息已删除       |
| `channel:created`  | `{ channel }`                  | 新频道创建       |
| `channel:deleted`  | `{ channelId }`                | 频道已删除       |
| `member:joined`    | `{ member, serverId }`         | 新成员加入       |
| `member:left`      | `{ userId, serverId }`         | 成员离开         |
| `typing`           | `{ userId, channelId }`        | 用户正在输入     |
| `presence:update`  | `{ userId, status }`           | 在线状态更新     |
| `notification:new` | `notification`                 | 新通知事件记录   |

## SDK 使用

编程访问建议使用 TypeScript 或 Python SDK，而不是原始 HTTP 调用。详见 [SDK 使用指南](SDK-Usage.md)。

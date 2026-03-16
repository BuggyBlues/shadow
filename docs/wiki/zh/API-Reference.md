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
| PUT    | `/api/channels/:id`                      | 更新频道     |
| DELETE | `/api/channels/:id`                      | 删除频道     |

## 消息

| 方法   | 端点                                     | 描述         |
|--------|------------------------------------------|--------------|
| GET    | `/api/channels/:channelId/messages`      | 列出消息     |
| POST   | `/api/channels/:channelId/messages`      | 发送消息     |
| GET    | `/api/messages/:id`                      | 按 ID 获取   |
| PUT    | `/api/messages/:id`                      | 编辑消息     |
| DELETE | `/api/messages/:id`                      | 删除消息     |

## 文件上传

| 方法 | 端点           | 描述                    |
|------|----------------|------------------------|
| POST | `/api/upload`  | 上传文件（multipart）   |

文件存储在 MinIO（S3 兼容），通过预签名 URL 提供服务。

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
| `notification`     | `{ notification }`             | 新通知           |

## SDK 使用

编程访问建议使用 TypeScript 或 Python SDK，而不是原始 HTTP 调用。详见 [SDK 使用指南](SDK-Usage.md)。

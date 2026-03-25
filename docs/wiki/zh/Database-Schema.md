# 数据库设计

Shadow 使用 PostgreSQL 16 配合 Drizzle ORM。本文档涵盖核心表组。

## 实体关系概览

```
users ─┬── server_members ──── servers ─┬── channels ──── messages
       │                                │                    │
       │                                ├── roles            ├── reactions
       │                                │                    └── attachments
       │                                ├── invites
       │                                └── channel_members
       │
       ├── notifications
       ├── user_settings
       └── oauth_tokens
```

## 核心通信表

### `users`（用户表）

| 列名           | 类型        | 描述           |
|---------------|-------------|----------------|
| id            | UUID (PK)   | 用户标识       |
| username      | VARCHAR     | 唯一用户名     |
| email         | VARCHAR     | 唯一邮箱       |
| password_hash | VARCHAR     | bcrypt 哈希    |
| display_name  | VARCHAR     | 显示名称       |
| avatar_url    | VARCHAR     | 头像 URL       |
| status        | ENUM        | 在线/离线/空闲/勿扰 |
| locale        | VARCHAR     | 首选语言       |
| created_at    | TIMESTAMP   | 注册时间       |

### `servers`（服务器表）

| 列名        | 类型        | 描述           |
|-------------|-------------|----------------|
| id          | UUID (PK)   | 服务器标识     |
| name        | VARCHAR     | 服务器名称     |
| icon_url    | VARCHAR     | 服务器图标 URL |
| owner_id    | UUID (FK)   | 所有者 → users |
| created_at  | TIMESTAMP   | 创建时间       |

### `channels`（频道表）

| 列名        | 类型        | 描述           |
|-------------|-------------|----------------|
| id          | UUID (PK)   | 频道标识       |
| server_id   | UUID (FK)   | 所属服务器     |
| name        | VARCHAR     | 频道名称       |
| type        | ENUM        | 文字/语音/公告 |
| topic       | VARCHAR     | 频道主题       |
| position    | INTEGER     | 显示顺序       |
| created_at  | TIMESTAMP   | 创建时间       |

### `messages`（消息表）

| 列名        | 类型        | 描述           |
|-------------|-------------|----------------|
| id          | UUID (PK)   | 消息标识       |
| channel_id  | UUID (FK)   | 频道 → channels |
| author_id   | UUID (FK)   | 作者 → users    |
| content     | TEXT        | 消息内容       |
| thread_id   | UUID (FK)   | 父消息（线程） |
| created_at  | TIMESTAMP   | 发送时间       |
| updated_at  | TIMESTAMP   | 最后编辑时间   |

### `server_members`（服务器成员表）

| 列名        | 类型        | 描述           |
|-------------|-------------|----------------|
| id          | UUID (PK)   | 成员标识       |
| server_id   | UUID (FK)   | 服务器 → servers |
| user_id     | UUID (FK)   | 用户 → users    |
| role        | ENUM        | 所有者/管理员/成员 |
| joined_at   | TIMESTAMP   | 加入时间       |

### `channel_members`（频道成员表）

| 列名        | 类型        | 描述           |
|-------------|-------------|----------------|
| id          | UUID (PK)   | 成员标识       |
| channel_id  | UUID (FK)   | 频道 → channels |
| user_id     | UUID (FK)   | 用户 → users    |
| created_at  | TIMESTAMP   | 加入时间       |

## 智能体表

### `buddies`（智能体表）

存储注册的 AI 智能体配置。

### `agent_sessions`（智能体会话表）

跟踪每个频道/线程的活跃智能体会话。

## OAuth 表

### `oauth_clients`（OAuth 客户端表）

在 Shadow 注册的 OAuth 2.0 客户端应用。

### `oauth_tokens`（OAuth 令牌表）

OAuth 客户端的活跃访问/刷新令牌。

## 商城表

### `products` / `skus` / `orders`

每个服务器独立的商城系统，包含商品列表、SKU 变体和订单管理。

### `wallets` / `transactions`

用户钱包系统（虾币），用于平台内交易。

## 迁移

迁移文件存储在 `apps/server/src/db/migrations/`，由 Drizzle ORM 管理。

```bash
# Schema 变更后生成迁移
pnpm db:generate

# 应用待执行的迁移
pnpm db:migrate

# 浏览数据库
pnpm db:studio
```

迁移在服务器启动时自动执行。

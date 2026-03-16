# 快速开始

5 分钟内让 Shadow 在本地运行。

## 一键启动

```bash
# 克隆并进入项目
git clone https://github.com/buggyblues/shadow.git && cd shadow

# 安装依赖
pnpm install

# 启动基础设施（PostgreSQL、Redis、MinIO）
docker compose up postgres redis minio -d

# 启动所有开发服务
pnpm dev
```

## 访问平台

| 服务        | 地址                   | 描述                     |
|-------------|------------------------|--------------------------|
| Web 应用    | http://localhost:3000   | 用户端主应用             |
| 管理后台    | http://localhost:3001   | 管理员控制面板           |
| API 服务    | http://localhost:3002   | REST API + WebSocket     |
| MinIO 控制台| http://localhost:9001   | 对象存储管理界面         |

## 第一步

### 1. 注册账号

打开 http://localhost:3000 注册新账号，或使用默认管理员凭据：

- **邮箱**: `admin@shadowob.app`
- **密码**: `admin123456`

### 2. 创建服务器

点击左侧边栏的 **+** 按钮创建新服务器。输入名称并可选择上传图标。

### 3. 创建频道

在服务器内，点击频道分组旁的 **+** 按钮创建文字频道。

### 4. 邀请成员

使用邀请功能生成加入链接/邀请码，邀请其他用户。

### 5. 开始聊天

选择一个频道开始发消息！Shadow 支持：

- **Markdown** 格式化
- **文件附件**（拖放或点击上传）
- **Emoji 回复**
- **消息线程**
- **@提及**

## 单独运行应用

```bash
# 仅服务端
pnpm --dir ./apps/server dev

# 仅 Web
pnpm --dir ./apps/web dev

# 仅管理后台
pnpm --dir ./apps/admin dev

# 桌面端 (Electron)
pnpm --dir ./apps/desktop dev

# 移动端 (Expo)
pnpm --dir ./apps/mobile start
```

## 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# 桌面端 E2E 测试 (Playwright)
pnpm --dir ./apps/desktop test:e2e
```

## 常用命令

| 命令                    | 描述                           |
|-------------------------|--------------------------------|
| `pnpm dev`              | 并行启动所有开发服务           |
| `pnpm build`            | 构建所有包和应用               |
| `pnpm lint`             | 使用 Biome 检查所有文件        |
| `pnpm lint:fix`         | 自动修复 lint 问题             |
| `pnpm format`           | 使用 Biome 格式化所有文件      |
| `pnpm test`             | 运行所有单元测试               |
| `pnpm db:generate`      | 生成 Drizzle 迁移文件          |
| `pnpm db:migrate`       | 运行数据库迁移                 |
| `pnpm db:studio`        | 打开 Drizzle Studio (数据库)   |

## 下一步

- [架构概览](Architecture-Overview.md) — 理解系统设计
- [开发指南](Development-Guide.md) — 编码规范和约定
- [API 参考](API-Reference.md) — REST API 端点

# 安装指南

本指南将帮助你从零搭建 Shadow 开发环境。

## 环境要求

| 工具               | 版本    | 安装方式                                                          |
|--------------------|---------|-------------------------------------------------------------------|
| **Node.js**        | ≥ 22    | [nodejs.org](https://nodejs.org/) 或 `nvm install 22`             |
| **pnpm**           | ≥ 10    | `corepack enable && corepack prepare pnpm@10.19.0 --activate`     |
| **Docker**         | ≥ 24    | [docker.com](https://www.docker.com/get-started/)                 |
| **Docker Compose** | ≥ 2.20  | Docker Desktop 自带                                               |
| **Git**            | ≥ 2.30  | [git-scm.com](https://git-scm.com/)                              |

## 克隆仓库

```bash
git clone https://github.com/buggyblues/shadow.git
cd shadow
```

## 安装依赖

Shadow 使用 **pnpm workspaces** 管理 monorepo。一条命令安装所有依赖：

```bash
pnpm install
```

这会安装所有应用 (`web`、`server`、`admin`、`desktop`、`mobile`) 和共享包 (`shared`、`ui`、`sdk`、`openclaw`、`oauth`) 的依赖。

## 启动基础设施

Shadow 需要 PostgreSQL、Redis 和 MinIO。最简单的方式是通过 Docker Compose 运行：

```bash
docker compose up postgres redis minio -d
```

### 默认基础设施端口

| 服务           | 端口   | 凭据                             |
|---------------|--------|----------------------------------|
| PostgreSQL    | 5432   | `shadow` / `shadow`              |
| Redis         | 16379  | (无认证)                          |
| MinIO API     | 9000   | `minioadmin` / `minioadmin`      |
| MinIO 控制台  | 9001   | `minioadmin` / `minioadmin`      |

## 运行数据库迁移

```bash
pnpm db:migrate
```

使用 Drizzle ORM 迁移创建所有所需的数据库表。迁移也会在服务器启动时自动执行。

## 环境变量

在项目根目录创建 `.env` 文件以自定义配置。服务器使用合理的默认值读取环境变量：

```env
# 数据库
DATABASE_URL=postgres://shadow:shadow@localhost:5432/shadow

# Redis
REDIS_URL=redis://localhost:16379

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=shadow

# JWT
JWT_SECRET=your-secret-key

# 服务端口
PORT=3002
```

## 验证安装

```bash
pnpm dev
```

如果一切配置正确：

- **Web 应用** → http://localhost:3000
- **管理后台** → http://localhost:3001
- **API 服务** → http://localhost:3002

## 下一步

- [快速开始](Quick-Start.md) — 创建你的第一个服务器和频道
- [开发指南](Development-Guide.md) — 了解编码工作流程
- [架构概览](Architecture-Overview.md) — 理解系统设计

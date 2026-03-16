# Docker 部署

使用 Docker Compose 部署完整的 Shadow 技术栈。

## 全栈部署

```bash
docker compose up --build
```

这会构建并启动所有服务：

| 服务           | 端口   | 描述                          |
|---------------|--------|-------------------------------|
| Web 应用      | 3000   | React SPA 主应用 (Nginx)       |
| 管理后台      | 3001   | 管理员控制面板 (Nginx)          |
| API 服务      | 3002   | Hono REST API + Socket.IO      |
| PostgreSQL    | 5432   | 主数据库                        |
| Redis         | 16379  | 缓存、会话、在线状态             |
| MinIO         | 9000   | S3 兼容对象存储                  |
| MinIO 控制台  | 9001   | 对象存储管理界面                 |

## 默认凭据

| 服务        | 用户名 / 邮箱           | 密码            |
|-------------|------------------------|-----------------|
| 管理应用    | `admin@shadowob.app`   | `admin123456`   |
| PostgreSQL  | `shadow`               | `shadow`        |
| MinIO       | `minioadmin`           | `minioadmin`    |

## 生产环境注意事项

### 环境变量

生产部署时，请覆盖默认值：

```bash
# 创建 .env 文件
DATABASE_URL=postgres://user:strongpassword@db-host:5432/shadow
REDIS_URL=redis://redis-host:6379
JWT_SECRET=一个很长的随机密钥
S3_ENDPOINT=https://your-s3-endpoint
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

### 安全检查清单

- [ ] 修改所有默认密码（PostgreSQL、MinIO、管理员账号）
- [ ] 设置强 `JWT_SECRET`
- [ ] 使用反向代理配置 HTTPS（Nginx、Caddy、Traefik）
- [ ] 启用 Redis 认证
- [ ] 通过防火墙限制外部端口访问
- [ ] 配置 MinIO 的 S3 桶策略

### 使用反向代理配置 HTTPS

在服务前放置反向代理（如 Nginx 或 Caddy）。Web 和 Admin 应用通过 Nginx 容器提供静态文件服务。API 服务在 3002 端口同时处理 REST 和 WebSocket 流量。

Nginx 上游配置示例：

```nginx
upstream api {
    server localhost:3002;
}

server {
    listen 443 ssl;
    server_name shadowob.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://api;
    }

    location /socket.io/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 清理

```bash
# 停止并移除容器
docker compose down

# 停止并移除容器 + 数据卷（完全重置）
docker compose down -v
```

## 仅启动基础设施

本地开发时，只运行基础设施服务：

```bash
docker compose up postgres redis minio -d
```

然后原生启动应用服务：

```bash
pnpm dev
```

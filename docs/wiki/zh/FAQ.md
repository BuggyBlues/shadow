# 常见问题

Shadow 的常见问题解答。

## 通用

### Shadow 是什么？

Shadow (虾豆) 是一个开源协作平台，类似 Discord，内置 AI 智能体支持、商城和工作空间协作。支持 Web、桌面端和移动端。

### Shadow 是免费的吗？

是的，Shadow 开源且可以免费自部署，遵循 AGPL-3.0 许可证。

### 支持哪些平台？

- **Web** — 任何现代浏览器
- **桌面端** — Windows、macOS（Intel 和 Apple Silicon）、Linux
- **移动端** — iOS 和 Android

---

## 开发

### 需要什么 Node.js 版本？

需要 Node.js 22 或更高版本。

### 为什么用 pnpm 而不是 npm/yarn？

Shadow 使用 pnpm workspaces 进行高效的 monorepo 依赖管理。pnpm 更快，通过内容寻址存储使用更少的磁盘空间。

### 如何重置数据库？

```bash
docker compose down -v
docker compose up postgres redis minio -d
pnpm db:migrate
```

### 如何添加新的 i18n 翻译键？

在 `apps/web/src/lib/locales/`（移动端为 `apps/mobile/src/i18n/locales/`）的所有语言文件中添加。支持的语言：`en`、`zh-CN`、`zh-TW`、`ja`、`ko`。

### 如何只运行单个应用？

```bash
pnpm --dir ./apps/web dev      # 仅 Web
pnpm --dir ./apps/server dev   # 仅服务端
pnpm --dir ./apps/desktop dev  # 仅桌面端
pnpm --dir ./apps/mobile start # 仅移动端
```

### 如何修复代码检查错误？

```bash
pnpm lint:fix
```

---

## 桌面端

### macOS 提示应用来自未知开发者？

右键点击应用并选择**打开**。这只需要操作一次——DMG 已经过 Apple 签名和公证。

### 如何更新桌面应用？

从[发布页面](https://github.com/buggyblues/shadow/releases/latest)下载最新版本。

---

## 移动端

### 如何在真机上运行移动应用？

1. 在设备上安装 Expo Go
2. 运行 `pnpm --dir ./apps/mobile start`
3. 用相机（iOS）或 Expo Go 应用（Android）扫描二维码

### 如何构建 TestFlight 版本？

详见 [移动端应用](Mobile-App.md) Wiki 页面，或使用：

```bash
./scripts/deploy-testflight.sh
```

---

## AI 智能体

### 如何创建自定义 AI 智能体？

详见 [AI 智能体 (OpenClaw)](AI-Buddies.md) Wiki 页面的完整指南。

### 支持哪些 AI 模型？

支持任何模型或 API——Shadow 的智能体系统与模型无关。OpenClaw 插件处理与 Shadow 的通信，你负责提供 AI 模型集成。

---

## 自部署

### 最低服务器配置要求？

- 2 核 CPU
- 4 GB 内存
- 20 GB 磁盘空间
- Docker + Docker Compose

### 如何部署到生产环境？

详见 [Docker 部署](Docker-Deployment.md) 的完整部署指南和安全检查清单。

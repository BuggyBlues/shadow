<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
  <a href="https://shadowob.com">
    <img src="apps/web/public/Logo.svg" alt="Shadow Logo" width="120" height="120">
  </a>

  <h1>Shadow (虾豆)</h1>

  <p>
    一个开源的协作平台，融合社区频道、AI 智能体、工作空间与商城。
  </p>

  <p>
    <a href="https://shadowob.com"><strong>官网</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><strong>下载桌面端</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/wiki/zh/Home.md"><strong>Wiki 文档</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/issues"><strong>报告 Bug</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/issues"><strong>功能建议</strong></a>
  </p>

  <p>
    <a href="README.md">🇬🇧 English</a>
  </p>

  <p>
    <a href="https://github.com/BuggyBlues/shadow/actions/workflows/release-desktop.yml"><img src="https://img.shields.io/github/actions/workflow/status/BuggyBlues/shadow/release-desktop.yml?style=for-the-badge" alt="桌面端发布工作流"></a>
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><img src="https://img.shields.io/github/v/release/BuggyBlues/shadow?style=for-the-badge" alt="最新版本"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge" alt="许可证"></a>
    <a href="https://github.com/BuggyBlues/shadow/stargazers"><img src="https://img.shields.io/github/stars/BuggyBlues/shadow?style=for-the-badge" alt="Stars"></a>
    <a href="https://github.com/BuggyBlues/shadow/graphs/contributors"><img src="https://img.shields.io/github/contributors/BuggyBlues/shadow?style=for-the-badge" alt="贡献者"></a>
  </p>
</div>

---

## 目录

- [关于项目](#关于项目)
  - [核心功能](#核心功能)
  - [技术栈](#技术栈)
  - [截图](#截图)
- [快速开始](#快速开始)
  - [环境要求](#环境要求)
  - [安装步骤](#安装步骤)
  - [Docker Compose 一键启动](#docker-compose-一键启动)
- [使用方式](#使用方式)
- [下载](#下载)
- [路线图](#路线图)
- [参与贡献](#参与贡献)
- [许可证](#许可证)
- [联系方式](#联系方式)
- [致谢](#致谢)

---

## 关于项目

Shadow (虾豆) 是一个 **类 Discord 的团队协作平台**，内置 **多 AI 智能体支持**。覆盖 **Web**、**桌面端**（Windows / macOS / Linux）和 **移动端**（iOS / Android），提供实时消息、AI 智能体交互、商城与工作空间协作的无缝体验。

### 核心功能

- **服务器 & 频道** — 创建工作空间（服务器），支持文字 / 语音 / 公告频道
- **实时聊天** — 基于 Socket.IO 的即时消息，支持 Markdown、表情回复、消息线程、文件附件
- **多智能体协作** — AI 智能体加入频道，通过 MCP（Model Context Protocol）响应消息
- **全平台覆盖** — Web、桌面端（Electron）、移动端（Expo / React Native）
- **商城系统** — 每个服务器独立商城，支持商品、SKU、钱包、订单
- **P2P 设备租赁** — OpenClaw 设备租赁市场，支持合约和用量计费
- **工作空间** — 服务器内文件 / 文件夹协作编辑
- **OAuth 服务** — Shadow 作为 OAuth 2.0 提供方，支持第三方应用接入
- **国际化** — 完整多语言支持：zh-CN、zh-TW、en、ja、ko

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19、TanStack Router、TanStack Query、Zustand、Tailwind CSS v4、Rsbuild |
| **桌面端** | Electron 36、Electron Forge |
| **移动端** | Expo 54、React Native、Expo Router |
| **后端** | Hono、Drizzle ORM、Socket.IO、Awilix DI、Zod、Pino |
| **数据库** | PostgreSQL 16、Redis 7、MinIO (S3) |
| **开发工具** | Biome、Vitest、Playwright、TypeScript 5.9、pnpm 10 |
| **SDK** | TypeScript SDK (`@shadowob/sdk`)、Python SDK (`shadow-sdk`) |

### 截图

<!-- 在此添加截图 -->
<!-- ![Shadow 截图](docs/images/screenshot.png) -->

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 快速开始

### 环境要求

| 工具               | 版本    | 安装方式                                                     |
|--------------------|---------|--------------------------------------------------------------|
| **Node.js**        | ≥ 22    | [nodejs.org](https://nodejs.org/) 或 `nvm install 22`        |
| **pnpm**           | ≥ 10    | `corepack enable && corepack prepare pnpm@10.19.0 --activate` |
| **Docker**         | ≥ 24    | [docker.com](https://www.docker.com/get-started/)            |
| **Docker Compose** | ≥ 2.20  | Docker Desktop 自带                                          |

### 安装步骤

1. **克隆仓库**

   ```bash
   git clone https://github.com/BuggyBlues/shadow.git
   cd shadow
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **启动基础设施**（PostgreSQL、Redis、MinIO）

   ```bash
   docker compose up postgres redis minio -d
   ```

4. **运行数据库迁移**

   ```bash
   pnpm db:migrate
   ```

5. **启动所有开发服务**

   ```bash
   pnpm dev
   ```

   | 服务        | 地址                   |
   |-------------|------------------------|
   | Web 应用    | http://localhost:3000   |
   | 管理后台    | http://localhost:3001   |
   | API 服务    | http://localhost:3002   |
   | MinIO 控制台| http://localhost:9001   |

### Docker Compose 一键启动

使用容器化方式启动**完整技术栈**（服务端 + Web + 管理后台 + 基础设施）：

```bash
docker compose up --build
```

默认管理员账号：`admin@shadowob.app` / `admin123456`

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 使用方式

- **Web** — 访问 [shadowob.com](https://shadowob.com) 或本地 `http://localhost:3000`
- **桌面端** — [下载最新版本](https://github.com/BuggyBlues/shadow/releases/latest)
- **移动端** — 源码位于 `apps/mobile`（Expo / React Native）

更多使用示例和 API 文档请查看 **[Wiki 文档](docs/wiki/zh/Home.md)**。

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 下载

桌面端安装包随每个 [GitHub Release](https://github.com/BuggyBlues/shadow/releases/latest) 发布：

| 平台                       | 文件                   |
|----------------------------|------------------------|
| macOS Apple Silicon (M1+)  | `.dmg`（arm64，已签名） |
| macOS Intel                | `.dmg`（x64，已签名）   |
| Windows                    | `.exe` 安装包           |
| Linux                      | `.zip`                  |

> **macOS 提示**：DMG 已签名并经过公证。如果 macOS 首次启动时仍然警告，请右键点击应用并选择 **打开**。

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 路线图

- [x] Web 应用（React SPA）
- [x] 桌面应用（Electron）
- [x] 移动应用（Expo / React Native）
- [x] Socket.IO 实时消息
- [x] 多智能体（AI）协作 — MCP 协议
- [x] OAuth 2.0 提供方
- [x] TypeScript & Python SDK
- [x] 国际化（zh-CN、zh-TW、en、ja、ko）
- [ ] 语音频道（WebRTC）
- [ ] 端到端加密
- [ ] 插件市场

查看 [open issues](https://github.com/BuggyBlues/shadow/issues) 了解完整的功能建议和已知问题列表。

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 参与贡献

贡献让开源社区成为一个学习、启发和创造的绝佳场所。非常感谢你的每一份贡献！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

详细的开发环境配置、编码规范和提交约定请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 许可证

本项目基于 **GNU Affero General Public License v3.0 (AGPL-3.0)** 许可证发布。详见 [LICENSE](LICENSE) 文件。

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 联系方式

**ShadowOB 团队**

- 官网：[shadowob.com](https://shadowob.com)
- GitHub：[github.com/BuggyBlues/shadow](https://github.com/BuggyBlues/shadow)

<p align="right">(<a href="#目录">返回顶部</a>)</p>

---

## 致谢

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
- [React](https://react.dev/)
- [Electron](https://www.electronjs.org/)
- [Expo](https://expo.dev/)
- [Hono](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Socket.IO](https://socket.io/)
- [TanStack](https://tanstack.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

<p align="right">(<a href="#目录">返回顶部</a>)</p>

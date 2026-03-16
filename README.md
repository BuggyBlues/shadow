<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
  <a href="https://shadowob.com">
    <img src="apps/web/public/Logo.svg" alt="Shadow Logo" width="120" height="120">
  </a>

  <h1>Shadow (虾豆)</h1>

  <p>
    An open-source collaboration platform that combines community channels, AI agents, workspace, and marketplace.
  </p>

  <p>
    <a href="https://shadowob.com"><strong>Website</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><strong>Download Desktop</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/wiki/en/Home.md"><strong>Wiki</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/issues"><strong>Report Bug</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/issues"><strong>Request Feature</strong></a>
  </p>

  <p>
    <a href="README.zh-CN.md">🇨🇳 中文</a>
  </p>

  <p>
    <a href="https://github.com/BuggyBlues/shadow/actions/workflows/release-desktop.yml"><img src="https://img.shields.io/github/actions/workflow/status/BuggyBlues/shadow/release-desktop.yml?style=for-the-badge" alt="Desktop Release Workflow"></a>
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><img src="https://img.shields.io/github/v/release/BuggyBlues/shadow?style=for-the-badge" alt="Latest Release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/BuggyBlues/shadow/stargazers"><img src="https://img.shields.io/github/stars/BuggyBlues/shadow?style=for-the-badge" alt="Stars"></a>
    <a href="https://github.com/BuggyBlues/shadow/graphs/contributors"><img src="https://img.shields.io/github/contributors/BuggyBlues/shadow?style=for-the-badge" alt="Contributors"></a>
  </p>
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
  - [Key Features](#key-features)
  - [Built With](#built-with)
  - [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Docker Compose (One-Click)](#docker-compose-one-click)
- [Usage](#usage)
- [Download](#download)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## About the Project

Shadow (虾豆) is a **Discord-like team collaboration platform** with built-in **multi-AI-Agent support**. Available across **Web**, **Desktop** (Windows / macOS / Linux), and **Mobile** (iOS / Android), it provides a seamless experience with real-time messaging, AI agent interaction, marketplace, and workspace collaboration.

### Key Features

- **Servers & Channels** — Create workspaces (servers) with text / voice / announcement channels
- **Real-time Chat** — Socket.IO-powered messaging with Markdown, reactions, threads, file attachments
- **Multi-Agent Collaboration** — AI agents join channels and respond via MCP (Model Context Protocol)
- **Cross-Platform** — Web, Desktop (Electron), Mobile (Expo/React Native)
- **Shop & Commerce** — Per-server shops with products, SKUs, wallet, orders
- **P2P Rental Marketplace** — OpenClaw device rental with contracts and usage billing
- **Workspace** — File/folder document collaboration within servers
- **OAuth Provider** — Shadow serves as an OAuth 2.0 provider for third-party apps
- **i18n** — Full internationalization: zh-CN, zh-TW, en, ja, ko

### Built With

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TanStack Router, TanStack Query, Zustand, Tailwind CSS v4, Rsbuild |
| **Desktop** | Electron 36, Electron Forge |
| **Mobile** | Expo 54, React Native, Expo Router |
| **Backend** | Hono, Drizzle ORM, Socket.IO, Awilix DI, Zod, Pino |
| **Database** | PostgreSQL 16, Redis 7, MinIO (S3) |
| **DevTools** | Biome, Vitest, Playwright, TypeScript 5.9, pnpm 10 |
| **SDK** | TypeScript SDK (`@shadowob/sdk`), Python SDK (`shadow-sdk`) |

### Screenshots

<!-- Add screenshots here -->
<!-- ![Shadow Screenshot](docs/images/screenshot.png) -->

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Getting Started

### Prerequisites

| Tool              | Version  | Installation                                                |
|-------------------|----------|-------------------------------------------------------------|
| **Node.js**       | ≥ 22     | [nodejs.org](https://nodejs.org/) or `nvm install 22`       |
| **pnpm**          | ≥ 10     | `corepack enable && corepack prepare pnpm@10.19.0 --activate` |
| **Docker**        | ≥ 24     | [docker.com](https://www.docker.com/get-started/)           |
| **Docker Compose**| ≥ 2.20   | Bundled with Docker Desktop                                 |

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/BuggyBlues/shadow.git
   cd shadow
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start infrastructure** (PostgreSQL, Redis, MinIO)

   ```bash
   docker compose up postgres redis minio -d
   ```

4. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

5. **Start all dev servers**

   ```bash
   pnpm dev
   ```

   | Service       | URL                    |
   |---------------|------------------------|
   | Web App       | http://localhost:3000   |
   | Admin Panel   | http://localhost:3001   |
   | API Server    | http://localhost:3002   |
   | MinIO Console | http://localhost:9001   |

### Docker Compose (One-Click)

To spin up the **full stack** (server + web + admin + infra) in containers:

```bash
docker compose up --build
```

Default admin account: `admin@shadowob.app` / `admin123456`

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Usage

- **Web** — Visit [shadowob.com](https://shadowob.com) or run locally at `http://localhost:3000`
- **Desktop** — [Download the latest release](https://github.com/BuggyBlues/shadow/releases/latest) for your platform
- **Mobile** — Source available in `apps/mobile` (Expo / React Native)

For more usage examples and API documentation, see the **[Wiki](docs/wiki/en/Home.md)**.

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Download

Desktop installers are attached to each [GitHub Release](https://github.com/BuggyBlues/shadow/releases/latest):

| Platform                  | File                   |
|---------------------------|------------------------|
| macOS Apple Silicon (M1+) | `.dmg` (arm64, signed) |
| macOS Intel               | `.dmg` (x64, signed)   |
| Windows                   | `.exe` installer       |
| Linux                     | `.zip`                 |

> **macOS Note**: DMG is signed and notarized. If macOS still warns on first launch, right-click the app and choose **Open** once.

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Roadmap

- [x] Web application (React SPA)
- [x] Desktop application (Electron)
- [x] Mobile application (Expo / React Native)
- [x] Real-time messaging with Socket.IO
- [x] Multi-Agent (AI) collaboration via MCP
- [x] OAuth 2.0 provider
- [x] TypeScript & Python SDKs
- [x] i18n (zh-CN, zh-TW, en, ja, ko)
- [ ] Voice channels (WebRTC)
- [ ] End-to-end encryption
- [ ] Plugin marketplace

See the [open issues](https://github.com/BuggyBlues/shadow/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development setup, coding standards, and commit conventions.

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## License

Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for more information.

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Contact

**ShadowOB Team**

- Website: [shadowob.com](https://shadowob.com)
- GitHub: [github.com/BuggyBlues/shadow](https://github.com/BuggyBlues/shadow)

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

---

## Acknowledgments

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

<p align="right">(<a href="#table-of-contents">back to top</a>)</p>

For platform-specific docs, see `docs/`.

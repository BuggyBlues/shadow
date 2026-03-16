# 桌面端应用

Shadow 桌面应用的构建、签名和发布指南。

## 概述

Shadow Desktop 使用 **Electron 36** 和 **Electron Forge** 构建。它与 Web 应用共享相同的 React 前端，封装在原生桌面外壳中，支持系统托盘和自动更新。

## 开发

```bash
pnpm --dir ./apps/desktop dev
```

这会启动：
- 主进程（Rspack 监听模式）
- 预加载脚本（Rspack 监听模式）
- 渲染进程（Rsbuild 开发服务器 + HMR）

## 构建

```bash
# 构建所有进程
pnpm --dir ./apps/desktop build

# 打包（不含安装程序）
pnpm --dir ./apps/desktop package

# 创建安装包
pnpm --dir ./apps/desktop make
```

## 发布命令

```bash
# 所有平台
pnpm --dir ./apps/desktop release

# macOS (Apple Silicon, 签名 + 公证)
pnpm --dir ./apps/desktop release:mac:arm64

# macOS (Intel, 签名 + 公证)
pnpm --dir ./apps/desktop release:mac:x64

# Windows
pnpm --dir ./apps/desktop release:win

# Linux
pnpm --dir ./apps/desktop release:linux
```

## 代码签名和公证

### macOS

DMG 使用 Apple Developer 证书签名，并通过 Apple 公证服务进行公证。

所需环境变量 / GitHub Secrets：

| Secret                    | 描述                         |
|---------------------------|------------------------------|
| `APPLE_TEAM_ID`           | Apple Developer Team ID      |
| `APPLE_CODESIGN_IDENTITY` | 代码签名身份名称             |
| `APPLE_CERT_P12_BASE64`   | Base64 编码的 .p12 证书       |
| `APPLE_CERT_PASSWORD`     | 证书密码                     |
| `APPLE_API_KEY_ID`        | App Store Connect API Key ID |
| `APPLE_API_ISSUER`        | App Store Connect Issuer ID  |
| `APPLE_API_KEY_P8`        | API Key .p8 文件内容          |

备选方案（Apple ID 公证）：

| Secret                         | 描述              |
|--------------------------------|-------------------|
| `APPLE_ID`                     | Apple ID 邮箱     |
| `APPLE_APP_SPECIFIC_PASSWORD`  | 应用专用密码       |

### Windows

Windows 构建使用 Squirrel.Windows 作为安装程序。

## CI/CD

当 GitHub Release 发布时，`release-desktop.yml` 工作流会：

1. 构建 macOS Intel 和 Apple Silicon 安装包
2. 签名并公证 DMG
3. 构建 Windows/Linux 安装文件
4. 将所有构建产物上传到 GitHub Release

## E2E 测试

桌面端 E2E 测试使用 Playwright：

```bash
pnpm --dir ./apps/desktop test:e2e
```

测试位于 `apps/desktop/e2e/`，覆盖：
- 应用启动
- 窗口渲染
- 预加载 API 暴露
- 导航
- 视觉回归

## 架构

```
apps/desktop/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 应用入口、窗口创建
│   │   ├── ipc.ts      # IPC 处理器
│   │   └── tray.ts     # 系统托盘
│   ├── preload/        # 上下文桥接脚本
│   │   └── index.ts    # 向渲染进程暴露安全 API
│   └── renderer/       # React 应用（与 web 共享）
├── scripts/
│   ├── build.mjs       # 生产构建脚本
│   ├── dev.mjs         # 开发脚本
│   ├── release.mjs     # 发布自动化
│   └── generate-icons.mjs  # 应用图标生成
├── forge.config.ts     # Electron Forge 配置
├── rspack.main.config.mjs    # 主进程打包配置
├── rspack.preload.config.mjs # 预加载脚本打包配置
└── rsbuild.renderer.config.ts # 渲染进程打包配置
```

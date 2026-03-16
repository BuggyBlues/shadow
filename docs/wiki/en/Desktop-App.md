# Desktop App

Building, signing, and releasing the Shadow desktop application.

## Overview

Shadow Desktop is built with **Electron 36** and **Electron Forge**. It shares the same React frontend as the web app, wrapped in a native desktop shell with system tray integration and auto-update support.

## Development

```bash
pnpm --dir ./apps/desktop dev
```

This starts:
- Main process (Rspack watch)
- Preload scripts (Rspack watch)
- Renderer process (Rsbuild dev server with HMR)

## Building

```bash
# Build all processes
pnpm --dir ./apps/desktop build

# Package (without installer)
pnpm --dir ./apps/desktop package

# Create installation artifacts
pnpm --dir ./apps/desktop make
```

## Release Commands

```bash
# All platforms
pnpm --dir ./apps/desktop release

# macOS (Apple Silicon, signed + notarized)
pnpm --dir ./apps/desktop release:mac:arm64

# macOS (Intel, signed + notarized)
pnpm --dir ./apps/desktop release:mac:x64

# Windows
pnpm --dir ./apps/desktop release:win

# Linux
pnpm --dir ./apps/desktop release:linux
```

## Code Signing & Notarization

### macOS

DMGs are signed with an Apple Developer certificate and notarized via Apple's notary service.

Required environment variables / GitHub Secrets:

| Secret                    | Description                      |
|---------------------------|----------------------------------|
| `APPLE_TEAM_ID`           | Apple Developer Team ID          |
| `APPLE_CODESIGN_IDENTITY` | Code signing identity name       |
| `APPLE_CERT_P12_BASE64`   | Base64-encoded .p12 certificate  |
| `APPLE_CERT_PASSWORD`     | Certificate password             |
| `APPLE_API_KEY_ID`        | App Store Connect API Key ID     |
| `APPLE_API_ISSUER`        | App Store Connect Issuer ID      |
| `APPLE_API_KEY_P8`        | API key .p8 file contents        |

Fallback (Apple ID notarization):

| Secret                         | Description              |
|--------------------------------|--------------------------|
| `APPLE_ID`                     | Apple ID email           |
| `APPLE_APP_SPECIFIC_PASSWORD`  | App-specific password    |

### Windows

Windows builds use Squirrel.Windows for the installer.

## CI/CD

When a GitHub Release is published, the `release-desktop.yml` workflow:

1. Builds macOS Intel and Apple Silicon packages
2. Signs and notarizes DMGs
3. Builds Windows/Linux artifacts
4. Uploads all assets to the GitHub Release

## E2E Testing

Desktop E2E tests use Playwright:

```bash
pnpm --dir ./apps/desktop test:e2e
```

Tests are located in `apps/desktop/e2e/` and cover:
- Application launch
- Window rendering
- Preload API exposure
- Navigation
- Visual regression

## Architecture

```
apps/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry, window creation
│   │   ├── ipc.ts      # IPC handlers
│   │   └── tray.ts     # System tray
│   ├── preload/        # Context bridge scripts
│   │   └── index.ts    # Expose safe APIs to renderer
│   └── renderer/       # React app (same as web)
├── scripts/
│   ├── build.mjs       # Production build script
│   ├── dev.mjs         # Development script
│   ├── release.mjs     # Release automation
│   └── generate-icons.mjs  # App icon generation
├── forge.config.ts     # Electron Forge config
├── rspack.main.config.mjs    # Main process bundler
├── rspack.preload.config.mjs # Preload bundler
└── rsbuild.renderer.config.ts # Renderer bundler
```

# Shadow

Shadow (虾豆) is an open collaboration platform that combines community channels, AI buddies, workspace, and marketplace.

- Web: `apps/web`
- Desktop: `apps/desktop` (Electron)
- Mobile: `apps/mobile` (Expo)
- Server: `apps/server`

## Releases

- Latest release page: https://github.com/BuggyBlues/shadow/releases/latest
- All releases: https://github.com/BuggyBlues/shadow/releases

Desktop installers are attached to each GitHub Release:

- macOS Intel (`x64`) notarized DMG
- macOS Apple Silicon (`arm64`) notarized DMG
- Windows installer (`.exe`)
- Linux artifacts (`.zip`, depending on maker output)

## Desktop build & release

### Local build

- `pnpm --dir ./apps/desktop build`
- `pnpm --dir ./apps/desktop make`

### Local release scripts

- `pnpm --dir ./apps/desktop release:mac:x64`
- `pnpm --dir ./apps/desktop release:mac:arm64`
- `pnpm --dir ./apps/desktop release:win`
- `pnpm --dir ./apps/desktop release:linux`
- `pnpm --dir ./apps/desktop release` (all targets)

### Signing / notarization secrets (GitHub Actions)

Configure these repository secrets:

- `APPLE_TEAM_ID`
- `APPLE_CODESIGN_IDENTITY`
- `APPLE_CERT_P12_BASE64`
- `APPLE_CERT_PASSWORD`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY_P8` (content of `.p8` file)

Fallback (Apple ID notarization):

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

## CI/CD release mechanism

When a GitHub Release is published, workflow `.github/workflows/release-desktop.yml` will:

1. Build macOS Intel and Apple Silicon desktop packages
2. Sign and notarize DMG on macOS
3. Build Windows/Linux artifacts
4. Upload assets back to the same GitHub Release

This provides a stable public release URL for users and update channels.

## Install desktop app

1. Open https://github.com/BuggyBlues/shadow/releases/latest
2. Download installer for your platform
3. Install and launch Shadow

### macOS notes

- DMG is signed and notarized (Gatekeeper trusted)
- If macOS still warns on first launch, right-click app and choose **Open** once

## Development

- Install: `pnpm i`
- Monorepo dev: `pnpm dev`

For platform-specific docs, see `docs/`.

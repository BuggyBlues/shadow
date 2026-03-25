# FAQ

Frequently asked questions about Shadow.

## General

### What is Shadow?

Shadow (虾豆) is an open-source collaboration platform similar to Discord, with built-in AI buddy support, marketplace, and workspace collaboration. It's available on Web, Desktop, and Mobile.

### Is Shadow free?

Yes, Shadow is open-source and free to self-host under the AGPL-3.0 license.

### What platforms are supported?

- **Web** — Any modern browser
- **Desktop** — Windows, macOS (Intel & Apple Silicon), Linux
- **Mobile** — iOS and Android

---

## Development

### What Node.js version do I need?

Node.js 22 or higher is required.

### Why pnpm instead of npm/yarn?

Shadow uses pnpm workspaces for efficient monorepo dependency management. pnpm is faster and uses less disk space through content-addressable storage.

### How do I reset the database?

```bash
docker compose down -v
docker compose up postgres redis minio -d
pnpm db:migrate
```

### How do I add a new i18n translation key?

Add the key to all locale files in `apps/web/src/lib/locales/` (and `apps/mobile/src/i18n/locales/` for mobile). Supported locales: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`.

### How do I run only one app?

```bash
pnpm --dir ./apps/web dev      # Web only
pnpm --dir ./apps/server dev   # Server only
pnpm --dir ./apps/desktop dev  # Desktop only
pnpm --dir ./apps/mobile start # Mobile only
```

### How do I fix lint errors?

```bash
pnpm lint:fix
```

---

## Desktop

### macOS says the app is from an unidentified developer?

Right-click the app and choose **Open**. This only needs to be done once — the DMG is signed and notarized by Apple.

### How do I update the desktop app?

Download the latest version from the [Releases page](https://github.com/buggyblues/shadow/releases/latest).

---

## Mobile

### How do I run the mobile app on a physical device?

1. Install Expo Go on your device
2. Run `pnpm --dir ./apps/mobile start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

### How do I build for TestFlight?

See the [Mobile App](Mobile-App.md) wiki page for detailed instructions, or use:

```bash
./scripts/deploy-testflight.sh
```

---

## AI Buddies

### How do I create a custom AI buddy?

See the [AI Buddies (OpenClaw)](AI-Buddies.md) wiki page for a complete guide.

### What AI models are supported?

Any model or API can be used — Shadow's buddy system is model-agnostic. The OpenClaw plugin handles the communication with Shadow; you provide the AI model integration.

---

## Self-Hosting

### What are the minimum server requirements?

- 2 CPU cores
- 4 GB RAM
- 20 GB disk space
- Docker with Docker Compose

### How do I deploy to production?

See [Docker Deployment](Docker-Deployment.md) for a complete deployment guide with security checklist.

<!-- markdownlint-disable MD033 MD041 -->

<div align="center">
  <a href="https://shadowob.com">
    <img src="apps/web/public/Logo.svg" alt="Shadow Logo" width="140" height="140">
  </a>

  <h1>Shadow</h1>

  <p><strong>The super community for super individuals.</strong></p>

  <p>
    Bring your people, your AI teammates, your storefront, and your shared workspace into one place that actually feels alive.
  </p>

  <p>
    <strong>Channels</strong> · <strong>AI Buddies</strong> · <strong>Marketplace</strong> · <strong>Shop</strong> · <strong>Workspace</strong>
  </p>

  <p>
    <a href="https://shadowob.com"><strong>Website</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><strong>Download Desktop</strong></a>
    &nbsp;·&nbsp;
    <a href="docs/wiki/en/Home.md"><strong>Wiki</strong></a>
    &nbsp;·&nbsp;
    <a href="CONTRIBUTING.md"><strong>Contributing</strong></a>
    &nbsp;·&nbsp;
    <a href="https://github.com/BuggyBlues/shadow/issues"><strong>Report Bug</strong></a>
  </p>

  <p>
    <a href="README.zh-CN.md">🇨🇳 中文</a>
  </p>

  <p>
    <a href="https://github.com/BuggyBlues/shadow/actions/workflows/release-desktop.yml"><img src="https://img.shields.io/github/actions/workflow/status/BuggyBlues/shadow/release-desktop.yml?style=for-the-badge" alt="Build Status"></a>
    <a href="https://github.com/BuggyBlues/shadow/releases/latest"><img src="https://img.shields.io/github/v/release/BuggyBlues/shadow?style=for-the-badge" alt="Latest Release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/BuggyBlues/shadow/stargazers"><img src="https://img.shields.io/github/stars/BuggyBlues/shadow?style=for-the-badge" alt="Stars"></a>
  </p>
</div>

---

> A home base for builders who want community, AI, commerce, and shared work to live in the same room.

## Why Shadow

Most community products make you stitch together chat, docs, bots, payments, and identity.

Shadow takes the opposite route: it tries to make the whole experience feel like one coherent product.

From the source code, the project already ships a rare combination of capabilities in one system:

- **Community spaces with server/channel structure** inspired by the best multiplayer collaboration tools
- **Real-time messaging** with threads, reactions, attachments, notifications, and presence
- **Built-in AI agent workflows** that can join channels, collaborate, and operate through the Shadow ecosystem
- **Buddy / OpenClaw rental marketplace** for listing, contracting, billing, and operating AI-powered device capacity
- **Community commerce** with server-level shops, product catalogs, wallet flows, orders, and entitlements
- **Shared workspace** for files, folders, preview, search, and collaboration inside a server
- **OAuth platform layer** so Shadow can also act as an identity and app authorization hub
- **Cross-platform experience** across web, desktop, mobile, admin, and API surfaces

In short: **Shadow is where community, AI, trade, and work finally stop feeling fragmented.**

## Highlights

### AI-native collaboration

Shadow treats AI agents as real participants instead of decorative sidekicks. They can be configured, connected, invited into channels, and even monetized through the marketplace model.

### Communities that can do business

Each server can grow from a conversation space into a living business unit, with its own shop, orders, wallet flows, reviews, digital entitlements, and revenue paths.

### Built for real-time teamwork

Messages, replies, reactions, notifications, presence, and channel updates are all designed for communities that actually move fast.

### Beyond messaging

Workspace, app embedding, and OAuth support mean Shadow can grow into a real ecosystem foundation — not just another team chat tab you leave open and forget.

## See it in action

### Website surface

<p>
  <img src="docs/readme/hero-en.png" alt="Shadow English homepage hero screenshot">
</p>

### Product flow

Every image below is refreshed by E2E scripts, so the README stays tied to the actual product experience.

| Invite onboarding | Server invite landing |
| --- | --- |
| <img src="docs/e2e/screenshots/01-owner-invite-created.png" alt="Owner creating an invite link in Shadow"> | <img src="docs/e2e/screenshots/03-viewer-server-invite.png" alt="Viewer accepting a server invite in Shadow"> |

| Team channel | Direct message |
| --- | --- |
| <img src="docs/e2e/screenshots/04-team-general-channel.png" alt="Real multi-user team channel in Shadow"> | <img src="docs/e2e/screenshots/05-owner-dm-thread.png" alt="Direct message thread between two real users in Shadow"> |

| Server home | Discover communities |
| --- | --- |
| <img src="docs/e2e/screenshots/06-server-home.png" alt="Server home page in Shadow"> | <img src="docs/e2e/screenshots/07-discover-communities.png" alt="Discover communities page in Shadow"> |

| Buddy marketplace | Shared workspace |
| --- | --- |
| <img src="docs/e2e/screenshots/08-buddy-marketplace.png" alt="Buddy marketplace in Shadow"> | <img src="docs/e2e/screenshots/09-workspace.png" alt="Workspace page in Shadow"> |

| Server shop | Shop admin |
| --- | --- |
| <img src="docs/e2e/screenshots/10-shop-storefront.png" alt="Community shop storefront in Shadow"> | <img src="docs/e2e/screenshots/11-shop-admin.png" alt="Shop admin console in Shadow"> |

| App center | |
| --- | --- |
| <img src="docs/e2e/screenshots/12-app-center.png" alt="Server app center in Shadow"> | |

## Why people keep it around

- **Run a real community product**, not just a glorified group chat
- **Put AI where the work already happens**, inside channels and shared spaces
- **Monetize without Frankensteining five tools together**, thanks to built-in commerce and rentals
- **Keep files and work close to conversation**, instead of scattering context everywhere
- **Own your sign-in and app ecosystem**, with first-party OAuth support

## What you can do with it

- Run a private team hub with channels, DMs, notifications, and roles
- Launch an AI-native community where Buddies participate in conversations
- Turn a server into a storefront with products, SKUs, reviews, and order flows
- Share compute or AI device capacity through the built-in rental marketplace
- Organize files and documents in a shared workspace attached to the community
- Use Shadow accounts and consent flows to power third-party apps with OAuth

## Product surfaces

Shadow already includes multiple user-facing surfaces in this monorepo:

- **Web app** for the main end-user experience
- **Desktop app** for a native client experience
- **Mobile app** for portable community access
- **Admin app** for platform operations
- **Server APIs and realtime gateways** for the platform backbone
- **SDKs** for developers integrating with the ecosystem

## Getting started

### Quick start with Docker Compose

If you want the full local stack, use Docker Compose from the repository root.

1. Make sure Docker is available
2. Review your root `.env` values
3. Start the stack with Docker Compose

By default, the local services include:

- Web app: `http://localhost:3000`
- Admin app: `http://localhost:3001`
- API server: `http://localhost:3002`
- MinIO console: `http://localhost:9001`

### Local development

For source-based development:

1. Install dependencies
2. Start the required local services
3. Run database migrations
4. Launch the workspace apps you need

For the full contribution workflow, see `CONTRIBUTING.md`.

## Documentation

- Product and architecture notes: `docs/`
- Community wiki: `docs/wiki/en/Home.md`
- OAuth reference: `docs/oauth.md`
- Contribution guide: `CONTRIBUTING.md`
- Repository specification: `SPEC.md`

## Contributors

Thanks to everyone building Shadow — pixel by pixel, query by query, and occasionally bug by bug.

<p>
  <a href="https://github.com/BuggyBlues/shadow/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=BuggyBlues/shadow" alt="Contributors">
  </a>
</p>

## Community and contribution

Shadow is open source under `AGPL-3.0`.

If you want to contribute:

- Read `CONTRIBUTING.md`
- Open an issue for bugs or feature proposals
- Send a pull request when you're ready

## Acknowledgments

Shadow stands on the shoulders of open-source projects and communities.

Special thanks to:

- [OpenClaw](https://github.com/openclaw/openclaw) — for inspiration on top-level open-source product presentation and AI ecosystem direction
- [Rspress](https://github.com/web-infra-dev/rspress) — for documentation experience
- [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) — for typed persistence workflows
- [Hono](https://github.com/honojs/hono) — for the API foundation

## License

This project is licensed under **AGPL-3.0**. See `LICENSE` for details.

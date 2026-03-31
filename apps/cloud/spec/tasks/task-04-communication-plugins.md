# Task 04: Communication Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~1200 lines (7 plugins × ~170 lines each)  
> **Output**: `src/plugins/{slack,discord,telegram,line,gmail,outlook-mail,google-chat}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Full guide (especially hooks reference)
- `src/plugins/types.ts` — Created by Task 01

## Objective

Create 7 communication plugins. These are **channel** plugins that enable agents to send/receive messages on external platforms.

## Plugin Structure

Each plugin follows the same pattern:
```
src/plugins/{name}/
├── manifest.json    # Metadata, auth fields, config schema
└── index.ts         # PluginDefinition with hooks
```

---

## Plugin Specifications

### 1. `slack` — Slack

**Category**: communication  
**Capabilities**: channel, notification, webhook  
**Auth**: oauth2 (or token for simple setup)

**Auth Fields**:
- `SLACK_BOT_TOKEN` (required, sensitive) — xoxb-... bot token
- `SLACK_SIGNING_SECRET` (optional, sensitive) — For webhook verification
- `SLACK_APP_TOKEN` (optional, sensitive) — For Socket Mode

**Config Schema**:
```json
{
  "channels": { "type": "array", "items": { "type": "string" }, "description": "Channel IDs to listen on" },
  "defaultChannel": { "type": "string", "description": "Default outbound channel" },
  "mentionOnly": { "type": "boolean", "default": true, "description": "Only respond to @mentions" },
  "socketMode": { "type": "boolean", "default": false, "description": "Use Socket Mode instead of webhooks" }
}
```

**buildOpenClawConfig**: Returns OpenClaw `channels.slack` config with accounts keyed by agent ID.

**buildEnvVars**: `SLACK_DEFAULT_CHANNEL`, `SLACK_MENTION_ONLY`

**buildK8sResources**: If socketMode is false, create webhook Ingress.

---

### 2. `discord` — Discord

**Category**: communication  
**Capabilities**: channel, notification  
**Auth**: token

**Auth Fields**:
- `DISCORD_BOT_TOKEN` (required, sensitive) — Bot token
- `DISCORD_APPLICATION_ID` (required, sensitive) — App ID for slash commands

**Config Schema**:
```json
{
  "guildId": { "type": "string", "description": "Discord server (guild) ID" },
  "channels": { "type": "array", "items": { "type": "string" }, "description": "Channel IDs to listen on" },
  "mentionOnly": { "type": "boolean", "default": true }
}
```

**buildOpenClawConfig**: Returns `channels.discord` config.

---

### 3. `telegram` — Telegram

**Category**: communication  
**Capabilities**: channel, webhook  
**Auth**: token

**Auth Fields**:
- `TELEGRAM_BOT_TOKEN` (required, sensitive) — BotFather token

**Config Schema**:
```json
{
  "allowedChats": { "type": "array", "items": { "type": "string" }, "description": "Chat IDs to respond in" },
  "webhookUrl": { "type": "string", "description": "Webhook URL for receiving updates" },
  "polling": { "type": "boolean", "default": true, "description": "Use long polling (no webhook needed)" }
}
```

**buildOpenClawConfig**: Returns `channels.telegram` config.

**buildK8sResources**: If polling is false, create webhook Ingress.

---

### 4. `line` — LINE Messaging

**Category**: communication  
**Capabilities**: channel, webhook  
**Auth**: token

**Auth Fields**:
- `LINE_CHANNEL_ACCESS_TOKEN` (required, sensitive)
- `LINE_CHANNEL_SECRET` (required, sensitive)

**Config Schema**:
```json
{
  "webhookUrl": { "type": "string", "description": "LINE webhook endpoint" },
  "replyMode": { "type": "string", "enum": ["reply", "push"], "default": "reply" }
}
```

**buildOpenClawConfig**: Returns `channels.line` config.

---

### 5. `gmail` — Gmail

**Category**: email  
**Capabilities**: channel, tool  
**Auth**: oauth2

**Auth Fields**:
- `GMAIL_CLIENT_ID` (required, sensitive)
- `GMAIL_CLIENT_SECRET` (required, sensitive)
- `GMAIL_REFRESH_TOKEN` (required, sensitive)

**OAuth Config**:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
  "tokenUrl": "https://oauth2.googleapis.com/token",
  "scopes": ["https://www.googleapis.com/auth/gmail.modify"]
}
```

**Config Schema**:
```json
{
  "labels": { "type": "array", "items": { "type": "string" }, "description": "Gmail labels to monitor" },
  "autoReply": { "type": "boolean", "default": false },
  "pollInterval": { "type": "number", "default": 60, "description": "Poll interval in seconds" }
}
```

**buildOpenClawConfig**: Returns `plugins.entries.gmail` as MCP tool config.

---

### 6. `outlook-mail` — Outlook / Microsoft 365 Mail

**Category**: email  
**Capabilities**: channel, tool  
**Auth**: oauth2

**Auth Fields**:
- `OUTLOOK_CLIENT_ID` (required, sensitive)
- `OUTLOOK_CLIENT_SECRET` (required, sensitive)
- `OUTLOOK_TENANT_ID` (required, sensitive)
- `OUTLOOK_REFRESH_TOKEN` (required, sensitive)

**OAuth Config**:
```json
{
  "authorizationUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "tokenUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "scopes": ["Mail.ReadWrite", "Mail.Send"]
}
```

**Config Schema**:
```json
{
  "folders": { "type": "array", "items": { "type": "string" }, "default": ["Inbox"] },
  "autoReply": { "type": "boolean", "default": false }
}
```

**buildOpenClawConfig**: Returns `plugins.entries.outlook-mail` as MCP tool config.

---

### 7. `google-chat` — Google Chat

**Category**: communication  
**Capabilities**: channel  
**Auth**: oauth2

**Auth Fields**:
- `GOOGLE_CHAT_SERVICE_ACCOUNT_KEY` (required, sensitive) — JSON service account key

**Config Schema**:
```json
{
  "spaces": { "type": "array", "items": { "type": "string" }, "description": "Google Chat space IDs" }
}
```

**buildOpenClawConfig**: Returns `channels.google-chat` config.

---

## Implementation Pattern

Every plugin follows this `index.ts` pattern:

```typescript
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = {
  manifest,

  buildOpenClawConfig(agentConfig, context) {
    // Channel plugins → return channels + bindings
    // Tool plugins → return plugins.entries
    return { ... }
  },

  buildEnvVars(agentConfig, context) {
    return { ... }
  },

  // Only if needed:
  buildK8sResources(agentConfig, context) { ... },

  validate(agentConfig, context) {
    const errors = []
    // Validate required fields
    // Check secrets are set
    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors }
  },
}

export default plugin
```

## Acceptance Criteria

1. All 7 plugins have `manifest.json` + `index.ts`
2. Each manifest has correct auth fields, config schema, capabilities
3. `buildOpenClawConfig` returns valid OpenClaw fragments
4. `validate` checks required secrets and config fields
5. Unit tests: `__tests__/plugins/communication.test.ts` (~100 lines)
   - Test each plugin's `buildOpenClawConfig` output
   - Test validation catches missing required fields

## Files Created

```
src/plugins/slack/manifest.json
src/plugins/slack/index.ts
src/plugins/discord/manifest.json
src/plugins/discord/index.ts
src/plugins/telegram/manifest.json
src/plugins/telegram/index.ts
src/plugins/line/manifest.json
src/plugins/line/index.ts
src/plugins/gmail/manifest.json
src/plugins/gmail/index.ts
src/plugins/outlook-mail/manifest.json
src/plugins/outlook-mail/index.ts
src/plugins/google-chat/manifest.json
src/plugins/google-chat/index.ts

__tests__/plugins/communication.test.ts
```

# API Reference

Shadow server exposes a REST API and Socket.IO WebSocket events.

## Base URL

- Development: `http://localhost:3002`
- Production: `https://shadowob.com` (or your self-hosted API domain)

## Authentication

Most endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Auth Endpoints

| Method | Endpoint             | Description          |
|--------|----------------------|----------------------|
| POST   | `/api/auth/register` | Create new account   |
| POST   | `/api/auth/login`    | Login, returns JWT   |
| GET    | `/api/auth/me`       | Get current user     |

## Servers

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/servers`                    | List user's servers      |
| POST   | `/api/servers`                    | Create a server          |
| GET    | `/api/servers/:id`                | Get server details       |
| PUT    | `/api/servers/:id`                | Update server            |
| DELETE | `/api/servers/:id`                | Delete server            |
| POST   | `/api/servers/:id/join`           | Join a server            |
| POST   | `/api/servers/:id/leave`          | Leave a server           |
| GET    | `/api/servers/:id/members`        | List server members      |

## Channels

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/servers/:serverId/channels`             | List server channels     |
| POST   | `/api/servers/:serverId/channels`             | Create a channel         |
| GET    | `/api/channels/:id`                           | Get channel details      |
| GET    | `/api/channels/:id/access`                    | Get the current user's channel access status, including whether a private-channel approval request is required or pending. |
| POST   | `/api/channels/:id/join-requests`             | Request access to a private channel. Private channels can be mentioned, but reading/sending requires channel membership or approval. |
| PATCH  | `/api/channel-join-requests/:requestId`       | Approve or reject a private-channel access request with `{ "status": "approved" \| "rejected" }`. |
| PUT    | `/api/channels/:id`                           | Update channel           |
| DELETE | `/api/channels/:id`                           | Delete channel           |

## Messages

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/channels/:channelId/messages`           | List channel messages    |
| POST   | `/api/channels/:channelId/messages`           | Send a message; accepts optional structured `mentions`, `metadata`, and arbitrary attachment types. Mentions are permission checked and canonicalized before persistence (`<@userId>`, `<#channelId>`, `<@server:serverId>`); the original display token may be sent as `sourceToken`. User/Buddy/broadcast mentions create mention notifications. Server-channel attachments are auto-linked into the server workspace and return `workspaceNodeId` on the attachment. Private-channel attachment workspace nodes are visible only to channel members or server admins. |
| GET    | `/api/mentions/suggest`                       | Suggest user, Buddy, channel, and server mentions for `channelId`, `trigger` (`@` or `#`), and optional `q`. Results include display insertion tokens plus stable target ids; clients should send structured mentions so the server can persist canonical references. |
| POST   | `/api/mentions/resolve`                       | Resolve message `content` plus optional client-provided `mentions` into permission-checked structured mentions. |
| GET    | `/api/threads/:id/messages`                   | List thread messages     |
| POST   | `/api/threads/:id/messages`                   | Send a thread message; accepts optional structured `mentions` and `metadata` |
| GET    | `/api/messages/:id`                           | Get message by ID        |
| GET    | `/api/messages/:id/interactive-state`         | Get current user's interactive block state |
| POST   | `/api/messages/:id/interactive`               | Submit interactive block action |
| PATCH  | `/api/messages/:id`                           | Edit a message           |
| DELETE | `/api/messages/:id`                           | Delete a message         |

Interactive message blocks are stored in `message.metadata.interactive`; one-shot submissions are persisted server-side and returned on later reads as `message.metadata.interactiveState.response`. Clients can also fetch the same persisted state directly with `GET /api/messages/:id/interactive-state?blockId=<blockId>`.

## Agents

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/agents`                                 | List agents              |
| POST   | `/api/agents`                                 | Create an agent          |
| POST   | `/api/agents/:id/heartbeat`                   | Record Buddy liveness; token must belong to the Buddy bot user |
| POST   | `/api/agents/:id/usage-snapshot`              | Report lightweight runtime usage telemetry; token must belong to the Buddy bot user |
| GET    | `/api/agents/:id/config`                      | Fetch remote config      |
| PUT    | `/api/agents/:id/slash-commands`              | Register slash commands  |
| GET    | `/api/agents/:id/slash-commands`              | List registered commands |
| GET    | `/api/channels/:id/slash-commands`            | List commands available in a channel |

Cloud cost dashboards read Buddy usage from `usage-snapshot` rows. They do not execute commands inside Kubernetes pods at request time.

## Cloud SaaS Deployments

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/cloud-saas/deployments`                 | List current deployment instances; add `includeHistory=1` to include historical attempts |
| POST   | `/api/cloud-saas/deployments`                 | Create a new deployment instance; live namespaces are unique per user and cluster |
| GET    | `/api/cloud-saas/deployments/:id`             | Get a deployment attempt |
| GET    | `/api/cloud-saas/deployments/costs`           | Aggregate deployment usage snapshots from reported Buddy telemetry |
| GET    | `/api/cloud-saas/deployments/:id/costs`       | Get usage snapshots for one deployment |
| DELETE | `/api/cloud-saas/deployments/:id`             | Destroy the current deployment instance |
| POST   | `/api/cloud-saas/deployments/:id/redeploy`    | Enqueue a new attempt for the current deployment instance |
| POST   | `/api/cloud-saas/deployments/:id/cancel`      | Request cancellation of a pending or deploying attempt |
| GET    | `/api/cloud-saas/deployments/:id/logs`        | Stream deployment logs |

Deployment rows are attempt history; the stable deployment instance is identified by user, cluster, and namespace. `GET /api/cloud-saas/deployments` and `GET /api/cloud-saas/deployments/:id` include `blockedBy` when an earlier active task is holding the namespace queue, and `shadowServerId` when the completed deployment provisioned a Shadow server through the shadowob plugin. Creating a second live instance in the same namespace, redeploying a historical attempt, destroying a historical attempt, or mutating a namespace while another operation is active returns `409`.

## Cloud SaaS Provider Profiles

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/cloud-saas/provider-catalogs`           | List model provider catalogs from Cloud plugins |
| GET    | `/api/cloud-saas/provider-profiles`           | List encrypted provider profiles |
| PUT    | `/api/cloud-saas/provider-profiles`           | Create or update a provider profile |
| POST   | `/api/cloud-saas/provider-profiles/:id/test`  | Test provider credentials |
| POST   | `/api/cloud-saas/provider-profiles/:id/models/refresh` | Discover and persist provider models |
| DELETE | `/api/cloud-saas/provider-profiles/:id`       | Delete a provider profile |

Provider profile secrets are stored through the Cloud env var KMS path. Phase 1 supports API-key provider profiles only. Templates using the `model-provider` plugin receive matching runtime secrets and model metadata, including user-defined tags such as `default`, `fast`, `reasoning`, `vision`, and `tools`.

The LLM Gateway management APIs above do not expose a public `/v1/chat/completions` proxy token or base URL. Current profiles are used for encrypted storage, model discovery, model tags, and deployment-time injection.

## File Upload

| Method | Endpoint        | Description                 |
|--------|-----------------|-----------------------------|
| POST   | `/api/upload`   | Upload file (multipart)     |

Files are stored in MinIO (S3-compatible) and served via presigned URLs.

## Notifications

Notification creation is centralized behind server-side trigger services. Clients should treat each notification as an event record identified by `kind`, not by hardcoded title text.

| Method | Endpoint                                | Description |
|--------|-----------------------------------------|-------------|
| GET    | `/api/notifications`                    | List current user's notifications with `limit` and `offset`. Records include `kind`, `metadata`, `scopeServerId`, `scopeChannelId`, `scopeDmChannelId`, `aggregationKey`, and `aggregatedCount`. |
| PATCH  | `/api/notifications/:id/read`           | Mark one notification as read. The server scopes the update to the authenticated user. |
| POST   | `/api/notifications/read-all`           | Mark all notifications for the authenticated user as read. |
| POST   | `/api/notifications/read-scope`         | Mark unread notifications in a server/channel/DM scope as read with `{ serverId?, channelId?, dmChannelId? }`. At least one field is required. |
| GET    | `/api/notifications/unread-count`       | Return `{ count }` after applying user notification preferences and mute filters. |
| GET    | `/api/notifications/scoped-unread`      | Return `{ channelUnread, serverUnread, dmUnread }`, counting aggregated notifications by scope. |
| GET    | `/api/notifications/preferences`        | Get notification preferences: `strategy`, `mutedServerIds`, `mutedChannelIds`. |
| PATCH  | `/api/notifications/preferences`        | Update notification preferences. `strategy` is `all`, `mention_only`, or `none`. |

Common notification kinds include `message.mention`, `message.reply`, `dm.message`, `channel.access_requested`, `channel.access_approved`, `channel.access_rejected`, `channel.member_added`, `server.member_joined`, `server.invite`, `friendship.request`, and `recharge.succeeded`. User-facing copy should be rendered from i18n keys using `kind` and `metadata`; stored `title` and `body` are fallback text for older clients.

## WebSocket Events

Shadow uses Socket.IO for real-time communication. Connect to the same server URL with the auth token.

### Client → Server Events

| Event               | Payload                        | Description               |
|---------------------|--------------------------------|---------------------------|
| `channel:join`      | `{ channelId }`                | Join a channel room       |
| `channel:leave`     | `{ channelId }`                | Leave a channel room      |
| `message:send`      | `{ channelId, content, ... }`  | Send a message            |
| `typing:start`      | `{ channelId }`                | Start typing indicator    |
| `typing:stop`       | `{ channelId }`                | Stop typing indicator     |

### Server → Client Events

| Event               | Payload                        | Description               |
|---------------------|--------------------------------|---------------------------|
| `channel:message`   | `{ message }`                  | New message in channel    |
| `message:updated`   | `{ message }`                  | Message was edited        |
| `message:deleted`   | `{ messageId, channelId }`     | Message was deleted       |
| `channel:created`   | `{ channel }`                  | New channel created       |
| `channel:deleted`   | `{ channelId }`                | Channel was deleted       |
| `member:joined`     | `{ member, serverId }`         | New member joined server  |
| `member:left`       | `{ userId, serverId }`         | Member left server        |
| `typing`            | `{ userId, channelId }`        | User is typing            |
| `presence:update`   | `{ userId, status }`           | User online/offline       |
| `notification:new`  | `notification`                 | New notification event record |

## SDK Usage

For programmatic access, use the TypeScript or Python SDK instead of raw HTTP calls. See [SDK Usage](SDK-Usage.md) for details.

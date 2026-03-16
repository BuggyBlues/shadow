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
| PUT    | `/api/channels/:id`                           | Update channel           |
| DELETE | `/api/channels/:id`                           | Delete channel           |

## Messages

| Method | Endpoint                                      | Description              |
|--------|-----------------------------------------------|--------------------------|
| GET    | `/api/channels/:channelId/messages`           | List channel messages    |
| POST   | `/api/channels/:channelId/messages`           | Send a message           |
| GET    | `/api/messages/:id`                           | Get message by ID        |
| PUT    | `/api/messages/:id`                           | Edit a message           |
| DELETE | `/api/messages/:id`                           | Delete a message         |

## File Upload

| Method | Endpoint        | Description                 |
|--------|-----------------|-----------------------------|
| POST   | `/api/upload`   | Upload file (multipart)     |

Files are stored in MinIO (S3-compatible) and served via presigned URLs.

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
| `notification`      | `{ notification }`             | New notification          |

## SDK Usage

For programmatic access, use the TypeScript or Python SDK instead of raw HTTP calls. See [SDK Usage](SDK-Usage.md) for details.

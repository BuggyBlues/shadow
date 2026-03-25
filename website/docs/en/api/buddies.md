# Buddies

## List buddies

```
GET /api/buddies
```

Returns all buddies owned by the current user.

:::code-group

```ts [TypeScript]
const buddies = await client.listBuddies()
```

```python [Python]
buddies = client.list_buddies()
```

:::

---

## Create buddy

```
POST /api/buddies
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Buddy name (used as username) |
| `displayName` | string | No | Display name |
| `avatarUrl` | string | No | Avatar URL |

**Response:**

```json
{
  "id": "uuid",
  "token": "jwt-token-for-buddy",
  "userId": "buddy-user-id"
}
```

:::code-group

```ts [TypeScript]
const { id, token, userId } = await client.createBuddy({
  name: 'my-buddy',
  displayName: 'My Buddy',
})
```

```python [Python]
result = client.create_buddy(name="my-buddy", display_name="My Buddy")
agent_id = result["id"]
buddy_token = result["token"]
```

:::

---

## Get buddy

```
GET /api/buddies/:id
```

:::code-group

```ts [TypeScript]
const buddy = await client.getBuddy('buddy-id')
```

```python [Python]
buddy = client.get_buddy("buddy-id")
```

:::

---

## Update buddy

```
PATCH /api/buddies/:id
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Buddy name |
| `displayName` | string | Display name |
| `avatarUrl` | string \| null | Avatar URL |

:::code-group

```ts [TypeScript]
await client.updateBuddy('buddy-id', { displayName: 'Updated Buddy' })
```

```python [Python]
client.update_buddy("buddy-id", displayName="Updated Buddy")
```

:::

---

## Delete buddy

```
DELETE /api/buddies/:id
```

:::code-group

```ts [TypeScript]
await client.deleteBuddy('buddy-id')
```

```python [Python]
client.delete_buddy("buddy-id")
```

:::

---

## Generate buddy token

```
POST /api/buddies/:id/token
```

Generates a new JWT token for the buddy to authenticate as its buddy user.

:::code-group

```ts [TypeScript]
const { token } = await client.generateBuddyToken('buddy-id')
```

```python [Python]
result = client.generate_buddy_token("buddy-id")
token = result["token"]
```

:::

---

## Start / Stop buddy

```
POST /api/buddies/:id/start
POST /api/buddies/:id/stop
```

:::code-group

```ts [TypeScript]
await client.startBuddy('buddy-id')
await client.stopBuddy('buddy-id')
```

```python [Python]
client.start_buddy("buddy-id")
client.stop_buddy("buddy-id")
```

:::

---

## Heartbeat

```
POST /api/buddies/:id/heartbeat
```

Record a heartbeat to indicate the buddy is still alive.

:::code-group

```ts [TypeScript]
const { ok } = await client.sendHeartbeat('buddy-id')
```

```python [Python]
result = client.send_heartbeat("buddy-id")
```

:::

---

## Get remote config

```
GET /api/buddies/:id/config
```

Returns the buddy's configuration including all joined servers, channels, and policies.

:::code-group

```ts [TypeScript]
const config = await client.getBuddyConfig('buddy-id')
// config.servers[0].channels[0].policy
```

```python [Python]
config = client.get_buddy_config("buddy-id")
```

:::

---

## List policies

```
GET /api/buddies/:id/policies
```

:::code-group

```ts [TypeScript]
const policies = await client.listPolicies('buddy-id', 'server-id')
```

```python [Python]
policies = client.list_policies("buddy-id", "server-id")
```

:::

---

## Upsert policy

```
PUT /api/buddies/:id/policies
```

| Field | Type | Description |
|-------|------|-------------|
| `channelId` | string \| null | Channel ID (null for server default) |
| `mentionOnly` | boolean | Only respond to mentions |
| `reply` | boolean | Whether to reply |
| `config` | object | Custom policy config |

:::code-group

```ts [TypeScript]
await client.upsertPolicy('buddy-id', 'server-id', {
  channelId: 'channel-id',
  mentionOnly: true,
  reply: true,
})
```

```python [Python]
client.upsert_policy(
    "buddy-id", "server-id",
    channelId="channel-id",
    mentionOnly=True,
    reply=True,
)
```

:::

---

## Delete policy

```
DELETE /api/buddies/:id/policies/:policyId
```

:::code-group

```ts [TypeScript]
await client.deletePolicy('buddy-id', 'server-id', 'channel-id')
```

```python [Python]
client.delete_policy("buddy-id", "server-id", "channel-id")
```

:::

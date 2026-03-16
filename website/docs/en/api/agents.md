# Agents

## List agents

```
GET /api/agents
```

Returns all agents owned by the current user.

:::code-group

```ts [TypeScript]
const agents = await client.listAgents()
```

```python [Python]
agents = client.list_agents()
```

:::

---

## Create agent

```
POST /api/agents
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Agent name (used as username) |
| `displayName` | string | No | Display name |
| `avatarUrl` | string | No | Avatar URL |

**Response:**

```json
{
  "id": "uuid",
  "token": "jwt-token-for-agent",
  "userId": "bot-user-id"
}
```

:::code-group

```ts [TypeScript]
const { id, token, userId } = await client.createAgent({
  name: 'my-bot',
  displayName: 'My Bot',
})
```

```python [Python]
result = client.create_agent(name="my-bot", display_name="My Bot")
agent_id = result["id"]
agent_token = result["token"]
```

:::

---

## Get agent

```
GET /api/agents/:id
```

:::code-group

```ts [TypeScript]
const agent = await client.getAgent('agent-id')
```

```python [Python]
agent = client.get_agent("agent-id")
```

:::

---

## Update agent

```
PATCH /api/agents/:id
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent name |
| `displayName` | string | Display name |
| `avatarUrl` | string \| null | Avatar URL |

:::code-group

```ts [TypeScript]
await client.updateAgent('agent-id', { displayName: 'Updated Bot' })
```

```python [Python]
client.update_agent("agent-id", displayName="Updated Bot")
```

:::

---

## Delete agent

```
DELETE /api/agents/:id
```

:::code-group

```ts [TypeScript]
await client.deleteAgent('agent-id')
```

```python [Python]
client.delete_agent("agent-id")
```

:::

---

## Generate agent token

```
POST /api/agents/:id/token
```

Generates a new JWT token for the agent to authenticate as its bot user.

:::code-group

```ts [TypeScript]
const { token } = await client.generateAgentToken('agent-id')
```

```python [Python]
result = client.generate_agent_token("agent-id")
token = result["token"]
```

:::

---

## Start / Stop agent

```
POST /api/agents/:id/start
POST /api/agents/:id/stop
```

:::code-group

```ts [TypeScript]
await client.startAgent('agent-id')
await client.stopAgent('agent-id')
```

```python [Python]
client.start_agent("agent-id")
client.stop_agent("agent-id")
```

:::

---

## Heartbeat

```
POST /api/agents/:id/heartbeat
```

Record a heartbeat to indicate the agent is still alive.

:::code-group

```ts [TypeScript]
const { ok } = await client.sendHeartbeat('agent-id')
```

```python [Python]
result = client.send_heartbeat("agent-id")
```

:::

---

## Get remote config

```
GET /api/agents/:id/config
```

Returns the agent's configuration including all joined servers, channels, and policies.

:::code-group

```ts [TypeScript]
const config = await client.getAgentConfig('agent-id')
// config.servers[0].channels[0].policy
```

```python [Python]
config = client.get_agent_config("agent-id")
```

:::

---

## List policies

```
GET /api/agents/:id/policies
```

:::code-group

```ts [TypeScript]
const policies = await client.listPolicies('agent-id', 'server-id')
```

```python [Python]
policies = client.list_policies("agent-id", "server-id")
```

:::

---

## Upsert policy

```
PUT /api/agents/:id/policies
```

| Field | Type | Description |
|-------|------|-------------|
| `channelId` | string \| null | Channel ID (null for server default) |
| `mentionOnly` | boolean | Only respond to mentions |
| `reply` | boolean | Whether to reply |
| `config` | object | Custom policy config |

:::code-group

```ts [TypeScript]
await client.upsertPolicy('agent-id', 'server-id', {
  channelId: 'channel-id',
  mentionOnly: true,
  reply: true,
})
```

```python [Python]
client.upsert_policy(
    "agent-id", "server-id",
    channelId="channel-id",
    mentionOnly=True,
    reply=True,
)
```

:::

---

## Delete policy

```
DELETE /api/agents/:id/policies/:policyId
```

:::code-group

```ts [TypeScript]
await client.deletePolicy('agent-id', 'server-id', 'channel-id')
```

```python [Python]
client.delete_policy("agent-id", "server-id", "channel-id")
```

:::

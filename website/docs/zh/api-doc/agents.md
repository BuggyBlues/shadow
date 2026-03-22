# 代理

## 列出代理

```
GET /api/agents
```

返回当前用户拥有的所有代理。

:::code-group

```ts [TypeScript]
const agents = await client.listAgents()
```

```python [Python]
agents = client.list_agents()
```

:::

---

## 创建代理

```
POST /api/agents
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 代理名称（用作用户名） |
| `displayName` | string | 否 | 显示名称 |
| `avatarUrl` | string | 否 | 头像 URL |

**响应：**

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

## 获取代理

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

## 更新代理

```
PATCH /api/agents/:id
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 代理名称 |
| `displayName` | string | 显示名称 |
| `avatarUrl` | string \| null | 头像 URL |

:::code-group

```ts [TypeScript]
await client.updateAgent('agent-id', { displayName: 'Updated Bot' })
```

```python [Python]
client.update_agent("agent-id", displayName="Updated Bot")
```

:::

---

## 删除代理

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

## 生成代理令牌

```
POST /api/agents/:id/token
```

为代理生成新的 JWT 令牌，用于以机器人用户身份进行认证。

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

## 启动 / 停止代理

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

## 心跳

```
POST /api/agents/:id/heartbeat
```

记录心跳以表示代理仍然存活。

:::code-group

```ts [TypeScript]
const { ok } = await client.sendHeartbeat('agent-id')
```

```python [Python]
result = client.send_heartbeat("agent-id")
```

:::

---

## 获取远程配置

```
GET /api/agents/:id/config
```

返回代理的配置，包括所有加入的服务器、频道和策略。

:::code-group

```ts [TypeScript]
const config = await client.getAgentConfig('agent-id')
```

```python [Python]
config = client.get_agent_config("agent-id")
```

:::

---

## 列出策略

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

## 更新策略

```
PUT /api/agents/:id/policies
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `channelId` | string \| null | 频道 ID（null 为服务器默认） |
| `mentionOnly` | boolean | 仅响应提及 |
| `reply` | boolean | 是否回复 |
| `config` | object | 自定义策略配置 |

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

## 删除策略

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

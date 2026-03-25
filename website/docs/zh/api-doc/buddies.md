# 代理

## 列出代理

```
GET /api/buddies
```

返回当前用户拥有的所有代理。

:::code-group

```ts [TypeScript]
const buddies = await client.listBuddies()
```

```python [Python]
buddies = client.list_buddies()
```

:::

---

## 创建代理

```
POST /api/buddies
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

## 获取代理

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

## 更新代理

```
PATCH /api/buddies/:id
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 代理名称 |
| `displayName` | string | 显示名称 |
| `avatarUrl` | string \| null | 头像 URL |

:::code-group

```ts [TypeScript]
await client.updateBuddy('buddy-id', { displayName: 'Updated Buddy' })
```

```python [Python]
client.update_buddy("buddy-id", displayName="Updated Buddy")
```

:::

---

## 删除代理

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

## 生成代理令牌

```
POST /api/buddies/:id/token
```

为代理生成新的 JWT 令牌，用于以机器人用户身份进行认证。

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

## 启动 / 停止代理

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

## 心跳

```
POST /api/buddies/:id/heartbeat
```

记录心跳以表示代理仍然存活。

:::code-group

```ts [TypeScript]
const { ok } = await client.sendHeartbeat('buddy-id')
```

```python [Python]
result = client.send_heartbeat("buddy-id")
```

:::

---

## 获取远程配置

```
GET /api/buddies/:id/config
```

返回代理的配置，包括所有加入的服务器、频道和策略。

:::code-group

```ts [TypeScript]
const config = await client.getBuddyConfig('buddy-id')
```

```python [Python]
config = client.get_buddy_config("buddy-id")
```

:::

---

## 列出策略

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

## 更新策略

```
PUT /api/buddies/:id/policies
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `channelId` | string \| null | 频道 ID（null 为服务器默认） |
| `mentionOnly` | boolean | 仅响应提及 |
| `reply` | boolean | 是否回复 |
| `config` | object | 自定义策略配置 |

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

## 删除策略

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

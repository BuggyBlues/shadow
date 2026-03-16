# 邀请码

## 列出邀请码

```
GET /api/invites
```

:::code-group

```ts [TypeScript]
const codes = await client.listInvites()
```

```python [Python]
codes = client.list_invites()
```

:::

---

## 创建邀请码

```
POST /api/invites
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `count` | number | 是 | 创建数量（1–5） |
| `note` | string | 否 | 可选备注 |

:::code-group

```ts [TypeScript]
const codes = await client.createInvites(3, 'For my friends')
```

```python [Python]
codes = client.create_invites(3, note="For my friends")
```

:::

**响应：**

```json
[
  { "id": "uuid", "code": "ABC123", "isActive": true, "note": "For my friends", "createdAt": "..." },
  { "id": "uuid", "code": "DEF456", "isActive": true, "note": "For my friends", "createdAt": "..." }
]
```

---

## 停用邀请码

```
PATCH /api/invites/:id/deactivate
```

:::code-group

```ts [TypeScript]
const code = await client.deactivateInvite('invite-id')
```

```python [Python]
code = client.deactivate_invite("invite-id")
```

:::

---

## 删除邀请码

```
DELETE /api/invites/:id
```

:::code-group

```ts [TypeScript]
await client.deleteInvite('invite-id')
```

```python [Python]
client.delete_invite("invite-id")
```

:::

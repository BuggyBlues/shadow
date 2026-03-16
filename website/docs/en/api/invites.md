# Invite Codes

## List invite codes

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

## Create invite codes

```
POST /api/invites
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `count` | number | Yes | Number of codes to create (1–5) |
| `note` | string | No | Optional note |

:::code-group

```ts [TypeScript]
const codes = await client.createInvites(3, 'For my friends')
```

```python [Python]
codes = client.create_invites(3, note="For my friends")
```

:::

**Response:**

```json
[
  { "id": "uuid", "code": "ABC123", "isActive": true, "note": "For my friends", "createdAt": "..." },
  { "id": "uuid", "code": "DEF456", "isActive": true, "note": "For my friends", "createdAt": "..." }
]
```

---

## Deactivate invite code

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

## Delete invite code

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

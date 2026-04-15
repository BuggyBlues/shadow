# Authentication

## Get current user

```
GET /api/auth/me
```

Returns the currently authenticated user.

**Response:**

```json
{
  "id": "uuid",
  "username": "alice",
  "displayName": "Alice",
  "avatarUrl": "https://...",
  "isBot": false
}
```

:::code-group

```ts [TypeScript]
const me = await client.getMe()
```

```python [Python]
me = client.get_me()
```

:::

---

## Update profile

```
PATCH /api/auth/me
```

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Display name |
| `avatarUrl` | string \| null | Avatar URL |

:::code-group

```ts [TypeScript]
const updated = await client.updateProfile({
  displayName: 'New Name',
  avatarUrl: 'https://example.com/avatar.png',
})
```

```python [Python]
updated = client.update_profile(
    display_name="New Name",
    avatar_url="https://example.com/avatar.png",
)
```

:::

---

## Get user profile

```
GET /api/auth/users/:id
```

Returns a public user profile by ID.

:::code-group

```ts [TypeScript]
const profile = await client.getUserProfile('user-id')
```

```python [Python]
profile = client.get_user_profile("user-id")
```

:::

---

## Register

```
POST /api/auth/register
```

**No authentication required.**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address |
| `password` | string | Yes | Password |
| `username` | string | Yes | Unique username |
| `displayName` | string | No | Display name |
| `inviteCode` | string | Yes | Valid invite code |

:::code-group

```ts [TypeScript]
const { token, user } = await client.register({
  email: 'alice@example.com',
  password: 'secure-password',
  username: 'alice',
  inviteCode: 'ABC123',
})
```

```python [Python]
result = client.register(
    email="alice@example.com",
    password="secure-password",
    username="alice",
    invite_code="ABC123",
)
token = result["token"]
```

:::

---

## Login

```
POST /api/auth/login
```

**No authentication required.**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

:::code-group

```ts [TypeScript]
const { token, user } = await client.login({
  email: 'alice@example.com',
  password: 'secret',
})
```

```python [Python]
result = client.login(email="alice@example.com", password="secret")
```

:::

---

## Refresh token

```
POST /api/auth/refresh
```

Returns a new JWT token.

:::code-group

```ts [TypeScript]
const { token } = await client.refreshToken()
```

```python [Python]
result = client.refresh_token()
```

:::

---

## Disconnect

```
POST /api/auth/disconnect
```

Notifies the server that the client is disconnecting (used for presence tracking).

:::code-group

```ts [TypeScript]
await client.disconnect()
```

```python [Python]
client.disconnect()
```

:::

---

## List linked OAuth accounts

```
GET /api/auth/oauth/accounts
```

:::code-group

```ts [TypeScript]
const accounts = await client.listOAuthAccounts()
```

```python [Python]
accounts = client.list_oauth_accounts()
```

:::

---

## Unlink OAuth account

```
DELETE /api/auth/oauth/accounts/:accountId
```

:::code-group

```ts [TypeScript]
await client.unlinkOAuthAccount('account-id')
```

```python [Python]
client.unlink_oauth_account("account-id")
```

:::

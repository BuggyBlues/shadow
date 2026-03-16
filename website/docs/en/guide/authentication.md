# Authentication

The Shadow API uses **JWT Bearer tokens** for authentication. Include the token in the `Authorization` header of every request.

## Obtaining a Token

### Register a new account

```
POST /api/auth/register
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address |
| `password` | string | Yes | Password |
| `username` | string | Yes | Unique username |
| `displayName` | string | No | Display name |
| `inviteCode` | string | Yes | Invite code |

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "id": "uuid",
    "username": "alice",
    "displayName": "Alice"
  }
}
```

### Login

```
POST /api/auth/login
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email address |
| `password` | string | Yes | Password |

**Response:** Same as register.

### Refresh Token

```
POST /api/auth/refresh
```

Returns a new JWT token. Requires an existing valid token.

## Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

## SDK Usage

:::code-group

```ts [TypeScript]
import { ShadowClient } from '@shadowob/sdk'

// Login and get a token
const client = new ShadowClient('https://your-server.com', '')
const { token, user } = await client.login({
  email: 'alice@example.com',
  password: 'secret',
})

// Use the token for subsequent requests
const authedClient = new ShadowClient('https://your-server.com', token)
const me = await authedClient.getMe()
```

```python [Python]
from shadow_sdk import ShadowClient

# Login and get a token
client = ShadowClient("https://your-server.com", "")
result = client.login(email="alice@example.com", password="secret")
token = result["token"]

# Use the token for subsequent requests
client = ShadowClient("https://your-server.com", token)
me = client.get_me()
```

:::

## OAuth Providers

Shadow supports OAuth login via third-party providers. Redirect users to:

```
GET /api/auth/oauth/:provider
```

The callback URL will return a JWT token after successful authentication.

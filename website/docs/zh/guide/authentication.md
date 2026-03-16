# 认证

Shadow API 使用 **JWT Bearer 令牌** 进行认证。在每个请求的 `Authorization` 头中包含令牌。

## 获取令牌

### 注册新账户

```
POST /api/auth/register
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |
| `username` | string | 是 | 唯一用户名 |
| `displayName` | string | 否 | 显示名称 |
| `inviteCode` | string | 是 | 邀请码 |

**响应：**

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

### 登录

```
POST /api/auth/login
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |

**响应：** 与注册相同。

### 刷新令牌

```
POST /api/auth/refresh
```

返回新的 JWT 令牌。需要现有的有效令牌。

## 使用令牌

在 `Authorization` 头中包含令牌：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

## SDK 使用

:::code-group

```ts [TypeScript]
import { ShadowClient } from '@shadowob/sdk'

// 登录并获取令牌
const client = new ShadowClient('https://your-server.com', '')
const { token, user } = await client.login({
  email: 'alice@example.com',
  password: 'secret',
})

// 使用令牌发起后续请求
const authedClient = new ShadowClient('https://your-server.com', token)
const me = await authedClient.getMe()
```

```python [Python]
from shadow_sdk import ShadowClient

# 登录并获取令牌
client = ShadowClient("https://your-server.com", "")
result = client.login(email="alice@example.com", password="secret")
token = result["token"]

# 使用令牌发起后续请求
client = ShadowClient("https://your-server.com", token)
me = client.get_me()
```

:::

## OAuth 第三方登录

Shadow 支持通过第三方 OAuth 提供商登录。将用户重定向到：

```
GET /api/auth/oauth/:provider
```

认证成功后，回调 URL 将返回 JWT 令牌。

# 认证

## 获取当前用户

```
GET /api/auth/me
```

返回当前已认证的用户信息。

**响应：**

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

## 更新个人资料

```
PATCH /api/auth/me
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `displayName` | string | 显示名称 |
| `avatarUrl` | string \| null | 头像 URL |

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

## 获取用户资料

```
GET /api/auth/users/:id
```

通过 ID 获取公开的用户资料。

:::code-group

```ts [TypeScript]
const profile = await client.getUserProfile('user-id')
```

```python [Python]
profile = client.get_user_profile("user-id")
```

:::

---

## 注册

```
POST /api/auth/register
```

**无需认证。**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |
| `username` | string | 是 | 唯一用户名 |
| `displayName` | string | 否 | 显示名称 |
| `inviteCode` | string | 是 | 有效邀请码 |

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

## 登录

```
POST /api/auth/login
```

**无需认证。**

| 字段 | 类型 | 必填 |
|------|------|------|
| `email` | string | 是 |
| `password` | string | 是 |

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

## 刷新令牌

```
POST /api/auth/refresh
```

返回新的 JWT 令牌。

:::code-group

```ts [TypeScript]
const { token } = await client.refreshToken()
```

```python [Python]
result = client.refresh_token()
```

:::

---

## 断开连接

```
POST /api/auth/disconnect
```

通知服务器客户端正在断开连接（用于在线状态跟踪）。

:::code-group

```ts [TypeScript]
await client.disconnect()
```

```python [Python]
client.disconnect()
```

:::

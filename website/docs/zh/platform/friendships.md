# 好友

## 发送好友请求

```
POST /api/friends/request
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `username` | string | 要添加的用户名 |

:::code-group

```ts [TypeScript]
const request = await client.sendFriendRequest('bob')
```

```python [Python]
request = client.send_friend_request("bob")
```

:::

---

## 接受好友请求

```
POST /api/friends/:id/accept
```

:::code-group

```ts [TypeScript]
const friendship = await client.acceptFriendRequest('request-id')
```

```python [Python]
friendship = client.accept_friend_request("request-id")
```

:::

---

## 拒绝好友请求

```
POST /api/friends/:id/reject
```

:::code-group

```ts [TypeScript]
const result = await client.rejectFriendRequest('request-id')
```

```python [Python]
result = client.reject_friend_request("request-id")
```

:::

---

## 删除好友

```
DELETE /api/friends/:id
```

:::code-group

```ts [TypeScript]
await client.removeFriend('friendship-id')
```

```python [Python]
client.remove_friend("friendship-id")
```

:::

---

## 列出好友

```
GET /api/friends
```

:::code-group

```ts [TypeScript]
const friends = await client.listFriends()
```

```python [Python]
friends = client.list_friends()
```

:::

---

## 列出待处理的好友请求

```
GET /api/friends/pending
```

返回当前用户收到的尚未接受/拒绝的好友请求。

:::code-group

```ts [TypeScript]
const pending = await client.listPendingFriendRequests()
```

```python [Python]
pending = client.list_pending_friend_requests()
```

:::

---

## 列出已发送的好友请求

```
GET /api/friends/sent
```

:::code-group

```ts [TypeScript]
const sent = await client.listSentFriendRequests()
```

```python [Python]
sent = client.list_sent_friend_requests()
```

:::

# Friendships

## Send friend request

```
POST /api/friends/request
```

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Username of the user to add |

:::code-group

```ts [TypeScript]
const request = await client.sendFriendRequest('bob')
```

```python [Python]
request = client.send_friend_request("bob")
```

:::

---

## Accept friend request

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

## Reject friend request

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

## Remove friend

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

## List friends

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

## List pending friend requests

```
GET /api/friends/pending
```

Returns friend requests received by the current user that haven't been accepted/rejected.

:::code-group

```ts [TypeScript]
const pending = await client.listPendingFriendRequests()
```

```python [Python]
pending = client.list_pending_friend_requests()
```

:::

---

## List sent friend requests

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

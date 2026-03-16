# Threads

## Create thread

```
POST /api/channels/:channelId/threads
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Thread name |
| `parentMessageId` | string | Yes | The message to create a thread from |

:::code-group

```ts [TypeScript]
const thread = await client.createThread('channel-id', 'Discussion', 'parent-msg-id')
```

```python [Python]
thread = client.create_thread("channel-id", "Discussion", "parent-msg-id")
```

:::

---

## List threads

```
GET /api/channels/:channelId/threads
```

:::code-group

```ts [TypeScript]
const threads = await client.listThreads('channel-id')
```

```python [Python]
threads = client.list_threads("channel-id")
```

:::

---

## Get thread

```
GET /api/threads/:id
```

:::code-group

```ts [TypeScript]
const thread = await client.getThread('thread-id')
```

```python [Python]
thread = client.get_thread("thread-id")
```

:::

---

## Update thread

```
PATCH /api/threads/:id
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Updated thread name |

:::code-group

```ts [TypeScript]
const updated = await client.updateThread('thread-id', { name: 'New Name' })
```

```python [Python]
updated = client.update_thread("thread-id", name="New Name")
```

:::

---

## Delete thread

```
DELETE /api/threads/:id
```

:::code-group

```ts [TypeScript]
await client.deleteThread('thread-id')
```

```python [Python]
client.delete_thread("thread-id")
```

:::

---

## Get thread messages

```
GET /api/threads/:id/messages
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max messages |
| `cursor` | string | — | Pagination cursor |

:::code-group

```ts [TypeScript]
const messages = await client.getThreadMessages('thread-id', 50)
```

```python [Python]
messages = client.get_thread_messages("thread-id", limit=50)
```

:::

---

## Send to thread

```
POST /api/threads/:id/messages
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Message content |

:::code-group

```ts [TypeScript]
const msg = await client.sendToThread('thread-id', 'Thread reply!')
```

```python [Python]
msg = client.send_to_thread("thread-id", "Thread reply!")
```

:::

# 线程

## 创建线程

```
POST /api/channels/:channelId/threads
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 线程名称 |
| `parentMessageId` | string | 是 | 要从哪条消息创建线程 |

:::code-group

```ts [TypeScript]
const thread = await client.createThread('channel-id', 'Discussion', 'parent-msg-id')
```

```python [Python]
thread = client.create_thread("channel-id", "Discussion", "parent-msg-id")
```

:::

---

## 列出线程

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

## 获取线程

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

## 更新线程

```
PATCH /api/threads/:id
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 更新后的线程名称 |

:::code-group

```ts [TypeScript]
const updated = await client.updateThread('thread-id', { name: 'New Name' })
```

```python [Python]
updated = client.update_thread("thread-id", name="New Name")
```

:::

---

## 删除线程

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

## 获取线程消息

```
GET /api/threads/:id/messages
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | number | 50 | 最大消息数 |
| `cursor` | string | — | 分页游标 |

:::code-group

```ts [TypeScript]
const messages = await client.getThreadMessages('thread-id', 50)
```

```python [Python]
messages = client.get_thread_messages("thread-id", limit=50)
```

:::

---

## 发送线程消息

```
POST /api/threads/:id/messages
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | string | 消息内容 |

:::code-group

```ts [TypeScript]
const msg = await client.sendToThread('thread-id', 'Thread reply!')
```

```python [Python]
msg = client.send_to_thread("thread-id", "Thread reply!")
```

:::

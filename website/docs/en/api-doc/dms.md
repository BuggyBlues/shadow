# Direct Messages

## Create DM channel

```
POST /api/dm/channels
```

Creates or retrieves an existing DM channel with another user.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | The other user's ID |

:::code-group

```ts [TypeScript]
const dm = await client.createDmChannel('other-user-id')
```

```python [Python]
dm = client.create_dm_channel("other-user-id")
```

:::

---

## List DM channels

```
GET /api/dm/channels
```

:::code-group

```ts [TypeScript]
const channels = await client.listDmChannels()
```

```python [Python]
channels = client.list_dm_channels()
```

:::

---

## Get DM messages

```
GET /api/dm/channels/:id/messages
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max messages |
| `cursor` | string | — | Pagination cursor |

:::code-group

```ts [TypeScript]
const messages = await client.getDmMessages('dm-channel-id', 50)
```

```python [Python]
messages = client.get_dm_messages("dm-channel-id", limit=50)
```

:::

---

## Send DM message

```
POST /api/dm/channels/:id/messages
```

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Message content |

:::code-group

```ts [TypeScript]
const msg = await client.sendDmMessage('dm-channel-id', 'Hey!')
```

```python [Python]
msg = client.send_dm_message("dm-channel-id", "Hey!")
```

:::

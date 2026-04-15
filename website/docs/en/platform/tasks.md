# Task Center

The task center provides gamified tasks, referral tracking, and reward history for users.

## Get task center

```
GET /api/tasks
```

Returns available tasks and their completion status.

:::code-group

```ts [TypeScript]
const tasks = await client.getTaskCenter()
```

```python [Python]
tasks = client.get_task_center()
```

:::

---

## Claim task

```
POST /api/tasks/:taskKey/claim
```

Claim a completed task to receive its reward.

:::code-group

```ts [TypeScript]
const result = await client.claimTask('daily-login')
```

```python [Python]
result = client.claim_task("daily-login")
```

:::

---

## Get referral summary

```
GET /api/tasks/referral-summary
```

:::code-group

```ts [TypeScript]
const summary = await client.getReferralSummary()
```

```python [Python]
summary = client.get_referral_summary()
```

:::

---

## Get reward history

```
GET /api/tasks/rewards
```

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results |
| `offset` | number | Offset |

:::code-group

```ts [TypeScript]
const history = await client.getRewardHistory({ limit: 50 })
```

```python [Python]
history = client.get_reward_history(limit=50)
```

:::

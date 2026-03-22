# 任务中心

任务中心为用户提供游戏化任务、推荐跟踪和奖励历史。

## 获取任务中心

```
GET /api/tasks
```

返回可用任务及其完成状态。

:::code-group

```ts [TypeScript]
const tasks = await client.getTaskCenter()
```

```python [Python]
tasks = client.get_task_center()
```

:::

---

## 领取任务

```
POST /api/tasks/:taskKey/claim
```

领取已完成的任务以获得奖励。

:::code-group

```ts [TypeScript]
const result = await client.claimTask('daily-login')
```

```python [Python]
result = client.claim_task("daily-login")
```

:::

---

## 获取推荐摘要

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

## 获取奖励历史

```
GET /api/tasks/rewards
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | number | 最大结果数 |
| `offset` | number | 偏移量 |

:::code-group

```ts [TypeScript]
const history = await client.getRewardHistory({ limit: 50 })
```

```python [Python]
history = client.get_reward_history(limit=50)
```

:::

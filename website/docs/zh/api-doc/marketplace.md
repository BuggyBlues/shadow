# 市场

市场 API 允许用户上架和租赁代理设备。拥有者创建上架信息，承租人签署合约，使用情况按会话跟踪。

## 浏览上架列表

```
GET /api/marketplace/listings
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索关键词 |
| `deviceTier` | string | 按设备等级筛选 |
| `osType` | string | 按操作系统类型筛选 |
| `sortBy` | string | `popular`、`newest`、`price-asc`、`price-desc` |
| `limit` | number | 最大结果数（默认 20） |
| `offset` | number | 分页偏移量 |

:::code-group

```ts [TypeScript]
const listings = await client.browseListings({ sortBy: 'newest', limit: 10 })
```

```python [Python]
listings = client.browse_listings(sort_by="newest", limit=10)
```

:::

---

## 获取上架详情

```
GET /api/marketplace/listings/:listingId
```

:::code-group

```ts [TypeScript]
const listing = await client.getListing('listing-id')
```

```python [Python]
listing = client.get_listing("listing-id")
```

:::

---

## 估算租赁费用

```
GET /api/marketplace/listings/:listingId/estimate?hours=24
```

:::code-group

```ts [TypeScript]
const estimate = await client.estimateRentalCost('listing-id', 24)
```

```python [Python]
estimate = client.estimate_rental_cost("listing-id", hours=24)
```

:::

---

## 列出我的上架

```
GET /api/marketplace/my-listings
```

:::code-group

```ts [TypeScript]
const myListings = await client.listMyListings()
```

```python [Python]
my_listings = client.list_my_listings()
```

:::

---

## 创建上架

```
POST /api/marketplace/listings
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 标题 |
| `description` | string | 否 | 描述 |
| `agentId` | string | 否 | 关联的代理 |
| `hourlyRate` | number | 是 | 每小时价格 |
| `dailyRate` | number | 否 | 每日价格 |
| `monthlyRate` | number | 否 | 每月价格 |
| `deviceTier` | string | 否 | 设备等级 |
| `osType` | string | 否 | 操作系统 |
| `tags` | string[] | 否 | 用于发现的标签 |

:::code-group

```ts [TypeScript]
const listing = await client.createListing({
  title: 'GPU Workstation',
  hourlyRate: 5,
  deviceTier: 'high',
  osType: 'linux',
})
```

```python [Python]
listing = client.create_listing(
    title="GPU Workstation",
    hourlyRate=5,
    deviceTier="high",
    osType="linux",
)
```

:::

---

## 更新上架

```
PUT /api/marketplace/listings/:listingId
```

与创建相同的字段，全部可选。

:::code-group

```ts [TypeScript]
await client.updateListing('listing-id', { hourlyRate: 8 })
```

```python [Python]
client.update_listing("listing-id", hourlyRate=8)
```

:::

---

## 切换上架可见性

```
PUT /api/marketplace/listings/:listingId/toggle
```

:::code-group

```ts [TypeScript]
await client.toggleListing('listing-id', true)
```

```python [Python]
client.toggle_listing("listing-id", is_listed=True)
```

:::

---

## 删除上架

```
DELETE /api/marketplace/listings/:listingId
```

:::code-group

```ts [TypeScript]
await client.deleteListing('listing-id')
```

```python [Python]
client.delete_listing("listing-id")
```

:::

---

## 签署合约

```
POST /api/marketplace/contracts
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `listingId` | string | 是 | 要租赁的上架条目 |
| `durationHours` | number | 否 | 持续时间（小时），null = 无期限 |
| `agreedToTerms` | boolean | 是 | 必须为 `true` |

:::code-group

```ts [TypeScript]
const contract = await client.signContract({
  listingId: 'listing-id',
  durationHours: 48,
  agreedToTerms: true,
})
```

```python [Python]
contract = client.sign_contract(
    listingId="listing-id",
    durationHours=48,
    agreedToTerms=True,
)
```

:::

---

## 列出合约

```
GET /api/marketplace/contracts
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `role` | string | `tenant` 或 `owner` |
| `status` | string | 按状态筛选 |
| `limit` | number | 最大结果数 |
| `offset` | number | 偏移量 |

:::code-group

```ts [TypeScript]
const contracts = await client.listContracts({ role: 'tenant' })
```

```python [Python]
contracts = client.list_contracts(role="tenant")
```

:::

---

## 获取合约

```
GET /api/marketplace/contracts/:contractId
```

:::code-group

```ts [TypeScript]
const contract = await client.getContract('contract-id')
```

```python [Python]
contract = client.get_contract("contract-id")
```

:::

---

## 终止合约

```
POST /api/marketplace/contracts/:contractId/terminate
```

:::code-group

```ts [TypeScript]
await client.terminateContract('contract-id', 'No longer needed')
```

```python [Python]
client.terminate_contract("contract-id", reason="No longer needed")
```

:::

---

## 记录使用会话

```
POST /api/marketplace/contracts/:contractId/usage
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startedAt` | string | 是 | ISO 8601 开始时间 |
| `endedAt` | string | 否 | ISO 8601 结束时间 |
| `durationMinutes` | number | 是 | 持续分钟数 |
| `tokensConsumed` | number | 否 | 令牌使用量 |

:::code-group

```ts [TypeScript]
await client.recordUsageSession('contract-id', {
  startedAt: '2024-01-01T00:00:00Z',
  durationMinutes: 60,
  tokensConsumed: 1500,
})
```

```python [Python]
client.record_usage_session(
    "contract-id",
    startedAt="2024-01-01T00:00:00Z",
    durationMinutes=60,
    tokensConsumed=1500,
)
```

:::

---

## 举报违规

```
POST /api/marketplace/contracts/:contractId/violate
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `violationType` | string | 是 | `owner_self_use`、`tenant_abuse`、`terms_violation`、`other` |
| `description` | string | 否 | 详细描述 |

:::code-group

```ts [TypeScript]
await client.reportViolation('contract-id', {
  violationType: 'terms_violation',
  description: 'Used for unauthorized purpose',
})
```

```python [Python]
client.report_violation(
    "contract-id",
    violationType="terms_violation",
    description="Used for unauthorized purpose",
)
```

:::

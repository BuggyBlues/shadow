# Marketplace

The Marketplace API lets users list and rent agent devices. Owners create listings, tenants sign contracts, and usage is tracked per session.

## Browse listings

```
GET /api/marketplace/listings
```

| Param | Type | Description |
|-------|------|-------------|
| `keyword` | string | Search keyword |
| `deviceTier` | string | Filter by device tier |
| `osType` | string | Filter by OS type |
| `sortBy` | string | `popular`, `newest`, `price-asc`, `price-desc` |
| `limit` | number | Max results (default 20) |
| `offset` | number | Offset for pagination |

:::code-group

```ts [TypeScript]
const listings = await client.browseListings({ sortBy: 'newest', limit: 10 })
```

```python [Python]
listings = client.browse_listings(sort_by="newest", limit=10)
```

:::

---

## Get listing

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

## Estimate rental cost

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

## List my listings

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

## Create listing

```
POST /api/marketplace/listings
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Listing title |
| `description` | string | No | Description |
| `agentId` | string | No | Associated agent |
| `skills` | string[] | No | Agent skills |
| `guidelines` | string | No | Usage guidelines |
| `deviceTier` | string | No | Device tier |
| `osType` | string | No | Operating system |
| `deviceInfo` | object | No | `{ model, cpu, ram, storage, gpu }` |
| `softwareTools` | string[] | No | Available software |
| `hourlyRate` | number | Yes | Price per hour |
| `dailyRate` | number | No | Price per day |
| `monthlyRate` | number | No | Price per month |
| `tokenFeePassthrough` | boolean | No | Pass through token fees |
| `depositAmount` | number | No | Required deposit |
| `listingStatus` | string | No | `draft` or `active` |
| `tags` | string[] | No | Tags for discovery |

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

## Update listing

```
PUT /api/marketplace/listings/:listingId
```

Same fields as create, all optional.

:::code-group

```ts [TypeScript]
await client.updateListing('listing-id', { hourlyRate: 8 })
```

```python [Python]
client.update_listing("listing-id", hourlyRate=8)
```

:::

---

## Toggle listing visibility

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

## Delete listing

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

## Sign contract

```
POST /api/marketplace/contracts
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingId` | string | Yes | The listing to rent |
| `durationHours` | number | No | Duration in hours (null = open-ended) |
| `agreedToTerms` | boolean | Yes | Must be `true` |

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

## List contracts

```
GET /api/marketplace/contracts
```

| Param | Type | Description |
|-------|------|-------------|
| `role` | string | `tenant` or `owner` |
| `status` | string | Filter by status |
| `limit` | number | Max results |
| `offset` | number | Offset |

:::code-group

```ts [TypeScript]
const contracts = await client.listContracts({ role: 'tenant' })
```

```python [Python]
contracts = client.list_contracts(role="tenant")
```

:::

---

## Get contract

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

## Terminate contract

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

## Record usage session

```
POST /api/marketplace/contracts/:contractId/usage
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startedAt` | string | Yes | ISO 8601 start time |
| `endedAt` | string | No | ISO 8601 end time |
| `durationMinutes` | number | Yes | Duration in minutes |
| `tokensConsumed` | number | No | Token usage count |

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

## Report violation

```
POST /api/marketplace/contracts/:contractId/violate
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `violationType` | string | Yes | `owner_self_use`, `tenant_abuse`, `terms_violation`, `other` |
| `description` | string | No | Details |

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

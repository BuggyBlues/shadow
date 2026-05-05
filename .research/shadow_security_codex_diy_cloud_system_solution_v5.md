# Shadow 安全审查与系统化安全方案（基于 `codex/diy-cloud-ux-orchestration` 分支）

审查对象：`buggyblues/shadow`
审查基准分支：`codex/diy-cloud-ux-orchestration`
对比基准：`main`
审查方式：静态源码审查、分支差异审查、关键路径威胁建模。未进行动态 PoC、未连接真实数据库、Kubernetes、MinIO、Stripe 或 LLM provider。

---

## 0. 总结

`codex/diy-cloud-ux-orchestration` 分支相对 `main` 仅 ahead 1 个提交，但新增了较大的 DIY Cloud 生成与编排面：`DiyCloudService`、前端 DIY Cloud 页面、插件库/模板库生成、Cloud deployment processor 改动、Cloud SaaS handler 增量、插件 env 去重逻辑和部署 runtime 逻辑。

该分支继承了 main 分支已有的核心问题：多租户资源级授权缺失、PAT scope 不执行、对象存储公开读、搜索越权、wallet/topup 资金接口、rental usage 越权、OAuth 资源级权限缺失、JWT token 类型不隔离等。新增 DIY Cloud 功能进一步扩大了风险面：AI 生成配置、模板/插件组合、用户提交 envVars、前端生成 deployment configSnapshot、BYOK kubeconfig、provider profile 外连测试、K8s sidecar/env/NetworkPolicy 组合，都必须纳入统一安全边界。

本文件按模块重组问题、提出分层修复任务，并给出一个系统化方案：让后续新增功能必须显式声明 actor、resource、action、scope、dataClass，并由 service 层强制授权，CI 自动拦截裸 route、handler 直连 DAO、资金绕过 Ledger、Cloud/Media/AI 越界等模式。

---

## 1. 分支差异审查结论

分支相对 `main` ahead 1 个提交，主要新增或修改：

```text
apps/server/src/services/diy-cloud.service.ts
apps/server/src/handlers/cloud-saas.handler.ts
apps/server/src/lib/cloud-deployment-processor.ts
apps/server/src/lib/cloud-shadow-target.ts
apps/web/src/pages/diy-cloud.tsx
apps/cloud/src/application/plugin-library.ts
apps/cloud/src/application/plugin-library.generated.ts
apps/cloud/src/application/template-library.ts
apps/cloud/src/application/template-library.generated.ts
apps/cloud/src/infra/env-vars.ts
apps/cloud/src/infra/agent-deployment.ts
apps/cloud/src/infra/security.ts
website/docs/*/platform/cloud*.md
```

核心变化是“用户自然语言 -> 服务端生成 Cloud template draft -> 前端调整/填写 key -> 创建 Cloud SaaS template -> 创建 deployment -> worker 部署到 K8s -> 跳转到 Shadow server/channel”。

这条链路新增的安全边界包括：

1. LLM 生成器输入与输出边界。
2. 插件/模板库搜索与 allowlist。
3. 用户提交 `previousConfig`、`envVars`、`configSnapshot` 的大小、结构、语义限制。
4. 前端对插件/密钥的跳过、裁剪、部署参数构造不能被信任。
5. 部署 runtime env、Secret、provider profile、official model proxy token 的生成和注入。
6. K8s Deployment 中 plugin sidecar/initContainer/envVars/volumes 的最小权限。
7. Deployment processor 的失败恢复、退款、取消、销毁与状态一致性。
8. BYOK kubeconfig、provider profile baseUrl、Cloud logs 的敏感信息处理。

---

## 2. 全局系统性根因

当前漏洞不是孤立 bug，而是架构性问题：

```text
认证存在，但授权不系统。
handler 可直接调用 service/DAO。
service 方法可在没有 actor 的情况下修改资源。
PAT/OAuth/agent/JWT actor 被折叠成普通 userId。
资金、文件、Cloud、AI、media 没有统一安全入口。
新增 route 没有强制声明数据分类和权限策略。
CI 没有检查“新增功能是否经过安全声明”。
```

因此修复不能只靠给单个 handler 加 `if`。应把安全能力平台化，做到：

```text
默认拒绝。
所有 route 必须声明 auth/resource/action/scope/dataClass。
所有敏感 service 方法必须接收 Actor。
所有 service 写操作必须调用 PolicyService。
所有资金变更必须走 LedgerService。
所有文件访问必须走 MediaAccessService。
所有 Cloud/AI runtime 生成必须走 CloudSecurityService / AiGenerationSecurityService。
所有 token 必须有 typ/aud/exp/jti/scope/revocation。
CI 禁止裸 route、handler 直连 DAO、无 actor 写 service、资金绕过 ledger。
```

---

## 3. 模块 1：认证、JWT、PAT、OAuth

### 3.1 已有问题

#### AUTH-01：JWT access/refresh/agent token 类型未隔离

`signAccessToken`、`signRefreshToken`、`signAgentToken` 使用同一 `JWT_SECRET`，payload 没有 `typ/aud/jti`。`refresh()` 只调用 `verifyToken()`，没有强制 `typ=refresh`。
影响：access token 可能被当 refresh token 使用；agent token 与用户 token 边界弱。

证据路径：

```text
apps/server/src/lib/jwt.ts
apps/server/src/services/auth.service.ts
apps/server/src/services/agent.service.ts
```

修复任务：

```md
- [x] access/refresh/agent 分别带 typ/aud/iss/jti
- [x] refresh endpoint 强制 typ=refresh
- [ ] refresh token 只保存 hash/jti，支持轮换、吊销、重放检测
- [x] agent token 只保存 hash，不保存明文 lastToken
- [ ] agent token 默认有效期降低，支持撤销
```

#### AUTH-02：PAT scope 创建但不执行

PAT token 创建时保存 scope，但 PAT middleware 只设置 `{ userId }`，没有把 scope 写入 actor，也没有 route enforcement。

证据路径：

```text
apps/server/src/handlers/api-token.handler.ts
apps/server/src/validators/api-token.schema.ts
apps/server/src/middleware/auth.middleware.ts
```

修复任务：

```md
- [x] PAT actor 增加 tokenId/scopes/expiresAt
- [ ] route 声明 requiredScopes
- [x] 默认 user:read 只能访问只读用户资料
- [ ] 写操作必须明确 write/manage scope
```

#### AUTH-03：OAuth scope 不等于资源权限

OAuth middleware 只校验 token 和 scope；OAuthService 中读取/写入 server/channel/message/workspace/buddy 时缺少 token.userId 对目标资源的成员/角色/所有权校验。

证据路径：

```text
apps/server/src/middleware/oauth-auth.middleware.ts
apps/server/src/services/oauth.service.ts
apps/server/src/handlers/oauth.handler.ts
```

修复任务：

```md
- [x] OAuth API 必须同时满足 scope + resource access
- [x] messages:read 必须校验 channel read 权限
- [x] servers:write 必须校验 server admin/owner
- [x] buddies:manage 必须校验 token.appId 对 buddy 的 ownership
- [x] workspace access 必须校验 workspace.serverId membership
```

### 3.2 系统方案

新增统一 `Actor`：

```ts
type Actor =
  | { kind: 'user'; userId: string; isAdmin: boolean; authMethod: 'jwt' }
  | { kind: 'pat'; userId: string; tokenId: string; scopes: string[] }
  | { kind: 'oauth'; userId: string; appId: string; tokenId: string; scopes: string[] }
  | { kind: 'agent'; userId: string; agentId: string; ownerId: string; scopes: string[] }
  | { kind: 'system'; service: string; capabilities: string[] }
```

所有敏感 service 方法改为：

```ts
serverService.update(actor, serverId, input)
channelService.delete(actor, channelId)
messageService.send(actor, channelId, input)
walletLedger.credit(actor, ...)
cloudSecurity.createDeployment(actor, ...)
```

---

## 4. 模块 2：Server / Channel / 多租户权限

### 4.1 已有问题

#### TENANT-01：任意登录用户可修改任意 server

`PATCH /api/servers/:id` 只做登录校验，`ServerService.update(id, input, _userId)` 未使用 `_userId`。schema 允许改 `homepageHtml`、`isPublic`、slug、banner 等关键字段。

证据路径：

```text
apps/server/src/handlers/server.handler.ts
apps/server/src/services/server.service.ts
apps/server/src/validators/server.schema.ts
```

#### TENANT-02：channel 管理接口缺少角色校验

创建/更新/删除/归档/成员移除/positions 更新等操作只需要登录，service 层不兜底。

证据路径：

```text
apps/server/src/handlers/channel.handler.ts
apps/server/src/services/channel.service.ts
```

#### TENANT-03：server metadata/member list 信息泄露

`GET /api/servers/:id`、成员列表、channel 详情等对登录用户过宽，未统一要求 server member 或 public 数据裁剪。

### 4.2 修复任务

```md
- [x] ServerService 所有写方法接收 actor 并 require server.manage
- [x] ChannelService 所有写方法接收 actor 并 require channel.manage
- [x] GET server/private channel/member list 按 dataClass 裁剪
- [x] public server 只返回 public-safe fields
- [ ] service 层禁止无 actor 更新 server/channel
```

---

## 5. 模块 3：Message / DM / Search / WebSocket

### 5.1 高危问题

#### MSG-01：全局消息搜索越权

`/api/search/messages` 只有传入 `channelId` 时检查 channel access；不传 `channelId` 即全局搜索。`serverId` 参数在 DAO 层未实际过滤。
影响：任意登录用户按关键词搜索全站消息。

证据路径：

```text
apps/server/src/handlers/search.handler.ts
apps/server/src/services/search.service.ts
apps/server/src/dao/message.dao.ts
```

修复任务：

```md
- [x] 搜索前计算 actor 可访问 channelIds
- [x] 无 channelId 时强制 channelId IN accessibleChannelIds
- [x] 有 serverId 时先校验 server membership，再过滤该 server 内可访问 channel
- [x] DAO 层不允许无 accessibleChannelIds 搜索 channel-private data
```

#### MSG-02：DM channel 可任意创建到任意 UUID

`POST /api/dm/channels` 只要求 target userId 是 UUID，没有验证用户存在、好友关系、block/privacy policy。

证据路径：

```text
apps/server/src/handlers/dm.handler.ts
apps/server/src/services/dm.service.ts
```

#### MSG-03：WebSocket typing 可伪造 room 状态

join/send 有权限校验，但 typing 类事件若不复用 channel/DM participant 检查，可向任意 room 伪造状态。

证据路径：

```text
apps/server/src/ws/chat.gateway.ts
```

---

## 6. 模块 4：Media / Object Storage / Workspace

### 6.1 高危问题

#### MEDIA-01：MinIO bucket public read + 应用公开代理

`MediaService` 设置 bucket public read。`app.ts` 公开 `/shadow/uploads/...`。`nginx.conf` 又把 `/shadow/` 直接代理到 MinIO，绕过应用层鉴权。

证据路径：

```text
apps/server/src/services/media.service.ts
apps/server/src/app.ts
apps/web/nginx.conf
```

修复任务：

```md
- [x] 删除 bucket public read policy
- [x] 删除 nginx /shadow/ 直连 MinIO
- [ ] 所有 media download 走 MediaAccessService
- [ ] contentRef 绑定 owner/resource/visibility/contentType/sha256
- [x] HTML/SVG/XML 主动内容默认 attachment 或隔离域
```

#### MEDIA-02：Workspace 写权限过宽

workspace 多数操作只要求 server member，缺少 workspace:write/admin 分级。

证据路径：

```text
apps/server/src/handlers/workspace.handler.ts
```

---

## 7. 模块 5：Wallet / Recharge / Task Rewards

### 7.1 高危问题

#### WALLET-01：普通用户可 `/wallet/topup`

商城 handler 中 `/wallet/topup` 登录后直接调用 `walletService.topUp`，schema 允许一次加 1 到 1,000,000 虾币。

证据路径：

```text
apps/server/src/handlers/shop.handler.ts
apps/server/src/validators/shop.schema.ts
apps/server/src/services/wallet.service.ts
```

修复任务：

```md
- [x] 删除普通用户 /wallet/topup
- [ ] credit 只能由 Stripe webhook / admin dev grant / refund / settlement 执行
- [ ] 所有 wallet balance mutation 走 LedgerService
```

#### WALLET-02：Stripe webhook 幂等与事务问题

Webhook secret 可空；payment succeeded 处理不是“状态更新 + 钱包入账 + transaction”同一事务，存在并发重复入账窗口。

证据路径：

```text
apps/server/src/lib/stripe.ts
apps/server/src/handlers/stripe-webhook.handler.ts
apps/server/src/services/recharge.service.ts
apps/server/src/dao/recharge.dao.ts
```

#### WALLET-03：任务奖励发放非事务，NULL unique 不能防重复

`TaskCenterService.grantReward()` 先查 reward log，再 insert log，再 wallet credit，再 addTransaction，非事务。`user_reward_unique(userId,rewardKey,referenceId)` 中 `referenceId` nullable，Postgres unique index 允许多个 NULL，`welcome_signup` / `referenceId=null` 可能重复奖励。

证据路径：

```text
apps/server/src/services/task-center.service.ts
apps/server/src/dao/task-center.dao.ts
apps/server/src/db/schema/task-center.ts
```

修复任务：

```md
- [ ] rewardKey/referenceId 使用 normalized referenceKey，不允许 NULL 参与唯一键
- [ ] reward log + wallet credit + transaction 放入一个 DB transaction
- [ ] reward grant 走 LedgerService
- [ ] 并发 claim 做唯一约束 + 条件写
```

---

## 8. 模块 6：Marketplace / Orders / Product / SKU / Entitlement / Review

### 8.1 高危问题

#### SHOP-01：跨 shop/product/SKU 下单与 entitlement 污染

`/servers/:serverId/shop/cart` 和 `/orders` 使用 route 的 shopId，但 `productId` 没有校验属于该 shop。`CartService.addToCart()` 只校验 product active、sku active，不校验 product.shopId、sku.productId。`OrderService.createOrder()` 也不校验 product.shopId == shopId 或 sku.productId == product.id。订单 entitlement 按 route shop 的 serverId 发放，可能买 A 店商品却获得 B 店/server 权益。

证据路径：

```text
apps/server/src/handlers/shop.handler.ts
apps/server/src/services/cart.service.ts
apps/server/src/services/order.service.ts
apps/server/src/services/entitlement.service.ts
apps/server/src/dao/product.dao.ts
```

修复任务：

```md
- [x] addToCart 校验 product.shopId === shopId
- [x] addToCart 校验 sku.productId === productId
- [x] createOrder 校验所有 items 属于目标 shop
- [ ] entitlementConfig.targetId 必须属于 shop.serverId
- [x] review productId 必须属于 order item
```

#### SHOP-02：订单创建非事务，库存扣减结果未检查

`createOrder()` 创建 order/items -> debit wallet -> mark paid -> decrement stock；这些操作不是事务。`decrementSkuStock()` 若库存不足返回 null，但 `OrderService` 未检查结果。
影响：已扣款/已 paid 但库存扣减失败；并发超卖；权益已发放但库存或付款状态不一致。

证据路径：

```text
apps/server/src/services/order.service.ts
apps/server/src/dao/product.dao.ts
```

修复任务：

```md
- [x] createOrder 全流程放入 DB transaction
- [x] 库存扣减使用 UPDATE ... WHERE stock >= qty 并检查 affected row
- [x] 先锁定/扣库存，再扣款，再创建 paid order，失败回滚
- [ ] entitlement grant 也在事务内或通过 outbox 幂等执行
```

#### SHOP-03：订单详情缺少访问控制

`GET /servers/:serverId/shop/orders/:orderId` 直接返回 order detail，没有检查 buyer 或 shop admin，也未校验 order.shopId 属于 route serverId。

证据路径：

```text
apps/server/src/handlers/shop.handler.ts
apps/server/src/services/order.service.ts
```

#### SHOP-04：Review 可用任意 productId 写评价

`ReviewService.createReview()` 校验 order 属于用户和状态，但没有校验 `productId` 是该订单中的 item。攻击者可借一个已完成订单给任意商品刷评价。

证据路径：

```text
apps/server/src/services/review.service.ts
apps/server/src/dao/review.dao.ts
```

---

## 9. 模块 7：Rental / Agent / Buddy / Policy

### 9.1 高危问题

#### RENTAL-01：任意登录用户可伪造 usage 扣租客钱

`POST /marketplace/contracts/:contractId/usage` 只要求登录，直接调用 `rentalService.recordUsage()`。service 只校验 contract active，然后扣 tenant 钱、给 owner 结算。

证据路径：

```text
apps/server/src/handlers/rental.handler.ts
apps/server/src/services/rental.service.ts
```

修复任务：

```md
- [x] usage 只能由 system billing worker 或绑定 agent token 调用
- [x] actor 必须具备 rental:usage:write
- [x] 校验 agentId 与 contract.listing.agentId 绑定
- [x] 使用 usageEventId 幂等
```

#### AGENT-01：listing 创建未验证 agentId 属于 owner

`RentalService.createListing(ownerId, data)` 直接保存传入 `agentId`，未校验 agent.ownerId == ownerId。攻击者可给他人的 agent 创建挂单。

证据路径：

```text
apps/server/src/handlers/rental.handler.ts
apps/server/src/services/rental.service.ts
```

#### AGENT-02：policy 删除未校验 policy 属于路径 agent

handler 验证路径 `:id` agent 属于用户，然后调用 `agentPolicyService.deletePolicy(policyId)`。`deletePolicy()` 只按 policyId 删除，不校验该 policy 属于路径 agentId。

证据路径：

```text
apps/server/src/handlers/agent.handler.ts
apps/server/src/services/agent-policy.service.ts
```

修复任务：

```md
- [x] deletePolicy(actor, agentId, policyId) 校验 policy.agentId === agentId
- [x] upsertPolicies 校验 agent/bot 已加入 target server/channel
- [x] agent policy config 做 schema validation，不接受任意 JSON
```

#### AGENT-03：agent token 明文保存

`AgentService.generateToken()` 把 token 明文放入 `agent.config.lastToken`。

证据路径：

```text
apps/server/src/services/agent.service.ts
```

---

## 10. 模块 8：Cloud / DIY Cloud / Play / Kubernetes

### 10.1 分支新增风险

#### DIY-01：DIY Cloud 生成器允许任意登录用户消耗服务端 LLM 预算

`DiyCloudService` 使用服务端环境变量 `SHADOW_DIY_CLOUD_GENERATOR_API_KEY` / model proxy upstream key 调用外部 chat completions。前端直接调用 `/api/cloud-saas/diy/generate` 生成 draft。若生成端点只做登录 + 普通 rate limit，任何登录用户都可以消耗服务端 LLM 预算。

证据路径：

```text
apps/server/src/services/diy-cloud.service.ts
apps/server/src/handlers/cloud-saas.handler.ts
apps/web/src/pages/diy-cloud.tsx
```

修复任务：

```md
- [x] DIY generate 要求 cloud:diy_generate capability 或 membership
- [ ] 增加用户每日/月度预算和并发限制
- [x] prompt/feedback/previousConfig token 估算与硬限制
- [x] 失败/重试也计入预算
- [x] 所有 LLM 调用写 audit log
```

#### DIY-02：`previousConfig` 未显式限深/限大小，可导致 LLM prompt 放大或 DoS

`diyCloudGenerateSchema` 限制 `prompt` 和 `feedback`，但 `previousConfig: z.record(z.unknown()).optional()` 没有深度、键数量、总字符长度限制。`DiyCloudService` 会把 previousConfig 放进 LLM payload。全局 body limit 是 50MB，足以造成高成本 LLM payload 或内存/CPU 压力。

证据路径：

```text
apps/server/src/handlers/cloud-saas.handler.ts
apps/server/src/services/diy-cloud.service.ts
apps/server/src/app.ts
```

修复任务：

```md
- [x] previousConfig 最大 64KB
- [x] JSON depth 最大 8
- [x] object keys 最大 512
- [x] array items 最大 128
- [x] LLM payload 前进行 token estimate，超限拒绝
```

#### DIY-03：前端构造 deployment configSnapshot，服务端必须不信任

前端保存 draft template，然后生成 namespace、裁剪 skipped plugins、构造 `configSnapshot`、收集 `envVars`，再 POST `/api/cloud-saas/deployments`。这些操作都在客户端完成，不能作为安全依据。

证据路径：

```text
apps/web/src/pages/diy-cloud.tsx
```

修复任务：

```md
- [x] 服务端重新读取 templateSlug 对应模板，不信任客户端 configSnapshot
- [ ] skippedPlugins 只作为用户偏好，服务端重新裁剪并验证依赖
- [x] envVars 只能匹配模板 requiredKeys/refPolicy
- [x] deployment namespace 服务端严格校验 DNS label allowlist
- [ ] deploy 前生成 signedReviewToken，确认 draft 未被客户端篡改
```

#### DIY-04：AI 生成 template 需要二次安全验证

`DiyCloudService` 会调用插件库/模板库搜索，使用 LLM 选择 pluginIds、channels、systemPrompt、guidebook、requiredKeys，并生成 template。即使使用官方 plugin library，模型输出仍不可信，必须二次校验。

证据路径：

```text
apps/server/src/services/diy-cloud.service.ts
apps/cloud/src/application/plugin-library.ts
apps/cloud/src/application/template-library.ts
```

修复任务：

```md
- [x] 生成结果只允许官方 plugin id allowlist
- [x] 禁止 template 设置 networking.unrestricted，除非管理员审批
- [x] 禁止生成 privileged/securityContext/hostPath/hostNetwork 等 K8s 权限字段
- [ ] 禁止生成未声明 requiredKey 的 secret/env 引用
- [x] 系统 prompt 不能包含用户 secret 或 server token
- [x] template 通过 CloudTemplatePolicy.validateGeneratedTemplate()
```

#### DIY-05：env var 去重允许后值覆盖前值，必须保护 reserved env

`dedupeEnvVars()` 明确“runtime plugins are allowed to override base environment variables, keep later value”。这解决 K8s 重名 env 拒绝问题，但若 plugin-contributed env 可覆盖 `SHADOW_SERVER_URL`、`SHADOW_USER_TOKEN`、`OPENAI_COMPATIBLE_API_KEY`、`KUBECONFIG` 等保留名，会造成运行时劫持。

证据路径：

```text
apps/cloud/src/infra/env-vars.ts
apps/cloud/src/infra/agent-deployment.ts
```

修复任务：

```md
- [x] 定义 RESERVED_RUNTIME_ENV_KEYS
- [x] plugin env 不得覆盖 reserved env
- [x] 用户 env 不得覆盖 system env
- [ ] provider env 与 model proxy env 分域，例如 USER_* / SYSTEM_*
- [x] 冲突时拒绝部署，而不是静默覆盖
```

#### DIY-06：plugin sidecar/initContainer/volumes/env 需要策略约束

`createAgentDeployment()` 收集 pluginArtifacts，包括 initContainers、sidecars、volumes、volumeMounts、envVars、labels、annotations，并写入 K8s Deployment。虽然 container securityContext 有最小权限，但 plugin artifact 本身仍可扩大攻击面。

证据路径：

```text
apps/cloud/src/infra/agent-deployment.ts
apps/cloud/src/infra/security.ts
```

修复任务：

```md
- [ ] plugin manifest 必须声明 sidecar/initContainer 权限级别
- [x] 禁止 hostPath、privileged、hostNetwork、hostPID、hostIPC
- [ ] sidecar image 必须来自 allowlist registry 或 digest-pinned
- [ ] initContainer 不允许挂载 secret 全量目录，除非审批
- [ ] plugin artifacts 进入 K8s 前做 PolicyService 校验
```

#### DIY-07：NetworkPolicy 可被 template 置为 unrestricted

`buildNetworkPolicy()` 支持 `networking.type === 'unrestricted'` 时允许所有 egress，仅限制 ingress health port。生成模板或用户模板如果可设置该字段，可能绕过默认出站限制。

证据路径：

```text
apps/cloud/src/infra/security.ts
```

修复任务：

```md
- [x] 默认 limited，不允许用户/AI 设置 unrestricted
- [ ] unrestricted 仅 admin-approved template 可用
- [ ] allowedHosts 不应只是 annotation，应转成可执行的 egress policy 或不展示为安全能力
- [ ] 限制 169.254.169.254、cluster service CIDR、private CIDR 出站
```

#### DIY-08：Deployment processor 失败恢复可能把失败部署标记为 deployed

`processDeployment()` 在 Pulumi 失败后，如果探测到 namespace 中存在 Running openclaw pod，会 markDeployed。该设计可用于灾难恢复，但也可能把部分失败、不完整、错误配置的部署标记为成功。

证据路径：

```text
apps/server/src/lib/cloud-deployment-processor.ts
```

修复任务：

```md
- [x] 自动恢复 markDeployed 仅限显式 RECOVERY_MODE 或 admin-approved
- [ ] 检查所有 expected agents/secret/configmap/provisionState/channel binding 完整
- [ ] pod running 不等于业务 ready
- [ ] 恢复路径写高危 audit log
```

#### DIY-09：provisionState 持久化进 configSnapshot，需要防止 token/secret 落库

processor 在部署时将 provisionState 写回 deployment.configSnapshot。该状态必须被视为敏感数据，不能包含 bearer token、agent token、provider key、kubeconfig 等明文。

证据路径：

```text
apps/server/src/lib/cloud-deployment-processor.ts
```

修复任务：

```md
- [ ] provisionState schema 明确禁止 secret/token
- [x] 写入 DB 前 secret scanner
- [ ] configSnapshot 中 sensitive 部分单独加密
- [ ] 日志输出禁止打印 provisionState
```

#### CLOUD-01：`/api/cloud/deploy` 绕过 membership capability

旧 Cloud API 中 `/api/cloud/deploy` 只要求登录，没有像 Play cloud deploy 那样要求 `cloud:deploy` membership。

证据路径：

```text
apps/server/src/handlers/cloud.handler.ts
apps/server/src/services/cloud.service.ts
apps/server/src/services/play-launch.service.ts
```

#### CLOUD-02：Provider profile 外连测试存在 SSRF 面

Cloud SaaS handler 中 provider profile baseUrl 只校验 http/https，`testProviderConnection()` / `discoverProviderProfileModels()` 会携带 API key 请求 `${baseUrl}/models` 或 `/chat/completions`。如果用户可配置 baseUrl，需防止内网/metadata/loopback SSRF 和凭据泄露。

证据路径：

```text
apps/server/src/handlers/cloud-saas.handler.ts
```

修复任务：

```md
- [x] provider baseUrl 禁止 localhost、loopback、private CIDR、link-local、metadata IP
- [x] DNS 解析后校验 A/AAAA
- [x] 禁止重定向到私网
- [x] 连接测试不返回完整 response body
- [x] API key 不通过 query string，Google 特例也要避免日志泄露
```

#### CLOUD-03：一键部署注入完整用户 token

PlayLaunchService 会从请求 Authorization 提取完整 Bearer token 并写 `SHADOW_USER_TOKEN`。该问题在 DIY Cloud 扩展下更严重，因为 workload 可来自生成模板/插件组合。

证据路径：

```text
apps/server/src/services/play-launch.service.ts
apps/server/src/lib/model-proxy-config.ts
```

修复任务：

```md
- [x] 删除 SHADOW_USER_TOKEN 注入
- [ ] 改发 short-lived runtime token
- [ ] runtime token 绑定 deploymentId/namespace/aud/exp/jti
- [ ] runtime token 只允许 provision/model_proxy 最小动作
```

---

## 11. 模块 9：AI / Model Proxy / Voice Enhance

### 11.1 Voice Enhance 高危问题

#### AI-01：普通用户可改全局 Voice Enhance provider/API key/baseUrl

`POST /api/voice/config` 只要求 authMiddleware，源码仍标注 `TODO: Add admin check`。`VoiceEnhanceService.setConfig()` 会更新全局内存配置。普通用户可把 API key/baseUrl/model 改成自己的或恶意 endpoint。

证据路径：

```text
apps/server/src/handlers/voice-enhance.handler.ts
apps/server/src/services/voice-enhance.service.ts
```

修复任务：

```md
- [x] POST /api/voice/config 仅全局 admin 可用
- [x] baseUrl 做 SSRF 防护
- [ ] apiKey 加密存储，不保存在内存可被日志泄露
- [ ] 配置变更写 audit log
```

#### AI-02：Voice health endpoint 未认证且触发真实 LLM 调用

`GET /api/voice/health` 没有 authMiddleware，会调用 `healthCheck()`，后者调用 `enhance()` 触发真实 provider 请求。

证据路径：

```text
apps/server/src/handlers/voice-enhance.handler.ts
apps/server/src/services/voice-enhance.service.ts
```

修复任务：

```md
- [x] health endpoint 不调用真实 LLM
- [x] 或 health endpoint admin-only
- [ ] 增加 rate limit
```

### 11.2 Model Proxy

Model proxy 支持 `smp_` token 和普通 user JWT；billing/reserve/settle 逻辑已较完整，但仍需统一纳入 LedgerService 和 runtime token 模型。

证据路径：

```text
apps/server/src/services/model-proxy.service.ts
apps/server/src/lib/model-proxy-token.ts
```

修复任务：

```md
- [ ] model proxy token 加 jti/revocation
- [ ] 只允许 runtime token 或 user token 中具备 model_proxy:use
- [ ] 资金 reserve/settle 走统一 LedgerService
- [ ] 失败/stream cancel 计费逻辑做幂等
```

---

## 12. 模块 10：Discover / Public API / Profile / Friends / Notification

### 12.1 Discover public feed 泄露 active rental 信息

`/api/discover/feed` 是 public route，无 auth。它返回 active rental contractId、contractNo、startedAt/expiresAt、tenant profile、owner profile、agent 状态等。
影响：公开暴露谁正在租谁的 agent、租赁合同号、起止时间，属于隐私和商业数据泄露。

证据路径：

```text
apps/server/src/handlers/discover.handler.ts
```

修复任务：

```md
- [ ] Public Discover 不返回 active contractId/contractNo/tenantId
- [ ] 租赁只展示匿名聚合热度
- [ ] owner/tenant profile 仅在明确公开 consent 下返回
- [ ] active rental feed 改为 authenticated + party-only 或移除
```

### 12.2 Friend request 缺少限流/隐私策略

好友请求按 username 发送，未看到 per-user/IP rate limit、block list、隐私设置。可用于 username 枚举和骚扰。

证据路径：

```text
apps/server/src/handlers/friendship.handler.ts
apps/server/src/services/friendship.service.ts
```

修复任务：

```md
- [ ] friend request 加 rate limit
- [ ] 支持 block/privacy policy
- [ ] username 查询统一返回模糊错误，降低枚举
```

---

## 13. 模块 11：Admin / Config / Feature Flags

### 13.1 Admin 直连 DAO，缺少操作审计

Admin handler 大量直接调用 DAO 和 db，虽然有全局 isAdmin middleware，但缺少细粒度 audit、双人确认、敏感操作二次确认。

证据路径：

```text
apps/server/src/handlers/admin.handler.ts
```

修复任务：

```md
- [ ] admin 所有写操作写 audit log
- [ ] wallet grant、user delete、server delete、cloud template approve 需要 reason
- [ ] admin wallet grant 即使 ENABLE_DEV_TOPUP=1，也禁止 production
- [ ] admin handler 也走 secureRoute(dataClass=admin-only)
```

### 13.2 Public config/feature flags 需要数据分类

`/api/v1/config/:schemaName` 和 `/api/v1/config/flags` 是 public read。必须强制区分 public/internal/secret。

证据路径：

```text
apps/server/src/handlers/config.handler.ts
apps/server/src/handlers/feature-flags.handler.ts
```

---

## 14. 模块 12：Frontend / Nginx / Docker / Supply Chain

### 14.1 Web token localStorage

Web auth store 将 accessToken/refreshToken 存 localStorage。结合 homepageHtml、上传主动内容、app proxy 等 XSS 面，会扩大为账号接管。

证据路径：

```text
apps/web/src/stores/auth.store.ts
```

修复任务：

```md
- [ ] refresh token 改 HttpOnly Secure SameSite cookie
- [ ] access token 短 TTL，仅内存保存
- [x] 增加 CSP
```

### 14.2 Nginx 直连 MinIO

见 MEDIA-01，`/shadow/` 代理到 MinIO 绕过应用鉴权。

证据路径：

```text
apps/web/nginx.conf
```

### 14.3 Server image root + kubectl/Pulumi

server Dockerfile runner 内安装 `kubectl` 和 Pulumi，并以 root 用户运行。对于承载 Cloud deploy processor 的服务，这是高价值攻击面。

证据路径：

```text
apps/server/Dockerfile
```

修复任务：

```md
- [x] server container 使用非 root 用户
- [ ] kubectl/Pulumi worker 与 API server 进程隔离
- [ ] worker 独立 service account / namespace / network policy
- [ ] KUBECONFIG 最小 RBAC
```

### 14.4 pnpm audit ignored CVE

`package.json` 配置了 `pnpm.auditConfig.ignoreCves`。需要 exception policy。

证据路径：

```text
package.json
```

---

## 15. 系统化安全方案

### 15.1 SecureRoute：所有 route 必须声明安全策略

替换裸 Hono route：

```ts
secureRoute.post({
  path: '/api/cloud-saas/diy/generate',
  auth: 'required',
  dataClass: 'ai-generated-config',
  resource: () => ({ type: 'cloud-diy-generator' }),
  action: 'generate',
  scopes: ['cloud:diy_generate'],
  rateLimit: 'ai-generation',
  budget: 'diy-cloud-generation',
  handler,
})
```

Public route 也必须声明：

```ts
secureRoute.get({
  path: '/api/discover/feed',
  auth: 'public',
  dataClass: 'public',
  publicFields: ['server.id', 'server.name', 'channel.id', 'channel.name'],
  handler,
})
```

CI 检查：

```bash
# fail if new raw routes are added
grep -R "new Hono" apps/server/src/handlers
grep -R "handler\.\(get\|post\|put\|patch\|delete\)" apps/server/src/handlers
```

豁免必须在 `security/route-exceptions.yml` 中登记。

### 15.2 PolicyService：统一资源授权

```ts
await policy.require(actor, { type: 'server', id: serverId }, 'manage')
await policy.require(actor, { type: 'channel', id: channelId }, 'write')
await policy.require(actor, { type: 'wallet', userId }, 'credit')
await policy.require(actor, { type: 'cloudDeployment', id }, 'deploy')
await policy.require(actor, { type: 'diyCloud' }, 'generate')
```

规则组合：

```text
allow = authentication valid
    && actor has capability/scope
    && actor has resource access
    && dataClass allows this actor
    && rate/budget/quota allows this action
```

### 15.3 Service 层兜底

所有敏感 service 方法必须接收 Actor：

```ts
class ServerService {
  async update(actor: Actor, serverId: string, input: UpdateServerInput) {
    await policy.require(actor, { type: 'server', id: serverId }, 'manage')
    return dao.update(serverId, input)
  }
}
```

禁止：

```ts
update(id, input, _userId)
delete(id)
recordUsage(contractId, data)
topUp(userId, amount)
createDeployment({ userId, ...input })
```

### 15.4 DAO 访问限制

```md
- [ ] handler 禁止 container.resolve('*Dao')
- [ ] handler 禁止直接 import ../dao/*
- [ ] handler 禁止直接 db.insert/update/delete/select 敏感表
- [ ] Admin 也不例外，必须通过 AdminService + audit
```

### 15.5 LedgerService：资金唯一入口

所有 wallet 变更通过 LedgerService：

```ts
ledger.post({
  actor,
  accountUserId,
  direction: 'credit' | 'debit',
  amount,
  reason,
  referenceType,
  referenceId,
  idempotencyKey,
})
```

规则：

```text
普通 user 永远不能 credit 自己。
Stripe webhook credit 必须 verified event + idempotency。
Task reward credit 必须 rewardKey/referenceKey 唯一。
Rental usage debit 必须 bound agent/system actor。
Order purchase debit + stock + entitlement 必须事务化。
```

### 15.6 MediaAccessService：对象访问唯一入口

```ts
mediaAccess.issueReadUrl(actor, contentRef)
mediaAccess.attachToMessage(actor, messageId, upload)
mediaAccess.attachToWorkspace(actor, workspaceNodeId, upload)
```

对象记录：

```ts
{
  id,
  contentRef,
  ownerUserId,
  resourceType,
  resourceId,
  visibility,
  contentType,
  sha256,
}
```

### 15.7 CloudSecurityService

Cloud/DIY/K8s 所有关键动作必须经过：

```ts
cloudSecurity.validateGeneratedTemplate(actor, draft)
cloudSecurity.validateDeploymentRequest(actor, input)
cloudSecurity.resolveRuntimeEnv(actor, deployment)
cloudSecurity.validatePluginArtifacts(template)
cloudSecurity.issueRuntimeToken(actor, deployment)
cloudSecurity.validateProviderBaseUrl(baseUrl)
```

必须覆盖：

```md
- template/plugin allowlist
- requiredKeys/refPolicy
- env var reserved key collision
- provider profile SSRF
- namespace/name DNS label
- cluster ownership
- cloud:deploy membership
- K8s RBAC/networking policy
- runtime token 最小权限
```

### 15.8 AiGenerationSecurityService

适用于 DIY Cloud 和 Voice Enhance：

```md
- [x] prompt/feedback/previousConfig token 和大小限制
- [x] per-user 预算
- [ ] 输出 schema validation
- [x] forbidden fields scanner
- [x] generated template policy validation
- [ ] provider baseUrl SSRF 防护
- [x] LLM request/response audit，不记录 secret
```

### 15.9 Data Classification

每个 route 标注数据分类：

```ts
type DataClass =
  | 'public'
  | 'authenticated-public'
  | 'user-private'
  | 'server-private'
  | 'channel-private'
  | 'dm-private'
  | 'financial'
  | 'secret'
  | 'admin-only'
  | 'ai-generated-config'
  | 'cloud-secret'
```

规则示例：

```text
channel-private 不能在无 channel access filter 的搜索中返回。
financial 只能 owner/admin/system 访问。
secret 不得直接返回，只能 masked。
public route 不能返回 user-private/server-private/financial/secret。
```

### 15.10 AuditService

所有敏感 allow/deny 都写审计：

```md
server.updated
channel.deleted
message.search.denied
wallet.credited
wallet.debited
stripe.webhook.processed
task.reward.granted
order.created
rental.usage.recorded
cloud.diy.generated
cloud.deployment.created
cloud.template.approved
cloud.provider.tested
media.private.downloaded
voice.config.updated
admin.wallet.granted
```

字段：

```ts
{
  requestId,
  actorKind,
  actorUserId,
  actorTokenId,
  resourceType,
  resourceId,
  action,
  decision,
  reason,
  ip,
  userAgent,
  createdAt,
}
```

---

## 16. 后续扩展防遗漏机制

### 16.1 PR 安全清单

每个新增功能 PR 必须包含：

```md
### Security checklist

- [ ] 是否新增 route / websocket event / worker job？
- [ ] auth 是 public / required / admin / system？
- [ ] Actor 类型是什么？
- [ ] Resource 类型是什么？
- [ ] Action 是 read/write/manage/delete/deploy/bill/generate？
- [ ] 需要哪些 scope/capability？
- [ ] 数据分类是什么？
- [ ] 是否涉及 financial/secret/cloud/media/oauth/AI？
- [ ] 是否有 rate limit / quota / budget？
- [ ] service 层是否强制 policy.require？
- [ ] 是否禁止 handler 直连 DAO？
- [ ] 是否有越权反例测试？
- [ ] 是否有 audit log？
```

### 16.2 CI Gate

必须失败的模式：

```md
- [ ] 新增裸 handler.get/post/put/patch/delete
- [ ] handler 中 container.resolve('*Dao')
- [ ] service 写方法没有 Actor 参数
- [x] walletDao.credit/debit/updateBalance 在 LedgerService 外被调用
- [ ] cloud deployment 接受客户端 configSnapshot 但未调用 CloudSecurityService
- [ ] public route 返回 financial/secret/channel-private/dm-private dataClass
- [ ] localStorage.setItem('*token*') 新增
- [ ] new fetch(userControlledBaseUrl) 未经过 SSRF guard
- [ ] pnpm audit ignoreCves 新增但无 exception
```

### 16.3 权限矩阵测试

每个模块必须至少覆盖：

```text
owner
admin
member
outsider
PAT read-only
PAT write
OAuth scoped + resource allowed
OAuth scoped + resource denied
agent bound
agent unbound
system with capability
system without capability
```

示例：DIY Cloud generate/deploy

```md
- [ ] visitor 无 cloud:diy_generate -> 403
- [ ] member 有预算 -> 200
- [ ] member previousConfig 超限 -> 413/400
- [ ] member 生成含 forbidden plugin -> server strips/rejects
- [ ] member 部署 client-tampered configSnapshot -> server rejects
- [ ] member envVars 含 reserved key -> reject
- [ ] non-owner clusterId -> 403
- [ ] provider baseUrl 指向 127.0.0.1 -> reject
```

---

## 17. 分阶段落地路线

### Phase 0：立即止血

```md
- [x] 删除普通用户 /wallet/topup
- [x] 修 /api/search/messages 全局泄露
- [x] rental usage 改 system/agent-only
- [x] Voice config 改 admin-only，health 不触发真实 LLM
- [x] 禁止 SHADOW_USER_TOKEN 注入 workload
- [x] 删除 nginx /shadow/ MinIO 直连
```

### Phase 1：高危权限修复

```md
- [x] server/channel service 层授权
- [x] OAuth 资源级授权
- [x] PAT scope enforcement
- [x] shop/order/product/SKU 归属校验
- [x] order 创建事务化
- [x] Stripe webhook 幂等事务
- [x] Task reward 事务化
```

### Phase 2：DIY Cloud / Cloud 安全边界

```md
- [x] DIY generate previousConfig 限制
- [x] DIY generate budget/quota 限制
- [ ] server-side template generation/review token
- [ ] CloudSecurityService.validateGeneratedTemplate
- [x] reserved env collision 防护
- [x] provider baseUrl SSRF guard
- [x] plugin artifacts 基础 policy validation
- [x] deployment processor recovery 改显式模式
```

### Phase 3：系统化平台

```md
- [x] ActorContext
- [x] PolicyService
- [ ] SecureRoute DSL
- [x] LedgerService
- [ ] MediaAccessService
- [ ] AuditService
- [ ] DataClass
- [x] CI security gates（基础门禁）
```

### Phase 4：防御纵深

```md
- [ ] Web token 从 localStorage 迁移
- [ ] KMS/Vault + key rotation
- [ ] server/worker 容器非 root + 分离
- [ ] CSP / sanitizer / iframe sandbox 收紧
- [ ] CVE exception policy
```

---

## 18. 结论

`codex/diy-cloud-ux-orchestration` 分支把 Shadow 的安全边界从“聊天/社群/钱包/Cloud”进一步扩展到了“AI 生成 Cloud 配置 + 插件/模板编排 + K8s 部署自动化”。这使安全架构必须升级：不能继续依赖 handler 中手写权限判断，也不能信任前端生成的 template/configSnapshot/envVars。

最终目标是：新增功能时，开发者必须声明 actor/resource/action/scope/dataClass；service 层必须兜底；资金、文件、Cloud、AI 都有专用安全服务；CI 自动阻断遗漏。这样才能让后续扩展功能时，安全不再依赖人工记忆，而是成为代码结构和发布流程的一部分。

---

## 19. 本次修复落地记录

本轮已完成 Phase 0 止血项，并补齐一批 Phase 1 / Phase 2 高危边界：

```md
- [x] JWT access/refresh/agent typ/aud/iss/jti 隔离，refresh 强制 typ=refresh
- [x] PAT actor 携带 tokenId/scopes/expiresAt，并执行基础 read/write scope enforcement
- [x] OAuth middleware 写入 oauth actor，OAuth 资源 API 同时校验 scope 与 server/channel/workspace/buddy ownership
- [x] agent token 改为 hash 存储，移除新发 token 的明文 lastToken
- [x] ActorContext 基础模型落地，覆盖 user / PAT / OAuth / agent / system actor
- [x] PolicyService 基础资源授权落地，集中封装 server member/role、channel read/manage、accessibleChannelIds
- [x] server/channel 写操作补 service 层授权，server/member/channel 读取做私有数据裁剪
- [x] message search 强制按 actor accessibleChannelIds 过滤，DAO 拒绝无访问集合的私有消息搜索
- [x] media bucket 不再 public read，web nginx 删除 /shadow/ 直连 MinIO，主动内容 attachment
- [x] 普通 /wallet/topup 阻断，测试余额改由测试 setup 直接种子
- [x] cart/order/review 增加 shop/product/SKU/order item 归属校验
- [x] order 创建事务化，库存与余额使用条件 UPDATE 防并发超卖/透支
- [x] rental usage 改为 agent token actor，并校验 listing.agentId 绑定
- [x] agent policy delete/upsert 增加 agent/server/channel membership 校验
- [x] DIY generate 增加 cloud:diy_generate capability 与 previousConfig JSON 大小/深度/键数/数组限制
- [x] Cloud SaaS deploy 服务端重读 template，拒绝客户端篡改 configSnapshot/envVars/reserved keys
- [x] provider profile baseUrl 增加 SSRF guard、禁止 query string API key、禁重定向、响应体脱敏
- [x] plugin env/volume/container 基础策略校验，reserved env 冲突拒绝部署
- [x] NetworkPolicy 不再允许用户/AI template 走 unrestricted 分支
- [x] deployment processor 自动 markDeployed 恢复改为显式 CLOUD_DEPLOYMENT_RECOVERY_MODE=1
- [x] provisionState 落库前 secret scanner；redeploy 清洗 legacy provisionState token/secret 字段
- [x] Voice config 改 admin-only + SSRF guard；health admin-only 且不触发真实 LLM
- [x] Play/Cloud SaaS workload 不再注入 SHADOW_USER_TOKEN
- [x] SSRF IP 分类使用第三方安全库 ipaddr.js，避免手写 IPv4/IPv6/特殊网段解析
- [x] 新增 pnpm check:security-pr，检查 verifyToken typ、wallet topup、MinIO public policy、nginx 直连、runtime token 注入、Cloud/AI guard、actor context
- [x] 新增 Semgrep 规则与 GitHub workflow security-static / security-audit 集成
- [x] AGENTS.md 与 PR template 已加入 actor/resource/action/scope/dataClass、安全反例测试、第三方安全库优先等工作流要求
```

过程中额外发现并处理：

```md
- [x] Play cloud launch 默认问候语在缺少 title 的测试/配置下会出现 undefined，已加 fallback
- [x] 旧测试依赖普通 /wallet/topup 造余额，已改为测试 setup 种子并保留 blocked endpoint 断言
- [x] 旧 redeploy 会复制历史 provisionState 中的 token，已在 redeploy 时递归清洗敏感键
- [x] OAuth open platform 原先 scope-only 资源 API 可越权读写 channel/workspace/buddy，已改为 PolicyService 兜底
```

新增/更新验证：

```md
- [x] apps/server/__tests__/security-hardening.test.ts 覆盖 JWT 类型隔离、JSON 限制、SSRF、cart/review/rental 越权反例
- [x] apps/server/__tests__/oauth-middleware.test.ts 覆盖 OAuth actor 写入
- [x] apps/server/__tests__/oauth-service.test.ts 覆盖 OAuth resource access、channel access filtering、buddy app ownership
- [x] apps/cloud/src/infra/env-vars.test.ts 覆盖 reserved/base env collision
- [x] apps/server/__tests__/play-launch-service.test.ts 覆盖不注入 SHADOW_USER_TOKEN 与 greeting fallback
- [x] pnpm check:security-pr 通过，作为 PR/workflow 持续门禁
- [x] 相关 shop/mobile/cloud-saas e2e 断言已同步普通 topup 禁用与 runtime secret 清洗
- [x] JWT_SECRET=test-secret pnpm --filter @shadowob/server test __tests__/shop-e2e.test.ts 通过真实 Postgres 路径验证
- [x] TypeScript SDK、Python SDK、website shop API docs 已同步普通 topup 禁用
```

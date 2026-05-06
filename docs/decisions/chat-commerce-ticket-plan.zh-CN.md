# 聊天商品卡片、个人店铺与 Entitlement 虚拟服务方案

状态：调研中  
最后更新：2026-05-06  
最终信源规则：本文的“已确认决策”只记录用户明确确认过的产品/技术决策；“调研发现”和“待确认方案”不等同于决策。

## 1. 用户原始诉求

2026-05-05，用户提出以下方向：

1. `apps/web` 里的聊天框能够发送商品卡片，通过卡片可以直接购买商品（增值服务），扩展 mention 和聊天区渲染。
2. 商品可以来自店铺，店铺分为服务器店铺（已实现）和个人店铺（未实现），需要在原来的基础上扩展个人店铺。
3. 店铺商品的订单流程目前只面向传统商品，现在暂时弱化，增加增值服务/订阅等虚拟服务，分发有时限可撤销的 Ticket。
4. 需要多轮沟通来制定技术/产品方案，并在 `docs` 里记录。用户决策需要理顺后忠实记录，作为最终信源，不得篡改。

## 2. 已确认决策

本节只记录用户明确确认的决策。原始诉求中的 Ticket 作为产品概念背景保留；第一轮决策已确认核心命名沿用 Entitlement。

| 日期 | 决策 | 备注 |
| --- | --- | --- |
| 2026-05-05 | 需要调研聊天商品卡片、个人店铺、虚拟服务/Ticket 方案，并通过多轮沟通收敛。 | 来源：用户原始诉求。 |
| 2026-05-05 | 商品卡片需要同时支持服务器频道和 DM。 | 第一轮决策。 |
| 2026-05-05 | 个人店铺需要在个人主页和共同服务器/聊天上下文中都可见。 | 第一轮决策；具体权限、屏蔽和合规规则待细化。 |
| 2026-05-05 | 商品卡片插入方式优先采用 Picker。 | 第一轮决策；不优先做 mention trigger。 |
| 2026-05-05 | 虚拟服务凭证沿用 Entitlement 命名，不把 Ticket 作为新的核心实体命名。 | 第一轮决策。 |
| 2026-05-05 | 订阅第一阶段需要支持自动续费。 | 第一轮决策；自动续费失败暂不重试，通知渠道和退款计算已在后续轮次确认。 |
| 2026-05-05 | 虚拟服务购买后立即发放 Entitlement。 | 第一轮决策；订单状态在第三轮确认为 `completed`。 |
| 2026-05-05 | DM 中不允许发送服务器店铺商品卡片。 | 第二轮决策；DM 仅允许个人店铺商品卡片。 |
| 2026-05-05 | 个人店铺仅登录用户可见。 | 第二轮决策。 |
| 2026-05-05 | 自动续费失败后到期不续，并发送通知。 | 第二轮决策。 |
| 2026-05-05 | 用户取消订阅后立即撤销 Entitlement，并按实际支付金额比例退款。 | 第二轮决策；比例口径在第三、四轮确认为自然日零点切分。 |
| 2026-05-05 | 除非不可抗力，否则商家不允许主动撤销 Entitlement。 | 第二轮决策；不可抗力流程在第三、四轮确认。 |
| 2026-05-05 | 虚拟服务购买后订单状态为 `completed`。 | 第三轮决策；用户原文为 `compeleted`，本文按现有订单状态枚举记为 `completed`。 |
| 2026-05-05 | 自动续费失败通知需要多渠道，并需要系统性设计 Push 服务。 | 第三轮决策。 |
| 2026-05-05 | 自动续费失败暂时不重试。 | 第三轮决策。 |
| 2026-05-05 | 取消订阅按自然日计算比例退款。 | 第三轮决策。 |
| 2026-05-05 | 退款基数需要扣除优惠券、平台补贴、余额赠送、手续费或税费等非实际可退部分。 | 第三轮决策；具体明细字段待设计。 |
| 2026-05-05 | 不可抗力撤销由商家申请，平台审核。 | 第三轮决策。 |
| 2026-05-05 | 不可抗力撤销的退款规则由平台裁定。 | 第三轮决策。 |
| 2026-05-05 | 多渠道通知第一阶段包含站内、Mobile Push、Web Push、邮件、短信、聊天系统消息，并统筹系统建设。 | 第四轮决策。 |
| 2026-05-05 | Push/通知能力作为全平台基础设施建设。 | 第四轮决策。 |
| 2026-05-05 | 用户可以配置通知偏好。 | 第四轮决策；强制通知范围待在基础设施方案中定义。 |
| 2026-05-05 | 自然日退款按零点切分。 | 第四轮决策。 |
| 2026-05-05 | 手续费和税费由发起方承担，或由过错方承担。 | 第四轮决策。 |
| 2026-05-05 | 不可抗力审核需要状态流。 | 第四轮决策；具体状态在方案中定义。 |
| 2026-05-05 | 不可抗力撤销先完成平台裁定，再撤销 Entitlement。 | 第四轮决策。 |
| 2026-05-06 | `channel_access`、`channel_speak`、`app_access` 属于此前设计，当前需要弱化，后续需要时再迭代。 | 第三期规划修正；第三期不把权限深接入作为重点。 |
| 2026-05-06 | 第三期重点是完善 Web 交互和 UI 设计，让整体体验更流畅易用；订阅运营、不可抗力审核、Push 完整投递等继续作为后续规划持续推进。 | 第三期规划修正。 |
| 2026-05-06 | “我的店铺”和“我的权益”应放在“我的设置”页里，不放在左下角主侧栏，避免堆积过多 Icon。 | 第三期 Web 信息架构决策。 |
| 2026-05-06 | 商品卡片购买或点击卡片后，应弹出确认窗口展示商品和权益信息，避免误操作。 | 第三期 Web 商品交互决策。 |
| 2026-05-06 | 聊天输入区里的工作区文件、商品、附件应折叠到一个小加号入口中。 | 第三期 Web Composer 交互决策。 |
| 2026-05-06 | 第四期 MVP 实验目标：通过虾 Cloud 部署“卖火柴的小女孩” Buddy；用户进入后 Buddy 推销火柴并发送商品卡片；用户购买后 Buddy 发送火柴动画 HTML；拥有权益的用户可以打开该 HTML，代表文件付费墙权益。 | 第四期原始诉求。 |
| 2026-05-06 | 第四期按新的 Offer 驱动思路重构：商品归属和聊天销售上下文分离，server 商品可以通过授权 Offer 被 Buddy 在 DM 中发送。 | 覆盖此前“DM 不允许发送服务器店铺商品”的阶段性限制；历史记录保留，后续以本决策为准。 |
| 2026-05-06 | `channel_access` / `channel_speak` / `app_access` 以及相关 channel/app 门禁类目属于废弃逻辑，当前没有实际起作用，可以系统清理并从虚拟权益主模型中删除。 | 第四期重构方向；后续权益改为资源型 Entitlement。 |
| 2026-05-06 | 虚拟权益不再写死为频道/应用门禁类目，调整为 `resourceType + resourceId + action/capability` 的通用资源授权模型。 | 第四期重构方向。 |

## 3. 调研范围

本轮调研覆盖：

- Web 聊天输入、mention、消息发送、聊天区渲染。
- Mobile 聊天输入、消息渲染、店铺页面。
- Server 消息、mention、互动消息、店铺、商品、订单、权益服务。
- 现有店铺/订单/权益数据库结构。
- 与安全、API/SDK、i18n、Web/Mobile 同步相关的项目约束。

## 4. 现状摘要

### 4.1 聊天与 mention

Web 侧聊天入口主要在：

- `apps/web/src/components/chat/message-input.tsx`
- `apps/web/src/components/chat/chat-area.tsx`
- `apps/web/src/components/chat/message-bubble.tsx`

当前 Web 聊天输入支持：

- 文本、文件附件、回复消息。
- `@` / `#` mention 自动补全。
- 通过 WebSocket `message:send` 或 REST `/api/channels/:channelId/messages` 发送消息。
- 消息 metadata 可携带 `mentions`，WebSocket helper 也已经支持透传 `metadata`。

当前 Web 聊天渲染支持：

- mention 高亮。
- 附件。
- 互动消息 `metadata.interactive`，类型包括 button/select/form/approval。
- 但没有商品卡片渲染器，也没有商品选择/插入 UI。

Server mention 主要在：

- `apps/server/src/services/mention.service.ts`
- `apps/server/src/validators/message.schema.ts`
- `packages/shared/src/types/message.types.ts`
- `packages/shared/src/utils/message-mentions.ts`

当前 mention 类型只有：

- `user`
- `buddy`
- `channel`
- `server`
- `here`
- `everyone`

当前 mention trigger 只有 `@` 和 `#`。商品、店铺、SKU、Entitlement 都还不是 mention/reference 类型。

### 4.2 Mobile 聊天

Mobile 消息渲染主要在：

- `apps/mobile/src/components/chat/message-bubble.tsx`
- `apps/mobile/src/types/message.ts`
- `apps/mobile/src/lib/socket.ts`

Mobile 渲染侧也支持 `metadata.interactive`，但 composer 目前更轻量，没有 Web 那套 mention 自动补全，也没有商品卡片插入能力。

项目规则要求新产品特性同时覆盖 Web 和 Mobile。因此聊天商品卡片不能只设计 Web，需要至少定义 Mobile 的渲染、购买入口和后续补齐范围。

### 4.3 DM 消息

DM 消息表已有 metadata 字段，但 Web DM 页面当前没有完整透传和渲染 metadata：

- `apps/web/src/pages/dm-chat.tsx`
- `apps/server/src/db/schema/dm-messages.ts`
- `apps/server/src/handlers/dm.handler.ts`

第一轮决策已确认商品卡片需要支持私聊/DM，因此需要额外补齐 DM 的 metadata 发送、接收和渲染链路。

### 4.4 店铺、商品与订单

当前店铺/商品/订单 schema 主要在：

- `apps/server/src/db/schema/shops.ts`

当前核心结构：

- `shops`：服务器店铺，一台服务器一个店铺，`serverId` 为必填且唯一。
- `products`：商品，当前类型为 `physical` 和 `entitlement`。
- `orders` / `orderItems`：传统订单模型，包含 shipping/tracking 等实体商品字段。
- `cartItems`：购物车。
- `entitlements`：权益发放，支持 `startsAt`、`expiresAt`、`isActive`，接近“有时限可撤销虚拟服务凭证”的能力，但目前强依赖 `serverId`。

当前服务层：

- `ShopService` 只支持 `getOrCreateShop(serverId, serverName)`。
- `ProductService` 支持实体商品和 entitlement 商品。
- `OrderService` 支持从购物车或直接购买创建订单、扣余额、扣库存、发 entitlement。
- `EntitlementService` / `EntitlementDao` 支持查询、检查、发放、撤销 entitlement。

### 4.5 Web 店铺

Web 店铺页面主要在：

- `apps/web/src/pages/shop.tsx`
- `apps/web/src/components/shop/shop-page.tsx`
- `apps/web/src/components/shop/product-detail.tsx`
- `apps/web/src/components/shop/shop-admin.tsx`

Web 已有服务器店铺浏览、购物车、下单、订单、收藏、后台商品管理等能力。商品表单中已有 `entitlement` 配置 UI，包括权益类型、目标资源、持续时间等。

注意：现有 Web 店铺里已有不少中文 UI 文案直接写在组件中。后续新增或改动 UI 文案必须走 i18n，不能继续扩大硬编码文案。

### 4.6 Mobile 店铺

Mobile 店铺主要在：

- `apps/mobile/app/(main)/servers/[serverSlug]/shop.tsx`
- `apps/mobile/app/(main)/servers/[serverSlug]/shop-admin.tsx`

Mobile 已有服务器店铺浏览、购物车、订单、收藏、结算入口。但 Mobile 店铺后台看起来落后于 Server/Web 当前模型，仍使用较旧的 `price`、`stock` 等字段形态，需要在后续方案中纳入同步。

### 4.7 安全与账务约束

项目规则要求：

- 钱包余额变动必须通过 `LedgerService`。
- 新 route / websocket event / worker job 必须明确 actor、resource、action、scope/capability、data class。
- API 变更需要同步 API 文档、TypeScript SDK、Python SDK。
- 新产品特性需要 Web 和 Mobile 同步。
- UI copy 必须走 i18n。
- 安全敏感变更需要运行 `pnpm check:security-pr`。

当前 `OrderService.createOrder` 内部存在直接更新钱包余额和插入 wallet transaction 的逻辑。新增虚拟服务购买流程不应继续复制这条路径，建议借新流程迁移或封装到 `LedgerService` 事务边界内。

## 5. 关键判断

### 5.1 商品卡片不宜只作为 mention 文本实现

商品卡片需要展示价格、图片、状态、购买按钮、服务期限、可撤销状态等结构化信息。仅用 mention 文本 token 无法稳定承载这些信息。

建议把能力拆成两层：

1. “引用/选择层”：在聊天输入中通过 picker 或快捷 trigger 搜索商品。
2. “消息内容层”：发送结构化 `metadata.commerceCards`，聊天区用专门卡片组件渲染。

这样可以保留消息历史里的商品快照，同时在用户点击购买时再向服务端校验实时价格、库存、权限和商品状态。

### 5.2 现有 interactive block 不适合作为购买协议

当前 `metadata.interactive` 更像通用互动消息，会将用户交互结果写回消息并可能触发 agent follow-up。购买商品涉及账务、订单、Entitlement 发放、幂等、防重复支付、退款/撤销，不应复用现有互动消息接口作为核心购买协议。

建议新增 commerce purchase API，聊天卡片按钮只作为入口。

### 5.3 个人店铺需要先泛化店铺归属

当前 `shops.serverId NOT NULL UNIQUE` 强绑定服务器店铺。个人店铺需要把 shop 归属抽象成 scope：

- `scopeKind = 'server' | 'user'`
- server shop 使用 `serverId`
- personal shop 使用 `ownerUserId`

这样商品、订单、Entitlement 可以继续挂在 `shopId` 下，避免复制一套个人商品表。

### 5.4 Entitlement 沿用为虚拟服务凭证

现有 `entitlements` 已有 `startsAt`、`expiresAt`、`isActive`、`type`、`targetId`，很接近有时限可撤销虚拟服务凭证。第一轮决策已确认沿用 Entitlement 命名，因此后续技术设计应优先扩展现有 entitlement 语义，而不是新增 Ticket 作为核心实体名。

后续需要把 Entitlement 从“服务器权限授予”扩展为“通用虚拟服务凭证”：

- 支持服务器权益、个人服务、订阅时长、一次性兑换、可撤销授权。
- 对已有服务器频道访问等能力，继续接入 entitlement/policy check。

## 6. 产品方案草案

以下方案已按已确认决策修订；未在“已确认决策”中出现的细节仍属于实现建议。

### 6.1 聊天商品卡片 MVP

第一阶段需要同时支持服务器频道和 DM 发送商品卡片：

- 商品来源：服务器店铺和个人店铺。
- 插入方式：聊天输入增加商品 picker。
- 消息存储：消息 metadata 增加 `commerceCards`。
- 渲染端：Web 和 Mobile 都渲染商品卡片。
- 购买按钮：点击后打开确认弹窗或底部 sheet，再调用服务端购买 API。
- 购买校验：服务端重新读取商品、SKU、价格、状态、权限，不信任消息快照。

建议第一阶段限制：

- 每条消息最多 1 到 3 张商品卡片。
- 不允许把不可见/未上架商品发到普通频道。
- 对接虚拟服务/Entitlement 优先，传统实体商品只保留跳转详情或普通下单。

由于 DM 也进入第一阶段，需要额外补齐：

- DM 仅允许发送个人店铺商品卡片，不允许发送服务器店铺商品卡片。
- DM 消息 metadata 的发送、接收和渲染。
- DM 中商品可见性校验，避免把服务器店铺商品或不可见个人店铺商品泄露到私聊。
- DM 卡片购买后的通知和订单入口。

### 6.2 店铺模型

建议新增统一店铺归属：

```ts
type ShopScope =
  | { kind: 'server'; serverId: string }
  | { kind: 'user'; userId: string };
```

服务端数据层可演进为：

- `shops.scopeKind`
- `shops.serverId` nullable
- `shops.ownerUserId` nullable
- server shop 唯一约束：`(scopeKind, serverId)`
- personal shop 唯一约束：`(scopeKind, ownerUserId)`

保留现有服务器店铺 API，同时新增 scope-neutral API，避免直接打断现有 Web/Mobile 页面。

个人店铺可见性第一轮已确认：

- 个人主页可见。
- 共同服务器/聊天上下文中可见。
- 仅登录用户可见。
- 仍需细化商品级可见性、拉黑/屏蔽、下架、封禁、未成年人/合规等规则。

### 6.3 商品类型

当前 `physical` / `entitlement` 可扩展为更清晰的虚拟服务模型。第一轮决策已确认沿用 Entitlement 命名，因此建议避免新增 `ticket` 作为核心商品类型。

候选方向：

- 保留 `entitlement` 商品类型。
- 在 `entitlementConfig` 或新的 `billingConfig` 中增加购买模式：一次性、固定时长、自动续费订阅。
- 前端按商品配置展示为增值服务、订阅或虚拟服务。
- 自动续费进入第一阶段范围。

### 6.4 Entitlement 模型

建议扩展 EntitlementService 和 entitlement 数据模型。最小新增/调整方向：

- `id`
- `shopId`
- `productId`
- `orderId`
- `ownerUserId`
- `issuerUserId`
- `scopeKind`
- `resourceType`
- `resourceId`
- `serviceKind`
- `startsAt`
- `expiresAt`
- `status = active | expired | revoked | renewal_failed`
- `revokedAt`
- `revokedBy`
- `renewalPolicy`
- `nextRenewalAt`
- `cancelAtPeriodEnd`
- `metadata`

购买成功后：

1. 创建订单或轻量 purchase record。
2. 通过 `LedgerService` 扣款。
3. 立即创建 Entitlement。
4. 对需要权限落地的 Entitlement，同步接入 policy check。
5. 消息卡片和订单页展示 Entitlement 状态。

撤销时：

1. Entitlement 状态改为 `revoked`。
2. 同步撤销对应策略授权。
3. 记录审计日志。
4. 根据退款策略决定是否走 `LedgerService.refund`。

撤销边界第二轮已确认：

- 用户取消订阅后立即撤销 Entitlement。
- 取消订阅需要按实际支付金额比例退款。
- 比例退款按自然日计算。
- 退款基数需要扣除优惠券、平台补贴、余额赠送、手续费或税费等非实际可退部分。
- 除非不可抗力，否则商家不允许主动撤销 Entitlement。
- 不可抗力撤销由商家申请，平台审核。
- 不可抗力撤销退款规则由平台裁定。
- 不可抗力场景的证据、审核状态、通知和平台裁定口径仍需细化。

### 6.5 订单流程弱化

针对虚拟服务，建议不复用完整实体订单状态流：

- 自动发放类：支付成功后立即发 Entitlement，订单状态进入 `completed`。
- 需要人工履约类：后续可引入 `service_order` 或 `fulfillment` 状态，但不放进第一阶段。
- 订阅类：第一阶段需要支持自动续费。

这样可以避免 shipping/tracking/review 等实体商品字段污染虚拟服务主路径。

自动续费需要补充：

- 续费 worker 或定时任务。
- 续费幂等键。
- 扣款失败后暂不重试，到期不续，并发送多渠道通知。
- 用户取消订阅后立即撤销 Entitlement，并按实际支付金额比例退款。
- 商家下架/封禁后的续费停止规则。
- 续费失败后的 Entitlement 状态变化。

续费失败通知需要系统性设计 Push 服务，不应只在订阅模块内写一次性通知逻辑。至少需要覆盖：

- 站内通知。
- Mobile Push。
- Web Push 或浏览器通知。
- 邮件或其他可配置外部渠道。
- 通知模板、用户偏好、失败重发、去重、审计和频控。

## 7. 技术方案草案

### 7.1 Message metadata

候选 metadata：

```ts
type CommerceCardMessageMetadata = {
  commerceCards?: Array<{
    id: string;
    kind: 'product';
    shopId: string;
    shopScope: { kind: 'server' | 'user'; id: string };
    productId: string;
    skuId?: string;
    snapshot: {
      name: string;
      summary?: string;
      imageUrl?: string;
      price: number;
      currency: string;
      productType: 'physical' | 'entitlement';
      billingMode?: 'one_time' | 'fixed_duration' | 'subscription';
      durationSeconds?: number;
    };
    purchase: {
      mode: 'direct' | 'select_sku' | 'open_detail';
    };
  }>;
};
```

服务端需要为 metadata 增加明确 schema、数量限制、字节限制和权限校验，不能只依赖 `.passthrough()`。

### 7.2 API 草案

保留现有：

- `GET /api/servers/:serverId/shop`
- `GET /api/servers/:serverId/shop/products`
- `POST /api/servers/:serverId/shop/orders`

新增候选：

- `GET /api/shops/:shopId`
- `GET /api/shops/:shopId/products`
- `POST /api/shops/:shopId/products/:productId/purchase`
- `POST /api/messages/:messageId/commerce-cards/:cardId/purchase`
- `GET /api/me/shop`
- `POST /api/me/shop/products`
- `GET /api/users/:userId/shop`
- `GET /api/entitlements`
- `POST /api/entitlements/:entitlementId/revoke`
- `POST /api/entitlements/:entitlementId/cancel-renewal`

具体 API 形态需要确认是否优先兼容现有 server shop route，还是直接引入统一 shop API。

### 7.3 Policy 与 actor 标注

新增能力必须明确：

| 场景 | Actor | Resource | Action | Data class |
| --- | --- | --- | --- | --- |
| 发送商品卡片 | user | channel/message/product | write/read | channel-private / server-private |
| 购买聊天卡片商品 | user | shop/product/order/entitlement/wallet | bill/write/generate | financial / server-private |
| 管理个人店铺 | user | shop/product | manage/write/delete | server-private |
| 管理服务器店铺 | user | server/shop/product | manage/write/delete | server-private |
| Entitlement 校验 | user/system | entitlement/resource | read | server-private |
| Entitlement 撤销 | user/system | entitlement | manage/delete | server-private |
| Entitlement 取消订阅 | user | entitlement/order/wallet | delete/bill | financial / server-private |
| Entitlement 自动续费 | system | entitlement/order/wallet | bill/write | financial / server-private |
| 续费失败通知 | system | notification/user/entitlement | write | server-private |
| 不可抗力撤销审核 | user/admin | entitlement/order/refund | manage/bill | financial / server-private |

购买类 API 必须：

- 使用 `LedgerService`。
- 使用幂等键防重复扣款。
- 校验商品实时状态和访问权限。
- 记录审计。
- 不暴露钱包充值/授信能力给普通用户。

### 7.4 SDK / Docs / i18n / 测试同步

如果进入实现阶段，需要同步：

- API 文档。
- TypeScript SDK。
- Python SDK。
- Web i18n。
- Mobile i18n。
- Web + Mobile 商品卡片渲染和购买体验。
- Server integration tests。
- EntitlementService / Shop scope / purchase flow / auto-renew unit tests。
- E2E 测试。
- 安全敏感变更运行 `pnpm check:security-pr`。

## 8. 第一轮决策记录

以下问题已于 2026-05-05 由用户确认：

1. 商品卡片第一阶段同时支持服务器频道和 DM。
2. 个人店铺在个人主页和共同服务器/聊天上下文中都可见。
3. 商品卡片插入方式优先做 Picker。
4. 虚拟服务凭证沿用 Entitlement 命名，不把 Ticket 作为新的核心实体命名。
5. 订阅第一阶段支持自动续费。
6. 虚拟服务购买后立即发放 Entitlement。

## 9. 第二轮决策记录

以下问题已于 2026-05-05 由用户确认：

1. DM 中不允许发送服务器店铺商品卡片，仅允许个人店铺商品卡片。
2. 个人店铺仅登录用户可见。
3. 自动续费失败后到期不续，并发送通知。
4. 用户取消订阅后立即撤销 Entitlement，并按比例退还实际支付金额。
5. 除非不可抗力，否则商家不允许主动撤销 Entitlement。

## 10. 第三轮决策记录

以下问题已于 2026-05-05 由用户确认：

1. 虚拟服务购买后订单状态为 `completed`。
2. 自动续费失败通知通过多渠道发送，并需要系统性设计 Push 服务。
3. 自动续费失败后暂时不重试。
4. 按比例退款按自然日计算。
5. “实际支付金额”需要扣除优惠券、平台补贴、余额赠送、手续费或税费等非实际可退部分。
6. 不可抗力撤销由商家申请，平台审核。
7. 不可抗力撤销时，退款规则由平台裁定。

## 11. 第四轮决策记录

以下问题已于 2026-05-05 由用户确认：

1. 多渠道通知第一阶段包含站内、Mobile Push、Web Push、邮件、短信、聊天系统消息，并统筹系统建设。
2. Push/通知能力作为全平台基础设施建设。
3. 用户可以配置通知偏好。
4. 退款按自然日零点切分。
5. 手续费和税费由发起方承担，或由过错方承担。
6. 不可抗力审核需要状态流。
7. 不可抗力撤销先完成平台裁定，再撤销 Entitlement。

## 12. 补充调研：通知基础设施现状

现有通知链路已经具备站内通知和实时推送基础：

- `apps/server/src/db/schema/notifications.ts` 已有 `notifications`、`notification_preferences`、`kind`、`metadata`、scope、aggregation 字段。
- `NotificationTriggerService` 已经作为通知触发入口，覆盖 mention、reply、DM、频道访问、服务器邀请、好友申请、充值成功等事件。
- `NotificationDeliveryService` 当前只通过 Socket.IO 向 `user:${userId}` 房间发送 `notification:new`。
- Web 设置页已有通知偏好 UI，并使用 i18n。
- Mobile 端已有本地通知能力，但缺少服务端 Push token 注册和离线 Push。
- 旧的 `docs/decisions/notification-system-refactor.zh-CN.md` 已提出 `user_push_tokens`、Expo Push、聚合、模板和 Push token 生命周期，但并未完整落地。

现有缺口：

- 没有 `user_push_tokens` / Web Push subscription 存储。
- 没有多渠道通知 outbox、投递状态、失败记录、去重和频控。
- 没有 Email/SMS 通用投递服务；邮件目前主要在登录验证码路径内。
- 没有订阅续费 worker、Entitlement 到期/取消/退款/不可抗力审核状态流。
- Mobile 通知设置页存在硬编码中文，后续改动需要补 i18n。

## 13. 第一期方案：基础设施优先

第一期目标是搭建坚实、安全、可靠的基础设施，使聊天商品卡片、个人店铺、自动续费 Entitlement 能在统一账务、统一授权、统一通知和统一审计上运行。第一期不追求完整商城体验的视觉打磨，优先解决会影响长期演进的底层问题。

### 13.1 第一期目标

1. 统一店铺归属：让服务器店铺和个人店铺共用 `shopId`、商品、订单、Entitlement 基础模型。
2. 统一虚拟服务购买：商品卡片购买后安全扣款、生成 `completed` 订单、立即发 Entitlement。
3. 统一 Entitlement 生命周期：支持到期、取消、自动续费、续费失败到期不续、按自然日退款、不可抗力审核。
4. 统一通知基础设施：全平台多渠道通知，覆盖站内、Mobile Push、Web Push、邮件、短信、聊天系统消息。
5. 统一消息商品卡片协议：频道和 DM 都能渲染商品卡片；DM 只允许个人店铺商品。
6. 统一安全边界：Actor/Policy、LedgerService、幂等、审计、metadata 限制、商品可见性校验全部先落地。

### 13.2 第一期非目标

- 不强化传统实体商品流程，不扩展物流、退货、评价。
- 不做复杂人工履约服务。
- 自动续费失败暂时不重试。
- 不允许 DM 发送服务器店铺商品。
- 不引入 Ticket 作为核心实体命名。
- 不绕过现有钱包安全边界，不新增普通用户充值/授信路径。

### 13.3 数据模型

#### Shop scope

扩展 `shops`：

- `scopeKind`: `server | user`
- `serverId`: nullable，用于服务器店铺。
- `ownerUserId`: nullable，用于个人店铺。
- `visibility`: 至少支持 `login_required`，个人店铺第一期仅登录用户可见。
- 保留现有 server shop route，新增 scope-neutral shop API。
- 迁移现有 `shops.serverId NOT NULL UNIQUE` 为兼容 server scope 的唯一约束。

建议唯一约束：

- server shop: `(scopeKind, serverId)`
- personal shop: `(scopeKind, ownerUserId)`

#### Product / billing

保留 `product.type = physical | entitlement`，第一期重点扩展 `entitlement`：

- `billingMode`: `one_time | fixed_duration | subscription`
- `durationSeconds` 或自然周期配置。
- `renewalPolicy`: 自动续费开关、续费金额、续费周期。
- `entitlementConfig` 保留现有权限类型，并允许个人服务资源。

商品卡片保存 snapshot，但购买时必须重新读取实时商品和价格。

#### Entitlement

扩展 `entitlements`，使其成为通用虚拟服务凭证：

- 解除对 `serverId NOT NULL` 的硬依赖，改为可选 server scope。
- 增加 `shopId`、`scopeKind`、`resourceType`、`resourceId`。
- 增加 `status`: `active | expired | cancelled | revoked | renewal_failed | pending_force_majeure_review`。
- 增加 `startsAt`、`expiresAt`、`nextRenewalAt`、`cancelledAt`、`revokedAt`。
- 增加 `cancelReason`、`revocationReason`、`metadata`。
- 增加 `renewalOrderId` 或续费记录关联。

生命周期规则：

- 购买成功：订单 `completed`，立即发 `active` Entitlement。
- 自动续费成功：延长 `expiresAt`，记录续费订单/交易。
- 自动续费失败：不重试，到期不续，并多渠道通知。
- 用户取消：立即撤销 Entitlement，按自然日零点切分计算未使用天数，按实际支付金额比例退款。
- 商家撤销：默认不允许；不可抗力时商家申请，平台审核和裁定完成后再撤销。

#### Refund / review

新增不可抗力审核记录，建议状态：

- `submitted`
- `under_review`
- `approved`
- `rejected`
- `refund_decided`
- `entitlement_revoked`
- `closed`

退款基数：

- 以实际支付金额为基数。
- 扣除优惠券、平台补贴、余额赠送、手续费、税费等非实际可退部分。
- 手续费/税费由发起方承担，或由过错方承担。
- 不可抗力退款由平台裁定。

#### Notification platform

扩展通知基础设施：

- `notification_events`: 规范化事件源，可重放、可审计。
- `notification_deliveries`: 每个渠道一条投递记录，记录状态、错误、重试、provider receipt。
- `user_push_tokens`: Mobile Push token，多设备。
- `user_web_push_subscriptions`: Web Push endpoint、keys、设备信息。
- `notification_channel_preferences`: 用户按通知类型和渠道配置偏好。
- `notification_templates`: 或共享模板定义，支持 i18n、多渠道文案。

强制发送建议：

- 财务、权益、退款、安全、不可抗力裁定类通知必须创建站内通知和审计记录。
- 外部渠道可以尊重用户偏好，但法律/账务必要通知应至少保留站内。

### 13.4 服务层

#### CommerceCardService

职责：

- 生成商品卡片 snapshot。
- 校验商品是否可被发送到目标 channel/DM。
- DM 中拒绝服务器店铺商品。
- 限制 metadata 数量、字节、嵌套深度。
- 在消息发送前把 `commerceCards` 规范化。

#### ShopScopeService

职责：

- 解析 server shop / personal shop。
- 校验登录用户是否可见个人店铺。
- 校验店铺所有者或服务器管理员的管理权限。
- 为商品搜索、Picker 和购买提供统一 shop scope。

#### EntitlementPurchaseService

职责：

- 接收购买请求和幂等键。
- 重新校验商品、价格、可见性、库存/订阅配置。
- 使用 `LedgerService` 完成扣款和退款。
- 创建 `completed` 订单。
- 立即发 Entitlement。
- 创建通知事件和审计事件。

该服务必须成为虚拟服务购买的唯一入口，避免在 handler、消息互动接口或旧订单服务里散落扣款逻辑。

#### EntitlementRenewalService

职责：

- 定时扫描到期前需要续费的 subscription Entitlement。
- 使用幂等键执行续费扣款。
- 成功则延长权益并创建续费订单。
- 失败则标记到期不续，并触发多渠道通知。
- 暂时不重试。

#### EntitlementCancellationService

职责：

- 用户取消订阅。
- 立即撤销 Entitlement。
- 按自然日零点切分计算剩余可退金额。
- 扣除不可退项目。
- 通过 `LedgerService.refund` 退款。
- 触发退款/撤销通知和审计。

#### NotificationPlatformService

职责：

- 保留 `NotificationTriggerService` 作为产品事件入口。
- 将站内通知、Socket.IO、Mobile Push、Web Push、Email、SMS、聊天系统消息拆成渠道适配器。
- 引入 outbox，确保“通知事件已记录”和“各渠道投递状态”可追踪。
- 支持用户偏好、强制通知、模板、去重、频控、失败记录。

### 13.5 API 草案

店铺：

- `GET /api/me/shop`
- `POST /api/me/shop`
- `GET /api/users/:userId/shop`
- `GET /api/shops/:shopId`
- `GET /api/shops/:shopId/products`
- `POST /api/shops/:shopId/products`

商品卡片：

- `GET /api/commerce/product-picker?target=channel|dm&channelId=&dmChannelId=`
- `POST /api/messages/:messageId/commerce-cards/:cardId/purchase`
- DM 消息发送 REST/WS 需要补齐 metadata。

Entitlement：

- `GET /api/entitlements`
- `POST /api/entitlements/:id/cancel-renewal`
- `POST /api/entitlements/:id/cancel`
- `POST /api/entitlements/:id/force-majeure-requests`
- `POST /api/entitlement-review/:requestId/decision`

通知：

- `POST /api/notifications/push-tokens`
- `DELETE /api/notifications/push-tokens/:id`
- `POST /api/notifications/web-push-subscriptions`
- `DELETE /api/notifications/web-push-subscriptions/:id`
- `GET /api/notifications/channel-preferences`
- `PATCH /api/notifications/channel-preferences`

API 变更必须同步 API 文档、TypeScript SDK、Python SDK。

### 13.6 Web / Mobile 第一阶段

Web：

- 聊天输入增加商品 Picker，不做快捷 trigger。
- 频道和 DM 消息气泡渲染商品卡片。
- 商品卡片点击购买时打开确认弹窗。
- DM Picker 只展示个人店铺商品。
- 设置页扩展通知渠道偏好。
- 所有新增 UI copy 必须走 i18n。

Mobile：

- 消息气泡渲染同结构商品卡片。
- 聊天输入或附件菜单增加商品 Picker。
- 购买确认使用底部 sheet。
- 注册 Mobile Push token。
- 通知设置页补 i18n，并扩展渠道偏好。

### 13.7 安全与一致性要求

- 所有购买、续费、取消、退款必须使用 `Actor` 和 PolicyService。
- 钱包扣款/退款只通过 `LedgerService`。
- 购买和续费必须带幂等键。
- 商品卡片 snapshot 只用于展示，购买永远重新校验实时数据。
- DM 不允许服务器店铺商品，服务端必须强校验。
- 个人店铺仅登录用户可见，未登录不可通过商品卡片或 API 读取。
- Entitlement 读取、撤销、续费、退款属于 `financial` / `server-private` 数据，记录审计。
- metadata、notification payload、AI/JSON 配置都需要字节、深度、key 数、数组长度限制。
- 商品图片/媒体继续走应用授权，不新增公共桶或直连绕过。

### 13.8 Worker 与可靠性

第一期建议先使用现有 in-process scheduled jobs 模式补齐能力，但把任务状态持久化到 DB，后续可迁移 BullMQ：

- `entitlement_renewal_jobs`
- `notification_outbox`
- `notification_deliveries`
- `force_majeure_review_jobs`

可靠性要求：

- job 可幂等重入。
- 每次扣款、退款、续费都要有业务幂等键。
- outbox 先写 DB，再异步投递。
- 投递失败不影响账务提交。
- Push token 失效后标记 inactive。
- 多渠道通知需要去重和频控。

### 13.9 测试与验收

Server：

- Shop scope migration unit/integration tests。
- DM 商品卡片拒绝服务器店铺商品 integration test。
- Entitlement 购买、续费成功、续费失败到期不续、取消退款、不可抗力审核 tests。
- LedgerService 幂等、余额不足、退款基数 tests。
- Notification outbox、多渠道偏好、强制站内通知 tests。

Web/Mobile：

- 商品 Picker、商品卡片渲染、购买确认 E2E。
- DM 场景 E2E。
- 通知偏好和 Push token 注册测试。
- i18n key 覆盖测试。

安全：

- `pnpm check:security-pr`。
- 相关 Semgrep 规则更新：禁止虚拟服务购买绕过 `LedgerService`，禁止 DM 服务器店铺商品卡片，禁止直接写 notification delivery provider payload 无限制 JSON。

### 13.10 第一期交付顺序

1. 数据模型迁移：shop scope、Entitlement lifecycle、notification outbox/push token、refund review。
2. 服务层基础：ShopScopeService、CommerceCardService、NotificationPlatformService、EntitlementPurchaseService。
3. 账务闭环：购买、订单 `completed`、立即发 Entitlement、取消退款。
4. 通知闭环：站内 + Socket.IO + Mobile Push + Web Push + Email/SMS/聊天系统消息 outbox。
5. 自动续费：成功续费、失败到期不续、多渠道通知。
6. 聊天商品卡片：频道和 DM metadata、Web/Mobile 渲染、Picker。
7. SDK / API docs / i18n / tests / security checks。

### 13.11 第一期实现记录（2026-05-05）

本节记录第一期已落地内容，只作为实现状态记录，不改变上面的产品决策。

- 数据模型：新增 shop scope、personal shop、product billing mode、Entitlement lifecycle、force-majeure review、commerce idempotency、notification event/delivery、mobile push token、web push subscription、channel preference 等基础表和迁移。
- 服务层：新增 ShopScopeService、CommerceCardService、NotificationPlatformService、EntitlementPurchaseService、EntitlementRenewalService、EntitlementCancellationService；购买通过 LedgerService 扣款，订单立即 `completed`，并立即发放 Entitlement。
- 聊天链路：频道和 DM 消息发送均支持 `metadata.commerceCards`；Web/Mobile 均有商品 Picker、待发送预览、聊天区商品卡片渲染和卡片购买入口。DM Picker 只返回个人店铺商品，服务器店铺商品不允许进入 DM。
- 通知链路：新增全平台通知事件与投递记录，支持站内、Socket、Mobile Push、Web Push、Email、SMS、聊天系统消息的统一分发接口和 per-kind/per-channel 偏好。
- 订阅/撤销：自动续费任务按周期扫描 due Entitlement；续费失败不重试、标记失败并通知；用户取消立即撤销并按自然日零点切分计算比例退款；不可抗力走商家申请、平台裁定、裁定后撤销。
- 客户端与 SDK：Web/Mobile i18n 已补齐商品卡片和 Picker 文案；TypeScript SDK 与 Python SDK 已同步个人店铺、商品 Picker、购买、Entitlement 取消、通知渠道偏好和 Push token 注册方法；API/SDK 文档已更新。

## 14. 第二期方案：Web 商品体验、Mention 与 Entitlement 管理

### 14.1 新增决策记录

- 服务端不存储、也不面向客户端返回可展示错误提示文案。服务端只返回稳定错误码、参数和状态码；Web 通过 i18n key 渲染文案。
- 第二期只做 `apps/web`，移动端暂不继续扩展。
- Buddy 也可以拥有个人店铺。Buddy 的个人店铺与普通用户个人店铺共用 shop scope=`user`，owner 是 Buddy 对应的 bot user。
- Buddy 可以在聊天中发送自己个人店铺的商品卡片。服务端仍按商品/店铺/聊天目标做强校验。

### 14.2 第二期目标

第二期从“基础设施可用”推进到“Web 端完整经营与消费闭环”：

1. 商品卡片体验从“可发送/可购买”升级为“可配置、可预览、可追踪、可管理”。
2. Mention 机制扩展出商品/店铺实体，用户和 Buddy 可以通过统一 Picker/Mention 插入商品卡片。
3. Web 店铺前端支持个人店铺、Buddy 店铺、服务器店铺的管理与展示。
4. Entitlement 管理支持用户查看、商家查看、平台审核、到期/续费/撤销状态追踪。
5. 购买后的“发货”不只是写 Entitlement，还要把 Entitlement 绑定到可执行资源权限，并在聊天内给出可本地化的状态回执。

### 14.3 错误与 i18n 规范

服务端错误协议：

```ts
type ApiError = {
  ok?: false
  error: string // stable error code, same as code
  code: string
  params?: Record<string, unknown>
}
```

要求：

- `error` 和 `code` 都是稳定机器码，例如 `COMMERCE_CARD_NOT_FOUND`、`ENTITLEMENT_NOT_ACTIVE`。
- `params` 只能放结构化参数，例如 `{ maxCards: 3 }`、`{ requiredAmount, balance }`。
- 数据库不得保存用户可见错误提示。notification 的 `title/body` 也应逐步降级为 legacy fallback，新的 Web 渲染以 `kind + metadata` i18n 为准。
- Web 新增 `errors.<code>` 翻译域；缺失 key 时展示通用失败文案，并把 code 放到开发日志，不直接展示英文服务端 message。
- 第二期新增/改动的 commerce、shop、entitlement API 必须遵守该协议；旧 API 可分批迁移。

### 14.4 Web 商品卡片与发送体验

Composer：

- `@` mention：继续用于人、Buddy、频道、服务器。
- `#` mention：继续用于频道/服务器引用。
- 新增商品入口：使用现有商品按钮和独立 Picker，不把商品塞进纯文本 mention 解析里。
- 新增快捷触发建议：输入 `/product`、`/shop` 或 `+` 面板商品按钮打开同一个 Product Picker。
- Picker 支持三类来源：
  - 当前服务器店铺商品：只在服务器频道可见。
  - 当前用户个人店铺商品：频道和 DM 都可见。
  - Buddy 个人店铺商品：当 Buddy 是当前会话参与者、频道成员或可见主体时可见。

商品卡片发送：

- 发送前 Web 只保存 `productId/skuId` 到待发送状态，最终仍由服务端重建 snapshot。
- 单条消息最多 3 张商品卡片。
- 卡片展示价格、计费模式、有效期、订阅标识、库存/不可购状态、商家身份。
- 购买按钮必须有确认态，展示本次扣款金额、是否立即发放 Entitlement、是否订阅自动续费。
- 购买完成后卡片局部刷新：显示已购买、Entitlement 状态、到期时间、管理入口。

### 14.5 Mention 机制扩展

不建议把商品卡片实现成传统 mention token，因为商品卡片需要购买协议、账务幂等、库存校验和 Entitlement 发放。第二期采用“Mention 建议系统扩展 + 消息 metadata 渲染”的折中方案：

- `MentionSuggestion` 新增可选实体类型：`product`、`shop`。
- mention suggest API 可以返回商品/店铺候选，但 Web 选择商品时写入 `metadata.commerceCards`，不是只插入文本 token。
- 文本中可插入轻量引用 token，例如 `[[product:name]]`，仅用于人类可读；购买依据仍是 metadata。
- 服务端 mention resolver 只负责 canonical reference，不负责购买。
- 商品/店铺 mention 的权限规则必须与 Product Picker 完全一致。

### 14.6 Web 店铺前端

新增页面建议：

- `/shop/me`：我的个人店铺，普通用户和 Buddy owner 共用。
- `/shop/users/:userId`：用户/Buddy 个人店铺展示页，仅登录用户可见。
- `/servers/:serverId/shop/manage`：服务器店铺管理页升级。
- `/shop/products/:productId`：商品详情页，可从卡片打开。
- `/settings/entitlements`：我的 Entitlement 管理。
- `/shop/orders`：商家订单/Entitlement 发放记录。

个人店铺能力：

- 创建/编辑店铺资料：名称、简介、头像/横幅、可见性。
- 商品 CRUD：虚拟服务/订阅优先；传统商品继续弱化。
- 商品配置：价格、货币、计费模式、有效期、续费周期、Entitlement 类型、目标资源。
- Buddy 店铺：Buddy owner 可以为 Buddy 配置商品；Buddy 在聊天中可代表自己的个人店铺发送卡片。

### 14.7 Entitlement 管理与发货

用户侧：

- 列表：active、pending_force_majeure_review、renewal_failed、expired、cancelled、revoked。
- 详情：来源订单、商品、店铺、开始/到期时间、续费状态、退款记录。
- 操作：取消订阅、查看退款、查看不可抗力审核状态。

商家侧：

- 查看已售 Entitlement 与订单。
- 查看发放状态和资源绑定状态。
- 不允许主动撤销；只能发起不可抗力申请。
- 发起申请后显示“平台裁定中”，裁定完成前不撤销。

平台侧：

- force-majeure review queue。
- 审核时展示订单实付、退款基数、已使用自然日、建议退款金额。
- 裁定完成后再撤销 Entitlement 并触发通知。

发货实现：

- Entitlement 发放后调用 Entitlement Provisioner。
- `channel_access`：自动授予频道访问。
- `channel_speak`：授予发言能力。
- `app_access`：写入 app/resource access。
- `custom_role/custom`：第二期先记录待处理状态，不自动执行危险操作。
- 发货状态进入 `entitlement.metadata.provisioning`，但只存状态码和结构化数据，不存用户可见错误文案。

### 14.8 Buddy 个人店铺与聊天发送

Buddy 店铺 owner 仍是 bot user，但管理权限属于 Buddy owner / agent owner：

- `ShopScopeService.requireShopManager` 第二期需要识别 Buddy owner 到 bot user 的授权关系。
- Buddy 发送商品卡片时，actor 是 Buddy/system/agent，resource owner 是 Buddy bot user。
- Web Composer 中，当当前频道有 Buddy 可发言时，商品 Picker 展示“Buddy 商品”分组。
- Buddy 自动发送商品卡片必须走服务端策略：
  - 不能在 DM 中发送服务器店铺商品。
  - 不能发送未 active 商品。
  - 不能绕过消息频控和商业内容频控。
  - 需要审计：哪个 Buddy、哪个 agent action、发送了哪个 productId。

### 14.9 第二期验收用例

Web E2E：

- 用户创建个人店铺、创建订阅商品、在频道 Picker 插入商品卡片、另一个用户购买、立即获得 Entitlement。
- DM 中 Picker 不出现服务器店铺商品，只出现个人/Buddy 个人店铺商品。
- Buddy 在频道发送个人店铺商品卡片，用户购买后立即发放。
- 商品卡片购买后卡片状态刷新，Entitlement 管理页可见。
- 用户取消订阅后 Entitlement 立即撤销，退款按自然日零点切分。
- 商家发起不可抗力申请后 Entitlement 不撤销；平台裁定后再撤销。
- 服务端错误返回 code，Web 用 i18n 文案展示。

API/服务端测试：

- Product Picker 权限矩阵：server channel、DM、个人店铺、Buddy 店铺。
- Mention suggest 返回 product/shop 候选但最终购买只依赖 metadata。
- Entitlement Provisioner 幂等测试。
- Buddy owner 管理 Buddy 个人店铺授权测试。
- 错误协议测试：新增 commerce/shop/entitlement API 不返回用户可见错误 prose。

### 14.10 第二期执行顺序

1. 错误协议收敛：新增 `apiError(code, status, params)`，Web error i18n 渲染。
2. Web 店铺基础页面：个人店铺/Buddy 店铺/服务器店铺统一商品管理。
3. Product Picker v2：分组、搜索、商品/店铺候选、Buddy 商品。
4. Mention suggest 扩展：product/shop 候选和权限校验。
5. 商品卡片 v2：确认购买、购买后状态、详情页跳转。
6. Entitlement 管理页：用户侧 + 商家侧 + 平台审核入口。
7. Entitlement Provisioner：把发放落到实际资源权限。
8. Docker Compose E2E：聊天区 mention/商品卡片、购买、发货全链路。

### 14.11 第二期第一批落地记录（2026-05-06）

本轮实现以“坚实、安全、可靠的基础设施”为优先级，已落地但不改变前述产品决策：

- Web 仅覆盖 `apps/web`：聊天输入区支持 `+`、`/product`、`/shop` 打开 Product Picker；Picker 按个人店铺、服务器店铺、Buddy 店铺/对方店铺分组并支持搜索。发送消息时仍只写 `metadata.commerceCards`，购买不依赖文本解析。
- 商品卡片购买改为前端 i18n 错误文案、二次确认、购买完成状态和 Entitlement 管理页入口。服务端错误协议继续只暴露 `code/params/status`，不在服务端维护用户可见错误提示。
- 个人店铺扩展到 Buddy：Buddy 的个人店铺 owner 是 bot user，但 `ShopScopeService.requireShopManager` 识别 `agent.ownerId`，允许 Buddy owner 管理该 bot user 的个人店铺。
- Product Picker v2 后端返回 `groups` 与兼容字段 `cards`；频道场景校验频道访问权限，DM 场景校验私聊参与者，只允许可发送的商品卡片进入消息 metadata。
- Entitlement Provisioner 第一版落地：`channel_access` 在购买完成后立即把买家加入目标频道，并将结构化发货状态写入 `entitlement.metadata.provisioning`；`channel_speak/custom` 等暂记为 `manual_pending`，不执行危险操作。
- 新增 Entitlement 验证接口：`GET /api/entitlements/:entitlementId/verify`，返回 active 状态、entitlement 和 provisioning 状态；新增商家侧 `GET /api/shops/:shopId/entitlements` 查看本店发货记录。
- 新增 scope-neutral 商品管理/购买接口、DM 商品卡片购买接口，并同步 API 文档、TypeScript SDK、Python SDK。

## 15. 第三期方案：Web 交互与 UI 易用性

### 15.1 第三期定位

第三期不以继续扩展商业基础设施为主线，而是把第二期已经跑通的能力打磨成更自然、更低误触、更容易理解的 Web 体验。

第三期主线：

- 信息架构收敛：把“我的店铺”“我的权益”等低频个人经营入口归入“我的设置”，减少左下角主侧栏 Icon 堆积。
- 聊天输入区减负：把工作区文件、商品、附件等辅助动作折叠到小加号菜单里，输入框主路径只保留发送消息本身。
- 商品卡片确认体验：点击商品卡片或购买按钮时先打开确认弹窗，展示商品、价格、权益、有效期、发货方式，再由用户确认购买。
- 店铺与权益页面易用性：个人店铺、商品详情、权益列表、发货记录需要更像同一套产品，而不是散落的技术页面。
- 保留可靠性底座：现有错误码/i18n、幂等购买、发货状态、权限校验继续保留；但不在第三期主动扩展复杂权限模型。

不作为第三期重点：

- `channel_access` / `channel_speak` / `app_access` 的深度权限化接入。
- 自动续费 worker 的生产化细节。
- 不可抗力审核后台完整运营流。
- 多渠道 Push/邮件/短信投递的完整 worker 和排障后台。

这些能力继续留在后续规划中，等核心交易体验足够顺滑后再系统推进。

### 15.2 信息架构调整

第三期应把个人商业能力放进“我的设置”：

- `/settings?tab=shop`：我的店铺。
- `/settings?tab=entitlements`：我的权益。
- `/settings?tab=commerce-orders`：发货记录 / 销售记录。
- 原有 `/shop/me`、`/settings/entitlements`、`/shop/orders` 可作为兼容路由保留，但导航入口从主侧栏移除。

左下角主侧栏只保留高频全局动作，例如头像/设置、通知、好友/DM 或应用已有核心入口。商业经营入口属于用户设置里的二级能力，不占主侧栏 Icon。

设置页里的商业区建议独立分组：

- “我的店铺”：店铺资料、商品管理、商品创建。
- “我的权益”：已购权益、有效期、发货状态、取消/续费状态。
- “销售记录”：本店售出的 Entitlement、订单、发货状态。

### 15.3 聊天输入区小加号菜单

当前聊天输入区已有上传文件、商品、图片、工作区文件等多个按钮。第三期改成一个小加号入口：

- 小加号作为辅助动作总入口。
- 菜单项包括：
  - 上传附件。
  - 上传图片。
  - 从工作区选择文件。
  - 发送商品。
  - 后续可扩展投票、表单、应用动作。
- 菜单项使用图标 + 本地化标签 + 简短说明；主输入框区域不再横向堆多个按钮。
- 发送商品仍进入 Product Picker，但 Product Picker 是加号菜单的一项，不再独立占位。

交互要求：

- 键盘路径不打断输入；打开菜单后 Esc 关闭，选择后回到 composer。
- 菜单在移动窄屏和桌面宽屏都要避免遮挡输入内容。
- 选中商品后显示待发送预览，发送前可移除。
- 单条消息最多 3 张商品卡片的限制继续保留。

### 15.4 商品卡片确认弹窗

第三期把“卡片点击”和“购买确认”统一成商品确认弹窗，避免误操作。

触发方式：

- 点击商品卡片主体：打开商品/权益详情弹窗。
- 点击购买按钮：打开同一个弹窗，并默认聚焦购买确认区域。
- 从商品详情页点击购买：复用同一套确认内容。

弹窗内容：

- 商品名称、店铺、价格、货币。
- 商品简介和图片。
- 权益类型、有效期、续费/一次性说明。
- 发货方式：即时发放、人工处理或待处理状态。
- 本次扣款金额和余额不足提示。
- 明确的“确认购买”按钮；关闭弹窗不产生购买。

购买完成后：

- 弹窗展示购买成功、发货状态和“查看权益”入口。
- 原聊天卡片同步更新为已购买/已发货状态。
- 如果失败，前端基于错误码/i18n 显示可理解文案，不展示服务端 prose。

### 15.5 店铺和权益页面体验

我的店铺：

- 顶部展示店铺资料和可见状态。
- 商品创建表单减少技术字段暴露，使用分步或分区：
  - 基本信息。
  - 价格与有效期。
  - 权益说明。
  - 发货方式。
- 商品列表支持预览、编辑、下架、复制商品链接。
- 对 `channel_access` 等旧权限类型不做强强调，默认以“虚拟服务/权益说明”表达，避免让用户感知内部权限枚举。

我的权益：

- 以“正在使用 / 即将到期 / 已结束”分组。
- 每张权益卡展示来源店铺、商品、到期时间、发货状态。
- 点击权益进入详情弹窗，展示订单、扣款、权益说明和可操作项。

销售记录：

- 面向商家展示售出商品、买家、发货状态、到期时间。
- 第三期先优化可读性和筛选，不展开完整不可抗力审核后台。

### 15.6 视觉与交互标准

第三期 UI 需要遵守：

- 不新增硬编码 UI 文案，全部走 Web i18n。
- 不在主侧栏继续堆商业入口 Icon。
- 弹窗和菜单使用项目现有设计语言，避免做成营销页。
- 卡片不套卡片；列表项保持扫描友好。
- 长商品名、长店铺名、长权益说明必须在桌面和窄屏下正常换行或截断。
- 商品购买、取消、失败、成功状态都要有清晰 loading/disabled/success/error 状态。

### 15.7 第三期验收用例

Web UI：

- 用户从“我的设置”进入我的店铺、我的权益、销售记录，不再依赖左下角额外 Icon。
- 聊天输入区只显示小加号辅助入口；工作区文件、商品、附件都能从小加号菜单进入。
- 从小加号选择商品后，商品卡片预览可见、可移除、可发送。
- 点击聊天商品卡片主体打开详情/确认弹窗，不直接购买。
- 点击购买按钮打开确认弹窗，确认后才扣款。
- 购买完成后弹窗和聊天卡片同时展示成功和发货状态。
- 商品详情页和聊天卡片购买复用同一套确认体验。
- 我的权益页能从购买完成弹窗进入，并清楚展示已购权益。

工程验证：

- `pnpm --filter @shadowob/web typecheck`。
- `pnpm check:i18n`，确认第三期新增 UI 文案全部有 key。
- `docker compose up --build` 后用浏览器验证设置页入口、加号菜单、商品弹窗、购买成功、权益页跳转。

### 15.8 第三期执行顺序

1. 导航信息架构：把我的店铺、我的权益、销售记录迁入设置页，移除主侧栏商业 Icon。
2. Composer 小加号菜单：统一工作区文件、商品、附件入口。
3. 商品详情/购买确认弹窗：聊天卡片、详情页和购买按钮统一使用。
4. 店铺页和权益页体验打磨：布局、分组、空状态、loading/error、移动窄屏适配。
5. 浏览器 UI 验证和 i18n/typecheck 收尾。

## 16. 第四期方案：Offer 驱动的 Buddy 售卖与付费文件基础设施

### 16.1 第四期定位

第四期以“卖火柴的小女孩”MVP 实验为牵引，目标不是继续扩展传统商城，而是把以下基础能力打牢：

1. 虾 Cloud 可以部署一个带人格、店铺、商品、交付物和销售脚本的 Buddy。
2. Buddy 可以在用户进入后可靠地发送销售消息和商品卡片。
3. 商品卡片不再直接绑定“商品归属在哪个聊天面”，而是通过 Offer 决定在哪卖、谁能卖、卖给谁。
4. 用户购买后立即获得资源型 Entitlement。
5. 购买完成后系统可靠履约，由 Buddy 自动发送付费 HTML 文件卡片。
6. 只有拥有对应 Entitlement 的用户才能打开 HTML 文件，文件打开由服务端付费墙网关控制。

第四期要同时完成一次架构清理：删除旧的 channel/app 门禁型虚拟权益，不再把 `channel_access`、`channel_speak`、`app_access` 当作虚拟商品权益主类目。

### 16.2 MVP 用户链路

MVP 链路：

```text
用户点击玩法 / Cloud 模板入口
 -> 虾 Cloud 部署 Little Match Girl Buddy
 -> Shadow provision 创建 server/channel/Buddy/shop/product/offer/deliverable
 -> 用户进入频道或 DM
 -> Campaign 触发 Buddy 发推销消息 + 火柴商品卡片
 -> 用户点击卡片，确认弹窗展示商品/权益/付费文件信息
 -> 用户确认购买
 -> 系统扣款、订单 completed、生成 Entitlement
 -> Fulfillment job 由 Buddy 发送火柴 HTML 付费文件卡片
 -> 用户点击文件卡片
 -> Paid File Gateway 校验 Entitlement
 -> sandbox viewer 打开火柴动画 HTML
```

### 16.3 核心抽象

第四期统一使用以下抽象：

```text
Shop
  表示谁拥有经营主体：server / user / platform。

Product
  表示卖什么：火柴、会员、文件、服务包。Product 不决定出现在哪个聊天面。

CommerceOffer
  表示怎么卖、在哪卖、谁能卖、谁能看、谁能买。聊天商品卡片只引用 offerId。

Entitlement
  表示购买后用户拥有什么资源权益：userId + resourceType + resourceId + capability。

Deliverable
  表示买完交付什么：例如一个 workspace_file HTML。

FulfillmentJob
  表示可靠履约任务：购买完成后由哪个 Buddy 往哪个会话发什么交付消息。

PaidFileGrant
  表示短时文件打开授权：用于付费 HTML viewer，不暴露 MinIO 真实地址。
```

这套模型保证扩展性和简单性：

- Product 保持简单，只做商品资料、价格、计费和可售状态。
- Offer 承担销售上下文，避免把 DM、频道、server、Buddy 代售、活动期限都塞进 Product。
- Entitlement 只表达资源授权，不再关心商品从哪个聊天场景卖出。
- Deliverable / FulfillmentJob 只负责交付，避免购买接口同步完成复杂消息发送。

### 16.4 清理旧权益模型

第四期需要把旧模型从主路径清理出去：

- 删除虚拟权益创建 UI 中的 `channel_access`、`channel_speak`、`app_access`、`custom_role` 枚举。
- 删除或停用 Entitlement Provisioner 中针对 `channel_access` 自动加频道成员的主路径逻辑。
- 删除 product entitlement config 中写死的频道/app 门禁文案和表单。
- API、SDK、文档中不再把 `entitlement.type` 解释为频道/app 权限类型。
执行口径更新：用户已确认“无需兼容，减熵”。因此第四期旧逻辑移除不保留 `legacy_*` 历史展示层，迁移直接删除 `entitlement.type/targetId` 和 `entitlement_type` 枚举；历史记录若存在，统一补齐 `resourceType/resourceId/capability` 后进入新资源模型。

新模型建议：

```ts
type EntitlementResourceType =
  | 'workspace_file'
  | 'digital_asset'
  | 'service'
  | 'subscription'
  | 'external_resource'

type EntitlementCapability =
  | 'view'
  | 'download'
  | 'use'
  | 'redeem'
  | 'manage'
```

新 entitlement 记录以 `resourceType/resourceId/capability` 为准：

```ts
{
  userId,
  shopId,
  productId,
  offerId,
  orderId,
  resourceType: 'workspace_file',
  resourceId: fileId,
  capability: 'view',
  startsAt,
  expiresAt,
  status: 'active'
}
```

### 16.5 Commerce Offer

新增 `commerce_offers`。Offer 是第四期最重要的新增实体，用于解决 server 商品在 DM 中由 Buddy 发送的问题。

建议字段：

```ts
commerce_offers {
  id
  shopId
  productId
  originKind: 'server' | 'user' | 'platform'
  originServerId
  sellerUserId
  sellerBuddyUserId
  allowedSurfaces: Array<'channel' | 'dm' | 'profile' | 'play_launch'>
  visibility: 'logged_in' | 'server_members' | 'invite_only'
  eligibility: {
    serverMembership?: 'not_required' | 'required' | 'join_on_purchase'
    maxPurchasesPerUser?: number
  }
  priceOverride
  currency
  startsAt
  expiresAt
  status: 'draft' | 'active' | 'paused' | 'archived'
  metadata
  createdAt
  updatedAt
}
```

规则：

- 聊天商品卡片必须引用 `offerId`，不再只引用 `productId`。
- 服务端构建卡片时读取 offer/product/shop，生成 snapshot。
- Buddy 在 DM 中发送 server 商品，必须使用一个 `allowedSurfaces` 包含 `dm` 的 active offer。
- 购买时重新校验 offer/product/shop，不信任消息 snapshot。
- server 商品不复制到 Buddy 个人店铺；Buddy 只是被授权销售某个 Offer。

火柴 MVP 的 Offer：

```ts
{
  originKind: 'server',
  allowedSurfaces: ['channel', 'dm', 'play_launch'],
  sellerBuddyUserId: littleMatchGirlBuddyUserId,
  eligibility: { serverMembership: 'not_required' },
  productId: matchProductId
}
```

### 16.6 商品与资源绑定

第四期建议保留 `product.type = "entitlement"` 的大类，但不再使用旧 `entitlementConfig.type` 枚举。改为资源授权配置：

```ts
product.entitlementConfig = {
  resourceType: 'workspace_file',
  capability: 'view',
  durationSeconds: 86400,
  privilegeDescriptionKey?: 'commerce.matchFilePrivilege'
}
```

如果一个商品解锁多个资源，不在 Product 上塞数组执行复杂履约，而是通过 Deliverable 表达交付物，通过 EntitlementResource 表达授权资源。

建议新增 `commerce_product_resources`：

```ts
commerce_product_resources {
  id
  productId
  resourceType
  resourceId
  capability
  durationSeconds
  metadata
}
```

购买时为每个 resource 生成 entitlement。MVP 可先限制一个 product 一个 resource。

### 16.7 付费文件与 HTML Viewer

第四期新增付费文件能力，优先服务火柴动画 HTML。

文件存储：

- 继续使用 `workspace_nodes` 表示文件节点。
- HTML 内容仍通过 MinIO 私有桶存储，`workspace_nodes.contentRef` 保存内部引用。
- 文件节点 `flags` 增加付费墙信息：

```ts
flags.paywall = {
  enabled: true,
  productId,
  offerId,
  resourceType: 'workspace_file',
  requiredCapability: 'view',
  previewTitle,
  previewSummary
}
```

新增 Paid File Gateway：

- `GET /api/paid-files/:fileId`
  - 返回文件卡片展示信息和当前用户是否已拥有权益。
- `POST /api/paid-files/:fileId/open`
  - 校验登录用户、文件存在、paywall、active entitlement。
  - 创建短时 `paid_file_grants`。
  - 返回 `viewerUrl`。
- `GET /api/paid-files/:fileId/view/:grantId`
  - 校验 grant 未过期、未撤销、属于当前用户。
  - 重新校验 entitlement 仍 active。
  - 流式返回 HTML。

安全要求：

- 不返回 MinIO presigned URL 给前端。
- HTML 用隔离 viewer 打开，不能和 Shadow 主应用同源执行。
- 响应头建议：
  - `Content-Type: text/html; charset=utf-8`
  - `Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
- Viewer 页面不注入 Shadow token，不允许 HTML 访问 localStorage/cookies。
- HTML 文件大小、脚本大小、嵌套资源数量需要限制；MVP 只支持单文件 HTML 动画。

### 16.8 Deliverable 与 Fulfillment

新增 `commerce_deliverables`：

```ts
commerce_deliverables {
  id
  productId
  offerId
  kind: 'paid_file_card' | 'message' | 'external'
  resourceType: 'workspace_file'
  resourceId: fileId
  senderBuddyUserId
  deliveryTiming: 'after_purchase'
  messageTemplateKey
  metadata
  status: 'active' | 'paused' | 'archived'
}
```

新增 `commerce_fulfillment_jobs`：

```ts
commerce_fulfillment_jobs {
  id
  orderId
  entitlementId
  deliverableId
  buyerId
  destinationKind: 'channel' | 'dm'
  destinationId
  senderBuddyUserId
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  attempts
  nextRunAt
  resultMessageId
  lastErrorCode
  metadata
  createdAt
  updatedAt
}
```

购买流程：

1. 购买事务中创建 order、entitlement、fulfillment job。
2. 事务提交后由 worker 处理 job。
3. worker 用 Buddy 身份发送 `paidFileCards` 消息。
4. 成功后记录 `resultMessageId`。
5. 失败只记录 `lastErrorCode`，不存用户可见错误文案。

MVP 暂时不做复杂重试策略，但 job 表必须保留 `attempts/nextRunAt`，后续可平滑加重试和排障后台。

### 16.9 消息卡片协议

商品卡片从 `productId` 主导迁移到 `offerId` 主导：

```ts
metadata.commerceCards = [{
  id,
  kind: 'offer',
  offerId,
  productId,
  shopId,
  sellerBuddyUserId,
  snapshot: {
    name,
    summary,
    imageUrl,
    price,
    currency,
    productType: 'entitlement',
    resourceType: 'workspace_file',
    durationSeconds
  },
  purchase: { mode: 'direct' }
}]
```

购买完成后的文件卡片：

```ts
metadata.paidFileCards = [{
  id,
  kind: 'paid_file',
  fileId,
  productId,
  offerId,
  entitlementId,
  snapshot: {
    name,
    summary,
    mime: 'text/html',
    sizeBytes,
    previewState: 'owned'
  }
}]
```

渲染规则：

- `commerceCards` 点击后打开购买确认弹窗。
- 购买确认弹窗展示 Offer、商品、权益资源和交付物。
- `paidFileCards` 未拥有权益时显示锁定和购买入口；已拥有权益时显示打开按钮。
- 打开按钮调用 Paid File Gateway。

### 16.10 Buddy 与 Agent 能力

Buddy 发送商品和交付文件必须走服务端 canonicalization：

- Buddy runtime 可以请求发送 `offerId`，不能自行构造价格和权益 snapshot。
- 服务端校验：
  - Buddy 是否存在且运行身份有效。
  - Buddy 是否被 Offer 授权销售。
  - 目标 channel/DM 是否允许这个 Offer。
  - 是否触发商业消息频控。
  - 商品、Offer、Deliverable 是否 active。

建议扩展接口：

- `POST /api/oauth/buddies/:id/messages`
  - 支持 `offerIds`、`paidFileIds`，服务端 canonicalize。
- 或新增 agent 专用接口：
  - `POST /api/agent/messages`
  - actor 为 agent token，scope 更细，避免复用用户 OAuth 权限过宽。

安全边界：

- Cloud runtime 不注入完整用户 token。
- provisioning 阶段可以使用用户 token 创建资源，但运行态只拿 Buddy/agent scoped token。
- Buddy 不能自己创建订单、扣款、改价格、直接发私有文件 URL。

### 16.11 Campaign 与 Play Launch

MVP 需要确定性推销，不依赖 LLM 即兴发挥。

新增 `commerce_campaigns`：

```ts
commerce_campaigns {
  id
  templateSlug
  offerId
  sellerBuddyUserId
  trigger: 'play_launch_entered' | 'dm_opened' | 'channel_joined'
  messageTemplateKey
  status
}
```

新增 `commerce_campaign_deliveries`：

```ts
commerce_campaign_deliveries {
  campaignId
  userId
  destinationKind
  destinationId
  status
  messageId
  idempotencyKey
}
```

规则：

- 用户通过 Play Launch 进入后，服务端触发 campaign。
- 每个用户/目的地/campaign 只发送一次。
- Campaign 消息由 Buddy 发出，可包含推销文案和 `commerceCards`。
- 后续可扩展为 A/B、限时活动、二次触达，但 MVP 不做。

### 16.12 虾 Cloud 模板与 Provisioning

新增官方模板：

- `apps/cloud/templates/little-match-girl.template.json`

模板声明：

- 一个 Shadow server 和默认频道。
- 一个 Buddy：卖火柴的小女孩。
- 一个 server shop。
- 一个火柴商品。
- 一个火柴动画 HTML workspace file。
- 一个 Offer：允许 channel、DM、play_launch 发送。
- 一个 Deliverable：购买后发送 paid file card。
- 一个 Campaign：用户进入后 Buddy 推销火柴。

扩展 `shadowob` plugin provisioning：

```ts
shadowob.options = {
  servers,
  buddies,
  bindings,
  shops,
  products,
  workspaceFiles,
  offers,
  deliverables,
  campaigns
}
```

Provisioning 要求：

- 幂等：同一 deployment redeploy 不重复创建商品、Offer、文件和 Campaign。
- 状态写入 provision state：serverId、channelId、buddyUserId、shopId、productId、fileId、offerId、deliverableId、campaignId。
- 不把运行时完整用户 token 写入 pod。
- Provision state 不保存 Buddy token / secret / API key；Buddy token 仅在 provisioning 阶段即时 mint，并通过 K8s Secret 注入运行态。
- 对 HTML 文件做大小和 MIME 校验。
- 对商品价格、Offer surface、resourceType 做 schema 校验。

### 16.13 API 草案

新增/调整 API：

- `GET /api/commerce/offers`
- `GET /api/commerce/offers/:offerId`
- `POST /api/commerce/offers/:offerId/purchase`
- `POST /api/messages/:messageId/commerce-cards/:cardId/purchase`
- `POST /api/dm/messages/:messageId/commerce-cards/:cardId/purchase`
- `GET /api/paid-files/:fileId`
- `POST /api/paid-files/:fileId/open`
- `GET /api/paid-files/:fileId/view/:grantId`
- `GET /api/entitlements`
- `GET /api/entitlements/:id/verify`
- `GET /api/commerce/fulfillment-jobs/:id`

管理接口：

- `POST /api/shops/:shopId/products`
- `POST /api/commerce/offers`
- `POST /api/commerce/deliverables`
- `POST /api/commerce/campaigns`

购买响应：

```ts
{
  order,
  entitlements: [],
  fulfillmentJobs: [],
  next: {
    expectedDelivery: 'chat_message',
    destinationKind,
    destinationId
  }
}
```

### 16.14 数据迁移策略

当前迁移策略以减熵为优先，不保留旧 channel/app 门禁兼容层。

第一步：旧门禁删除

- entitlements 删除 `type`、`targetId` 和 `entitlement_type` enum。
- entitlements 以 `resourceType/resourceId/capability` 作为唯一主语义。
- 商品创建 UI 删除旧权益类型，只展示资源型权益。
- Entitlement Provisioner 不再处理 channel/app 自动门禁，只记录资源权益已发放。

第二步：主路径切换

- Product Picker 只返回 Offer。
- 商品卡片购买接口切换到 Offer purchase。
- Paid File Gateway 成为付费文件唯一打开路径。

第三步：新增 MVP 基础设施

- 新增 offers、deliverables、fulfillment_jobs、paid_file_grants。
- 商品卡片购买接口切换到 Offer purchase。
- Paid File Gateway 成为付费文件唯一打开路径。

### 16.15 Actor / Policy / 安全矩阵

| 场景 | Actor | Resource | Action | Scope/Capability | Data class |
| --- | --- | --- | --- | --- | --- |
| Buddy 发送 Offer 卡片 | agent / oauth | offer + message destination | write | `messages:write`, `commerce:offer:send` | server-private |
| 用户购买 Offer | user | offer/product/order/wallet | bill/write | `commerce:purchase` | financial |
| 生成 Entitlement | system | entitlement/resource | generate | internal | financial/server-private |
| Fulfillment 发文件卡片 | system/agent | fulfillment job + message | write | internal + Buddy authorized | server-private |
| 打开付费文件 | user | workspace_file + entitlement | read | `entitlement:view` | server-private |
| Cloud provision seed | user/system | server/shop/product/offer/file | manage/write | cloud deploy capability | server-private/financial |

安全原则：

- 所有钱包扣款必须走 `LedgerService`。
- 购买必须有幂等键。
- Offer snapshot 只能由服务端生成。
- 付费文件不能暴露 MinIO URL。
- HTML viewer 必须 sandbox。
- 服务端错误仍只存 code/params，不存用户可见文案。
- 新增 API/SDK/文档同步。
- 安全敏感实现需要运行 `pnpm check:security-pr`。

### 16.16 第一版实现范围

必须完成：

- Offer 数据模型、查询、购买。
- Entitlement 资源化。
- 旧 channel/app 门禁枚举从新建商品和新购买路径移除。
- Paid File Gateway 和 sandbox HTML viewer。
- Deliverable 和 FulfillmentJob。
- Buddy/Campaign 发送 Offer 卡片。
- Cloud little-match-girl template 和 shadowob provisioning 扩展。
- Web 商品卡片、付费文件卡片、打开 viewer。
- compose + browser 验证完整 MVP 链路。

暂不完成：

- 复杂订阅重试。
- 多级分销/佣金。
- Offer A/B 测试。
- 多文件包、流媒体、下载水印。
- 生产级人工审核后台。
- Mobile 端完整 UI；第四期 MVP 先围绕 Web 验证，但 API 和消息协议不能阻断 Mobile 后续接入。

### 16.17 验收用例

服务端测试：

- server shop 商品通过 active Offer 可以在 DM 中由授权 Buddy 发送。
- 未授权 Buddy 不能发送该 Offer。
- inactive/expired Offer 不能购买。
- 购买 Offer 后 order completed，entitlement 写入 `workspace_file` resource。
- fulfillment job 幂等生成，重复 purchase idempotency 不重复扣款和发货。
- 无 entitlement 打开 paid file 返回 403 code。
- 有 active entitlement 打开 paid file 返回 viewerUrl，并可访问 HTML。
- revoked/expired entitlement 不能打开。
- HTML viewer 响应头包含 sandbox CSP。

Web 浏览器验收：

- 部署 little-match-girl 模板。
- 用户进入后看到小女孩 Buddy 自然欢迎，不直接出现系统预置商品卡片。
- 用户在聊天里询问火柴、价格、购买或动画后，真实 Buddy 回复推销文案并发送火柴商品卡片。
- 点击购买弹出确认弹窗。
- 确认购买后卡片显示购买完成。
- Buddy 自动发送火柴动画 HTML 文件卡片。
- 用户点击打开后看到火柴动画。
- 未购买用户打开同一文件时看到付费墙。

工程验收：

- `pnpm biome format --write <changed files>`
- `pnpm --filter @shadowob/server test`
- `pnpm --filter @shadowob/web typecheck`
- `pnpm check:i18n`
- `pnpm check:security-pr`
- `docker compose up --build`
- 浏览器跑通 MVP 链路。

### 16.18 第四期执行顺序

1. 数据模型迁移：offers、deliverables、fulfillment_jobs、paid_file_grants、entitlement resource fields。
2. 服务端核心：OfferService、ResourceEntitlementService、PaidFileAccessService、FulfillmentService。
3. 购买路径：Offer purchase 替换 product direct purchase 主路径。
4. 清理旧门禁：隐藏/删除 channel/app 权益类型和 provisioner 主路径。
5. 消息协议：commerceCards 切 offerId，新增 paidFileCards。
6. Web UI：商品确认弹窗展示资源权益；新增付费文件卡片和 HTML viewer。
7. Buddy/Campaign：Play Launch 入场触发销售消息。
8. Cloud provisioning：little-match-girl template + shadowob seed。
9. 测试与 compose/browser 验证。

### 16.19 第四期实现记录（2026-05-06）

已完成第一批基础设施实现：

- 已删除旧 `entitlement_type`、`entitlements.type`、`entitlements.targetId` 主路径，Entitlement 以 `resourceType/resourceId/capability` 表达资源能力。
- 已新增 `commerce_offers`、`commerce_deliverables`、`commerce_fulfillment_jobs`、`paid_file_grants`。
- 商品卡片服务已切换为 Offer 快照，消息发送时服务端重新生成卡片快照，不信任客户端价格/权益快照。
- 购买路径新增 `POST /api/commerce/offers/:offerId/purchase`；频道/DM 消息卡片购买会携带 destination 并触发 fulfillment。
- Paid File Gateway 已新增：`GET /api/paid-files/:fileId`、`POST /api/paid-files/:fileId/open`、`GET /api/paid-files/:fileId/view/:grantId`。viewer 使用短时 grant，并在访问时重新校验 Entitlement。
- Web 消息区已新增 `paidFileCards` 渲染和打开入口，商品卡片继续使用购买确认弹窗。
- Cloud 已新增 `little-match-girl` 模板；`shadowob` provisioning 可 seed Buddy 个人店铺、工作区 HTML 付费文件、Offer 和 Deliverable。
- Play Launch 云部署欢迎消息只做自然入场，不再在 Buddy 首条消息中附带商品卡片；商品卡片由真实 Buddy 在后续对话中通过 `commerceOfferId` 发送。
- TypeScript SDK / Python SDK 已同步 Offer purchase、Offer card 字段和 Paid File open API。
- API 文档和架构文档已记录 Offer / Deliverable / Fulfillment / Paid File 基础设施。

仍需继续推进：

- 针对 Offer purchase、Fulfillment、Paid File Gateway 的集成测试。
- compose 部署和浏览器端 MVP 链路验证。

### 16.20 第四期 MVP 补充记录（2026-05-06）

本轮继续围绕“卖火柴的小女孩”MVP 完善基础设施和体验：

- Cloud `shadowob` provisioning 会把 seed 出来的 `offerId/productId/fileId/deliverableId` 注入 Buddy 运行时环境。
- OpenClaw `shadowob` channel 会把可销售 Offer 写入 Agent 上下文，Buddy 可以知道自己当前能卖什么。
- Shadow message tool 新增 `commerceOfferId` / `offerId` 参数；真实运行的 Agent 可通过 `action: "send"` 在频道或 DM 中发送服务端重建的 Offer 商品卡片。
- `little-match-girl` 模板的 system prompt 已明确要求 Buddy 在用户询价、想购买、想看动画时，使用 `commerceOfferId` 发送商品卡片，而不是只用纯文本推销。
- `little-match-girl` 已加入 Home Play catalog，可从玩法入口触发 Cloud deploy。
- 付费文件卡片不再打开新窗口；Web 聊天区会复用文件预览面板，在右侧打开短时 grant viewer。
- Offer 商品卡片对 `workspace_file:view` 权益做“打开优先”体验：已购买则直接在右侧打开；未购买则弹出购买确认框。
- 购买后的 Fulfillment 消息默认由销售 Buddy 发送明确的火柴动画提示文案，不再发送空消息。

### 16.21 第四期真实链路补强与 Agent 商品能力规划（2026-05-06）

本轮用户继续确认的目标：

- MVP 需要走真实链路：`首页 -> 点击玩法 -> 与 Buddy 交流 -> 推送卡片 -> 获取权益并打开文件`。
- 设置里的“我的权益”应更像 ToC 应用，展示已购买商品、关联权益资源和付费文件，不暴露“验证发货”“取消权益”等内部运维/商家按钮。
- 需要开始考虑 Agent 自主设计和发布商品的方法，后续会围绕这块做基础建设。

本轮实现方向：

- Cloud play 已部署后，Play Launch 不只发送首条欢迎消息，还必须确保 Buddy 加入 server/channel、写入 server default agent policy，并向 Buddy 运行时发送 `agent:policy-changed` / `channel:member-added` 通知。这样用户进入真实 Cloud Buddy 频道后，Buddy 能按真实 Agent 链路监听并回复。
- `GET /api/entitlements` 面向消费者返回 richer entitlement list：Entitlement 本体 + 关联 shop/product/offer 摘要 + paid file metadata。该接口仍然以服务端 code/结构化字段为准，不在服务端存用户可见错误文案。
- Web “我的权益”改为消费者清单：展示商品名、权益类型、能力、店铺、关联内容、到期时间和发货状态；有 active `workspace_file` 权益时提供“打开内容”，复用短时 paid-file grant 和文件预览面板。

Agent 自主商品设计/发布的后续基础设施建议：

- 新增 Agent Product Draft 能力：Agent 只能先创建 `product_drafts` / `offer_drafts` / `paid_file_drafts`，不能直接发布可售 Offer。
- Draft 必须归属到明确主体：Buddy 个人店铺、server 店铺或平台托管店铺；主体决定收入归属、审核责任和可售 surface。
- Agent Tool 最小能力边界：
  - `commerce.draftProduct`：生成商品名、摘要、价格建议、权益配置、素材计划。
  - `commerce.attachPaidFileDraft`：提交或引用文件草稿，文件必须经过安全扫描、大小/MIME/HTML sandbox 策略校验。
  - `commerce.requestPublish`：提交审核，进入商家或平台审核队列。
  - `commerce.readOwnCatalog`：读取自己可售/草稿商品，供对话推销时使用。
- 发布前校验：
  - 服务端重算 price/entitlement/paid-file snapshot，不信任 Agent 工具入参。
  - HTML/文件付费墙必须走 paid-file gateway，不能暴露对象存储原始地址。
  - 商品内容、权益范围、退款/撤销策略、目标 surface、seller identity 都需要审计记录。
- 审核模型：
  - 第一阶段建议平台或店主审核后发布。
  - 后续可按 Agent 信任等级、商品类别、价格上限、历史退款率做自动审核。
  - 商品发布、改价、下架、权益撤销都应写入 audit log，并能解释“谁发起、谁承担、谁过错”的费用责任。
- 对话销售模型：
  - Agent 运行时只拿到服务端生成的 offer context 和 offerId。
  - Agent 在聊天中发送商品卡片时只提交 `commerceOfferId`，服务端重新生成卡片并校验 surface、seller、status、visibility。
  - 已购买资源优先打开权益内容，未购买资源进入购买确认弹窗。

### 16.22 第四期对话式销售调整（2026-05-06）

用户进一步确认：MVP 的交易体验不能像系统在入场时直接贴商品卡片，而应表现为 Buddy 在真实聊天过程中自然推销，并在用户表达兴趣后发送商品卡片。

本轮决策与实现方向：

- Play Launch 首条欢迎消息只负责把用户带入场景，不再附带 `metadata.commerceCards`。
- `little-match-girl` 的欢迎语改为自然铺垫：“夜有点冷。我带着几盒会发光的火柴，如果你愿意，我可以给你讲讲它们。”
- 商品卡片发送责任归还给真实 Cloud Buddy：OpenClaw `shadowob` 运行时已经把可售 Offer 注入 Agent 上下文，Buddy 通过 message tool 发送 `commerceOfferId`，服务端重新生成商品卡片。
- 验收链路调整为：`首页 -> 点击玩法 -> 进入频道 -> 用户询问/表达兴趣 -> Buddy 回复推销文案并发送商品卡片 -> 用户购买 -> 发放权益和付费文件 -> 右侧打开文件`。
- 后续 Agent 自主商品基础设施也沿用这个边界：Agent 只拿 offer context / offerId，不直接构造价格、权益或卡片快照。

### 16.23 第四期对话销售可靠性补强（2026-05-06）

本轮浏览器验证发现：真实 Cloud Buddy 会自然推销商品，但模型有时只发送纯文本，或把 `commerceOfferId` 放在非标准 metadata 字段里，导致聊天区没有稳定渲染商品卡片。该问题属于基础设施可靠性问题，不能只依赖 Prompt。

本轮决策与实现方向：

- 服务端消息入口成为商品卡片最终兜底层：频道、DM、WebSocket 发送消息时都会经过 `CommerceCardService`。
- 服务端继续优先支持标准 `metadata.commerceCards`，并兼容 Agent 误发的顶层 `metadata.commerceOfferId`，统一重建为规范 Offer card。
- 当消息作者是店铺 owner / offer seller / seller Buddy，且消息内容呈现明确销售话术或商品关键词时，服务端可以自动推断其可售 Offer，并补齐商品卡片。
- 个人店铺 owner 也是可售主体。即使 `commerce_offers.seller_user_id` 未指向 Buddy，只要商品归属 Buddy 个人店铺，Buddy 也能在聊天里自然销售。
- 多商品场景必须避免误配：只有单商品可售，或文本能唯一匹配某个商品时才自动补卡；否则仍要求 Agent 明确发送 `commerceOfferId`。
- 该兜底不改变安全边界：卡片价格、权益、资源、surface、shop scope 都由服务端重新校验和快照化，不信任 Agent 传入的卡片内容。

本轮真实验收结果：

- 通过 compose 启动后，在浏览器中进入真实 `little-match-girl` Cloud Buddy 频道。
- 用户发送：“那我想带一盒会发光的火柴回家，可以把它递给我吗？”
- Buddy 回复自然推销文案：“来，接好了……点击下面这张卡片……”
- 服务端为该 Buddy 消息补齐规范 `commerceCards`，浏览器聊天区渲染出新的“ 一盒会发光的火柴 ”商品卡片。

## 17. 后续调研清单

- 梳理现有 API 文档和 SDK 中 shop/order/entitlement 的暴露面。
- 清理 API 文档和 SDK 中旧 `channel_access` / `channel_speak` / `app_access` 的暴露面，不保留历史兼容策略。
- 设计 shop scope migration 的兼容步骤。
- 设计 message metadata schema 与迁移策略。
- 设计 Web/Mobile 商品卡片 UI 和 i18n key。
- 设计虚拟服务购买的 LedgerService 事务边界。
- 设计 Entitlement 撤销、过期清理、自动续费和审计。
- 设计系统性 Push 服务，包括多渠道投递、模板、偏好、去重、频控、审计和失败处理。

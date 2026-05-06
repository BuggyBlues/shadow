# 第六期 Commerce UI/UX 精细化打磨方案草案

日期：2026-05-06

状态：草案，待用户审核。本文记录第六期产品技术方案，不覆盖既有已确认决策。用户确认后的修改应以增量决策记录追加，不应改写历史口径。

执行记录：

- 2026-05-06：已完成第六期第一批基础改造。钱包交易新增消费者展示口径，隐藏 model proxy 内部账务，收入/支出/count 与分页基于同一服务端筛选；商品交易流水补充商品、店铺、订单上下文。Checkout preview 新增 `primaryAction` / `displayState`，用于统一“购买/打开/续费/不可用”的前端展示判断。我的权益页在设置页内改为嵌入式消费者内容库，新增摘要、筛选、可打开内容标记，并避免默认展示底层资源 ID。
- 2026-05-06：按用户反馈完成设置页信息架构合并。左侧主导航收敛为消息、我的 Buddy、赚取虾币、钱包、我的店铺五个入口；邀请返利并入赚取虾币，权益并入钱包，发货/销售记录并入我的店铺。旧入口 `invite`、`entitlements`、`commerce-orders` 继续落到对应父级内部区块，不再作为左侧独立条目。
- 2026-05-06：按用户反馈开始 ToC 级 UI/UX 精修。新增 commerce 原子组件层，沉淀页头、指标、分段控制、状态胶囊、列表行和空状态；我的权益按“已购内容库”重做，突出可打开内容、有效期、来源店铺和主动作；我的店铺按“创作者橱窗”重做，店铺门面、发布服务、商品货架、发货记录统一使用同一视觉语言，减少后台表格感和重复样式。
- 2026-05-06：继续根据用户反馈降噪。店铺默认页不再暴露店铺设置和商品创建表单，编辑门面与发布服务收敛到右侧 Sheet；权益页 Header 改为更轻的内容库摘要，权益列表减少资源类型、能力、发货等技术标签，保留来源、到期和主动作；聊天与权益共用的文件预览改为圆角 Glass Sheet，避免硬直贴边和黑色外壳。

## 1. 背景

前几期已经完成从聊天商品卡片到购买、Entitlement 发放、paid file grant、右侧文件预览、钱包结算和 Buddy 推销链路的 MVP。当前能力已经能证明“Buddy 像商人一样在对话里销售虚拟权益”这条主线成立。

第六期重点不再扩品类，而是把商品、钱包、权益、店铺、发货、预览这几块打磨成一个可理解、可信、顺滑的消费者与轻量创作者体验。

本期仍以 apps/web 为主，Mobile 暂不作为主实现面；但 API、状态协议和 i18n key 要避免阻断后续移动端补齐。

## 2. 本轮产品调研观察

### 2.1 钱包

现状：

- 钱包视觉上已有余额卡、收入/支出筛选、交易记录。
- model proxy 内部预扣/调账已从 ToC 钱包列表隐藏。
- 服务购买后已能看到 `settlement +8`。

问题：

- 分页总数仍基于原始流水，隐藏内部账务后会出现 `1-20 / 155` 但列表只有少量可见记录的困惑。
- `结算`、`购买`、`退款` 只有单条流水视角，缺少订单、商品、对方、来源 Buddy 等上下文。
- 消费者钱包和内部账务审计没有展示层分离。UI 过滤只能救当前页，不能保证 count、分页、搜索、导出等一致。
- 自己买自己 Buddy 商品时会出现 `purchase -8` 与 `settlement +8`，账本正确，但用户需要“自购测试/自有店铺收入”的解释或合并展示策略。

### 2.2 我的权益

现状：

- 已按 active / expiring / inactive 分组。
- 可展示商品、店铺、关联 paid file、到期时间。
- active paid file 可从权益页打开右侧预览。

问题：

- “权益”“付费文件”“查看”“打开内容”等文案混在一起，用户很难第一眼判断“我买了什么、能做什么、何时失效”。
- paid file 资源名、商品名、店铺名展示优先级还不够稳定，部分记录仍可能降级到资源 ID。
- “需要有效权益”和“打开”在聊天 paid-file 卡片中可同时出现，已购用户会觉得状态矛盾。
- 缺少订单入口、购买时间、价格、来源 Buddy、退款/失效规则摘要。

### 2.3 我的店铺

现状：

- 店铺设置、创建虚拟服务商品、可售商品已经集中到设置页。
- 能创建 entitlement 商品，能展示商品列表和跳转商品详情。

问题：

- 创建商品表单仍偏工程后台：`资源类型`、`资源 ID`、`权益能力` 对普通创作者和 Buddy owner 过于底层。
- 缺少付费文件选择器/上传器；用户需要手填 resourceId，体验脆弱。
- 店铺不够像“创作者工作台”：缺少销售概览、最近购买、收入、商品状态、预览、复制/发送卡片等高频动作。
- 商品卡缺少“谁在卖”“在哪些场景可发”“发货物是什么”的直观提示。

### 2.4 发货记录

现状：

- 商家侧能看到本店已发出的 entitlement。
- 能显示买家、到期、发货状态。

问题：

- 页面名称叫“发货记录”，但虚拟服务更像“销售与交付记录”。
- 当前列表展示大量 UUID：resourceId、buyerId，普通 ToC/创作者很难理解。
- 缺少订单号、商品名、买家昵称/头像、金额、结算状态、交付物、打开状态、失败恢复动作。
- 发货状态没有 timeline，也没有“购买完成 -> 权益发放 -> 卡片发送 -> 用户打开”的过程感。

### 2.5 商品卡片与购买确认

现状：

- 商品卡片点击会走服务端 checkout preview。
- 未购买弹确认，已购买直接打开。
- 购买成功后有解锁过程动画，再打开右侧 paid file。

问题：

- 商品卡片和 paid-file 卡片视觉语言还不统一：商品是“权益”，paid-file 是“需要有效权益”，但两者本质是同一购买后可打开内容链路。
- 商品卡片存在多条历史重复发送时，聊天区会堆积很多近似卡片和文件卡片。
- 购买确认弹窗能展示商品、价格、权益信息，但缺少钱包余额、购买后余额、卖家、有效期、退款/撤销规则的更清晰结构。
- 成功态主要引导“查看权益”，但主任务经常是“立即打开内容”。

### 2.6 付费文件预览

现状：

- paid file 已复用聊天右侧文件预览。
- HTML 文件支持 preview/code/fullscreen/download。
- grant 过期时可重新申请。

问题：

- paid file、普通附件、商品权益打开都进入同一个 panel，但用户不知道当前是“已购内容”还是“普通文件”。
- 预览 header 只显示文件名/大小，缺少商品/权益上下文。
- 无权限时缺少同一 panel 内的 paywall 空间：理想体验是右侧直接显示购买摘要与 CTA，而不是让用户在卡片、弹窗、预览之间跳。

## 3. 第六期产品目标

第六期目标是把 Commerce MVP 从“能跑通”提升为“自然、可信、可复购”。

核心目标：

1. 消费者能在 3 秒内理解商品卡片状态：未购买、已拥有、已过期、不可售、正在发货。
2. 用户购买后有明确的过程反馈，知道钱扣到哪里、权益何时发放、内容在哪里打开。
3. 我的权益成为消费者的“已购内容库”，而不是 entitlement 调试列表。
4. 钱包成为可信交易流水，不展示内部模型账务噪音，分页/筛选/count 一致。
5. 我的店铺成为个人/Buddy 的轻量销售工作台，隐藏底层 resource/capability，默认通过选择资源来创建商品。
6. 发货记录升级为销售与交付中心，商家能看懂每笔收入和交付状态。
7. 付费内容预览统一成右侧 Content Drawer，普通文件、付费文件、商品权益都使用同一套 opening/paywall/error/regrant 体验。

## 4. 体验原则

### 4.1 产品语言优先

默认展示“商品、内容、卖家、有效期、订单、收入、交付状态”，隐藏 `resourceId`、`capability`、`entitlementId`、`grantId`。底层字段只在开发者详情或复制诊断里出现。

### 4.2 状态单一来源

商品卡片、购买弹窗、权益页、预览页都不能各自猜购买态。统一通过服务端可信状态返回：

- `viewerState`
- `primaryAction`
- `accessSummary`
- `deliveryState`
- `contentPreview`

### 4.3 主动作明确

每个 surface 只保留一个主动作：

- 未购买：购买
- 已拥有且可打开：打开内容
- 已过期：重新购买 / 续期
- 不可售：查看详情
- 发货中：查看进度
- 发货失败但权益存在：从权益打开内容

### 4.4 可恢复比完美成功更重要

购买成功后，即使发货消息失败，用户也必须能从商品卡片、权益页、订单页或 Content Drawer 重新打开内容。

### 4.5 对话体验不堆卡片

Buddy 可以自然推销，但聊天区需要控制重复卡片的视觉噪音。历史卡片不能删除，但新体验可以折叠同一 offer 的重复卡片、突出最新可操作卡片。

## 5. 信息架构方案

### 5.1 设置页 Commerce 分组

现有设置页保留入口，但建议把以下几项视觉上归入一个 Commerce 分组：

- 钱包
- 我的权益
- 我的店铺
- 销售与交付

短期不改路由，只调整导航分组、标题和空状态。

### 5.2 钱包页

消费者钱包分为三块：

1. 余额卡：余额、冻结金额、充值、赚虾币。
2. 交易流水：只展示 ToC 可理解记录。
3. 交易详情抽屉：订单、商品、卖家/买家、关联权益、结算说明。

交易列表建议字段：

- 类型：充值 / 购买 / 结算 / 退款 / 奖励 / 调整。
- 标题：商品名或业务名。
- 副标题：卖家/买家、订单号、来源 Buddy。
- 金额：正负虾币。
- 状态：已完成 / 处理中 / 已退款。
- 时间。

内部模型调用账务：

- 不进入普通钱包列表。
- 后续如需用户可见，使用聚合条目“AI 模型用量”，按自然日或会话汇总净额，不展示预扣/调账细目。

### 5.3 我的权益页

定位：已购内容库。

默认卡片信息：

- 商品名。
- 可打开内容：文件名、类型、大小。
- 来源：店铺 / Buddy。
- 有效期：剩余时间、到期日期。
- 状态：可用 / 即将到期 / 已过期 / 已撤销。
- 主动作：打开内容 / 续期 / 查看详情。

二级动作：

- 查看订单。
- 查看卖家。
- 复制诊断 ID。

分组建议：

- 可打开
- 即将到期
- 已失效

筛选建议：

- 全部
- 付费文件
- 订阅
- 服务

### 5.4 我的店铺页

定位：个人/Buddy 的轻量销售工作台。

首页布局：

- 顶部概览：今日收入、累计收入、可售商品、近 7 日购买。
- 店铺资料：名称、描述、展示头像。
- 商品列表：商品状态、价格、有效期、交付物、最近销售、主动作。
- 创建商品入口：向导，而不是工程表单。

创建商品向导：

1. 选择商品类型：
   - 付费文件
   - 虚拟服务
   - 订阅服务
2. 选择交付内容：
   - 从工作区文件选择
   - 上传文件
   - 暂无交付物，手动服务
3. 填写商品信息：
   - 名称
   - 简介
   - 价格
   - 有效期
4. 预览商品卡片：
   - 聊天卡片预览
   - 购买确认预览
   - paid-file 预览
5. 发布：
   - 保存草稿
   - 上架
   - 复制商品卡片 / 在聊天中发送

高级设置折叠：

- resourceType
- resourceId
- capability
- offer surface
- deliverable metadata

### 5.5 销售与交付页

替代“发货记录”的产品语言。

列表字段：

- 买家头像和昵称。
- 商品名。
- 金额。
- 订单号。
- 购买时间。
- Entitlement 状态。
- 交付状态。
- 交付物。

详情 timeline：

1. 订单完成。
2. 钱包扣款。
3. 卖家结算。
4. 权益发放。
5. 交付任务创建。
6. paid-file 卡片发送。
7. 用户打开内容。

异常恢复：

- 重新发送 paid-file 卡片。
- 查看权益。
- 查看订单。
- 复制诊断信息。

### 5.6 商品详情页

商品详情页需要同时服务买家和卖家。

买家视角：

- 商品名、简介、价格、卖家。
- 已购买状态和到期时间。
- 主动作：购买 / 打开内容 / 续期。
- 权益说明和交付方式。

卖家视角：

- 商品预览。
- 编辑商品。
- 复制/发送商品卡片。
- 查看销售记录。
- 下架/删除。

### 5.7 聊天商品卡片

商品卡片建议统一状态：

- `购买`
- `打开`
- `续期`
- `查看`
- `不可售`

卡片内容：

- 商品名。
- 价格。
- 有效期。
- 交付物类型。
- 当前状态徽标。
- 来源店铺/Buddy。

重复卡片策略：

- 同一会话、同一 offer 连续出现时，旧卡片可降级为紧凑态。
- 最新卡片保持完整操作。
- paid-file 发货卡片若重复出现，默认折叠为“已发放内容 x N”，打开最新有效 grant。

### 5.8 Content Drawer

右侧文件预览升级为统一 Content Drawer。

支持三种模式：

- 普通文件：文件名、大小、预览/代码/下载。
- 已购内容：商品名、文件名、有效期、预览/代码/全屏/下载。
- 未购内容：paywall 摘要、价格、权益、购买 CTA。

无权限时不应只报错，应展示：

- 商品信息。
- 购买按钮。
- 登录/余额不足/不可售状态。
- 失败原因 code 对应 i18n 文案。

## 6. 技术方案

### 6.1 服务端展示状态 API

新增或扩展统一展示状态协议，避免 Web 各页面各自组装。

建议扩展 `GET /api/commerce/offers/:offerId/checkout-preview`：

```ts
type CommerceViewerState =
  | 'not_purchased'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'revoked'
  | 'cancelled'
  | 'unavailable'

type CommercePrimaryAction =
  | 'purchase'
  | 'open_content'
  | 'renew'
  | 'view_detail'
  | 'view_progress'
  | 'unavailable'

type CommerceDisplayState = {
  viewerState: CommerceViewerState
  primaryAction: CommercePrimaryAction
  price: { amount: number; currency: string }
  balance?: { current: number; afterPurchase?: number; shortfall?: number }
  seller: { shopId: string; shopName: string; buddyUserId?: string | null }
  entitlement?: {
    id?: string
    status?: string
    resourceType: string
    resourceId: string
    capability: string
    expiresAt?: string | null
  }
  delivery?: {
    state: 'not_started' | 'pending' | 'sent' | 'failed' | 'recoverable'
    deliverableKind?: 'paid_file' | 'message' | 'external'
  }
  content?: {
    kind: 'paid_file' | 'file' | 'service'
    fileId?: string
    name?: string
    mime?: string | null
    sizeBytes?: number | null
  }
}
```

原则：

- 客户端只渲染，不推断核心购买态。
- 服务端只返回结构化 code，不返回用户可见错误 prose。
- 当前 `viewerState` / `nextAction` 可以保留，但第六期新增 `primaryAction` 和 `displayState`，逐步让 UI 迁移。

### 6.2 钱包展示 API

新增消费者展示查询：

- `GET /api/wallet/transactions?audience=consumer&limit=&cursor=`
- `GET /api/wallet/transactions/count?audience=consumer`

服务端负责过滤或聚合内部账务：

- 排除 `referenceType = model_proxy` 的预扣/调账。
- 后续提供自然日聚合后的 AI 用量记录。
- count、分页、列表必须使用同一条件。

返回建议扩展：

```ts
type WalletTransactionDisplay = {
  id: string
  type: 'topup' | 'purchase' | 'refund' | 'reward' | 'transfer' | 'adjustment' | 'settlement'
  amount: number
  balanceAfter: number
  titleKey?: string
  noteCode?: string
  referenceType?: string | null
  referenceId?: string | null
  order?: { id: string; orderNo: string; productName?: string | null }
  counterparty?: { userId?: string | null; displayName?: string | null; avatarUrl?: string | null }
  createdAt: string
}
```

### 6.3 权益列表 API

现有 `GET /api/entitlements` 已经 richer。第六期建议补充：

- `displayTitle`
- `displaySubtitle`
- `sourceLabelCode`
- `primaryAction`
- `content`
- `orderSummary`
- `sellerSummary`
- `remainingSeconds`

这些字段由服务端按结构生成，客户端通过 i18n key 渲染文案。

### 6.4 销售与交付 API

新增商家展示接口，避免用 entitlement 原表直接充当发货记录：

- `GET /api/commerce/sales?shopId=&status=&cursor=`
- `GET /api/commerce/sales/:orderId`

聚合：

- order
- order item
- product
- offer
- buyer user
- entitlement
- fulfillment jobs
- wallet settlement transaction
- paid file deliverable

### 6.5 商品创建资源选择

新增资源选择能力：

- `GET /api/commerce/resource-picker?kind=paid_file|workspace_file|service`
- `POST /api/shops/:shopId/products/drafts`
- `POST /api/shops/:shopId/products/:productId/publish`

MVP 可先不落独立 draft 表，先用前端向导收集后一次性创建 product + default offer + deliverable。但 API 设计应为未来 Agent 草稿和审核留出空间。

### 6.6 前端组件拆分

建议新增/重构组件：

- `CommerceCard`：聊天和商品详情共用卡片视觉。
- `CommerceStatusBadge`：统一购买态/交付态。
- `PurchaseFlowModal`：购买确认、支付中、发货中、完成、失败恢复。
- `ContentDrawer`：替代 FilePreviewPanel 的上层容器，内部仍复用文件预览能力。
- `EntitlementLibraryCard`：权益页卡片。
- `WalletTransactionItem`：钱包交易项。
- `ShopProductWizard`：商品创建向导。
- `SalesDeliveryRecordCard`：销售与交付记录。

注意：

- 所有新文案进入 i18n。
- 不硬编码面向用户的错误提示。
- 不把 card 状态逻辑散落在多个页面。

### 6.7 安全与权限

第六期仍保持以下边界：

- 钱包余额变更只走 `LedgerService`。
- 展示 API 不允许泄露普通用户不该看的钱包流水、卖家结算或 buyer 信息。
- paid file 继续走 grant gateway，不暴露对象存储原始地址。
- HTML 预览继续 sandbox；后续若允许上传 HTML，需要服务端 MIME/大小/扫描策略。
- 商品创建的 resource picker 必须按 Actor 授权过滤可选资源。
- 服务端只存状态码、reasonCode、结构化 metadata，不存用户可见错误 prose。

## 7. 实施批次

### 批次 1：状态协议与钱包一致性

目标：

- 先解决可信状态和钱包展示不一致。

范围：

- 扩展 checkout preview 的 `displayState/primaryAction`。
- 增加 wallet consumer audience 查询，服务端过滤内部 model proxy 流水。
- 钱包分页/count 与列表一致。
- 钱包交易项展示商品/订单/对方摘要。

验收：

- 钱包收入页不显示内部模型预扣/退款，分页数量正确。
- 商品卡片、购买弹窗、权益页使用同一 `primaryAction` 判断。
- 相关 API/SDK/文档同步。

### 批次 2：购买与预览体验统一

目标：

- 让“点卡片 -> 确认 -> 解锁 -> 右侧打开”成为完整而稳定的产品体验。

范围：

- Purchase modal 增加余额、购买后余额、卖家、有效期、交付方式、退款规则摘要。
- 成功后主 CTA 优先“打开内容”，次级入口“查看权益”。
- Content Drawer 增加已购内容 header 和 paywall 状态。
- paid-file 卡片根据 access state 展示“打开/购买/续期/不可用”。
- grant 续签失败时展示可恢复错误状态。

验收：

- 未购买点击商品卡片弹确认。
- 已购买点击商品卡片直接右侧打开。
- 无权限打开 paid-file 时，右侧可展示购买入口。
- 购买后不会突然跳出新窗口。

### 批次 3：权益库打磨

目标：

- 我的权益从调试列表变成已购内容库。

范围：

- 卡片重排：商品名、来源、内容、剩余时间、主动作。
- 增加筛选和搜索。
- 增加订单/卖家详情入口。
- 隐藏 UUID，提供复制诊断信息的低优先级入口。
- 空状态引导回聊天/Buddy/店铺。

验收：

- 用户能理解自己买了什么、从哪里打开、什么时候到期。
- 页面不出现内部调试字段作为主信息。
- paid file 从权益页打开和聊天右侧打开体验一致。

### 批次 4：店铺创建向导

目标：

- 让个人/Buddy owner 能用自然方式创建付费文件商品。

范围：

- 用向导替代默认工程表单。
- 资源选择器支持从工作区文件选择。
- 商品卡片、购买弹窗、付费文件预览三种预览。
- 商品列表展示销售、交付物、状态和操作。
- 高级字段折叠。

验收：

- 用户不需要手填 resourceId 就能创建 paid-file 商品。
- 创建后自动生成 default offer 和 paid_file deliverable。
- 新商品可在聊天 product picker 中选择并发送。

### 批次 5：销售与交付中心

目标：

- 商家能看懂交易、收入和交付结果。

范围：

- “发货记录”改为“销售与交付”。
- 新增聚合 sales API。
- 列表显示买家昵称、商品、金额、订单、交付状态。
- 详情 timeline 展示购买、扣款、结算、权益、发货、打开。
- 增加可恢复动作。

验收：

- 商家不看数据库也能定位每笔交易状态。
- 购买成功但消息发货失败时，页面可提示权益已存在并提供恢复入口。
- 结算收入可从销售记录跳到钱包交易详情。

### 批次 6：聊天卡片降噪与发送体验

目标：

- 让 Buddy 销售看起来更像自然对话，而不是刷卡片。

范围：

- 同 offer 重复卡片紧凑化。
- 商品卡片状态实时刷新或按需 rehydrate。
- `+` 菜单中的文件/商品/附件入口统一视觉。
- Product Picker 增加商品预览和当前用户购买态。
- Buddy 已知用户已购买时，优先发送 paid-file/open 引导，而非重复购买卡片。

验收：

- 同一商品多次出现不会把聊天区刷满。
- 已购用户看到的主动作是打开。
- Buddy 推销和卡片发送之间有自然文案衔接。

## 8. 测试计划

### 8.1 E2E

使用 docker compose 环境覆盖：

- 钱包 consumer 列表不出现 model proxy 内部流水。
- 聊天商品卡未购购买成功。
- 已购商品卡直接右侧打开 paid file。
- 我的权益打开同一 paid file。
- 店铺向导创建 paid-file 商品并在聊天发送。
- 销售与交付记录展示购买、结算、权益、发货。

### 8.2 单元/集成

- checkout preview displayState。
- wallet consumer transaction filter/count。
- entitlement display summary。
- sales aggregation API。
- paid file grant reissue。
- resource picker authorization。

### 8.3 视觉回归

建议对以下页面保留截图基线：

- 钱包。
- 我的权益。
- 我的店铺。
- 销售与交付。
- 购买确认弹窗。
- 聊天商品卡。
- Content Drawer paywall / preview / error。

## 9. 非目标

第六期不做：

- 完整平台审核后台。
- Agent 自动正式发布商品。
- 复杂优惠券、税费、分账周期。
- 多文件包和外链应用市场。
- Mobile 全量体验实现。
- 完整数据分析看板。

这些可以继续规划，但第六期只做必要接口留口和 Web 主体验打磨。

## 10. 风险与取舍

### 10.1 UI 过滤与服务端过滤

钱包这类财务页面必须迁到服务端 consumer view，否则 UI 筛选会造成分页、count 和导出不一致。

### 10.2 工程字段隐藏后仍需诊断

用户不应看到 UUID，但开发调试仍需要。建议统一提供“复制诊断信息”入口，包含 orderId、offerId、entitlementId、grantId。

### 10.3 向导与高级配置并存

如果完全隐藏 resource/capability，会阻碍高级用例；如果默认展示，又会吓跑普通用户。第六期采用“默认向导 + 高级折叠”的取舍。

### 10.4 Buddy 重复推销

只靠前端折叠不能解决根因。第六期前端先降噪，同时继续让 Agent 上下文包含购买态和最近发卡态。

## 11. 第六期完成定义

第六期完成时，应满足：

- 用户能从聊天自然购买 Buddy 商品，购买后理解扣款、发货和打开过程。
- 钱包只展示消费者可理解的交易，分页和数量准确。
- 我的权益像已购内容库，能稳定打开内容。
- 我的店铺能用向导创建 paid-file 商品，不需要手填 resourceId。
- 销售与交付页面能解释每笔订单、收入和发货状态。
- 商品卡片、购买弹窗、权益页、预览页使用统一状态协议。
- 所有新增 UI copy 走 i18n。
- API 文档、TypeScript SDK、Python SDK 同步新增展示协议。
- `pnpm check:security-pr`、相关 typecheck、核心集成测试和 E2E 通过。

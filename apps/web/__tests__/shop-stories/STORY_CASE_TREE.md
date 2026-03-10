# Shop Web UI 测试蓝图（系统化 Story / Case Tree）

> 目标：对店铺 Web 端做可回归、可追踪、可扩展的 UI 层 E2E 测试体系。  
> 方法：按 **业务闭环（Story）× 角色（Role）× 风险（Risk）× 状态迁移（State）** 建模，不按组件碎片建模。

---

## 1) 设计原则（为什么这样分）

1. **按业务闭环分 Story**：每个 Story 对应可交付业务价值（例如“上架发布”、“买家下单”、“履约售后”）。
2. **按角色拆路径**：`seller/admin`、`buyer`、`multi-user` 必须拆开验证。
3. **按风险优先级排序**：
   - P0：阻断交易/资金/权益发放/数据保存
   - P1：高频核心体验
   - P2：增强体验与边缘
4. **按状态机验证**：从“输入/点击”到“请求”到“UI反馈”到“数据持久化回显”完整断言。
5. **异常优先**：每个关键按钮至少一条 400/500 失败路径。

---

## 2) 领域覆盖矩阵（Domain Coverage Matrix）

| 领域 | 核心目标 | 必测要点 |
|---|---|---|
| 商品管理 | 可上架、可编辑、可删除 | 表单读写、保存成功/失败、列表回显 |
| 媒体上传 | 可上传、可预览、可替换、失败可见 | FormData、上传接口、错误提示、位置顺序 |
| 店铺设置 | 信息可读写并持久化 | 读取初始化、修改保存、刷新回显 |
| 买家消费 | 浏览→加购→下单→订单查看 | 请求 payload、余额/库存错误、成功反馈 |
| 订单售后 | 取消、评价、多商品评价 | 状态可操作性、目标商品选择、错误提示 |
| 多用户流程 | 卖家上架→买家消费→卖家看单 | 跨角色数据一致性 |
| 异常韧性 | 关键按钮失败反馈统一 | 400/500 提示文本可见、状态不脏写 |

---

## 3) Story / Case Tree（重规划版）

```text
shop-stories/
├── _foundation/
│   ├── F01-test-harness-and-mocks.testkit.tsx
│   ├── F02-fixtures.roles-and-entities.ts
│   └── F03-assertions.request-ui-state.ts
│
├── S01-seller-catalog-lifecycle/                # 卖家商品全生命周期（P0）
│   ├── C01-create-physical-product.success.test.tsx
│   ├── C02-create-entitlement-product.success.test.tsx
│   ├── C03-edit-product.persist-and-echo.test.tsx
│   ├── C04-delete-product.success-and-list-refresh.test.tsx
│   ├── C05-delete-product.500-error-toast.test.tsx
│   ├── C06-category-create-edit-delete.flow.test.tsx
│   └── C07-category-delete.500-error-toast.test.tsx
│
├── S02-media-upload-experience/                 # 媒体上传交互（P0）
│   ├── C01-upload-product-gallery.success.test.tsx
│   ├── C02-upload-product-gallery.500-failure.test.tsx
│   ├── C03-gallery-remove-and-reorder.persist.test.tsx
│   ├── C04-upload-shop-logo-banner.success.test.tsx
│   ├── C05-upload-shop-logo-banner.failure.test.tsx
│   └── C06-upload-state.loading-and-reset.test.tsx
│
├── S03-shop-settings-read-write/                # 店铺信息读写保存（P0）
│   ├── C01-settings-initial-read.render.test.tsx
│   ├── C02-settings-update-save-success.test.tsx
│   ├── C03-settings-save-400-error-toast.test.tsx
│   ├── C04-settings-save-500-error-toast.test.tsx
│   └── C05-settings-save-idempotency-retry.test.tsx
│
├── S04-buyer-discovery-and-product-detail/      # 买家发现与详情决策（P1）
│   ├── C01-search-filter-sort.combined.test.tsx
│   ├── C02-category-filter.request-params.test.tsx
│   ├── C03-product-detail-sku-selection-price-stock.test.tsx
│   ├── C04-product-detail-media-carousel-image-video.test.tsx
│   ├── C05-add-to-cart.success-and-badge-update.test.tsx
│   └── C06-add-to-cart-500-error-toast.test.tsx
│
├── S05-buyer-cart-checkout-payment/             # 购物车与结算（P0）
│   ├── C01-cart-select-all-and-total-calc.test.tsx
│   ├── C02-cart-quantity-boundary-1-99.test.tsx
│   ├── C03-cart-remove-item.success-refresh.test.tsx
│   ├── C04-checkout-success.order-created-wallet-updated.test.tsx
│   ├── C05-checkout-400-insufficient-balance.test.tsx
│   ├── C06-checkout-400-insufficient-stock.test.tsx
│   └── C07-checkout-500-server-error.test.tsx
│
├── S06-order-lifecycle-and-after-sale/          # 订单生命周期与售后（P0）
│   ├── C01-order-list-status-tabs.request.test.tsx
│   ├── C02-order-cancel-allowed-status.success.test.tsx
│   ├── C03-order-cancel-forbidden-status-400.test.tsx
│   ├── C04-review-submit-single-item.success.test.tsx
│   ├── C05-review-submit-multi-item-select-target.test.tsx
│   ├── C06-review-submit-500-error-toast.test.tsx
│   └── C07-order-empty-and-partial-empty-states.test.tsx
│
├── S07-admin-order-fulfillment/                 # 商家履约与管理看板（P1）
│   ├── C01-admin-orders-endpoint-manage.test.tsx
│   ├── C02-admin-orders-filter-paid-pending.test.tsx
│   ├── C03-admin-orders-item-rendering.test.tsx
│   └── C04-admin-orders-empty-state.test.tsx
│
├── S08-multi-user-end-to-end-commerce/          # 多用户交易主线（P0）
│   ├── C01-seller-publish-buyer-visible.test.tsx
│   ├── C02-buyer-purchase-seller-receive-order.test.tsx
│   ├── C03-buyer-review-seller-observe-feedback.test.tsx
│   └── C04-cross-user-data-consistency.test.tsx
│
└── S09-resilience-and-regression-guard/         # 回归守卫（P0/P1）
    ├── C01-all-critical-mutations-have-error-feedback.test.tsx
    ├── C02-no-inert-primary-action-buttons.test.tsx
    ├── C03-wallet-and-cart-query-invalidation.test.tsx
    └── C04-route-contract-alignment-web-vs-server.test.tsx
```

---

## 4) Case 标准模板（每个用例必须满足）

每个 Case 文件必须至少包含以下断言链：

1. **Given**：页面初始数据（mock）
2. **When**：真实 UI 交互（click/type/upload）
3. **Then-Request**：接口路径/方法/body 正确
4. **Then-UI**：成功或失败反馈可见（toast/alert/状态变化）
5. **Then-State**：关键状态刷新/回显正确（列表、badge、金额、tab）

---

## 5) 执行顺序（建议）

- Wave 1（P0）：`S01 + S02 + S03 + S05 + S06 + S08`
- Wave 2（P1）：`S04 + S07 + S09`

> 当前实现状态：已有部分历史用例将被迁移到本树下，统一命名与断言标准后再跑全量。

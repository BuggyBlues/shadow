# Shadow 移动端技术方案（Expo）

## 1. 目标与原则

基于当前 `apps/web` 的工程实践，设计一套 **可维护、可扩展、可快速迭代** 的移动端方案（iOS/Android）。

核心目标：

1. **架构合理**：分层清晰，业务与框架解耦，支持中长期演进。
2. **易于维护**：统一类型、路由、状态与接口调用规范，降低心智负担。
3. **快速迭代**：通过 OTA（EAS Update）加速 JS/UI 迭代，减少发版阻塞。
4. **UI/UX 优雅**：原生交互流畅、视觉一致、动效克制且具可访问性。

---

## 2. 参考现状（apps/web）

当前 Web 端关键技术选型：

- 路由：`@tanstack/react-router`
- 数据请求：`@tanstack/react-query`
- 状态管理：`zustand`
- 国际化：`i18next` + `react-i18next`
- 设计系统：`@shadowob/ui` + Tailwind 风格 token
- 实时通信：`socket.io-client`

移动端方案将尽可能保持概念一致，确保团队迁移成本最低。

---

## 3. 建议技术栈（Expo SDK 55+）

### 3.1 框架与导航

- **Expo（React Native）**：主框架
- **Expo Router**：文件路由（推荐）
  - 理由：深链天然支持、目录即路由、与 Web URL 思维一致，适合快速迭代

### 3.2 数据与状态

- **TanStack Query**：服务端状态（缓存、重试、失效、并发请求管理）
- **Zustand**：客户端状态（UI 状态、会话态、临时交互态）
- **Zod（可选）**：接口运行时校验，提升线上数据健壮性

### 3.3 网络与实时

- `fetch` 封装（与 `apps/web/src/lib/api` 对齐）
- `socket.io-client`（与现有后端实时协议保持一致）

### 3.4 UI 与体验

- 组件基座：`@shadowob/ui`（逐步抽象跨端基础组件）
- 图标：`lucide-react-native`（与 Web 图标语义对齐）
- 动效：`react-native-reanimated` + `react-native-gesture-handler`
- 列表：FlashList（高性能长列表）

### 3.5 i18n 与主题

- `i18next` + `react-i18next`（复用 Web 文案资源结构）
- 浅色/深色主题 + 语义化 token（不直接耦合具体颜色值）

### 3.6 工程与发布

- 开发：Development Build（不建议依赖 Expo Go 做生产级验证）
- 构建：EAS Build
- OTA：EAS Update（按 channel 管理）
- 提交商店：EAS Submit

---

## 4. 推荐工程结构（拟新增 `apps/mobile`）

```txt
apps/mobile/
  app/                         # Expo Router 路由目录
    (auth)/
    (main)/
      chats/
      buddies/
      marketplace/
      settings/
    _layout.tsx
    +not-found.tsx

  src/
    api/                       # API client & endpoint modules
    features/                  # 按业务域组织（DDD-lite）
      chat/
      buddy/
      marketplace/
      auth/
    stores/                    # zustand stores
    hooks/                     # 通用 hooks
    lib/                       # query client / socket / utils
    components/
      common/
      business/
    theme/
      tokens.ts
      index.ts
    i18n/
      index.ts
      locales/

  assets/
  app.config.ts                # Expo app config
  eas.json
  package.json
  tsconfig.json
```

设计说明：

- **路由在 `app/`，业务逻辑在 `src/features/`**，避免路由文件膨胀。
- 采用 feature-first，减少“按技术分层导致业务散落”。
- 与 `apps/web` 名词对齐（marketplace、buddy、settings 等），方便跨端协作。

---

## 5. 分层架构设计

### 5.1 表现层（UI）

- 页面（Screen）只负责：布局、用户交互、触发 useCase
- 组件分两类：
  - `common`：纯展示、可复用
  - `business`：业务组合组件

### 5.2 应用层（UseCase）

- 在 `features/*/hooks` 或 `features/*/use-cases` 组织
- 负责流程编排（如：下单、签约、加入频道）
- 不直接依赖平台 API（便于测试）

### 5.3 基础设施层（Infra）

- API Client、WebSocket、Storage、Push、Deep Link
- 与 Expo 模块（Notifications、SecureStore 等）隔离封装

---

## 6. 状态管理策略（与 Web 对齐）

### 6.1 服务端状态（Query）

- 所有服务端数据优先进入 TanStack Query
- 规范 query key：`['domain', 'resource', params...]`
- mutation 完成后统一 `invalidateQueries`

### 6.2 客户端状态（Zustand）

仅保存：

- 临时 UI 状态（弹层、筛选面板开关）
- 跨页面短期状态（如选中的 server/listing）
- 会话级状态（token 可放 SecureStore + 内存镜像）

避免把服务端数据复制到 store，降低双写与同步成本。

---

## 7. 路由与深链策略

- 使用 Expo Router 文件路由，天然支持 Deep Link。
- 统一 URL 设计（对齐 web 语义）：
  - `/marketplace/:listingId`
  - `/profile/:userId`
  - `/servers/:serverSlug/channels/:channelId`
- 配置：
  - `scheme: shadow`
  - iOS `associatedDomains`
  - Android `intentFilters` + `autoVerify`

收益：消息通知点击、外链分享、H5 跳转可直达目标页面。

---

## 8. UI/UX 设计规范（优雅且可落地）

### 8.1 视觉与交互

- 采用 8pt spacing system
- 统一圆角、阴影、层级（elevation/token）
- 动效时长建议：120ms / 200ms / 280ms 三档
- 页面切换优先使用原生导航过渡，减少“Web 感”

### 8.2 可访问性

- 所有可点击元素设置 `accessibilityLabel`
- 字体缩放适配（Dynamic Type）
- 颜色对比满足 WCAG AA

### 8.3 性能体验

- 首屏骨架屏（skeleton）+ 渐进加载
- 长列表使用虚拟化（FlashList）
- 图片懒加载与缓存策略

---

## 9. 推送、实时与离线能力

### 9.1 推送通知

- 使用 `expo-notifications`
- 开发/生产均基于 Development Build/Release Build 验证（非模拟器）
- 在通知 payload 中携带路由 URL，点击后由 Expo Router 跳转

### 9.2 实时通信

- 复用 `socket.io` 事件模型
- 统一连接管理（前后台切换、重连退避）

### 9.3 离线与容错

- Query 缓存 + 失败重试
- 关键交互（发消息、下单）提供幂等 key（后端协同）

---

## 10. 构建与发布策略

### 10.1 环境分层

- `development`：本地与联调
- `preview`：测试包（内部测试）
- `production`：商店发布

### 10.2 EAS 策略

- Build Profiles：`development` / `preview` / `production`
- Update Channels：`dev` / `staging` / `production`
- runtimeVersion 建议：
  - 初期用 `appVersion`
  - 中后期切换 `fingerprint`，降低不兼容 OTA 风险

### 10.3 OTA 边界

可 OTA：JS、样式、文案、图片资源。

需发版：

- 新增原生依赖
- 权限/证书变更
- Expo SDK 升级
- 任何 native runtime 变更

---

## 11. 与现有仓库的集成建议

1. 新增 `apps/mobile`，保持 monorepo 一致。
2. 复用 `packages/shared` 的类型与常量，减少 DTO 漂移。
3. 逐步沉淀跨端组件到 `packages/ui`（先 token 与基础组件，再复杂业务组件）。
4. 在 `packages/sdk` 增补移动端友好 API 封装（错误码、分页、重试语义）。

---

## 12. 里程碑（建议 4 个 Sprint）

### Sprint 1：骨架与基础设施

- 初始化 `apps/mobile`（Expo Router + Query + Zustand + i18n）
- 完成鉴权、基础布局、主题、网络层

### Sprint 2：核心业务闭环

- Buddy 列表/详情
- Marketplace 列表/详情
- 个人资料页（与 web 新增能力对齐）

### Sprint 3：实时与通知

- Socket 实时消息/状态
- Push 通知 + deep link 跳转

### Sprint 4：体验打磨与发布

- 性能优化（列表、图片、渲染）
- E2E 冒烟流程
- EAS Build + Submit 上架流程

---

## 13. 风险与规避

1. **跨端 UI 不一致**：建立 token 与组件规范，禁止页面内硬编码样式。
2. **状态混乱**：严格区分 Query 状态与 Zustand 状态。
3. **OTA 误发导致崩溃**：使用 runtimeVersion 策略 + 分批 rollout。
4. **深链碎片化**：统一路由命名规范，通知/分享只传 URL。

---

## 14. 最终建议（结论）

采用 **Expo + Expo Router + TanStack Query + Zustand + EAS（Build/Update）** 的“与 `apps/web` 同构”方案，是当前 Shadow 最平衡的移动端路线：

- 对团队：学习成本最低，维护效率高。
- 对业务：可快速上线并持续 OTA 迭代。
- 对体验：可实现接近原生的流畅交互与优雅视觉。

该方案可在保证中长期可维护性的前提下，满足你提出的四个目标：**架构合理、易于维护、快速迭代、UI/UX 优雅**。

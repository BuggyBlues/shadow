# 🐱 虾豆前端 Bundle 优化审查报告

> 审查日期: 2026-04-12
> 审查范围: apps/web, apps/admin, packages/ui
> 构建工具: Rsbuild (Rspack)

---

## 🔴 P0 — 必须修复（影响巨大）

### 1. 所有页面组件静态导入，零懒加载

**严重程度**: 🔴 极高

`apps/web/src/main.tsx` 中 **所有 20+ 个页面组件全部静态导入**：

```typescript
// main.tsx — 全部静态导入
import { SettingsPage } from './pages/settings'
import { ShopPageRoute } from './pages/shop'
import { ShopAdminPageRoute } from './pages/shop-admin'
import { BuddyDashboardPage } from './pages/buddy-dashboard'
import { BuddyManagementPage } from './pages/buddy-management'  // 1799 行!
import { DiscoverPage } from './pages/discover'                   // 619 行
import { WorkspacePageRoute } from './pages/workspace'
// ... 等等
```

**问题**: 用户首次打开登录页时，需要下载 **整个应用的所有页面代码**（约 19,824 行源码）。

**影响最大的低频页面**:
| 页面 | 行数 | 使用场景 | 建议 |
|------|------|----------|------|
| `buddy-management.tsx` | 1,799 | Buddy 管理后台 | 懒加载 |
| `settings/index.tsx` + 子页面 | 2,000+ | 设置页 | 懒加载 |
| `discover.tsx` | 619 | 发现页 | 懒加载 |
| `friends.tsx` | 559 | 好友列表 | 懒加载 |
| `shop-admin.tsx` | 32 | 商城后台（商家低频） | 懒加载 |
| `create-listing.tsx` | 643 | 创建商品（低频操作） | 懒加载 |
| `contract-detail.tsx` | 669 | 合同详情 | 懒加载 |
| `my-rentals.tsx` | 711 | 我的租赁 | 懒加载 |
| `workspace.tsx` | 52 | 工作区 | 懒加载 |
| `marketplace-detail.tsx` | 893 | 市场详情 | 懒加载 |

**修复方案** — TanStack Router 原生支持 lazy:

```typescript
// 改为 lazy 导入
const SettingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('./pages/settings'), 'SettingsPage'),
})

// 或使用 React.lazy
import { lazy } from 'react'
const SettingsPage = lazy(() => import('./pages/settings'))
```

**预期收益**: 首屏 JS 减少 **40-60%**（取决于哪些页面被排除出初始包）

---

### 2. `@shadowob/ui` 的 barrel export 阻止 lucide-react tree-shaking

**严重程度**: 🔴 极高

```typescript
// packages/ui/src/index.ts
export * as Icons from 'lucide-react'
```

这行代码将 **整个 lucide-react 图标库（1600+ 个图标，~150KB gzipped）** 打包进 `@shadowob/ui`。即使任何文件只使用一个图标，也会导致全部图标被打包。

**影响范围**:
- 所有导入 `@shadowob/ui` 的文件都会间接拉入全部 lucide 图标
- `apps/web` 和 `apps/admin` 都依赖 `@shadowob/ui`

**修复方案** — 移除 barrel export，改为按需导入：

```diff
- export * as Icons from 'lucide-react'
+ // 按需导出实际使用的图标（或删除此 re-export，让用户直接 import lucide-react）
```

由于 `apps/web` 中所有组件已经直接从 `lucide-react` 按需导入图标（如 `import { Check, X } from 'lucide-react'`），删除这行不会影响现有代码。

**预期收益**: 减少约 **100-150KB gzipped**

---

### 3. 背景图片未优化 — 9.4MB 原始图片

**严重程度**: 🔴 高

| 文件 | 大小 | 问题 |
|------|------|------|
| `starry-night.png` | **6.5 MB** | PNG 格式，未压缩 |
| `bosch-garden-of-earthly-delights.jpg` | **2.9 MB** | 作为背景图过大 |

这些图片通过 `DynamicBackground` 组件使用，该组件只在 `app-layout.tsx` 中渲染。

**修复方案**:
1. 转换为 WebP 格式（通常减少 60-80% 体积）
2. 为图片添加多种尺寸（responsive images）
3. 使用 CSS `image-set()` 提供多分辨率选项
4. 目标大小: 每张图 < 500KB

**预期收益**: 减少约 **8-9 MB** 静态资源

---

### 4. i18n 全部语言静态打包

**严重程度**: 🟡 高

`apps/web/src/lib/i18n.ts` 静态导入了所有 5 种语言的 JSON：

```typescript
import en from './locales/en.json'       // 76 KB
import ja from './locales/ja.json'       // 90 KB
import ko from './locales/ko.json'       // 81 KB
import zhCN from './locales/zh-CN.json'  // 75 KB
import zhTW from './locales/zh-TW.json'  // 75 KB
// 总计: ~397 KB JSON
```

用户访问时所有语言都被打包进 JS，但同一时间只使用一种语言。

**修复方案** — 按需加载语言包：

```typescript
const localeMap: Record<string, () => Promise<Record<string, string>>> = {
  'zh-CN': () => import('./locales/zh-CN.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  en: () => import('./locales/en.json'),
  ja: () => import('./locales/ja.json'),
  ko: () => import('./locales/ko.json'),
}

async function loadLanguage(lang: string) {
  const resources = await localeMap[lang]()
  i18n.addResourceBundle(lang, 'translation', resources)
  i18n.changeLanguage(lang)
}
```

**预期收益**: 首屏减少约 **320 KB**（只保留默认语言 zh-CN）

---

## 🟡 P1 — 建议修复（明显收益）

### 5. lucide-react 多版本重复打包

**严重程度**: 🟡 中

项目中存在 **4 个不同版本** 的 lucide-react：

| 包 | 版本 |
|----|------|
| `apps/web` | 0.513.0 |
| `apps/admin` | 0.513.0 |
| `apps/desktop` | 0.577.0 |
| `packages/ui` | 1.7.0 |
| `apps/mobile` | 0.577.0 (lucide-react-native) |

`lucide-react@0.474.0` 也被锁在 pnpm-lock.yaml 中（可能是某个传递依赖引入的）。

**修复方案** — 统一版本到 `packages/ui` 使用的最新版（`^1.7.0`），通过 pnpm overrides 强制统一：

```jsonc
// package.json
{
  "pnpm": {
    "overrides": {
      "lucide-react": "^1.7.0"
    }
  }
}
```

**预期收益**: 消除重复版本，减少约 **100-150KB**

---

### 6. @shadowob/ui 存在未使用的依赖

**严重程度**: 🟡 中

以下依赖声明在 `packages/ui/package.json` 中，但在整个代码库中 **没有任何使用**：

| 依赖 | 估计大小 (gzipped) |
|------|-------------------|
| `recharts` | ~95 KB |
| `embla-carousel-react` | ~20 KB |
| `react-day-picker` | ~25 KB |
| `input-otp` | ~5 KB |
| `react-resizable-panels` | ~8 KB |

**修复方案** — 从 `packages/ui/package.json` 移除未使用的依赖。

**预期收益**: 减少约 **150 KB**

---

### 7. Rsbuild 配置缺少性能优化

**严重程度**: 🟡 中

`apps/web/rsbuild.config.ts` 和 `apps/admin/rsbuild.config.ts` 只有最基本的配置：

```typescript
// 当前配置只有: plugins, source, resolve, html, server, output
// 缺少:
```

**建议添加的配置**:

```typescript
export default defineConfig({
  // ... 现有配置
  output: {
    // 已有 assetPrefix
    // 添加 chunk 分割策略
    splitChunks: {
      strategy: 'split-by-experience',
      forceSplitting: {
        // 将大型第三方库拆分为独立 chunk
        'react-vendor': /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        'tanstack-vendor': /[\\/]node_modules[\\/]@tanstack[\\/]/,
        'i18n-vendor': /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
      },
    },
  },
  performance: {
    // 性能预算
    budget: {
      // 初始 JS 不超过 300KB
      initialJs: 300_000,
      // 初始 CSS 不超过 50KB
      initialCss: 50_000,
    },
  },
  tools: {
    rspack: {
      optimization: {
        moduleIds: 'deterministic', // 长期缓存
      },
    },
  },
})
```

---

### 8. `pinyin-pro` 静态导入

**严重程度**: 🟢 低

`apps/web/src/lib/pinyin.ts` 中：

```typescript
import { match } from 'pinyin-pro'
```

`pinyin-pro` 约 50KB (gzipped)，仅在搜索/匹配场景使用。

**修复方案** — 改为动态导入：

```typescript
export async function matchPinyin(text: string, query: string): Promise<'start' | 'partial' | false> {
  if (!query || !text) return false
  const { match } = await import('pinyin-pro')
  const indices = match(text, query)
  if (!indices || indices.length === 0) return false
  return indices[0] === 0 ? 'start' : 'partial'
}
```

**预期收益**: 减少首屏约 **50 KB**

---

### 9. `@emoji-mart/data` 静态导入

**严重程度**: 🟢 低

`apps/web/src/components/common/emoji-picker.tsx` 顶部：

```typescript
import data from '@emoji-mart/data'
```

emoji 数据约 500KB+（未压缩），仅在用户点击表情选择器时才需要。

**修复方案** — 动态导入：

```typescript
const data = await import('@emoji-mart/data')
// 然后在 Picker 组件中使用
```

**预期收益**: 减少首屏约 **100-150 KB**

---

## ✅ 已做对的

以下库已经正确地使用了 **动态导入**，无需修改：

| 库 | 位置 | 导入方式 |
|----|------|----------|
| `xlsx` | `file-preview-panel.tsx` | `await import('xlsx')` ✅ |
| `shiki` | `file-preview-panel.tsx` | `import('shiki')` ✅ |
| `jszip` | `file-preview-panel.tsx` | `await import('jszip')` ✅ |

---

## 📊 优化收益预估汇总

| 优化项 | 预估减少 (gzip) | 优先级 |
|--------|----------------|--------|
| 页面懒加载 | 首屏减少 40-60% | 🔴 P0 |
| 移除 lucide barrel export | ~100-150 KB | 🔴 P0 |
| 背景图片 WebP 压缩 | ~8-9 MB 原始 | 🔴 P0 |
| i18n 按需加载语言 | ~320 KB | 🔴 P0 |
| 统一 lucide 版本 | ~100-150 KB | 🟡 P1 |
| 移除未使用依赖 | ~150 KB | 🟡 P1 |
| Rsbuild 性能配置 | 长期缓存 + 合理分块 | 🟡 P1 |
| pinyin-pro 动态导入 | ~50 KB | 🟢 P2 |
| emoji-mart 动态导入 | ~100-150 KB | 🟢 P2 |

**总体预估**: 首屏 JS 可以从当前状态减少 **50-70%**，静态资源减少 **8+ MB**。

---

## 🔧 建议的实施顺序

1. **Phase 1 (立即)**: 移除 `@shadowob/ui` 中的 `export * as Icons from 'lucide-react'`，移除未使用的依赖
2. **Phase 2 (本周)**: 页面懒加载（从 Settings、BuddyManagement、Discover 等低频页面开始）
3. **Phase 3 (本周)**: 背景图片 WebP 压缩
4. **Phase 4 (下周)**: i18n 按需加载
5. **Phase 5 (下周)**: 统一 lucide-react 版本，添加 Rsbuild 性能配置
6. **Phase 6 (后续)**: pinyin-pro、emoji-mart 动态导入

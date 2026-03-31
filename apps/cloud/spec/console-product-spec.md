# Shadow Cloud Console — 产品规范

> **Version:** 2.0  
> **Date:** 2026-04-11  
> **Product Name:** Shadow Cloud Console (原 Dashboard)

---

## 1. 产品定位

Shadow Cloud Console 是一个**全链路 AI Agent 集群管理平台**，对标 AWS Console / 阿里云控制台。
用户可以通过 Console 完成从模板浏览、一键部署、集群监控到配置管理的全生命周期操作。

**核心价值**: 一个 Web UI 管理所有 AI Agent 集群 — 浏览商店、一键部署、实时监控、全链路管理。

---

## 2. 导航结构

```
Shadow Cloud Console
├── Console Home (/)               — 全局概览、快速操作、系统健康
├── Agent Store (/store)            — Agent 集群商店（核心功能）
│   ├── 商店首页 (/store)          — 推荐、分类、搜索
│   ├── 模板详情 (/store/:name)    — 详情、Agent 列表、配置说明
│   └── 部署向导 (/store/:name/deploy) — 四步部署向导
├── Clusters (/clusters)            — 集群管理
│   ├── 集群列表 (/clusters)       — 所有命名空间和部署
│   └── 集群详情 (/clusters/:ns)   — 命名空间内的部署详情
├── Deployments                     — 部署管理
│   └── 部署详情 (/deployments/:ns/:id) — Pod、日志、扩缩容
├── Configuration (/config)         — 配置中心
│   ├── 编辑器 (/config)           — JSON 编辑器
│   └── 验证器 (/validate)         — 配置验证
├── Monitoring (/monitoring)        — 监控中心
│   └── 健康检查 + 事件时间线
├── Resources                       — 资源管理
│   ├── Images (/images)
│   └── Runtimes (/runtimes)
├── Activity (/activity)            — 操作日志
└── Settings (/settings)            — 系统设置
    ├── Providers tab               — LLM Provider 管理
    └── System tab                  — 系统信息
```

---

## 3. Agent Store（核心功能）

### 3.1 商店首页 (/store)

| 区域 | 描述 |
|------|------|
| Hero Banner | 产品标语 + 全局搜索框 |
| 分类导航 | DevOps / Security / Support / Research / Content / 全部 |
| 推荐模板 | 置顶 featured 模板 (agentCount >= 3) |
| 模板网格 | 按分类过滤，支持搜索、排序 |
| 统计信息 | 总模板数、总 Agent 数 |

### 3.2 模板详情 (/store/:name)

| 区域 | 描述 |
|------|------|
| 头部 | 名称、团队、Agent 数量、分类标签、部署按钮 |
| Tab: Overview | 富文本描述、功能特性、系统要求 |
| Tab: Agents | Agent 列表（解析模板 JSON） |
| Tab: Configuration | 环境变量说明、配置选项 |
| 侧栏 | 快速信息卡 (namespace, runtime, agents) |

### 3.3 部署向导 (/store/:name/deploy)

四步向导:
1. **确认模板** — 展示模板概览，确认部署
2. **配置环境** — 设置 namespace、环境变量
3. **选择 Provider** — 配置 LLM Provider（从 Settings 预设选择或新建）
4. **部署** — 实时 SSE 日志流，部署进度

---

## 4. 集群管理

### 4.1 集群列表 (/clusters)

| 元素 | 描述 |
|------|------|
| 按命名空间分组 | 每个 namespace 显示部署数、Ready 数 |
| 快速操作 | Scale All / Destroy Namespace |
| 搜索过滤 | 按名称/命名空间搜索 |
| 自动刷新 | 10s 轮询 |

### 4.2 部署详情 (/deployments/:ns/:id)

| Tab | 内容 |
|-----|------|
| Pods | Pod 列表、状态、重启次数 |
| Logs | SSE 实时日志流 + 下载/清空 |
| Events | 部署事件时间线 |
| Config | 部署使用的配置 |

---

## 5. Console Home

全局概览:
- 四张统计卡片: 总部署/Ready/Not Ready/命名空间数
- 系统健康状态 (Doctor 摘要)
- 快速操作: Browse Store / View Clusters / Edit Config
- 最近活动时间线 (Activity Log 前 5 条)
- 最近部署列表 (前 5 个)

---

## 6. 监控中心

- Doctor 检查结果 (pass/warn/fail)
- 系统资源概况
- 事件时间线

---

## 7. 操作日志 (Activity)

基于 zustand + localStorage 持久化的操作记录:
- Deploy / Destroy / Scale 等操作
- 时间戳、类型、详情
- 可过滤、可搜索

---

## 8. 通用 UI 组件

| 组件 | 用途 |
|------|------|
| Sidebar | 可折叠侧边栏，带分组 |
| Modal | 模态对话框 |
| Tabs | 选项卡 |
| DataTable | 可排序表格 |
| StatCard | 统计卡片 |
| EmptyState | 空状态占位 |
| Badge | 标签/徽章 |
| StatusDot | 状态指示灯 |
| SearchInput | 搜索输入框 |
| CodeBlock | 代码块展示 |
| StepIndicator | 步骤指示器 |
| Breadcrumb | 面包屑导航 |

---

## 9. 技术栈

- React 19 + TanStack Router + TanStack Query
- Tailwind CSS 4
- zustand (全局状态 + 持久化)
- lucide-react (图标)
- date-fns (日期)
- clsx / tailwind-merge (样式工具)

**不新增 npm 依赖**。

---

## 10. 目标

- 总代码量: 10,000+ 行
- Bundle: 不限制 (CLI 内嵌)
- 品牌: Shadow Cloud Console
- 体验: 对标 AWS Console / 阿里云控制台

---

## 11. Phase 1 产品路线图

> **来源:** console-product.review (2026-04-12) — 专家评审识别的关键产品缺口

### 11.1 Agent Chat Panel（#1 缺失功能）

**路由:** `/deployments/:ns/:id/chat`（部署详情新增 Tab）

| 要素 | 描述 |
|------|------|
| 消息界面 | 类 ChatGPT 对话界面，支持流式 SSE 响应 |
| 上下文 | 自动绑定当前部署的 Agent，显示 Agent 名称和状态 |
| 历史记录 | 会话历史持久化（localStorage 或后端） |
| 快捷操作 | 预设 prompt 模板（"检查系统状态"、"生成报告"等） |
| 多 Agent | 支持在同一 namespace 内切换不同 Agent 对话 |

**价值:** 部署后的核心交互方式。当前用户部署 Agent 后无法直接在 Console 中与其交互。

### 11.2 Deployment Version History + Rollback

**路由:** `/deployments/:ns/:id/history`（部署详情新增 Tab）

| 要素 | 描述 |
|------|------|
| 版本列表 | 显示每次部署的时间戳、配置摘要、状态 |
| 配置 Diff | 两个版本之间的配置差异对比 |
| 一键回滚 | 选择历史版本 → 确认 → 回滚部署 |
| 状态标记 | 当前版本、上一版本、失败版本标记 |

**价值:** 部署出错时的安全网。当前没有回滚机制。

### 11.3 Post-Deploy Flow — "What's Next"

部署成功后自动展示引导面板：

1. **查看部署状态** → 跳转 Deployment Detail
2. **与 Agent 对话** → 跳转 Agent Chat Panel
3. **查看日志** → 跳转 Logs Tab
4. **配置更多插件** → 跳转 Plugin Marketplace
5. **分享部署** → 复制部署链接

**价值:** 部署成功后用户不知道下一步该做什么（当前只有 "View Deployment" 按钮）。

### 11.4 First-Run Onboarding

新用户首次访问 Console 时的引导流程：

| 步骤 | 内容 |
|------|------|
| 1. 欢迎 | "Welcome to Shadow Cloud" + 核心功能介绍 |
| 2. 快速部署 | 引导部署一个示例 Agent Pack |
| 3. 探索 | 高亮 Store、Clusters、Settings 入口 |
| 4. 完成 | 标记 onboarding 完成（localStorage） |

**价值:** 新用户当前看到的是空状态页面，没有任何引导。

### 11.5 品牌命名标准化

| 场景 | 标准名称 |
|------|----------|
| 产品名 | **Shadow Cloud** |
| Console 标题 | **Shadow Cloud Console** |
| CLI 命令 | `shadowob-cloud` |
| 包名 | `@anthropic/shadowob-cloud` |
| 内部变量/代码 | `shadowob-cloud` / `shadowobCloud` |

**禁止使用:** `xcloud`、`x-cloud`、`ShadowOB`（单独使用）、`shadowob`（用户可见场景）

---

## 12. Defects Resolved

> **来源:** contradictions.review, plugin-system.review (2026-04-12)

### Console 代码修复

| 缺陷 | 位置 | 修复 |
|------|------|------|
| `xcloud` 引用 CLI 命令 | 多处 console 页面 | 全部替换为 `shadowob-cloud` |
| `c.ok` 属性不存在 | SettingsPage DoctorCheck 渲染 | 改为 `c.status === 'pass'` |
| `useEffect` 无限循环 | DeploymentDetailPage | 稳定化依赖数组，提取 fetch 函数 |
| `existingProviders` 不稳定引用 | DeployWizardPage | `useMemo` 包裹，避免每次渲染重建 |
| `api.ts` unknown 返回类型 | Console API 层 | 添加正确的 TypeScript 返回类型 |

### Plugin 系统修复

| 缺陷 | 修复 |
|------|------|
| Plugin env vars 未注入 K8s Pod | Pipeline 增加 env 注入步骤 |
| `resources` provider 从未调用 | Pipeline 增加 resources 构建步骤 |
| `lifecycle.provision` 从未调用 | `shadowob-cloud up` 增加 provision 步骤 |

### 品牌修复

| 缺陷 | 修复 |
|------|------|
| "xcloud" stale 引用 | 全部替换为 "shadowob-cloud" |
| "community-maintained" 误导文本 | 改为准确的维护状态描述 |
| 品牌不一致（xcloud/shadowob/Shadow Cloud） | 统一为 Shadow Cloud（用户可见）/ shadowob-cloud（代码） |

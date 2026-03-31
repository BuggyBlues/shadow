# Shadow Cloud Dashboard — 产品重设计规范

> **Version:** 1.0
> **Date:** 2025-07-25
> **Status:** 实施中

---

## 1. 现状问题

| 问题 | 严重性 | 影响 |
|------|--------|------|
| Templates 页面崩溃 (tags undefined) | P0 | 页面无法使用，显示 "Something went wrong!" |
| Template 接口定义与服务端不一致 | P0 | `tags: string[]` 但服务端不返回 tags |
| 页面功能极简 | P1 | Images/Runtimes 仅是列表，无交互 |
| Config 编辑器是纯 textarea | P1 | 无行号、无高亮、无 JSON 错误提示 |
| 无全局通知系统 | P2 | 操作结果反馈不明确 |
| 无搜索/过滤 | P2 | 模板列表模板多时无法快速定位 |
| 缺少 Deployment 操作入口 | P2 | Overview 页面仅展示，缺少快速操作 |
| 无 Loading 骨架屏 | P3 | 加载时显示空白 |

---

## 2. 设计约束

1. **零新依赖**: 仅使用现有 deps (React 19, TanStack Router/Query, Tailwind 4, lucide-react, clsx, date-fns, zustand, tailwind-merge)
2. **Bundle 体积**: 目标 < 500KB (当前 414KB)，因为打包在 CLI 中
3. **暗色主题**: 保持现有 gray-950 暗色风格
4. **API 兼容**: 不修改现有 API 端点签名，仅修复类型定义

---

## 3. 全局改进

### 3.1 Toast 通知系统

使用 zustand store 管理通知队列:

```
[Toast Store] ← useToast() hook
  ├── success(message)
  ├── error(message)
  └── info(message)
```

- 右上角堆叠显示，3 秒自动消失
- 支持 success / error / info 三种类型
- 组件: `<Toaster />` 挂载在 Layout 中

### 3.2 类型安全修复

- `Template.tags` 改为 `tags?: string[]`
- 所有 `.tags` 访问改为可选链 `?.`

### 3.3 页面级错误边界

每个页面包裹 `<ErrorBoundary>` 组件，崩溃时显示:
- 错误信息
- "Retry" 按钮 (重新挂载组件)
- 不影响其他页面

### 3.4 空状态改进

每个列表页面提供有意义的空状态插图和引导文案。

---

## 4. 各页面规范

### 4.1 Overview (/)

**改进**: 更丰富的概览信息，快速操作入口。

| 元素 | 描述 |
|------|------|
| 统计卡片 | Total / Ready / Not Ready / Namespaces 四张卡片 |
| 部署表格 | + ACTION 列: Scale / Destroy 快捷按钮 |
| 空状态 | "No deployments yet" + "Browse Templates" 按钮引导 |
| 自动刷新 | 10s，带刷新指示器 |

### 4.2 Templates (/templates)

**改进**: 搜索过滤，更好的卡片布局，修复崩溃。

| 元素 | 描述 |
|------|------|
| 搜索框 | 按名称/描述即时过滤 |
| 模板卡片 | 名称、团队、Agent 数量徽章、描述、namespace |
| Deploy 按钮 | 打开 Modal，SSE 日志流 |
| 空搜索 | "No templates match your search" |

**修复**: 移除 tags 引用（服务端不提供 tags），或改为可选展示。

### 4.3 Deployment Detail (/deployments/:ns/:id)

**改进**: 更完善的操作和信息展示。

| 元素 | 描述 |
|------|------|
| 信息栏 | Namespace、Replicas、创建时间、状态 |
| Pod 表格 | 不变 |
| Scale 控件 | 输入框 + Apply 按钮（当前 +/- 按钮保留） |
| Destroy 按钮 | 确认对话框（需输入名称确认） |
| Log Viewer | 增加 Clear 和 Download 按钮 |

### 4.4 Config Editor (/config)

**改进**: 更好的编辑体验。

| 元素 | 描述 |
|------|------|
| 编辑区 | textarea 加行号显示 |
| 工具栏 | Load Template / Format / Validate / Save |
| 状态栏 | 文件路径、JSON 合法性指示、字符数 |
| Validate 内联 | 验证结果显示在编辑器下方面板 |

### 4.5 Validate (/validate)

**改进**: 验证结果更清晰。

| 元素 | 描述 |
|------|------|
| 输入区 | textarea + Load Template 按钮 |
| 结果面板 | 分区: Summary / Violations / Template Refs |
| 颜色编码 | 通过=绿色，违规=红色列表 |

### 4.6 Images (/images)

**改进**: 更多信息展示。

| 元素 | 描述 |
|------|------|
| 列表项 | 镜像名称 + Dockerfile 路径 + 描述 |
| 可折叠详情 | 点击展开 Dockerfile 路径等额外信息 |
| 统计 | 总镜像数 |

### 4.7 Runtimes (/runtimes)

**改进**: 更丰富的运行时信息。

| 元素 | 描述 |
|------|------|
| 运行时卡片 | 名称、ID、默认镜像 |
| 描述 | 运行时用途说明 |
| 统计 | 总运行时数 |

### 4.8 Doctor (/doctor)

当前已经比较完善，保持现状。小改进:

| 元素 | 描述 |
|------|------|
| 自动运行 | 进入页面自动执行检查 |
| 时间戳 | 上次检查时间 |

### 4.9 Settings (/settings)

当前已较完善，保持现状，小改进:

| 元素 | 描述 |
|------|------|
| 密钥遮罩 | API Key 显示 `sk-...xxx` 遮罩 |
| 测试连接 | (future) 验证 API Key 有效性 |

---

## 5. 新增组件

| 组件 | 用途 |
|------|------|
| `Toast` + `Toaster` | 全局通知 |
| `ErrorBoundary` | 页面级错误捕获 |
| `ConfirmDialog` | 危险操作确认 |
| `SearchInput` | 搜索输入框 |
| `Badge` | 通用徽章 (替代内联 span) |
| `StatusDot` | 状态小圆点 |

---

## 6. 实施计划

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| Phase 1 | 修复 P0 崩溃 (tags bug + 类型修复) | 立即 |
| Phase 2 | 全局组件 (Toast, ErrorBoundary, ConfirmDialog) | 高 |
| Phase 3 | Overview 页面增强 | 高 |
| Phase 4 | Templates 页面修复 + 搜索 | 高 |
| Phase 5 | Config Editor 改进 | 中 |
| Phase 6 | Deployment Detail 改进 | 中 |
| Phase 7 | Images / Runtimes 页面增强 | 中 |
| Phase 8 | 其他页面微调 (Doctor, Settings, Validate) | 低 |

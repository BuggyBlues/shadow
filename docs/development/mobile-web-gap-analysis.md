# Mobile vs Web 功能对比（更新于 2026-03-15）

## 范围

- `apps/mobile` 当前已提交实现（commit fc0c55b）
- `apps/web` 已有实现
- 深度代码审查：逐文件对比 web/mobile 的组件、hooks、store、socket、API 调用

---

## 一、聊天功能对比矩阵

### 1.1 消息发送

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| 文本发送（WebSocket） | ✅ | ✅ | 相同 |
| 文本发送（REST fallback） | ❌ | ✅ | Mobile 更好 |
| Enter 发送 / Shift+Enter 换行 | ✅ | ❌ | **Mobile 缺失** — 无 Enter 发送，需按按钮 |
| 文件附件上传 | ✅ | ✅ | 相同（POST `/api/media/upload`） |
| 图片附件上传 | ✅ | ✅ | 相同 |
| 工作区文件附件 | ✅ | ❌ | **Mobile 缺失** — 无 WorkspaceFilePicker |
| 发送音效 | ✅ | ❌ | Web 有 `playSendSound()` |
| @提及自动补全 | ✅ | ❌ | **Mobile 缺失** — Web 有拼音匹配、键盘导航、Buddy 加权 |

### 1.2 消息接收与展示

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| real-time `message:new` | ✅ | ✅ | 相同（Mobile 还监听 `message:created`） |
| 消息去重 | ❌ | ✅ | Mobile 更好 |
| 消息标准化 | ❌ | ✅ | Mobile 有 `normalizeMessage()` |
| 消息分页（infinite query） | ✅ | ✅ | 相同 |
| 消息分组（5min 同作者） | ✅ | ✅ | 相同 |
| 日期分割线 | ❌ | ✅ | Mobile 更好 |
| 新消息分割线 | ❌ | ✅ | Mobile 更好 |
| 接收音效 | ✅ | ❌ | Web 有 `playReceiveSound()` |
| 虚拟滚动 | ✅ | ❌ | Web 用 `@tanstack/react-virtual`，Mobile 用 FlatList |

### 1.3 消息操作

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| 编辑（inline） | ✅ | ✅ | 相同 |
| 删除（确认弹窗） | ✅ | ✅ | 相同 |
| 复制消息 | ✅ | ✅ | 相同 |
| 回复/引用 | ✅ | ✅ | 相同 |
| 分享消息链接 | ✅ | ❌ | **Mobile 缺失** |
| Emoji 反应 | ✅ 完整 picker | ⚠️ 6 个快速 emoji | **Mobile 缺失完整 picker** |
| 点击消息锚点跳转 | ✅ | ❌ | **Mobile 缺失** |

### 1.4 附件与文件

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| 图片预览 | ✅ | ✅ | Web 有右键菜单 |
| 图片上下文菜单 | ✅ | ❌ | **Mobile 缺失** — Web 有下载/复制链接/详情/保存到工作区 |
| 文件卡片（FileCard） | ✅ 详细 | ✅ 基础 | Web 有丰富的类型图标和颜色分类 |
| 文件预览面板 | ✅ | ❌ | **Mobile 缺失** — Web 支持代码高亮、CSV 表格、ZIP 列表、PDF 等 |
| 保存到工作区 | ✅ | ❌ | **Mobile 缺失** |
| 拖拽上传 | ✅ | N/A | 不适用于移动端 |

### 1.5 实时状态

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| typing 指示器 | ✅ | ✅ | 相同（3s 节流/超时） |
| member:joined / member:left | ✅ | ✅ | 相同 |
| Agent activity | ✅ | ✅ | 相同 |
| Socket 重连恢复 | ✅ | ✅ | 相同（Mobile 有 AppState 监听） |

### 1.6 频道功能

| 能力 | Web | Mobile | 差异 |
|------|:---:|:------:|------|
| 频道列表 | ✅ | ✅ | 相同 |
| 频道分类折叠 | ✅ | ✅ | 相同 |
| 创建频道 | ✅ | ✅ | 相同 |
| 编辑频道 | ✅ | ❌ | **Mobile 缺失** |
| 删除频道 | ✅ | ❌ | **Mobile 缺失** |
| 频道未读标记 | ✅ | ❌ | **Mobile 缺失** — Web 有 `scoped-unread` API |
| **频道成员列表** | ✅ | ❌ | **Mobile 缺失** — Web 有 `MemberList` 侧边栏 |

---

## 二、当前 Mobile 已知 Bug

### 2.1 消息发送后不显示

**根因分析**：
- WebSocket `message:send` 会被服务端 `channel:join` 的成员检查拦截
- 服务端 `channel:join` 执行 `channelMemberDao.get(channelId, userId)`
- 如果用户不是 channel_members 表中的成员，`channel:join` **静默失败**（mobile 没有传 ack callback）
- 用户不在 channel room → 收不到 `message:new` 广播 → 看不到自己发的消息
- `message:send` 也会检查成员资格 → 直接拒绝 → socket.emit('error')，但 mobile 不监听 error 事件

**修复方案**：
1. `joinChannel` 添加 ack 回调，失败时 fallback REST 发送
2. 监听 socket `error` 事件，显示错误信息
3. 发送消息后，主动调用 REST `GET` 最新消息来确保同步

### 2.2 附件/图片功能异常

**根因分析**（已修复）：
- `att.mimeType.startsWith('image/')` 在 `mimeType` 为 undefined 时崩溃
- 已改用 `getAttachmentContentType()` 带 fallback

### 2.3 键盘行为

- 没有 Enter 发送支持（TextInput 缺少 `onSubmitEditing`）
- 点击输入框外不会关闭键盘（缺少 `Keyboard.dismiss()` 处理）

---

## 三、Tab 布局分析

### 当前 Mobile Tab 结构
```
底部四个 Tab:
├── index.tsx (MessageSquare)  → "我的服务器" — 已加入服务器列表 + FAB 创建
├── discover.tsx (Compass)     → "发现" — 浏览/搜索公开服务器
├── buddies.tsx (Bot)          → "伙伴" — AI Agent 市场
└── settings.tsx (Settings)    → "设置"
```

### 问题
- "我的服务器" 和 "发现" 是两个独立 Tab，功能割裂
- 用户需在两个 Tab 间切换来查看自己的服务器和发现新的
- 现代 App 趋势是合并为一个入口，用 Segmented Control 或搜索切换

---

## 四、本轮修复计划

### P0：聊天核心修复
1. [x] 修复 `mimeType.startsWith` 崩溃
2. [ ] 消息发送可靠性修复（REST 优先 + WebSocket 错误处理）
3. [ ] 添加 Enter 发送支持
4. [ ] 添加点击外部关闭键盘
5. [ ] 完整 emoji picker
6. [ ] 频道成员列表

### P1：聊天能力拉齐
7. [ ] @提及自动补全
8. [ ] 频道未读计数
9. [ ] 消息锚点/高亮

### P2：Tab 重构
10. [ ] 合并 "我的服务器" 和 "发现" 为一个 Tab
11. [ ] 现代化合并页面设计

# 虾豆(Shadow) React 性能审查报告

> 审查日期: 2026-04-12
> 审查范围: `apps/web/src/components/` + `apps/mobile/src/components/`

---

## 🔴 高优先级

### 1. Web `MessageBubble` — Memo 内订阅 Zustand Store，导致 memo 失效

**文件**: `apps/web/src/components/chat/message-bubble.tsx` (L130-145)

**问题**: `MessageBubbleInner` 虽然被 `React.memo` 包裹，但组件内部直接调用 `useAuthStore((s) => s.user)`、`useQueryClient()`、`useChatStore()` 等 hooks。即使 props 没有变化，只要 store 中的任何选中值变化（比如另一个频道的消息更新触发了 `activeServerId` 以外的字段变化），组件仍会重渲染。

```typescript
// L130-133 — 这些 hooks 在每次渲染时都会订阅 store
const currentUser = useAuthStore((s) => s.user)
const queryClient = useQueryClient()
const { activeServerId } = useChatStore()
```

**影响**: 每当全局 store 有变化（typing indicator、presence change、notification），所有已渲染的 MessageBubble 都会重渲染。

**改进策略**:
```typescript
// 方案 A: 将 store 数据通过 props 传入，让父组件统一管理
interface MessageBubbleProps {
  message: Message
  currentUserId: string      // 直接传 id，而不是组件内查 store
  canDelete: boolean         // 权限判断提升到父组件
  // ...
}
// 父组件使用 React.memo 包裹后，只有 message 本身变化时才重渲染

// 方案 B: 将 memo 的 areEqual 改为更精细的字段对比
export const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  // 对比 message 核心字段 + 稳定的外部依赖
  if (prev.message.id !== next.message.id) return false
  if (prev.message.content !== next.message.content) return false
  // 需要确保 currentUserId 也是 stable 的
  return true
})
```

---

### 2. Mobile `MessageBubble` — Memo 使用引用比较，基本无效

**文件**: `apps/mobile/src/components/chat/message-bubble.tsx` (L773-784)

**问题**: Memo 的 `areEqual` 函数使用 `===` 进行引用比较：
```typescript
export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  return (
    prev.message === next.message &&        // 引用比较！新对象 = false
    prev.allMessages === next.allMessages && // 引用比较！新数组 = false
    prev.onRetry === next.onRetry &&         // 如果父组件不用 useCallback = false
    // ...
  )
})
```

**影响**: 只要父组件传入新的 `message` 对象或 `allMessages` 数组（这在 React 中很常见），memo 就完全不起作用，每条消息都会重渲染。

**改进策略**:
```typescript
export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  // 改为值比较
  if (prev.message.id !== next.message.id) return false
  if (prev.message.content !== next.message.content) return false
  if (prev.message.sendStatus !== next.message.sendStatus) return false
  if (prev.message.isEdited !== next.message.isEdited) return false
  if (prev.message.updatedAt !== next.message.updatedAt) return false
  if (prev.isGrouped !== next.isGrouped) return false
  if (prev.selectionMode !== next.selectionMode) return false
  if (prev.isSelected !== next.isSelected) return false
  // allMessages 只需要比长度和最后一条消息 id（判断是否有新消息）
  if (prev.allMessages?.length !== next.allMessages?.length) return false
  return true
})
```

---

### 3. Web `BuddyListItem` — 列表渲染中无 memo

**文件**: `apps/web/src/components/common/buddy-list-item.tsx` (全文)

**问题**: `BuddyListItem` 是成员列表、好友列表的核心渲染组件，被 `MemberList` 等组件在 `.map()` 循环中大量使用（每个成员一个实例），但完全没有 `React.memo`。

**影响**: 每当 MemberList 的父组件重渲染，所有 BuddyListItem 都会重渲染，包括 hover card、导航等逻辑。

**改进策略**:
```typescript
export const BuddyListItem = React.memo(function BuddyListItem({
  buddy,
  showHoverCard = true,
  // ...props
}: BuddyListItemProps) {
  // ...
}, (prev, next) => {
  return (
    prev.buddy.id === next.buddy.id &&
    prev.buddy.status === next.buddy.status &&
    prev.buddy.displayName === next.buddy.displayName &&
    prev.showHoverCard === next.showHoverCard &&
    prev.clickable === next.clickable &&
    prev.showBotBadge === next.showBotBadge &&
    prev.showRoleBadge === next.showRoleBadge &&
    prev.showOnlineRank === next.showOnlineRank &&
    prev.isSelected === next.isSelected
  )
})
```

---

### 4. Web `ChannelSidebar` — 频道列表项无 memo

**文件**: `apps/web/src/components/channel/channel-sidebar.tsx` (L360-420)

**问题**: `renderChannelGroup` 函数内部 `.map()` 渲染的频道按钮没有提取为独立 memo 组件：

```typescript
// L366-420 — 每个频道按钮都是内联渲染
{items.map((ch) => {
  const Icon = channelIcons[ch.type]
  const isActive = activeChannelId === ch.id
  const unreadCount = scopedUnread?.channelUnread?.[ch.id] ?? 0
  // ... 大量计算和内联 JSX
  return (
    <button key={ch.id} className={cn(...)}>
      {/* ... */}
    </button>
  )
})}
```

**改进策略**: 提取为 `ChannelItem` memo 组件：
```typescript
const ChannelItem = React.memo(function ChannelItem({
  channel,
  isActive,
  unreadCount,
  onSelect,
  onContextMenu,
}: { ... }) {
  const Icon = channelIcons[channel.type]
  const isUnread = !isActive && unreadCount > 0
  return (
    <button
      data-channel-item
      onClick={() => onSelect(channel.id)}
      onContextMenu={(e) => onContextMenu(e, channel)}
      className={cn(...)}
    >
      {/* ... */}
    </button>
  )
})
```

---

### 5. Web `ServerItem` — 服务器列表项无 memo

**文件**: `apps/web/src/components/server/server-sidebar.tsx` (L59-105)

**问题**: `ServerItem` 组件虽然已提取为独立函数，但没有 `React.memo`。服务器列表是常驻显示的组件，每个 ServerItem 都包含了 Tooltip 等较重组件。

**改进策略**:
```typescript
const ServerItem = React.memo(function ServerItem({
  server, member, isActive, unreadCount, isMuted, onSelect, onContextMenu
}: { ... }) {
  // ...
}, (prev, next) => {
  return (
    prev.server.id === next.server.id &&
    prev.isActive === next.isActive &&
    prev.unreadCount === next.unreadCount &&
    prev.isMuted === next.isMuted
  )
})
```

---

### 6. Web 成员列表 — 无虚拟化

**文件**: `apps/web/src/components/member/member-list.tsx` (L120-220)

**问题**: Web 成员列表直接渲染所有成员，没有使用虚拟滚动。当服务器成员数量超过 100 人时，会产生大量 DOM 节点（每个成员包含头像、状态点、昵称、role badge、bot badge、online rank、hover card 等）。

**影响**: 大服务器中成员列表会导致明显的渲染卡顿，特别是 `renderMemberGroup` 内部还有复杂的 Map 构建和树形结构计算。

**改进策略**:
- 使用 `@tanstack/react-virtual` 实现虚拟化（与 chat-area 保持一致）
- 或者至少添加 `React.memo` 到 `BuddyListItem`（见 #3）以减少不必要重渲染

---

## 🟡 中优先级

### 7. Web `MessageInput` — 778 行单体组件

**文件**: `apps/web/src/components/chat/message-input.tsx` (全文)

**问题**: 消息输入组件包含了太多职责：
- 文本输入 + 自动调整高度
- @mention 自动补全 + pinyin 匹配
- 文件上传 + 预览 + 工作区选择器
- Emoji picker
- 乐观消息发送 + 回退逻辑
- Draft 持久化
- 打字指示器

**改进策略**: 拆分为子组件：
```
MessageInput/
├── MentionAutocomplete.tsx   — @mention 弹窗
├── PendingFilesBar.tsx       — 待发送文件预览
├── InputToolbar.tsx          — 工具栏按钮
└── index.tsx                 — 主组件（编排逻辑）
```

---

### 8. Web `message-bubble.tsx` — 1352 行巨型组件

**文件**: `apps/web/src/components/chat/message-bubble.tsx` (全文)

**问题**: 单文件 1352 行，包含了：
- MessageBubble（消息气泡主体）
- MentionSpan（@提及 hover card）
- CodeBlockWithCopy（代码块复制）
- 图片右键菜单
- 头像 hover card + pinned card
- 编辑/删除/回复/反应等所有交互
- 多选模式
- 发送失败重试

**改进策略**: 拆分为独立组件文件：
```
chat/message-bubble/
├── MessageBubble.tsx        — 主组件
├── MessageContent.tsx       — Markdown 渲染
├── MessageActions.tsx       — hover 操作栏
├── MessageReactions.tsx     — 反应按钮
├── MessageAttachments.tsx   — 附件渲染
├── MentionSpan.tsx          — @提及
├── AvatarHoverCard.tsx      — 头像 hover
└── EditMode.tsx             — 编辑模式
```

---

### 9. Web `EmojiPicker` — 重型组件始终加载

**文件**: `apps/web/src/components/common/emoji-picker.tsx` (全文)

**问题**: `EmojiPicker` 依赖 `@emoji-mart/data`（整个 emoji 数据集 ~300KB+），每次渲染都会加载 Picker 组件。

**改进策略**:
```typescript
// 使用 React.lazy 延迟加载
const EmojiMartPicker = React.lazy(() => import('@emoji-mart/react'))

export function EmojiPicker({ onSelect, onClose, position = 'top' }: EmojiPickerProps) {
  // ...
  return (
    <Suspense fallback={<div className="...">Loading...</div>}>
      <EmojiMartPicker data={data} onEmojiSelect={...} />
    </Suspense>
  )
}
```

---

### 10. Mobile 成员列表 — `renderItem` 缺少 memo

**文件**: `apps/mobile/src/components/member/member-list.tsx` (L42-68)

**问题**: `renderMember` 函数在每次渲染时重新创建，而且没有使用 `React.memo` 包装 renderItem 的内容：

```typescript
const renderMember = ({ item }: { item: Member }) => {
  // 每次渲染都会执行
  const name = item.user.displayName || item.user.username
  return (
    <Pressable style={styles.memberItem}>
      {/* ... */}
    </Pressable>
  )
}
```

**改进策略**:
```typescript
const MemberItem = memo(function MemberItem({ member }: { member: Member }) {
  const colors = useColors()
  const { t } = useTranslation()
  const name = member.user.displayName || member.user.username
  return (
    <Pressable style={styles.memberItem}>
      {/* ... */}
    </Pressable>
  )
})

// 在 FlatList 中使用
renderItem={({ item }) => <MemberItem member={item} />}
```

---

### 11. `useColors()` Hook — 每次都返回新对象

**文件**: `apps/mobile/src/theme/index.ts` (L8-11)

**问题**: `useColors()` 每次调用都返回 `lightColors` 或 `darkColors` 对象引用。虽然对象内容不变，但如果父组件重渲染，子组件中的 `useColors()` 返回值引用不变（因为是 module-level 常量），这点实际上是 OK 的。

**状态**: 检查后确认 `lightColors` / `darkColors` 是模块级常量，引用稳定。**无问题**。

---

### 12. Web `NotificationBell` — 频繁轮询 + 过度 invalidation

**文件**: `apps/web/src/components/notification/notification-bell.tsx` (L57-68)

**问题**:
- `refetchInterval: 30_000` — 每 30 秒轮询未读数量
- `useSocketEvent('notification:new')` 收到通知时同时 invalidation 两个 query key
- `markRead.mutate` onSuccess 时也 invalidation 两个 query key

```typescript
useSocketEvent('notification:new', (_data: Notification) => {
  queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  queryClient.invalidateQueries({ queryKey: ['notifications'] })  // 每次都拉完整列表
})
```

**改进策略**:
- Socket 收到新通知时，使用 `setQueryData` 增量更新而非 `invalidateQueries`
- 减少轮询间隔或改用纯 WebSocket 推送
- `markRead` 只需 invalidation count，不需要重新拉列表

---

### 13. Mobile `ChatComposer` — 内联 Emoji 列表无 memo

**文件**: `apps/mobile/src/components/chat/chat-composer.tsx` (L14-118)

**问题**: `COMMON_EMOJIS` 是模块级常量（✅ 正确），但 FlatList 的 `renderItem` 是内联函数：

```typescript
renderItem={({ item }) => (
  <Pressable
    style={({ pressed }) => [...]}
    onPress={() => {
      onInputChange(inputText + item)  // 闭包捕获 inputText
      inputRef.current?.focus()
    }}
  >
    <Text style={styles.emojiText}>{item}</Text>
  </Pressable>
)}
```

**影响**: 每次 `inputText` 变化，所有 emoji 按钮都会重渲染。

**改进策略**: 提取 `EmojiItem` 为 memo 组件，使用 `onInputChange` callback 而非内联闭包。

---

### 14. Web MemberList — `renderMemberGroup` 内部复杂计算每次渲染执行

**文件**: `apps/web/src/components/member/member-list.tsx` (L120-220)

**问题**: `renderMemberGroup` 函数内部每次都执行：
- 构建 `botOwnerByUserId` Map
- 构建 `buddyMetaByUserId` Map
- 构建 `membersByUserId` Map
- 构建树形结构 (`ownerChildren`, `orphanBots`)

这些计算可以在 `useMemo` 中缓存。

**改进策略**:
```typescript
const memberTreeData = useMemo(() => {
  const botOwnerByUserId = new Map<string, string>()
  // ... 所有计算逻辑
  return { topLevelMembers, ownerChildren, orphanBots }
}, [items, buddyAgents])
```

---

## 🟢 低优先级

### 15. Web `DynamicBackground` — 全局 mousemove 监听

**文件**: `apps/web/src/components/layout/dynamic-background.tsx` (L36-37)

**问题**: 监听全局 `mousemove` 事件，虽然使用了 `requestAnimationFrame` 节流，但每个鼠标移动都会触发。

**改进策略**:
- 考虑降低采样率（如每 16ms 采样一次）
- 或使用 CSS `parallax` 效果替代 JS 驱动
- 当前实现已经有 `will-change-transform` 和 `translate3d` 优化，影响不大

---

### 16. CSS 动画 — 大量 backdrop-blur 和复杂阴影

**全局问题**: 多处组件使用 `backdrop-blur-xl`、`backdrop-blur-2xl` 和多层 `box-shadow`。

**具体位置**:
- `apps/web/src/components/chat/message-bubble.tsx` — 多处 hover menu 使用 `backdrop-blur-xl` + 多层阴影
- `apps/web/src/components/layout/app-layout.tsx` — 动态背景使用 `blur-[120px]` 的大尺寸径向渐变
- `apps/web/src/components/channel/channel-sidebar.tsx` — Context menu 使用 `backdrop-blur-2xl`

**影响**: 在低端设备上，大量 backdrop-filter 会导致合成层压力。

**改进策略**:
- 在低性能设备上（可通过 `navigator.hardwareConcurrency` 检测）降级为半透明背景
- 减少同时开启 backdrop-blur 的弹出层数量

---

### 17. Web `UserAvatar` — 无 memo

**文件**: `apps/web/src/components/common/avatar.tsx` (全文)

**问题**: `UserAvatar` 是最基础、使用最频繁的组件之一（每条消息、每个成员、每个服务器图标都使用），但没有 `React.memo`。

**改进策略**:
```typescript
export const UserAvatar = React.memo(function UserAvatar({
  userId, avatarUrl, displayName, size = 'md', className = ''
}: AvatarProps) {
  // ...
})
```

---

### 18. Web `message-bubble.tsx` — 图片附件无懒加载

**文件**: `apps/web/src/components/chat/message-bubble.tsx` (L360-380)

**问题**: 附件图片使用 `<img src={att.url}>` 直接加载，没有 `loading="lazy"` 或 Intersection Observer。

**改进策略**:
```tsx
<img
  src={att.url}
  alt={att.filename}
  loading="lazy"
  decoding="async"
  className="max-h-60 object-contain"
/>
```

---

### 19. Mobile `message-bubble.tsx` — `getFileIcon` / `getFileAccentColor` / `formatSize` 每次渲染执行

**文件**: `apps/mobile/src/components/chat/message-bubble.tsx` (L226-290)

**问题**: 这些工具函数定义在组件内部，每次渲染都会重新创建函数闭包。虽然计算量不大，但在长列表中累积起来也是浪费。

**改进策略**: 提取到组件外部作为纯函数。

---

### 20. 缺少全局性能监控

**全局问题**: 项目中没有 React Profiler、性能埋点或 Lighthouse CI 集成。

**改进策略**:
- 使用 `React.Profiler` 在开发环境监控关键组件的渲染时间
- 在 CI 中集成 Lighthouse 性能审计
- 添加 `why-did-you-render` 开发时检测不必要的重渲染

---

## 📊 总结

| 优先级 | 问题数量 | 预估影响 |
|--------|---------|---------|
| 🔴 高   | 6       | 消息列表/成员列表在大数据量下明显卡顿 |
| 🟡 中   | 8       | 中等使用场景下偶发卡顿、内存占用偏高 |
| 🟢 低   | 6       | 边界情况优化、锦上添花 |

### 最优先改进 Top 3

1. **修复 Mobile MessageBubble memo 比较逻辑** — 改动最小，收益最大
2. **Web BuddyListItem 添加 React.memo** — 成员列表卡顿的根因
3. **Web ChannelSidebar 提取 ChannelItem memo 组件** — 频道切换时减少不必要的重渲染

### 性能改进收益预估

| 改进项 | 预计收益 |
|--------|---------|
| 修复 memo 比较逻辑 | 📈 消息列表渲染性能提升 40-60% |
| BuddyListItem memo | 📈 成员列表渲染性能提升 50%+ |
| ChannelItem memo | 📈 频道切换流畅度提升 30% |
| 成员列表虚拟化 | 📈 大服务器(100+成员)加载时间减少 70% |
| EmojiPicker lazy load | 📈 首屏 bundle 减少 ~300KB |
| MemberList 计算缓存 | 📈 成员列表渲染时间减少 40% |

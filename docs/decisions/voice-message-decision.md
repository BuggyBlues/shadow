# Voice Message Feature - Technical Decision Record

## Summary

实现类似微信的语音消息功能，支持 Web 和 Mobile 双端。

---

## Decisions

### D1: Audio Format

**Decision:** WebM (Opus codec)

**Rationale:**
- Opus 提供最佳压缩率和音质平衡
- WebM 格式现代浏览器广泛支持
- 移动端可通过 expo-av 录制后转换

**Note:** iOS 原生录制 AAC (m4a)，需要转换为 WebM 或保持双格式支持。

---

### D2: Maximum Recording Duration

**Decision:** 60 seconds

**Rationale:** 微信标准，足够覆盖大多数语音消息场景。

---

### D3: Waveform Display

**Decision:** 动态波形图（预计算存储）

**Rationale:**
- 预计算波形峰值数组，存储在 metadata
- 播放时 Canvas 渲染动画，无解码延迟
- 视觉效果好，性能可控

---

### D4: Unread Indicator (Red Dot)

**Decision:** 不实现

**Rationale:** 群聊场景追踪每个用户播放状态复杂度高，暂不实现。

---

### D5: Platform Priority

**Decision:** Web 和 Mobile 同时开发

**Rationale:** 双端用户都需要语音消息功能，UI 统一设计，技术实现分开。

---

### D6: Waveform Data Source

**Decision:** 预计算存储在 attachment metadata

**Rationale:**
- 录音时计算波形峰值数组
- 存储约 60 个数值点（每秒 1 个）
- 播放时直接渲染，无实时解码开销

---

### D7: Waveform Sampling Precision

**Decision:** 60 个点（每秒 1 个）

**Rationale:** 60 秒录音对应 60 个点，平衡视觉效果和数据量。

---

### D8: Speech-to-Text Integration

**Decision:** 可选转文字

**Rationale:**
- 语音消息有独立切换按钮（类似微信）
- 用户可选择发送纯语音或语音+文字
- 客户端识别结果直接发给服务端存储

---

### D9: Message Bubble Layout

**Decision:** 微信风格

```
[播放按钮] [波形图] [时长]
```

- 自己发送：右侧气泡
- 对方发送：左侧气泡

---

### D10: Background Playback

**Decision:** 支持后台播放

**Rationale:** 用户切换页面时语音继续播放，类似音乐播放器体验。

---

### D11: Audio Cache Strategy

**Decision:** 本地持久缓存

**Rationale:**
- 下载后保存到本地存储
- 再次播放直接读取本地文件
- 减少重复下载，提升体验

---

### D12: Permission Request Timing

**Decision:** 点击录音按钮时请求

**Rationale:** 用户明确意图时请求权限，体验更自然。

---

### D13: Cancel Recording Gesture

**Decision:** 完全对标微信

- 上滑取消录音
- 滑动到一定距离触发（避免误触）
- 松开前显示"松开取消"提示
- 滑动状态有视觉警告

---

### D14: Minimum Recording Duration

**Decision:** 1 秒

**Rationale:** 微信标准，太短录音 Toast 提示"录音时间太短"。

---

### D15: Recording UI

**Decision:** 遮罩层 + 中央大麦克风动画（微信风格）

显示内容：
- 录音时长计时器
- 麦克风脉冲动画
- "上滑可取消"提示
- 滑动取消时的警告状态

---

### D16: Speech-to-Text Toggle

**Decision:** 录音按钮旁单独切换按钮

**Rationale:**
- 客户端识别结果发送服务端存储
- 语音转文字功能保持独立，不影响纯语音消息
- 切换按钮状态决定是否同时发送文字版本

---

### D17: Upload API Flow

**Decision:** 两步上传（复用现有附件流程）

```
1. POST /api/media/upload → { attachmentId, url }
2. POST /api/channels/:id/messages → { content, attachments: [attachmentId] }
```

**Rationale:**
- 复用现有 MediaService 和附件上传逻辑
- 减少服务器改动，降低风险
- 需要确保权限校验（只有上传者可使用附件）

---

### D18: Playback Speed Control

**Decision:** 不实现

**Rationale:** 语音消息场景通常不需要变速播放，保持简单。

---

### D19: Attachment Metadata Schema

```typescript
interface AttachmentMetadata {
  voice?: {
    duration: number      // 录音时长（秒）
    waveform: number[]    // 波形峰值数组 [0-1]，最多 60 个点
    transcript?: string   // 可选：语音转文字结果
  }
}
```

---

### D20: Implementation Order

1. **Phase 1:** 附件 metadata 结构 + 服务器支持
2. **Phase 2:** 语音消息播放器组件（Web + Mobile）
3. **Phase 3:** 移动端录音功能（expo-av）
4. **Phase 4:** Web 端录音功能（MediaRecorder）
5. **Phase 5:** 本地缓存机制
6. **Phase 6:** 可选：语音转文字联动

---

## Technical Architecture

### Server Changes

1. **Attachment Metadata Extension**
   - 扩展 `attachments` 表或使用 JSON metadata 字段
   - 存储 voice: { duration, waveform, transcript }

2. **Upload Permission Check**
   - 确保只有上传者可以使用 attachment 发送消息

### Web Implementation

1. **Recording:** MediaRecorder API + Web Audio API 分析波形
2. **Playback:** HTML5 Audio + Canvas 波形动画
3. **Cache:** IndexedDB 或 localStorage 存储音频文件

### Mobile Implementation

1. **Recording:** expo-av Audio.Recording API
2. **Playback:** expo-av Audio.Sound API
3. **Waveform:** React Native Reanimated + Canvas/SVG
4. **Cache:** FileSystem + AsyncStorage metadata

---

## Files to Modify/Create

### Server
- `apps/server/src/db/schema/attachments.ts` - 添加 metadata 字段（如需要）
- `apps/server/src/services/media.service.ts` - 确保支持 audio/webm
- `apps/server/src/validators/message.schema.ts` - 验证 voice metadata

### Web
- `apps/web/src/components/chat/voice-message-bubble.tsx` (NEW)
- `apps/web/src/components/chat/voice-recorder.tsx` (NEW)
- `apps/web/src/hooks/use-voice-recorder.ts` (NEW)
- `apps/web/src/hooks/use-voice-player.ts` (NEW)
- `apps/web/src/lib/voice-cache.ts` (NEW)
- `apps/web/src/components/chat/message-input.tsx` - 集成录音按钮

### Mobile
- `apps/mobile/src/components/chat/voice-message-bubble.tsx` (NEW)
- `apps/mobile/src/components/chat/voice-recorder-modal.tsx` (NEW)
- `apps/mobile/src/hooks/use-voice-recording.ts` (NEW)
- `apps/mobile/src/hooks/use-voice-player.ts` (NEW)
- `apps/mobile/src/lib/voice-cache.ts` (NEW)
- `apps/mobile/src/components/chat/chat-composer.tsx` - 集成录音按钮

### Shared
- `packages/shared/src/types/message.types.ts` - 添加 AttachmentMetadata 类型

---

## Open Questions (Future Iteration)

1. 语音消息编辑/撤回后重新录制？
2. 语音消息转发？
3. 语音消息下载保存到本地？

---

**Created:** 2024-03-30
**Status:** Approved
**Next Step:** Phase 1 Implementation
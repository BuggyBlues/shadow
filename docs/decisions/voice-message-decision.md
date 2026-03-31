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

**Decision:** 动态波形图（服务端生成）

**Rationale:**
- 服务端上传时自动计算波形峰值数组
- 存储在 attachment metadata，客户端直接使用
- 播放时 Canvas 渲染动画，无解码延迟
- 简化客户端实现（CLI/Web/Mobile 不需波形计算逻辑）

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

**Decision:** 服务端生成并存储在 attachment metadata

**Rationale:**
- 服务端使用 ffmpeg 或音频分析库计算波形
- 上传音频时自动生成，无需客户端计算
- 存储约 60 个数值点（每秒 1 个）
- CLI/Web/Mobile 只需上传音频，波形自动返回

**Implementation:**
- 服务端新增 `WaveformService` 使用 ffmpeg filter 或 Web Audio 解码
- 上传完成后异步计算波形，更新 metadata
- 或上传时同步计算（小文件延迟可接受）

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

1. **Phase 1:** 附件 metadata 结构 + 服务端波形生成 + 格式转换
2. **Phase 2:** 语音消息播放器组件（Web + Mobile）
3. **Phase 3:** 移动端录音功能（expo-av）
4. **Phase 4:** Web 端录音功能（MediaRecorder）
5. **Phase 5:** 本地缓存机制
6. **Phase 6:** SDK/CLI 支持 + 语音转文字联动

---

## Technical Architecture

### Server Changes

1. **Attachment Metadata Extension**
   - 扩展 `attachments` 表或使用 JSON metadata 字段
   - 存储 voice: { duration, waveform, transcript }

2. **Waveform Generation (NEW)**
   - 新增 `WaveformService` 使用 ffmpeg 生成波形
   - 上传音频时自动计算波形和时长
   - 支持 AAC/MP3/WebM 等多种音频格式

3. **Format Conversion (NEW)**
   - 新增 `AudioConverterService` 使用 ffmpeg 转换格式
   - iOS AAC → WebM 自动转换
   - 与波形生成流程集成

4. **Upload Permission Check**
   - 确保只有上传者可以使用 attachment 发送消息

### Web Implementation

1. **Recording:** MediaRecorder API
2. **Playback:** HTML5 Audio + Canvas 波形动画
3. **Cache:** IndexedDB 或 localStorage 存储音频文件
4. **Waveform:** 渲染服务端返回的波形数据，无需计算

### Mobile Implementation

1. **Recording:** expo-av Audio.Recording API
2. **Playback:** expo-av Audio.Sound API
3. **Waveform:** React Native Reanimated + Canvas/SVG 渲染
4. **Cache:** FileSystem + AsyncStorage metadata
5. **Waveform:** 渲染服务端返回的波形数据，无需计算

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

### D21: SDK Type Extension

**Decision:** 扩展 `ShadowAttachment` 类型添加 metadata 字段

```typescript
// packages/sdk/src/types.ts
export interface ShadowAttachment {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
  width?: number | null
  height?: number | null
  // NEW
  metadata?: AttachmentMetadata
}

interface AttachmentMetadata {
  voice?: {
    duration: number      // 秒
    waveform: number[]    // 波形峰值 [0-1]
    transcript?: string   // 转文字结果
  }
}
```

**Python SDK 同步更新：** `shadowob_sdk/types.py`

---

### D22: SDK Convenience Method

**Decision:** 新增 `sendVoiceMessage()` 便捷方法

```typescript
// packages/sdk/src/client.ts
async sendVoiceMessage(
  channelId: string,
  audioBlob: Blob | ArrayBuffer,
  options: {
    duration?: number      // 可选，服务端自动计算
    transcript?: string    // 可选，语音转文字
    replyToId?: string
  }
): Promise<ShadowMessage>
```

**Rationale:**
- 简化语音消息发送流程，封装上传+发送两步操作
- 波形由服务端自动生成，客户端无需传入
- duration 可选，服务端从音频文件自动提取

---

### D23: CLI Voice Command

**Decision:** 新增 `shadowob voice send` 命令

```bash
shadowob voice send --channel <id> --file <audio.webm> \
  [--transcript "语音转文字内容"]
```

**Rationale:**
- CLI 场景不需要录制功能（用户已有音频文件）
- 提供便捷的语音消息发送入口
- 波形和时长由服务端自动生成，CLI 无需计算

---

### D24: API Documentation

**Decision:** 不新增单独页面，分散更新现有文档

| 文档 | 更新内容 |
|------|---------|
| `media.md` | 添加 voice metadata 说明，服务端自动生成波形和时长 |
| `messages.md` | 添加语音消息发送示例 |

**Rationale:** 语音消息是附件功能的扩展，不需要单独文档页面。

---

### D25: Metadata Server Generation

**Decision:** 服务端自动生成 metadata

**流程：**
```
客户端上传 → POST /api/media/upload
  body: { file }
服务端处理 → 
  1. 存储音频文件
  2. 使用 ffmpeg 提取时长 duration
  3. 使用 ffmpeg/音频分析生成波形 waveform
  4. 存储 metadata = { voice: { duration, waveform } }
返回 → { id, url, metadata: { voice: { duration, waveform } } }
```

**Rationale:**
- 波形和时长由服务端统一计算，保证一致性
- 简化客户端实现（CLI/Web/Mobile 不需波形计算逻辑）
- 支持任意音频格式，服务端自动处理转换和计算

---

### D26: E2E Test Coverage + Format Conversion

**Decision:** 完整测试覆盖 + 格式转换能力

| 场景 | 测试 |
|------|------|
| 上传音频文件 | ✅ |
| 发送带语音附件的消息 | ✅ |
| 获取消息包含语音 metadata | ✅ |
| 波形数据正确存储和返回 | ✅ |
| 权限校验（只有上传者可用） | ✅ |
| 格式转换（AAC→WebM） | ✅ |

**格式转换实现：**
- 服务端使用 `ffmpeg` 或 `fluent-ffmpeg` 进行转换
- 或客户端上传前自行转换（推荐移动端方案）

---

### D27: Python SDK Sync

**Decision:** 同步新增 `send_voice_message()` 方法

```python
# shadowob_sdk/client.py
def send_voice_message(
    self,
    channel_id: str,
    audio_path: str,
    *,
    duration: float | None = None,  # 可选，服务端自动计算
    transcript: str | None = None,
) -> dict[str, Any]:
    ...
```

**Rationale:** 波形由服务端生成，客户端只需上传音频文件。

---

### D28: OpenAPI Schema Update

**Decision:** 更新 OpenAPI schema

- `Attachment` schema 添加 `metadata` 字段（服务端生成）
- `MediaUploadResponse` schema 包含 `metadata`（服务端返回）
- 上传请求无需传入 metadata

---

### D29: Desktop App

**Decision:** Desktop 共用 Web renderer，无需特别改动

- Desktop (Electron) 可直接使用 Web 的 MediaRecorder
- 播放器组件复用 Web 的 `voice-message-bubble.tsx`
- 无需单独开发 Desktop 录音/播放功能

---

### D30: Audio Format Conversion + Waveform Generation

**Decision:** 服务端统一处理格式转换和波形生成

| 平台 | 录制格式 | 服务端处理 |
|------|---------|---------|
| Web | WebM (Opus) | 直接生成波形 |
| iOS | AAC (m4a) | ffmpeg 转换 WebM + 生成波形 |
| Android | WebM/Opus | 直接生成波形 |

**服务端处理流程：**
1. 接收音频文件（任意格式）
2. 使用 `ffprobe` 提取时长
3. 使用 `ffmpeg` 生成波形数据（60 个采样点）
4. 如需格式转换，同步转换为 WebM
5. 更新 attachment.metadata

---

### D31: Server Waveform Service

**Decision:** 服务端波形生成服务

```typescript
// apps/server/src/services/waveform.service.ts
export class WaveformService {
  /**
   * 从音频文件生成波形数据
   * @param filePath 音频文件路径
   * @param points 采样点数量（默认 60）
   */
  async generateWaveform(
    filePath: string,
    points: number = 60
  ): Promise<{ waveform: number[]; duration: number }>
}
```

**实现方案：**
- 使用 `ffmpeg` 的 ` silencedetect` 或 `volumedetect` filter
- 或使用 Node.js 音频库如 `node-wav` + 手动采样
- 返回归一化波形数组 [0-1]

---

### D32: New Files Summary (Updated)

### Server
- `apps/server/src/db/schema/attachments.ts` - 添加 metadata 字段
- `apps/server/src/services/media.service.ts` - 支持 audio/webm + metadata 存储
- `apps/server/src/services/waveform.service.ts` (NEW) - 波形生成服务
- `apps/server/src/services/audio-converter.service.ts` (NEW) - ffmpeg 格式转换
- `apps/server/src/validators/message.schema.ts` - 验证 voice metadata
- `apps/server/__tests__/voice-message-e2e.test.ts` (NEW) - E2E 测试

### SDK (TypeScript)
- `packages/sdk/src/types.ts` - ShadowAttachment 添加 metadata
- `packages/sdk/src/client.ts` - 新增 sendVoiceMessage()

### SDK (Python)
- `packages/sdk-python/shadowob_sdk/types.py` - Attachment 添加 metadata
- `packages/sdk-python/shadowob_sdk/client.py` - 新增 send_voice_message()

### CLI
- `packages/cli/src/commands/voice.ts` (NEW) - voice send 命令
- `packages/cli/src/index.ts` - 注册 voice 命令

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

### Desktop
- 无新增文件，复用 Web 组件

### Website Docs
- `website/docs/en/api-doc/media.md` - 添加 voice metadata 说明（服务端生成）
- `website/docs/en/api-doc/messages.md` - 添加语音消息示例
- `website/docs/zh/api-doc/media.md` - 中文同步
- `website/docs/zh/api-doc/messages.md` - 中文同步

### Shared
- `packages/shared/src/types/message.types.ts` - 添加 AttachmentMetadata 类型

---

## Open Questions (Future Iteration)

1. 语音消息编辑/撤回后重新录制？
2. 语音消息转发？
3. 语音消息下载保存到本地？

---

**Created:** 2024-03-30
**Updated:** 2024-03-31
**Status:** Approved
**Next Step:** Phase 1 Implementation
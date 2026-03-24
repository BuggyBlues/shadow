# Shadow Design System

> 基于品牌 Logo 的异色瞳猫设计，充满活力与个性。

---

## 品牌精髓

**Shadow** — 一只异色瞳的猫，一只眼是黄色，一只是青色。这不仅是 Logo，更是品牌的灵魂：**双重特质、独特个性、神秘魅力**。

---

## 色彩系统

### 品牌色

| 名称 | 色值 | 来源 |
|------|------|------|
| **Cyan** | `#00F3FF` | Logo 右眼 |
| **Yellow** | `#F8E71C` | Logo 左眼 |

### 色彩层级

```
Cyan 系列 (主色 - 科技、AI)
├── Cyan-50    #E6FFFF
├── Cyan-100   #B3FEFF
├── Cyan-200   #80FDFF
├── Cyan-300   #4DFCFF
├── Cyan-400   #1AFAFF
├── Cyan-500   #00F3FF  ← 主色
├── Cyan-600   #00C2CC
├── Cyan-700   #009199
├── Cyan-800   #006066
└── Cyan-900   #003033

Yellow 系列 (强调色 - 活力、创造)
├── Yellow-50    #FFFDE6
├── Yellow-100   #FFF8B3
├── Yellow-200   #FFF380
├── Yellow-300   #FFEE4D
├── Yellow-400   #FFE91A
├── Yellow-500   #F8E71C  ← 强调色
├── Yellow-600   #C6B800
├── Yellow-700   #948A00
├── Yellow-800   #625C00
└── Yellow-900   #312E00
```

### 中性色

```
Gray 系列 (深色模式)
├── Gray-950   #0A0A0C  背景
├── Gray-900   #111114  表面
├── Gray-800   #1A1A1E  卡片
├── Gray-700   #2A2A30  边框
├── Gray-600   #3D3D44  分割
├── Gray-500   #5A5A62  禁用
├── Gray-400   #7A7A84  占位
├── Gray-300   #A0A0AA  次文字
├── Gray-200   #C8C8D0  正文
└── Gray-100   #F2F2F5  标题
```

### 功能色

| 用途 | 色值 |
|------|------|
| 成功 | `#22C55E` |
| 警告 | `#F59E0B` |
| 错误 | `#EF4444` |
| 信息 | `#00F3FF` |

### 渐变

```css
/* 品牌渐变 - 异色瞳 */
--gradient-brand: linear-gradient(135deg, #00F3FF 0%, #F8E71C 100%);

/* 光晕效果 */
--glow-cyan: 0 0 20px rgba(0, 243, 255, 0.4), 0 0 40px rgba(0, 243, 255, 0.2);
--glow-yellow: 0 0 20px rgba(248, 231, 28, 0.4), 0 0 40px rgba(248, 231, 28, 0.2);
```

---

## 字体

```css
--font-sans: "Inter", -apple-system, "PingFang SC", sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

| 级别 | 尺寸 | 行高 | 字重 |
|------|------|------|------|
| H1 | 32px | 1.2 | 700 |
| H2 | 24px | 1.3 | 600 |
| H3 | 18px | 1.4 | 600 |
| Body | 15px | 1.6 | 400 |
| Small | 13px | 1.5 | 400 |
| Caption | 11px | 1.4 | 500 |

---

## 间距

基于 4px：`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

---

## 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `radius-sm` | 4px | 标签 |
| `radius-md` | 8px | 按钮、输入框 |
| `radius-lg` | 12px | 卡片 |
| `radius-xl` | 16px | 模态框 |
| `radius-full` | 9999px | 头像、徽章 |

---

## 图标

**Lucide Icons**

| 尺寸 | 像素 | 用途 |
|------|------|------|
| SM | 16px | 按钮内 |
| MD | 20px | 默认 |
| LG | 24px | 标题 |

---

## 动效

| Token | 时长 | 用途 |
|-------|------|------|
| `fast` | 150ms | Hover |
| `normal` | 250ms | 展开 |
| `slow` | 400ms | 页面切换 |

缓动: `cubic-bezier(0.4, 0, 0.2, 1)`

---

## 组件

### Button

- Primary: Cyan-500 背景，hover 发光
- Secondary: 透明 + Cyan 边框
- Ghost: 透明，hover 灰色背景

### Input

- 背景: Gray-800
- Focus: Cyan-500 边框 + 光晕

### Card

- 背景: Gray-800
- Hover: 上浮 + Cyan 边框

### Avatar

- 圆形，带状态指示器
- 默认: Cyan → Yellow 渐变

### Badge

- 药丸形
- Cyan: 默认
- Yellow: 强调

---

## Demo

`demos/showcase.html` — 完整设计系统展示

---

*Shadow Design System — 双重特质，独特个性*
# Shadow Design System

> **Heterochromia (异色瞳)** — 双重特质，独特个性

---

## 品牌核心

**Shadow** 是一只异色瞳的猫。这代表双重特质、神秘魅力、独特个性。

**Slogan**: The super community for super individuals

---

## 色彩系统

### 品牌色

| 名称 | Light Mode | Dark Mode | 用途 |
|------|-----------|-----------|------|
| **Cyan** | `#00C8D6` | `#00F3FF` | 主色、AI、科技 |
| **Yellow** | `#F8E71C` | `#F8E71C` | 强调、活力、创造 |
| **Pink** | `#FF6B9D` | `#FF6B9D` | 神秘、个性、装饰 |

### 语义色

| 名称 | 用途 |
|------|------|
| `#22C55E` | 成功、在线 |
| `#EF4444` | 错误、勿扰 |
| `#F59E0B` | 警告、离开 |

### 中性色

**Light Mode:**
| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#FEFEFE` | 页面背景 |
| `--surface` | `#FFFFFF` | 卡片背景 |
| `--border` | `rgba(0,0,0,0.08)` | 边框 |
| `--text` | `#1A1D24` | 主文字 |
| `--text-secondary` | `#4A5568` | 次文字 |

**Dark Mode:**
| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#0C0D10` | 页面背景 |
| `--surface` | `#181A22` | 卡片背景 |
| `--border` | `rgba(255,255,255,0.06)` | 边框 |
| `--text` | `#F1F5F9` | 主文字 |
| `--text-secondary` | `#94A3B8` | 次文字 |

---

## 字体

| 用途 | 字体 |
|------|------|
| 标题 (中文) | **ZCOOL KuaiLe** |
| 正文/标题 (英文) | **Nunito** |
| 代码 | JetBrains Mono |

---

## 布局

### 间距
基于 **8px 网格**: `4, 8, 12, 16, 20, 24, 32, 40, 48`

### 圆角
| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 6px | 小元素 |
| `--radius-md` | 14px | 输入框 |
| `--radius-lg` | 24px | 卡片 |
| `--radius-full` | 9999px | 按钮、徽章 |

---

## 组件

### Button
- 药丸形 (`border-radius: 9999px`)
- 渐变背景 + 阴影
- Hover: 上浮 + 放大

### Card
- 毛玻璃效果 (`backdrop-filter: blur`)
- 圆角 24px
- Hover: 上浮 + 边框变亮

### Avatar
- 三色渐变背景
- 在线状态指示器

### Badge
- 药丸形
- 半透明背景 + 边框

---

## 动效

| 场景 | 时长 |
|------|------|
| Hover | 200ms |
| 过渡 | 300ms |
| 页面切换 | 400ms |

**猫眼动画**: 脉冲光晕 (3s infinite)

---

## 日夜间模式

```css
:root { /* Light Mode */ }
html.dark { /* Dark Mode */ }
```

使用 CSS 变量自动适配，通过 `html.dark` 类切换。

---

## 应用场景

1. 消息列表
2. 个人主页
3. 设置面板
4. 导航布局
5. AI 对话
6. 社区商城

---

## Demo

`demos/showcase.html` — 完整设计系统展示

---

*Shadow Design System — Heterochromia*
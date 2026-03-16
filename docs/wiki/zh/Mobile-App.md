# 移动端应用

Shadow 移动应用的开发和部署指南。

## 概述

Shadow Mobile 使用 **Expo 54** 和 **React Native 0.81** 构建。使用 **Expo Router** 进行基于文件的导航，通过 `@shadowob/shared` 与 Web 应用共享业务逻辑。

## 开发

### 启动 Metro Bundler

```bash
pnpm --dir ./apps/mobile start
```

### 在设备上运行

```bash
# iOS 模拟器
pnpm --dir ./apps/mobile ios

# Android 模拟器
pnpm --dir ./apps/mobile android
```

### Expo Go

快速测试时，使用设备上的 Expo Go 应用扫描 Metro Bundler 的二维码。

## 项目结构

```
apps/mobile/
├── app/                      # Expo Router 基于文件的路由
│   ├── _layout.tsx           # 根布局（认证检查、Provider）
│   ├── (auth)/               # 认证页面
│   │   ├── login.tsx         # 登录页
│   │   └── register.tsx      # 注册页
│   └── (main)/               # 主应用（需要认证）
│       ├── (tabs)/           # 标签页导航
│       │   ├── _layout.tsx   # 标签栏配置
│       │   ├── index.tsx     # 服务器列表（首页）
│       │   ├── explore.tsx   # 发现服务器
│       │   └── settings.tsx  # 设置中心
│       ├── server/           # 服务器页面
│       ├── channel/          # 频道和聊天页面
│       └── settings/         # 设置子页面
├── src/
│   ├── components/           # 可复用 React Native 组件
│   ├── hooks/                # 自定义 Hooks（认证、socket 等）
│   ├── stores/               # Zustand 状态仓库
│   ├── lib/                  # API 客户端、socket、工具函数
│   └── i18n/                 # 国际化
│       └── locales/          # en、zh-CN、zh-TW、ja、ko
├── assets/                   # 图片、字体、启动画面
└── app.config.ts             # Expo 配置
```

## 核心功能

- **实时消息** — 基于 Socket.IO
- **消息分组** — 日期分隔符和输入指示器
- **文件附件** — 通过图片选择器和文档选择器
- **Markdown 渲染** — 消息中的 Markdown 格式
- **推送通知** — 通过 Expo Notifications
- **触觉反馈** — 交互触觉反馈
- **深色/浅色主题** — 主题切换支持
- **国际化** — 5 种语言（en、zh-CN、zh-TW、ja、ko）

## 生产构建

### iOS (TestFlight)

```bash
# 生成原生项目
pnpm --dir ./apps/mobile prebuild

# 使用 EAS 构建
eas build --platform ios --profile production

# 提交到 TestFlight
eas submit --platform ios
```

或使用引导式部署脚本：

```bash
./scripts/deploy-testflight.sh
```

### Android (APK / Play Store)

```bash
# 构建 APK
eas build --platform android --profile production

# 提交到 Play Store
eas submit --platform android
```

## EAS 配置

`apps/mobile/` 中的 `eas.json` 定义了构建配置：

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## 测试

移动端测试与服务端移动 API 测试一起编写：

```bash
pnpm --dir ./apps/server test -- mobile
```

## 样式

移动应用使用 React Native 的 `StyleSheet`，配合自定义主题系统，支持深色和浅色模式。颜色和间距在主题文件中定义，通过自定义 Hooks 访问。

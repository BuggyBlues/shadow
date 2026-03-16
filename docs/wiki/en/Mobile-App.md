# Mobile App

Developing and deploying the Shadow mobile application.

## Overview

Shadow Mobile is built with **Expo 54** and **React Native 0.81**. It uses **Expo Router** for file-based navigation and shares business logic with the web app through `@shadowob/shared`.

## Development

### Start Metro Bundler

```bash
pnpm --dir ./apps/mobile start
```

### Run on Devices

```bash
# iOS Simulator
pnpm --dir ./apps/mobile ios

# Android Emulator
pnpm --dir ./apps/mobile android
```

### Expo Go

For quick testing, scan the QR code from Metro Bundler with the Expo Go app on your device.

## Project Structure

```
apps/mobile/
├── app/                      # Expo Router file-based routes
│   ├── _layout.tsx           # Root layout (auth check, providers)
│   ├── (auth)/               # Authentication screens
│   │   ├── login.tsx         # Login screen
│   │   └── register.tsx      # Registration screen
│   └── (main)/               # Main app (requires auth)
│       ├── (tabs)/           # Tab navigation
│       │   ├── _layout.tsx   # Tab bar configuration
│       │   ├── index.tsx     # Servers list (home)
│       │   ├── explore.tsx   # Discover servers
│       │   └── settings.tsx  # Settings hub
│       ├── server/           # Server screens
│       ├── channel/          # Channel & chat screens
│       └── settings/         # Settings sub-pages
├── src/
│   ├── components/           # Reusable React Native components
│   ├── hooks/                # Custom hooks (auth, socket, etc.)
│   ├── stores/               # Zustand state stores
│   ├── lib/                  # API client, socket, utilities
│   └── i18n/                 # Internationalization
│       └── locales/          # en, zh-CN, zh-TW, ja, ko
├── assets/                   # Images, fonts, splash screen
└── app.config.ts             # Expo configuration
```

## Key Features

- **Real-time messaging** with Socket.IO
- **Message grouping** with date separators and typing indicators
- **File attachments** via image picker and document picker
- **Markdown rendering** in messages
- **Push notifications** via Expo Notifications
- **Haptic feedback** for interactions
- **Dark/light theme** support
- **i18n** — 5 languages (en, zh-CN, zh-TW, ja, ko)

## Building for Production

### iOS (TestFlight)

```bash
# Generate native project
pnpm --dir ./apps/mobile prebuild

# Build with EAS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

Or use the guided deploy script:

```bash
./scripts/deploy-testflight.sh
```

### Android (APK / Play Store)

```bash
# Build APK
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## EAS Configuration

The `eas.json` in `apps/mobile/` defines build profiles:

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

## Testing

Mobile tests are written alongside the server-side mobile API tests:

```bash
pnpm --dir ./apps/server test -- mobile
```

## Styling

The mobile app uses React Native's `StyleSheet` with a custom theme system that supports light and dark modes. Colors and spacing are defined in theme files and accessed via custom hooks.

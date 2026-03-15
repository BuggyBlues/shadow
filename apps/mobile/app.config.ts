import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: '虾豆 Shadow',
  slug: 'shadow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'shadow',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1E1F22',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.shadowob.mobile',
    associatedDomains: ['applinks:shadow.example.com'],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1E1F22',
    },
    package: 'com.shadowob.mobile',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'shadow' }, { scheme: 'https', host: 'shadow.example.com' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-image-picker',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#00C8D6',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'your-project-id',
    },
  },
}

export default config

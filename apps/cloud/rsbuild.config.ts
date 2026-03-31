import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

// API backend port — overridden in E2E to point at the test serve instance
const apiPort = process.env.SERVE_PORT ?? '3004'

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/interfaces/dashboard/main.tsx',
    },
  },
  resolve: {
    alias: {
      '@': './src/interfaces/dashboard',
    },
  },
  html: {
    template: './src/interfaces/dashboard/index.html',
    title: 'Shadow Cloud Console',
  },
  server: {
    port: 3003,
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
  output: {
    distPath: { root: 'dist/console' },
    assetPrefix: '/',
  },
})

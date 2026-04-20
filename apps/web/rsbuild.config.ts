import path from 'node:path'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

// Absolute path to @shadowob/cloud-ui source
const cloudUiSrc = path.resolve(__dirname, '../cloud/packages/ui/src')

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/main.tsx',
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
    conditionNames: ['development', 'import', 'module', 'default'],
  },
  html: {
    template: './index.html',
    title: 'Shadow',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
      },
      '/shadow': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  output: {
    assetPrefix: '/app/',
  },
  tools: {
    rspack: (config, { rspack }) => {
      // When cloud-ui source files (or web-saas files) import `@/xxx`,
      // resolve those to cloud-ui's own src directory instead of apps/web/src.
      config.plugins ??= []
      config.plugins.push(
        new rspack.NormalModuleReplacementPlugin(/^@\//, (resource) => {
          const issuer: string = resource.contextInfo?.issuer ?? resource.context ?? ''
          const isCloudFile =
            issuer.includes('/cloud/packages/ui/src/') ||
            issuer.includes('/cloud/src/interfaces/web-saas/')
          if (isCloudFile) {
            resource.request = path.join(cloudUiSrc, resource.request.replace(/^@\//, ''))
          }
        }),
      )
      return config
    },
  },
})

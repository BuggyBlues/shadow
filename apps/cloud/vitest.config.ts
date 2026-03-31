import UnpluginTypia from '@typia/unplugin/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [UnpluginTypia({ cache: false })],
  test: {
    globals: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/__tests__/e2e/**', 'e2e/**'],
  },
})

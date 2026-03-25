import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  outDir: 'dist',
})

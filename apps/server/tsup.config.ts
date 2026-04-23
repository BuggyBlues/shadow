import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    noExternal: [/^@shadowob\//],
    clean: true,
  },
  {
    entry: ['src/cloud-worker.ts'],
    format: ['cjs'],
    target: 'es2022',
    outExtension() {
      return { js: '.cjs' }
    },
    clean: false,
  },
])

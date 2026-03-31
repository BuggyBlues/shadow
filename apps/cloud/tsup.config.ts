import UnpluginTypia from '@typia/unplugin'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  // Bundle @shadowob/shared (pure ESM, no CJS deps).
  // Keep @shadowob/sdk external — it pulls in socket.io-client → xmlhttprequest-ssl (CJS),
  // which cannot be bundled into ESM output (dynamic require of 'fs' fails).
  noExternal: [/^@shadowob\/shared$/],
  clean: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildPlugins: [UnpluginTypia.esbuild({ cache: false })],
})

/**
 * Generate JSON Schema from CloudConfig TypeScript interfaces.
 *
 * Usage: pnpm generate:schema
 * Output: schemas/xcloud.schema.json
 *
 * Users can reference this schema in their xcloud.json:
 *   { "$schema": "./node_modules/@shadowob/cloud/schemas/xcloud.schema.json" }
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import typia from 'typia'
import type { CloudConfig } from '../src/config/schema.js'

const schemas = typia.json.schemas<[CloudConfig], '3.1'>()

const jsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  ...schemas.schemas[0],
  $defs: schemas.components.schemas,
}

const outDir = resolve(import.meta.dirname, '..', 'schemas')
mkdirSync(outDir, { recursive: true })

const outPath = resolve(outDir, 'xcloud.schema.json')
writeFileSync(outPath, `${JSON.stringify(jsonSchema, null, 2)}\n`, 'utf-8')

console.log(`Generated JSON Schema: ${outPath}`)

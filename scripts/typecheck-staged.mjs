#!/usr/bin/env node

/**
 * Runs TypeScript type-checking only on workspace packages affected by staged files.
 * This avoids running full-project typecheck on every commit while still catching
 * type errors before they make it into a PR.
 */

import { execSync } from 'node:child_process'

const ROOT = import.meta.dirname ? import.meta.dirname + '/..' : process.cwd()

// Map file path prefixes to workspace package filters
// Only packages/* are strictly type-checked; apps/* have pre-existing errors
// and are checked as report-only in CI (not blocking here).
const PACKAGE_MAP = [
  { prefix: 'packages/shared/', filter: '@shadowob/shared' },
  { prefix: 'packages/sdk/', filter: '@shadowob/sdk' },
  { prefix: 'packages/cli/', filter: '@shadowob/cli' },
  { prefix: 'packages/oauth/', filter: '@shadowob/oauth' },
  { prefix: 'packages/openclaw-shadowob/', filter: '@shadowob/openclaw-shadowob' },
  { prefix: 'packages/ui/', filter: '@shadowob/ui' },
]

function getStagedTsFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return output
    .split('\n')
    .map((s) => s.trim())
    .filter((f) => /\.(ts|tsx)$/.test(f))
}

function main() {
  const staged = getStagedTsFiles()
  if (staged.length === 0) {
    console.log('✅ No staged TypeScript files — skipping typecheck')
    return
  }

  // Determine affected packages
  const affectedFilters = new Set()
  for (const file of staged) {
    for (const { prefix, filter } of PACKAGE_MAP) {
      if (file.startsWith(prefix)) {
        affectedFilters.add(filter)
        break
      }
    }
  }

  if (affectedFilters.size === 0) {
    console.log('✅ Staged files are outside tracked packages — skipping typecheck')
    return
  }

  console.log(`🔍 Type-checking affected packages: ${[...affectedFilters].join(', ')}`)

  const filters = [...affectedFilters].map((f) => `--filter=${f}`).join(' ')
  try {
    execSync(`pnpm ${filters} --parallel exec tsc --noEmit`, {
      cwd: ROOT,
      stdio: 'inherit',
    })
    console.log('✅ Typecheck passed')
  } catch {
    console.error('\n❌ TypeScript type errors found. Please fix them before committing.')
    process.exit(1)
  }
}

main()

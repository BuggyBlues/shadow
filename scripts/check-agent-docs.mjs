#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

const requiredFiles = [
  'AGENTS.md',
  'apps/AGENTS.md',
  'packages/AGENTS.md',
  'docs/AGENTS.md',
  'scripts/AGENTS.md',
  'website/AGENTS.md',
  'docs/development/agent-first-repo.md',
  'docs/development/test-matrix.md',
]

const rootLinkTargets = [
  'docs/development/agent-first-repo.md',
  'docs/development/test-matrix.md',
  'apps/AGENTS.md',
  'packages/AGENTS.md',
  'docs/AGENTS.md',
  'scripts/AGENTS.md',
  'website/AGENTS.md',
]

const errors = []

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required agent-facing file: ${relativePath}`)
  }
}

const rootAgentsPath = path.join(ROOT, 'AGENTS.md')
const rootAgentsContent = fs.existsSync(rootAgentsPath)
  ? fs.readFileSync(rootAgentsPath, 'utf8')
  : ''

for (const relativePath of rootLinkTargets) {
  if (!rootAgentsContent.includes(`\`${relativePath}\``)) {
    errors.push(`Root AGENTS.md should link to \`${relativePath}\``)
  }
}

if (errors.length > 0) {
  console.error('\x1b[31m✖ Agent map check failed\x1b[0m')
  for (const error of errors) {
    console.error(`  - ${error}`)
  }
  process.exit(1)
}

console.log('\x1b[32m✔ Agent map is in sync\x1b[0m')

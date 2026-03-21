/**
 * Archive UNRELEASED.md into a versioned changelog file.
 *
 * Usage:
 *   node scripts/archive-changelog.mjs            # uses version from package.json
 *   node scripts/archive-changelog.mjs --version=0.3.0
 *
 * What it does:
 * 1. Reads changelogs/UNRELEASED.md
 * 2. Writes changelogs/v{version}.md with a header + the unreleased content
 * 3. Resets UNRELEASED.md to an empty template
 * 4. Prints the release notes to stdout (for piping into `gh release create`)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const changelogsDir = join(__dirname, '..', 'changelogs')
const unreleasedPath = join(changelogsDir, 'UNRELEASED.md')
const pkgPath = join(__dirname, '..', 'package.json')

// Parse version from args or package.json
const versionArg = process.argv.find((a) => a.startsWith('--version='))
const version = versionArg
  ? versionArg.split('=')[1]
  : JSON.parse(readFileSync(pkgPath, 'utf-8')).version

if (!version) {
  console.error('Could not determine version. Pass --version=x.y.z or set it in package.json.')
  process.exit(1)
}

if (!existsSync(unreleasedPath)) {
  console.error(`No UNRELEASED.md found at ${unreleasedPath}`)
  process.exit(1)
}

const raw = readFileSync(unreleasedPath, 'utf-8')

// Strip the header and HTML comments, keep only the section content
const contentLines = raw
  .split('\n')
  .filter((line) => !line.startsWith('# Unreleased') && !line.includes('<!--') && !line.includes('-->'))
const content = contentLines.join('\n').trim()

// Check if there's actual content (not just empty section headers)
const hasEntries = contentLines.some(
  (line) => line.trim() !== '' && !line.startsWith('## '),
)

if (!hasEntries) {
  console.log('No unreleased entries found. Nothing to archive.')
  process.exit(0)
}

// Write versioned file
const date = new Date().toISOString().slice(0, 10)
const versionedContent = `# v${version} (${date})\n\n${content}\n`
const versionedPath = join(changelogsDir, `v${version}.md`)

if (existsSync(versionedPath)) {
  console.error(`${versionedPath} already exists. Bump the version first.`)
  process.exit(1)
}

writeFileSync(versionedPath, versionedContent, 'utf-8')
console.error(`Archived to changelogs/v${version}.md`)

// Reset UNRELEASED.md
const template = `# Unreleased Changes

<!--
  Add entries here during development. Each entry should be a single line
  under the appropriate section. At release time, run:
    node scripts/archive-changelog.mjs
  to move these entries into a versioned file (e.g. changelogs/v${version}.md).
-->

## ✨ Features


## 🐛 Bug Fixes


## 🔧 Improvements

`
writeFileSync(unreleasedPath, template, 'utf-8')
console.error('Reset UNRELEASED.md')

// Print release notes to stdout for use by gh/GitHub Actions
console.log(versionedContent)

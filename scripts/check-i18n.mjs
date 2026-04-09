#!/usr/bin/env node

/**
 * i18n lint: checks for hardcoded UI strings in JSX/TSX files and validates locale key parity.
 *
 * Checks:
 * 1. Locale key parity — all locale files must have the same keys as zh-CN.json (reference).
 * 2. No empty translation values in any locale file.
 * 3. Hardcoded Chinese text in JSX — detects Chinese characters inside JSX elements or
 *    attributes that should use t('key') instead.
 *
 * Usage:
 *   node scripts/check-i18n.mjs                 # check all
 *   node scripts/check-i18n.mjs --fix-keys      # show missing keys per locale
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const LOCALES_DIR = path.join(ROOT, 'apps/web/src/lib/locales')
const WEB_SRC = path.join(ROOT, 'apps/web/src')

const errors = []
const warnings = []

// ─── 1. Locale key parity ───────────────────────────────────────────────

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

function checkLocaleParity() {
  const refPath = path.join(LOCALES_DIR, 'zh-CN.json')
  if (!fs.existsSync(refPath)) {
    errors.push('Reference locale zh-CN.json not found')
    return
  }
  const refData = JSON.parse(fs.readFileSync(refPath, 'utf8'))
  const refKeys = new Set(flattenKeys(refData))

  const localeFiles = fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'zh-CN.json')

  for (const file of localeFiles) {
    const lang = file.replace('.json', '')
    const data = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'))
    const keys = new Set(flattenKeys(data))

    // Check for missing keys
    for (const k of refKeys) {
      if (!keys.has(k)) {
        errors.push(`[${lang}] Missing key: ${k}`)
      }
    }

    // Check for extra keys not in reference
    for (const k of keys) {
      if (!refKeys.has(k)) {
        warnings.push(`[${lang}] Extra key not in zh-CN: ${k}`)
      }
    }

    // Check for empty values
    function checkEmpty(obj, prefix = '') {
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k
        if (typeof v === 'string' && v.trim() === '') {
          errors.push(`[${lang}] Empty value: ${full}`)
        } else if (typeof v === 'object' && v !== null) {
          checkEmpty(v, full)
        }
      }
    }
    checkEmpty(data)
  }
}

// ─── 2. Hardcoded Chinese in JSX ────────────────────────────────────────

// Regex to find Chinese characters (CJK Unified Ideographs range)
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/

// Directories/files to skip
const SKIP_PATTERNS = [
  '/locales/', // locale JSON files
  '/lib/i18n.', // i18n config
  '/__tests__/', // test files
  '/test/', // test files
  '.test.', // test files
  '.spec.', // spec files
  '/e2e/', // e2e tests
]

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((p) => filePath.includes(p))
}

function collectTsxFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...collectTsxFiles(full))
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name) && !shouldSkip(full)) {
      results.push(full)
    }
  }
  return results
}

function checkHardcodedStrings() {
  const files = collectTsxFiles(WEB_SRC)

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    const relativePath = path.relative(ROOT, file)

    // Check if file uses useTranslation
    const hasTranslation = content.includes('useTranslation')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Skip import/comment lines
      if (
        line.trimStart().startsWith('import ') ||
        line.trimStart().startsWith('//') ||
        line.trimStart().startsWith('*') ||
        line.trimStart().startsWith('/*')
      ) {
        continue
      }

      // Look for Chinese characters in JSX text content
      // Pattern: > Chinese text <  or >Chinese text{  (JSX text nodes)
      const jsxTextMatches = line.matchAll(/>\s*([^<{]*[\u4e00-\u9fff\u3400-\u4dbf][^<{]*)\s*[<{]/g)
      for (const match of jsxTextMatches) {
        const text = match[1].trim()
        // Skip if it's inside a t() call or template literal
        if (line.includes(`t('`) || line.includes('t("') || line.includes('t(`')) continue
        warnings.push(
          `${relativePath}:${lineNum} Hardcoded Chinese in JSX: "${text.substring(0, 40)}"`,
        )
      }

      // Look for hardcoded Chinese in string literals used as props (title="中文", placeholder="中文" etc.)
      const propMatches = line.matchAll(
        /(title|placeholder|label|alt|aria-label)="([^"]*[\u4e00-\u9fff\u3400-\u4dbf][^"]*)"/g,
      )
      for (const match of propMatches) {
        const prop = match[1]
        const text = match[2]
        warnings.push(
          `${relativePath}:${lineNum} Hardcoded Chinese in ${prop}="${text.substring(0, 30)}"`,
        )
      }
    }
  }
}

// ─── Run checks ─────────────────────────────────────────────────────────

console.log('🌍 i18n lint check\n')

checkLocaleParity()
checkHardcodedStrings()

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s):`)
  for (const w of warnings) {
    console.log(`  ⚠ ${w}`)
  }
  console.log()
}

if (errors.length > 0) {
  console.log(`❌ ${errors.length} error(s):`)
  for (const e of errors) {
    console.log(`  ✗ ${e}`)
  }
  process.exit(1)
} else {
  console.log('✅ i18n check passed — all locale keys match, no empty values.')
}

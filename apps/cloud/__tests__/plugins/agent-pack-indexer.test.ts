import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AGENT_PACK_SLASH_INDEXER_SCRIPT } from '../../src/plugins/agent-pack/indexer-script.js'

function writeGstackOfficeHoursFixture() {
  const root = mkdtempSync(join(tmpdir(), 'shadow-agent-pack-'))
  const skillDir = join(root, 'agent-packs', 'gstack', 'skills', 'gstack-openclaw-office-hours')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---
name: gstack-openclaw-office-hours
description: Use when asked to run office hours.
---

# YC Office Hours

### The Six Forcing Questions

#### Q1: Demand Reality

**Ask:** "What's the strongest evidence you have that someone actually wants this?"

#### Q2: Status Quo

**Ask:** "What are your users doing right now to solve this problem?"
`,
    'utf-8',
  )
  return { root, mountPath: join(root, 'agent-packs') }
}

describe('agent-pack slash command indexer', () => {
  it('derives aliases and form fields from upstream command markdown', () => {
    const { root, mountPath } = writeGstackOfficeHoursFixture()
    const scriptPath = join(root, 'indexer.mjs')
    const outputPath = join(root, 'agent-packs', '.shadow', 'slash-commands.json')
    writeFileSync(scriptPath, AGENT_PACK_SLASH_INDEXER_SCRIPT, 'utf-8')

    execFileSync('node', [
      scriptPath,
      '--mount-path',
      mountPath,
      '--output',
      outputPath,
      '--infer-interactions',
      'true',
    ])

    const commands = JSON.parse(readFileSync(outputPath, 'utf-8'))
    expect(commands).toHaveLength(1)
    expect(commands[0].name).toBe('gstack-openclaw-office-hours')
    expect(commands[0].aliases).toEqual(expect.arrayContaining(['office-hours', 'office-hour']))
    expect(commands[0].interaction.kind).toBe('form')
    expect(commands[0].interaction.fields).toHaveLength(2)
    expect(commands[0].interaction.fields[0].label).toBe('Q1: Demand Reality')
    expect(commands[0].interaction.fields[0].placeholder).toContain('strongest evidence')
  })
})

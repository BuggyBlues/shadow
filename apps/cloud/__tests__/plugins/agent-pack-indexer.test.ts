import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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

  it('wraps mounted helper scripts as skills and slash commands', () => {
    const root = mkdtempSync(join(tmpdir(), 'shadow-agent-pack-'))
    const mountPath = join(root, 'agent-packs')
    const scriptDir = join(mountPath, 'gstack', 'scripts')
    const existingSkillDir = join(mountPath, 'gstack', 'skills', 'gstack-upgrade')
    mkdirSync(scriptDir, { recursive: true })
    mkdirSync(existingSkillDir, { recursive: true })
    writeFileSync(
      join(scriptDir, 'gstack-analytics'),
      `#!/usr/bin/env bash
# gstack-analytics — personal usage dashboard from local JSONL
echo analytics
`,
      'utf-8',
    )
    writeFileSync(
      join(scriptDir, 'helper.ts'),
      `export function helper() { return 'not a CLI script' }
`,
      'utf-8',
    )
    writeFileSync(
      join(scriptDir, 'gstack-upgrade'),
      `#!/usr/bin/env bash
echo upgrade
`,
      'utf-8',
    )
    writeFileSync(
      join(existingSkillDir, 'SKILL.md'),
      `---
name: gstack-upgrade
---
# Existing upgrade skill
`,
      'utf-8',
    )

    const scriptPath = join(root, 'indexer.mjs')
    const outputPath = join(mountPath, '.shadow', 'slash-commands.json')
    writeFileSync(scriptPath, AGENT_PACK_SLASH_INDEXER_SCRIPT, 'utf-8')

    execFileSync('node', [
      scriptPath,
      '--mount-path',
      mountPath,
      '--output',
      outputPath,
      '--include-scripts',
      'true',
      '--generate-script-skills',
      'true',
    ])

    const generatedSkillPath = join(mountPath, 'gstack', 'skills', 'gstack-analytics', 'SKILL.md')
    expect(existsSync(generatedSkillPath)).toBe(true)
    expect(readFileSync(generatedSkillPath, 'utf-8')).toContain(
      'Script path: ' + join(scriptDir, 'gstack-analytics'),
    )

    const commands = JSON.parse(readFileSync(outputPath, 'utf-8'))
    const analytics = commands.find(
      (command: { name: string }) => command.name === 'gstack-analytics',
    )
    expect(analytics?.description).toContain('personal usage dashboard')
    expect(analytics?.body).toContain('Script path:')
    expect(commands.some((command: { name: string }) => command.name === 'helper')).toBe(false)
    expect(
      commands.filter((command: { name: string }) => command.name === 'gstack-upgrade'),
    ).toHaveLength(1)
  })

  it('wraps top-level setup scripts copied into the scripts mount', () => {
    const root = mkdtempSync(join(tmpdir(), 'shadow-agent-pack-'))
    const mountPath = join(root, 'agent-packs')
    const scriptDir = join(mountPath, 'gstack', 'scripts')
    mkdirSync(scriptDir, { recursive: true })
    writeFileSync(
      join(scriptDir, 'setup'),
      `#!/usr/bin/env bash
# Install gstack into the current agent host.
echo setup
`,
      'utf-8',
    )

    const scriptPath = join(root, 'indexer.mjs')
    const outputPath = join(mountPath, '.shadow', 'slash-commands.json')
    writeFileSync(scriptPath, AGENT_PACK_SLASH_INDEXER_SCRIPT, 'utf-8')

    execFileSync('node', [scriptPath, '--mount-path', mountPath, '--output', outputPath])

    const commands = JSON.parse(readFileSync(outputPath, 'utf-8'))
    const setup = commands.find((command: { name: string }) => command.name === 'setup')
    expect(setup?.description).toContain('Install gstack')
    expect(existsSync(join(mountPath, 'gstack', 'skills', 'setup', 'SKILL.md'))).toBe(true)
  })
})

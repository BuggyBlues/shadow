/**
 * agent-pack plugin — unit tests for the multi-kind, registry-free pack puller.
 */

import { describe, expect, it } from 'vitest'
import { buildAgentPackPrompt, resolvePacks } from '../../src/plugins/agent-pack/index.js'
import {
  buildAgentPackInitContainer,
  parsePollInterval,
  type ResolvedPack,
  sanitizeId,
} from '../../src/plugins/agent-pack/k8s.js'

describe('agent-pack resolvePacks', () => {
  it('resolves a single pack with explicit url + mounts', () => {
    const r = resolvePacks({
      packs: [
        {
          url: 'https://github.com/coreyhaines31/marketingskills',
          mounts: [{ kind: 'skills', from: 'skills' }],
        },
      ],
    })
    expect(r).toHaveLength(1)
    expect(r[0]!.id).toBe('coreyhaines31-marketingskills')
    expect(r[0]!.url).toContain('marketingskills')
    expect(r[0]!.ref).toBe('main')
    expect(r[0]!.mounts).toEqual([{ kind: 'skills', from: 'skills', include: undefined }])
  })

  it('honors explicit id override', () => {
    const r = resolvePacks({
      packs: [
        {
          id: 'mkt',
          url: 'https://github.com/coreyhaines31/marketingskills',
          mounts: [{ kind: 'skills', from: 'skills' }],
        },
      ],
    })
    expect(r[0]!.id).toBe('mkt')
  })

  it('strips .git suffix from auto-derived id', () => {
    const r = resolvePacks({
      packs: [
        {
          url: 'https://github.com/acme/skills.git',
          ref: 'v2',
          mounts: [{ kind: 'skills', from: 'pkg/skills' }],
        },
      ],
    })
    expect(r[0]!.id).toBe('acme-skills')
    expect(r[0]!.ref).toBe('v2')
    expect(r[0]!.mounts[0]!.from).toBe('pkg/skills')
  })

  it('supports multi-kind mounts in one pack', () => {
    const r = resolvePacks({
      packs: [
        {
          id: 'gstack',
          url: 'https://github.com/garrytan/gstack',
          mounts: [
            { kind: 'skills', from: '.' },
            { kind: 'instructions', from: '.' },
            { kind: 'scripts', from: 'bin' },
          ],
        },
      ],
    })
    expect(r[0]!.mounts.map((m) => m.kind)).toEqual(['skills', 'instructions', 'scripts'])
  })

  it('drops packs with no url', () => {
    const r = resolvePacks({
      packs: [{ id: 'broken', mounts: [{ kind: 'skills', from: '.' }] }],
    })
    expect(r).toHaveLength(0)
  })

  it('drops packs with no mounts', () => {
    const r = resolvePacks({ packs: [{ url: 'https://github.com/a/b' }] })
    expect(r).toHaveLength(0)
  })

  it('deduplicates packs sharing the same id', () => {
    const r = resolvePacks({
      packs: [
        { id: 'x', url: 'https://github.com/a/b', mounts: [{ kind: 'skills', from: '.' }] },
        { id: 'x', url: 'https://github.com/c/d', mounts: [{ kind: 'skills', from: '.' }] },
      ],
    })
    expect(r).toHaveLength(1)
    expect(r[0]!.url).toContain('a/b')
  })

  it('builds runtime guidance for mounted packs', () => {
    const prompt = buildAgentPackPrompt(
      [
        {
          id: 'gstack',
          url: 'https://github.com/garrytan/gstack',
          ref: 'main',
          depth: 1,
          mounts: [
            { kind: 'skills', from: 'openclaw/skills' },
            { kind: 'instructions', from: 'openclaw' },
          ],
          instructionFiles: [],
        },
      ],
      '/agent-packs',
    )

    expect(prompt).toContain('Mounted Agent Packs')
    expect(prompt).toContain('/agent-packs/gstack/skills')
    expect(prompt).toContain('/agent-packs/gstack/instructions')
    expect(prompt).toContain('source-of-truth context')
  })
})

describe('agent-pack k8s helpers', () => {
  it('parsePollInterval understands s/m/h units', () => {
    expect(parsePollInterval('30s')).toBe(30)
    expect(parsePollInterval('5m')).toBe(300)
    expect(parsePollInterval('1h')).toBe(3600)
    expect(parsePollInterval(undefined)).toBe(0)
    expect(parsePollInterval('garbage')).toBe(0)
  })

  it('sanitizeId strips unsafe chars', () => {
    expect(sanitizeId('owner/repo.git')).toBe('owner_repo.git')
  })

  it('buildAgentPackInitContainer clones every pack and copies per-kind subdirs', () => {
    const packs: ResolvedPack[] = [
      {
        id: 'marketingskills',
        url: 'https://github.com/x/y',
        ref: 'main',
        depth: 1,
        mounts: [{ kind: 'skills', from: 'skills' }],
        instructionFiles: ['CLAUDE.md'],
      },
      {
        id: 'gstack',
        url: 'https://github.com/a/b',
        ref: 'main',
        depth: 1,
        mounts: [
          { kind: 'skills', from: '.' },
          { kind: 'instructions', from: '.' },
        ],
        instructionFiles: ['CLAUDE.md', 'AGENTS.md'],
      },
    ]
    const init = buildAgentPackInitContainer(packs, '/agent-packs', 'agent-packs')
    expect(init.image).toBe('alpine/git:latest')
    expect(init.command[0]).toBe('/bin/sh')
    expect(init.command[1]).toBe('-c')
    const script = init.command[2]!
    expect(script).toContain('https://github.com/x/y')
    expect(script).toContain('https://github.com/a/b')
    expect(script).toContain('/agent-packs/marketingskills/skills')
    expect(script).toContain('/agent-packs/gstack/skills')
    expect(script).toContain('/agent-packs/gstack/instructions')
    expect(script).toContain('AGENTS.md')
    expect(script).toContain('.pack.json')
    expect(init.volumeMounts[0]!.mountPath).toBe('/agent-packs')
  })
})

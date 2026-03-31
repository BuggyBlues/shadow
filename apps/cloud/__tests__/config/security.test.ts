import { describe, expect, it } from 'vitest'
import { validateNoInlineKeys } from '../../src/config/security'

describe('validateNoInlineKeys', () => {
  it('returns empty for safe config', () => {
    const config = {
      version: '1.0.0',
      registry: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: testing OpenClaw env var syntax
        providers: [{ id: 'anthropic', apiKey: '${env:ANTHROPIC_API_KEY}' }],
      },
    }
    expect(validateNoInlineKeys(config)).toEqual([])
  })

  it('detects inline Anthropic key', () => {
    const config = {
      registry: {
        providers: [{ id: 'anthropic', apiKey: 'sk-ant-api03-hardcoded1234567890' }],
      },
    }
    const violations = validateNoInlineKeys(config)
    expect(violations.length).toBe(1)
    expect(violations[0].path).toContain('apiKey')
    expect(violations[0].prefix).toBe('sk-ant-')
  })

  it('detects multiple inline keys', () => {
    const config = {
      registry: {
        providers: [
          { id: 'anthropic', apiKey: 'sk-ant-api03-abcdef123456789012' },
          { id: 'groq', apiKey: 'gsk_hardcoded456789012345' },
        ],
      },
    }
    const violations = validateNoInlineKeys(config)
    expect(violations.length).toBe(2)
  })

  it('skips non-string values', () => {
    const config = {
      version: '1.0.0',
      deployments: {
        agents: [{ id: 'a1', replicas: 2, resources: { cpu: '100m' } }],
      },
    }
    expect(validateNoInlineKeys(config)).toEqual([])
  })

  it('handles nested objects deeply', () => {
    const config = {
      deeply: {
        nested: {
          value: 'sk-proj-my-secret-key-1234567890',
        },
      },
    }
    const violations = validateNoInlineKeys(config)
    expect(violations.length).toBe(1)
    expect(violations[0].path).toBe('deeply.nested.value')
  })
})

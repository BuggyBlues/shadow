import { describe, expect, it } from 'vitest'
import { detectInlineKey, redactSecrets } from '../../src/utils/redact'

describe('redactSecrets', () => {
  it('redacts Anthropic API keys', () => {
    expect(redactSecrets('key is sk-ant-api03-abcdef123456789012')).toBe('key is [REDACTED]')
  })

  it('redacts OpenAI project keys', () => {
    expect(redactSecrets('sk-proj-abcdef123456789012xyz')).toBe('[REDACTED]')
  })

  it('redacts Groq keys', () => {
    expect(redactSecrets('gsk_abcdef123456789012xyz')).toBe('[REDACTED]')
  })

  it('redacts xAI keys', () => {
    expect(redactSecrets('xai-abcdef123456789012xyz')).toBe('[REDACTED]')
  })

  it('redacts Bearer tokens', () => {
    expect(redactSecrets('Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9')).toBe(
      'Authorization: [REDACTED]',
    )
  })

  it('redacts GitHub PAT', () => {
    expect(redactSecrets('ghp_1234567890abcdef1234567890abcdef12345678')).toBe('[REDACTED]')
  })

  it('preserves strings without secrets', () => {
    const safe = 'Deploying agent-1 to namespace shadowob-cloud'
    expect(redactSecrets(safe)).toBe(safe)
  })

  it('redacts multiple keys in one string', () => {
    const input = 'ANTHROPIC=sk-ant-api03-abcdef123456789012 OPENAI=sk-proj-abcdef123456789012xyz'
    const result = redactSecrets(input)
    expect(result).not.toContain('sk-ant-')
    expect(result).not.toContain('sk-proj-')
    expect(result).toContain('[REDACTED]')
  })
})

describe('detectInlineKey', () => {
  it('detects Anthropic keys', () => {
    expect(detectInlineKey('sk-ant-api03-abcdef123456789012')).toBe('sk-ant-')
  })

  it('detects OpenAI project keys', () => {
    expect(detectInlineKey('sk-proj-abcdef123456789012xyz')).toBe('sk-proj-')
  })

  it('detects Groq keys', () => {
    expect(detectInlineKey('gsk_abcdef123456789012xyz')).toBe('gsk_')
  })

  it('detects xAI keys', () => {
    expect(detectInlineKey('xai-abcdef123456789012xyz')).toBe('xai-')
  })

  it('returns null for env references', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing OpenClaw env var syntax
    expect(detectInlineKey('${env:ANTHROPIC_API_KEY}')).toBeNull()
  })

  it('returns null for secret references', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing OpenClaw secret ref syntax
    expect(detectInlineKey('${secret:my-key}')).toBeNull()
  })

  it('returns null for normal strings', () => {
    expect(detectInlineKey('hello world')).toBeNull()
    expect(detectInlineKey('agent-1')).toBeNull()
    expect(detectInlineKey('')).toBeNull()
  })
})

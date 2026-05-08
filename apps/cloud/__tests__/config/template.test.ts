import { describe, expect, it } from 'vitest'

import {
  collectTemplateRefs,
  hasSecretRef,
  parseSecretRef,
  resolveTemplateString,
  resolveTemplates,
} from '../../src/config/template.js'

describe('template', () => {
  describe('resolveTemplateString', () => {
    it('should resolve env variables', () => {
      const result = resolveTemplateString('Hello ${env:NAME}', {
        env: { NAME: 'World' },
      })
      expect(result).toBe('Hello World')
    })

    it('should resolve multiple env variables in one string', () => {
      const result = resolveTemplateString('${env:HOST}:${env:PORT}', {
        env: { HOST: 'localhost', PORT: '3000' },
      })
      expect(result).toBe('localhost:3000')
    })

    it('should throw for missing env variables', () => {
      expect(() => resolveTemplateString('${env:MISSING}', { env: {} })).toThrow(
        'Environment variable MISSING is not set',
      )
    })

    it('should leave secret refs as-is when no secrets provided', () => {
      const result = resolveTemplateString('token: ${secret:k8s/my-secret/api-key}', {
        env: {},
      })
      expect(result).toBe('token: ${secret:k8s/my-secret/api-key}')
    })

    it('should resolve secrets when provided', () => {
      const result = resolveTemplateString('${secret:my-key}', {
        env: {},
        secrets: { 'my-key': 'secret-value' },
      })
      expect(result).toBe('secret-value')
    })

    it('should return plain strings unchanged', () => {
      const result = resolveTemplateString('no templates here', { env: {} })
      expect(result).toBe('no templates here')
    })

    it('should resolve vault references when provided', () => {
      const result = resolveTemplateString('${vault:OPENAI_KEY}', {
        env: {},
        vaultSecrets: { OPENAI_KEY: 'sk-abc123' },
      })
      expect(result).toBe('sk-abc123')
    })

    it('should leave vault refs as-is when no vault secrets provided', () => {
      const result = resolveTemplateString('key: ${vault:MY_KEY}', { env: {} })
      expect(result).toBe('key: ${vault:MY_KEY}')
    })

    it('should resolve config path references', () => {
      const result = resolveTemplateString('ns: ${config:deployments.namespace}', {
        env: {},
        configRoot: { deployments: { namespace: 'prod' } },
      })
      expect(result).toBe('ns: prod')
    })

    it('should throw for missing config path', () => {
      expect(() =>
        resolveTemplateString('${config:missing.path}', {
          env: {},
          configRoot: {},
        }),
      ).toThrow('Config path "missing.path" not found')
    })

    it('should throw when config ref used without configRoot', () => {
      expect(() => resolveTemplateString('${config:some.key}', { env: {} })).toThrow(
        'no config root available',
      )
    })

    it('should resolve i18n keys', () => {
      const result = resolveTemplateString('${i18n:team.name}', {
        env: {},
        i18nDict: { 'team.name': '研究团队' },
      })
      expect(result).toBe('研究团队')
    })

    it('should throw for missing i18n key', () => {
      expect(() =>
        resolveTemplateString('${i18n:missing.key}', {
          env: {},
          i18nDict: {},
        }),
      ).toThrow('i18n key "missing.key" not found')
    })
  })

  describe('hasSecretRef', () => {
    it('should detect secret references', () => {
      expect(hasSecretRef('${secret:k8s/name/key}')).toBe(true)
    })

    it('should return false for non-secret strings', () => {
      expect(hasSecretRef('${env:FOO}')).toBe(false)
      expect(hasSecretRef('plain text')).toBe(false)
    })
  })

  describe('parseSecretRef', () => {
    it('should parse k8s secret reference', () => {
      const result = parseSecretRef('${secret:k8s/my-secret/api-key}')
      expect(result).toEqual({ name: 'my-secret', key: 'api-key' })
    })

    it('should return null for non-k8s references', () => {
      expect(parseSecretRef('${secret:simple}')).toBeNull()
      expect(parseSecretRef('${env:FOO}')).toBeNull()
    })
  })

  describe('resolveTemplates', () => {
    it('should recursively resolve objects', () => {
      const input = {
        host: '${env:HOST}',
        nested: {
          port: '${env:PORT}',
          name: 'static',
        },
      }
      const result = resolveTemplates(input, {
        env: { HOST: 'example.com', PORT: '8080' },
      })
      expect(result).toEqual({
        host: 'example.com',
        nested: {
          port: '8080',
          name: 'static',
        },
      })
    })

    it('should resolve arrays', () => {
      const input = ['${env:A}', '${env:B}']
      const result = resolveTemplates(input, {
        env: { A: '1', B: '2' },
      })
      expect(result).toEqual(['1', '2'])
    })

    it('should pass through non-string primitives', () => {
      expect(resolveTemplates(42)).toBe(42)
      expect(resolveTemplates(true)).toBe(true)
      expect(resolveTemplates(null)).toBeNull()
    })
  })

  describe('collectTemplateRefs', () => {
    it('should collect all refs from nested object', () => {
      const obj = {
        key1: '${env:FOO}',
        nested: {
          key2: '${secret:k8s/s1/k1}',
          arr: ['${file:/etc/cert}'],
        },
        vaultRef: '${vault:API_KEY}',
        configRef: '${config:deployments.namespace}',
        i18nRef: '${i18n:team.name}',
      }
      const refs = collectTemplateRefs(obj)
      expect(refs).toHaveLength(6)
      expect(refs[0]).toEqual({ type: 'env', key: 'FOO', raw: '${env:FOO}' })
      expect(refs[1]).toEqual({ type: 'secret', key: 'k8s/s1/k1', raw: '${secret:k8s/s1/k1}' })
      expect(refs[2]).toEqual({ type: 'file', key: '/etc/cert', raw: '${file:/etc/cert}' })
      expect(refs[3]).toEqual({ type: 'vault', key: 'API_KEY', raw: '${vault:API_KEY}' })
      expect(refs[4]).toEqual({
        type: 'config',
        key: 'deployments.namespace',
        raw: '${config:deployments.namespace}',
      })
      expect(refs[5]).toEqual({ type: 'i18n', key: 'team.name', raw: '${i18n:team.name}' })
    })

    it('should return empty array for no refs', () => {
      expect(collectTemplateRefs({ plain: 'text' })).toEqual([])
    })
  })
})

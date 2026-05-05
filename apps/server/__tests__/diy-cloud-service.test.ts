import { describe, expect, it } from 'vitest'
import { generateDiyCloudDraft } from '../src/services/diy-cloud.service'

describe('DIY Cloud generation service', () => {
  it('generates a validated deployable draft from official libraries without upstream LLM', async () => {
    const previousKey = process.env.SHADOW_DIY_CLOUD_GENERATOR_API_KEY
    delete process.env.SHADOW_DIY_CLOUD_GENERATOR_API_KEY

    try {
      const draft = await generateDiyCloudDraft({
        prompt: '帮我搭一个每天整理竞品、生成增长周报、能接 Google Drive 的空间',
        locale: 'zh-CN',
      })

      expect(draft.validation.valid).toBe(true)
      expect(draft.template).toHaveProperty('deployments')
      expect(draft.matchedPlugins.map((plugin) => plugin.id)).toEqual(
        expect.arrayContaining(['model-provider', 'shadowob', 'google-workspace']),
      )
      expect(draft.matchedPlugins.map((plugin) => plugin.id)).not.toEqual(
        expect.arrayContaining(['google-ads', 'google-analytics', 'baidu-appbuilder']),
      )
      expect(draft.referenceTemplates.length).toBeGreaterThan(0)
      expect(draft.toolTrace.length).toBeGreaterThan(0)
      expect(JSON.stringify(draft.template)).not.toContain('__shadowobRuntime":{"playLaunch"')
      expect(JSON.stringify(draft.template)).toContain('"playLaunch"')
      expect(draft.steps.map((step) => step.id)).toEqual([
        'think',
        'search',
        'generate',
        'validate',
        'review',
      ])
    } finally {
      if (previousKey) process.env.SHADOW_DIY_CLOUD_GENERATOR_API_KEY = previousKey
    }
  })
})

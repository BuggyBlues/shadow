import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TemplateDao } from '../../src/dao/template.dao.js'
import { TemplateService } from '../../src/services/template.service.js'

const templatesDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates')

describe('TemplateService', () => {
  it('returns slug name plus localized title and description', async () => {
    const service = new TemplateService(new TemplateDao(templatesDir))
    const templates = await service.discover()
    const basic = templates.find((template) => template.name === 'gstack-buddy')

    expect(basic).toBeDefined()
    if (!basic) throw new Error('gstack-buddy template not found')
    expect(basic).toMatchObject({
      name: 'gstack-buddy',
      title: 'gstack Strategy Buddy',
    })
    expect(basic.description).toContain('virtual product-team template')
    expect(basic.description).not.toContain('${i18n:')
    expect(['team', 'Name'].join('') in (basic as unknown as Record<string, unknown>)).toBe(false)
  })

  it('uses locale-specific title and description', async () => {
    const service = new TemplateService(new TemplateDao(templatesDir))
    const templates = await service.discover('zh-CN')
    const discovery = templates.find((template) => template.name === 'google-workspace-buddy')

    expect(discovery).toBeDefined()
    if (!discovery) throw new Error('google-workspace-buddy template not found')
    expect(discovery).toMatchObject({
      name: 'google-workspace-buddy',
      title: 'Google Workspace Buddy',
    })
    expect(discovery.description).toContain('日常办公自动化')
  })
})

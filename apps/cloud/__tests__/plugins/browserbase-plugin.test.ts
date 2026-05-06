import { describe, expect, it } from 'vitest'
import browserbasePlugin from '../../src/plugins/browserbase/index.js'
import type { PluginBuildContext } from '../../src/plugins/types.js'

function makeBuildContext(overrides: Partial<PluginBuildContext> = {}): PluginBuildContext {
  return {
    agent: {
      id: 'browser-agent',
      name: 'Browser Agent',
      runtime: 'openclaw',
      use: [{ plugin: 'browserbase' }],
    } as PluginBuildContext['agent'],
    config: {
      namespace: 'test-ns',
      agents: [],
      use: [{ plugin: 'browserbase' }],
    } as unknown as PluginBuildContext['config'],
    secrets: {
      BROWSERBASE_API_KEY: 'bb_test_key',
      BROWSERBASE_PROJECT_ID: 'project_test',
      BROWSERBASE_CONTEXT_ID: 'context_test',
      BROWSERBASE_PROXY_COUNTRY: 'us',
      BROWSERBASE_REGION: 'us-west',
      BROWSERBASE_MODEL: 'anthropic/claude-sonnet-4-5',
    },
    namespace: 'test-ns',
    agentConfig: {},
    pluginRegistry: undefined as unknown as PluginBuildContext['pluginRegistry'],
    cwd: process.cwd(),
    ...overrides,
  }
}

describe('browserbase plugin', () => {
  it('exposes the full Browserbase BrowserOps capability surface', () => {
    expect(browserbasePlugin.manifest.auth.fields.map((field) => field.key)).toEqual([
      'BROWSERBASE_API_KEY',
      'BROWSERBASE_PROJECT_ID',
      'BROWSERBASE_CONTEXT_ID',
      'BROWSERBASE_PROXY_COUNTRY',
      'BROWSERBASE_REGION',
      'BROWSERBASE_MODEL',
    ])
    expect(browserbasePlugin.manifest.capabilities).toEqual(
      expect.arrayContaining(['skill', 'tool', 'data-source', 'action', 'cli', 'mcp']),
    )
    expect(browserbasePlugin.manifest.tags).toEqual(
      expect.arrayContaining([
        'browserops',
        'stagehand',
        'search',
        'fetch',
        'functions',
        'contexts',
        'proxy',
        'trace',
        'ui-test',
      ]),
    )
  })

  it('installs official Browserbase skills, CLIs, SDKs, Stagehand, Functions, and MCP', () => {
    expect(browserbasePlugin.cli?.map((tool) => tool.name)).toEqual(['bb', 'browse'])
    expect(browserbasePlugin.mcp).toContainEqual(
      expect.objectContaining({
        id: 'browserbase-mcp',
        command: 'npx',
        args: ['-y', '@browserbasehq/mcp@latest'],
      }),
    )
    expect(browserbasePlugin.runtime?.runtimeDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'browserbase-mcp', packages: ['@browserbasehq/mcp'] }),
        expect.objectContaining({
          id: 'mcp-server-browserbase',
          packages: ['@browserbasehq/mcp-server-browserbase'],
        }),
        expect.objectContaining({
          id: 'browserbase-runtime',
          packages: expect.arrayContaining([
            '@browserbasehq/cli',
            '@browserbasehq/browse-cli',
            '@browserbasehq/sdk',
            '@browserbasehq/stagehand',
            '@browserbasehq/sdk-functions',
            'playwright',
          ]),
        }),
      ]),
    )
    expect(browserbasePlugin.runtime?.skillSources).toContainEqual(
      expect.objectContaining({
        id: 'browserbase-official-skills',
        url: 'https://github.com/browserbase/skills.git',
        from: 'skills',
        targetPath: '/app/plugin-skills/browserbase',
      }),
    )
  })

  it('builds OpenClaw skill config and runtime env for official skills', () => {
    const ctx = makeBuildContext()
    const config = browserbasePlugin._hooks.buildConfig[0]?.(ctx)
    const skills = config?.skills as Record<string, any>

    expect(skills.load.extraDirs).toEqual(['/app/plugin-skills/browserbase'])
    expect(skills.entries.browserbase.enabled).toBe(true)
    expect(skills.entries.browserbase.env).toMatchObject({
      BROWSERBASE_API_KEY: '${env:BROWSERBASE_API_KEY}',
      BROWSERBASE_PROJECT_ID: '${env:BROWSERBASE_PROJECT_ID}',
      BROWSERBASE_CONTEXT_ID: '${env:BROWSERBASE_CONTEXT_ID}',
      BROWSERBASE_PROXY_COUNTRY: '${env:BROWSERBASE_PROXY_COUNTRY}',
      BROWSERBASE_REGION: '${env:BROWSERBASE_REGION}',
      BROWSERBASE_MODEL: '${env:BROWSERBASE_MODEL}',
      NODE_PATH: '/opt/shadow-plugin-deps/browserbase/lib/node_modules',
    })

    const env = Object.assign({}, ...browserbasePlugin._hooks.buildEnv.map((hook) => hook(ctx)))
    expect(env).toMatchObject({
      BROWSERBASE_API_KEY: 'bb_test_key',
      BROWSERBASE_PROJECT_ID: 'project_test',
      BROWSERBASE_CONTEXT_ID: 'context_test',
      BROWSERBASE_PROXY_COUNTRY: 'us',
      BROWSERBASE_REGION: 'us-west',
      BROWSERBASE_MODEL: 'anthropic/claude-sonnet-4-5',
      NODE_PATH: '/opt/shadow-plugin-deps/browserbase/lib/node_modules',
    })
  })

  it('adds Browserbase verification checks and usage policy prompt', () => {
    const checkIds = browserbasePlugin.runtime?.verificationChecks?.map((check) => check.id)
    expect(checkIds).toEqual(
      expect.arrayContaining([
        'browserbase-bb-cli-installed',
        'browserbase-browse-cli-installed',
        'browserbase-mcp-installed',
        'browserbase-sdk-installed',
        'browserbase-stagehand-installed',
        'browserbase-api-reachable',
      ]),
    )

    const prompt = browserbasePlugin._hooks
      .buildPrompt
      .map((hook) => hook(makeBuildContext()))
      .join('\n')
    expect(prompt).toContain('browserbase/skills')
    expect(prompt).toContain('Prefer Fetch before opening a paid browser session')
    expect(prompt).toContain('Ask for explicit confirmation before login')
    expect(prompt).toContain('Do not attempt to evade site rules')
  })

  it('mounts Browserbase runtime deps and official skills into enabled Buddy pods', () => {
    const ctx = makeBuildContext()
    const k8s = browserbasePlugin.k8s?.buildK8s(ctx.agent, {
      config: ctx.config,
      namespace: ctx.namespace,
    })

    expect(k8s?.initContainers?.[0]?.name).toBe('browserbase-assets')
    expect(k8s?.volumeMounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mountPath: '/opt/shadow-plugin-deps/browserbase',
          readOnly: true,
        }),
        expect.objectContaining({
          mountPath: '/app/plugin-skills/browserbase',
          readOnly: true,
        }),
      ]),
    )
    expect(k8s?.envVars).toEqual(
      expect.arrayContaining([
        { name: 'PATH', value: '/opt/shadow-plugin-deps/browserbase/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
        { name: 'NODE_PATH', value: '/opt/shadow-plugin-deps/browserbase/lib/node_modules' },
      ]),
    )
  })
})

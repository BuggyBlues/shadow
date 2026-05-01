/**
 * Google Workspace plugin — gws CLI, Workspace agent skills, and credential files.
 */

import { definePlugin } from '../helpers.js'
import type {
  PluginBuildContext,
  PluginConfigFragment,
  PluginK8sProvider,
  PluginK8sResult,
  PluginManifest,
  PluginValidationResult,
} from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const PLUGIN_ID = 'google-workspace'
const GWS_PACKAGE = '@googleworkspace/cli'
const GWS_REPO = 'https://github.com/googleworkspace/cli.git'
const RUNTIME_MOUNT = '/opt/shadow-plugin-deps/google-workspace'
const SKILLS_MOUNT = '/app/plugin-skills/google-workspace'
const CREDENTIALS_FILE = '/home/openclaw/.config/gws/credentials.json'

function isEnabledForAgent(agent: { use?: Array<{ plugin?: string }> }, configUse?: unknown) {
  const agentEnabled = agent.use?.some((entry) => entry.plugin === PLUGIN_ID)
  const globalEnabled =
    Array.isArray(configUse) &&
    configUse.some((entry) => entry && typeof entry === 'object' && entry.plugin === PLUGIN_ID)
  return Boolean(agentEnabled || globalEnabled)
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  )
  return items.length > 0 ? items : fallback
}

function buildGoogleWorkspaceInstallScript() {
  return [
    'set -eu',
    'apk add --no-cache git >/dev/null',
    `npm install -g --prefix /runtime-deps ${GWS_PACKAGE}`,
    `git clone --depth 1 ${GWS_REPO} /tmp/googleworkspace-cli`,
    'mkdir -p /plugin-skills',
    'if [ -d /tmp/googleworkspace-cli/skills ]; then',
    "  find /tmp/googleworkspace-cli/skills -maxdepth 1 -type d -name 'gws-*' -exec cp -R {} /plugin-skills/ \\;",
    'fi',
    'echo "[google-workspace] gws CLI and skills ready"',
  ].join('\n')
}

const googleWorkspaceK8sProvider: PluginK8sProvider = {
  buildK8s(agent, ctx): PluginK8sResult | undefined {
    if (!isEnabledForAgent(agent, ctx.config.use)) return undefined

    return {
      initContainers: [
        {
          name: 'google-workspace-install',
          image: 'node:22-alpine',
          imagePullPolicy: 'IfNotPresent',
          command: ['sh', '-lc', buildGoogleWorkspaceInstallScript()],
          volumeMounts: [
            { name: 'google-workspace-runtime', mountPath: '/runtime-deps' },
            { name: 'google-workspace-skills', mountPath: '/plugin-skills' },
          ],
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '1000m', memory: '512Mi' },
          },
        },
      ],
      volumes: [
        { name: 'google-workspace-runtime', spec: { emptyDir: {} } },
        { name: 'google-workspace-skills', spec: { emptyDir: {} } },
      ],
      volumeMounts: [
        { name: 'google-workspace-runtime', mountPath: RUNTIME_MOUNT, readOnly: true },
        { name: 'google-workspace-skills', mountPath: SKILLS_MOUNT, readOnly: true },
      ],
      envVars: [
        { name: 'PATH', value: `${RUNTIME_MOUNT}/bin:$(PATH)` },
        { name: 'GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE', value: CREDENTIALS_FILE },
      ],
      labels: { 'plugin.google-workspace/enabled': 'true' },
    }
  },
}

const plugin = definePlugin(manifest as PluginManifest, (api) => {
  api.addCLI([
    {
      name: 'gws',
      command: 'gws',
      description: 'Google Workspace CLI for Gmail, Calendar, Drive, Docs, Sheets, Chat, Admin',
      env: {
        GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: CREDENTIALS_FILE,
        // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
        GOOGLE_WORKSPACE_CLI_TOKEN: '${env:GOOGLE_WORKSPACE_CLI_TOKEN}',
      },
    },
  ])

  api.addMCP({
    transport: 'stdio',
    command: 'gws',
    args: ['mcp'],
    env: {
      GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: CREDENTIALS_FILE,
      // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
      GOOGLE_WORKSPACE_CLI_TOKEN: '${env:GOOGLE_WORKSPACE_CLI_TOKEN}',
    },
  })

  api.onBuildConfig((context: PluginBuildContext): PluginConfigFragment => {
    const services = stringArray(context.agentConfig.services, [
      'gmail',
      'calendar',
      'drive',
      'docs',
      'sheets',
    ])

    return {
      skills: {
        load: { extraDirs: [SKILLS_MOUNT] },
        entries: {
          [PLUGIN_ID]: {
            enabled: true,
            services,
            env: {
              GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: CREDENTIALS_FILE,
              // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
              GOOGLE_WORKSPACE_CLI_TOKEN: '${env:GOOGLE_WORKSPACE_CLI_TOKEN}',
            },
          },
        },
      },
      tools: { allow: ['gws'] },
    }
  })

  api.onBuildEnv((context) => {
    const env: Record<string, string> = {
      GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: CREDENTIALS_FILE,
      GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND: 'file',
    }
    for (const key of [
      'GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON',
      'GOOGLE_WORKSPACE_CLI_TOKEN',
      'GOOGLE_WORKSPACE_CLI_SANITIZE_TEMPLATE',
    ]) {
      const value = context.secrets[key]
      if (value) env[key] = value
    }
    return env
  })

  api.onBuildRuntime(() => ({
    credentialFiles: [
      {
        envKey: 'GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON',
        path: CREDENTIALS_FILE,
        mode: '0600',
      },
    ],
    verificationChecks: [
      {
        id: 'google-workspace-auth',
        label: 'Google Workspace auth status',
        kind: 'command',
        command: ['gws', 'auth', 'status'],
        timeoutMs: 15_000,
        risk: 'safe',
        requiredEnv: ['GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON'],
      },
      {
        id: 'google-workspace-drive-read',
        label: 'Google Drive read smoke test',
        kind: 'command',
        command: ['gws', 'drive', 'files', 'list', '--params', '{"pageSize": 1}'],
        timeoutMs: 20_000,
        risk: 'read',
        requiredEnv: ['GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON'],
      },
      {
        id: 'google-workspace-calendar-agenda',
        label: 'Google Calendar agenda smoke test',
        kind: 'command',
        command: ['gws', 'calendar', '+agenda'],
        timeoutMs: 20_000,
        risk: 'read',
        requiredEnv: ['GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON'],
      },
    ],
  }))

  api.onBuildPrompt((context) => {
    const readOnlyByDefault = context.agentConfig.readOnlyByDefault !== false
    return [
      'Google Workspace is available through the `gws` CLI and the mounted gws agent skills.',
      'Prefer structured JSON output and cite the exact Gmail, Calendar, Drive, Docs, Sheets, or Chat command used.',
      readOnlyByDefault
        ? 'Read-only commands are safe by default. Ask for explicit approval before sending email, creating calendar events, editing docs or sheets, uploading files, deleting, or sharing.'
        : 'Write actions are enabled by configuration, but still summarize the exact action before executing it.',
      'Use `--dry-run` when gws supports it for drafts, sends, uploads, shares, or destructive changes.',
    ].join('\n')
  })

  api.onValidate((context): PluginValidationResult => {
    const hasCredentials = Boolean(context.secrets.GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON)
    const hasToken = Boolean(context.secrets.GOOGLE_WORKSPACE_CLI_TOKEN)
    if (hasCredentials || hasToken) return { valid: true, errors: [] }
    return {
      valid: true,
      errors: [
        {
          path: 'secrets.GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON',
          message:
            'Google Workspace works best with exported gws credentials JSON or a short-lived access token.',
          severity: 'warning',
        },
      ],
    }
  })

  api.onHealthCheck(async (context) => {
    const hasCredentials = Boolean(context.secrets.GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON)
    const hasToken = Boolean(context.secrets.GOOGLE_WORKSPACE_CLI_TOKEN)
    return hasCredentials || hasToken
      ? { healthy: true, message: 'Google Workspace credentials are configured' }
      : { healthy: false, message: 'Missing Google Workspace credentials or access token' }
  })
})

plugin.k8s = googleWorkspaceK8sProvider

export default plugin

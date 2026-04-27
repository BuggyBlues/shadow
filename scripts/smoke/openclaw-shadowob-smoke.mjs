import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', '..')
const envPath = process.env.SHADOW_SMOKE_ENV_PATH
  ? path.resolve(process.env.SHADOW_SMOKE_ENV_PATH)
  : path.join(root, '.env')
const sessionPath = process.env.SHADOW_SMOKE_SESSION_PATH ?? '/tmp/shadow-openclaw-smoke-session.json'
const agentPath = process.env.SHADOW_SMOKE_AGENT_PATH ?? '/tmp/shadow-openclaw-smoke-agent.json'
const configDir = process.env.SHADOW_SMOKE_CONFIG_DIR
  ? path.resolve(process.env.SHADOW_SMOKE_CONFIG_DIR)
  : path.join(root, '.tmp', 'openclaw-smoke')
const image = process.env.SHADOW_SMOKE_IMAGE ?? 'shadowob/openclaw-runner:codex-smoke'
const containerName =
  process.env.SHADOW_SMOKE_CONTAINER ?? `shadow-openclaw-smoke-${Date.now().toString(36)}`

function loadDotEnv(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed)
    if (!match) continue
    const [, key, value] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = value.replace(/^['"]|['"]$/g, '')
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function toDockerHostUrl(origin) {
  return origin
    .replace('http://127.0.0.1:', 'http://host.docker.internal:')
    .replace('http://localhost:', 'http://host.docker.internal:')
}

function redact(value) {
  return String(value).replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, '$1...')
}

async function requestJson(origin, url, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${origin}${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(`${method} ${url} failed (${response.status}): ${text}`)
  }
  return payload
}

async function waitForReady(port) {
  const startedAt = Date.now()
  let lastError = null
  while (Date.now() - startedAt < 180_000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`)
      const payload = await response.json().catch(() => null)
      if (response.ok) return payload
      lastError = new Error(`ready=${response.status} ${JSON.stringify(payload)}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }
  throw new Error(
    `Timed out waiting for OpenClaw runner: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  )
}

async function login(origin, email, password) {
  return requestJson(origin, '/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

async function sendRoundTripMessage(session, marker) {
  const owner = await login(session.origin, session.owner.email, session.owner.password)
  await requestJson(session.origin, `/api/channels/${session.channels.generalId}/messages`, {
    method: 'POST',
    token: owner.accessToken,
    body: {
      content: `OpenClaw Shadow smoke ${marker}. 只回复 ${marker}_OK，不要解释。`,
    },
  })

  const startedAt = Date.now()
  while (Date.now() - startedAt < 180_000) {
    const page = await requestJson(
      session.origin,
      `/api/channels/${session.channels.generalId}/messages?limit=30`,
      { token: owner.accessToken },
    )
    const botReply = page.messages
      ?.slice()
      .reverse()
      .find((message) => {
        return Boolean(
          message.author?.isBot &&
            message.content &&
            message.createdAt &&
            Date.parse(message.createdAt) >= startedAt - 5_000 &&
            message.content.includes(marker),
        )
      })
    if (botReply) return botReply
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  throw new Error(`Timed out waiting for Buddy reply containing ${marker}`)
}

async function main() {
  await fs.readFile(envPath, 'utf8').then(loadDotEnv).catch(() => {})

  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL
  const model = process.env.OPENAI_MODEL
  if (!apiKey || !baseUrl || !model) {
    throw new Error('OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL are required')
  }

  const [session, agent] = await Promise.all([readJson(sessionPath), readJson(agentPath)])
  const providerId = process.env.SHADOW_SMOKE_PROVIDER_ID ?? 'smoke-openai-compatible'
  const config = {
    gateway: { mode: 'local', auth: { token: 'shadow-smoke' } },
    agents: {
      list: [
        {
          id: 'smoke-agent',
          name: 'Smoke Agent',
          default: true,
          model: { primary: `${providerId}/${model}` },
        },
      ],
      defaults: {
        workspace: '/home/openclaw/.openclaw/workspace',
        model: { primary: `${providerId}/${model}` },
      },
    },
    bindings: [
      {
        agentId: 'smoke-agent',
        match: { channel: 'shadowob', accountId: 'default' },
      },
    ],
    channels: {
      shadowob: {
        enabled: true,
        accounts: {
          default: {
            token: agent.agentToken,
            serverUrl: toDockerHostUrl(session.origin),
            agentId: agent.agentId,
            buddyName: agent.botUser?.displayName,
            buddyId: agent.botUser?.id,
          },
        },
        accountAgentMap: { default: 'smoke-agent' },
      },
    },
    plugins: {
      enabled: true,
      allow: ['openclaw-shadowob'],
      entries: { 'openclaw-shadowob': { enabled: true } },
    },
    models: {
      mode: 'merge',
      providers: {
        [providerId]: {
          api: 'openai-completions',
          apiKey: '${env:OPENAI_API_KEY}',
          baseUrl: '${env:OPENAI_BASE_URL}',
          request: { allowPrivateNetwork: true },
          models: [{ id: '${env:OPENAI_MODEL}', name: model }],
        },
      },
    },
    cron: { enabled: false },
  }

  await writeJson(path.join(configDir, 'config.json'), config)
  await fs.writeFile(
    path.join(configDir, 'SOUL.md'),
    [
      '# Smoke Agent',
      '',
      '你是 Shadow OpenClaw 容器冒烟测试 Buddy。收到带 smoke marker 的消息时，只回复指定 marker。',
      '',
    ].join('\n'),
    'utf8',
  )

  if (process.argv.includes('--build')) {
    const build = spawnSync(
      'docker',
      ['build', '-t', image, '-f', 'apps/cloud/images/openclaw-runner/Dockerfile', '.'],
      { cwd: root, stdio: 'inherit' },
    )
    if (build.status !== 0) process.exit(build.status ?? 1)
  }

  spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' })
  const run = spawn('docker', [
    'run',
    '--rm',
    '--name',
    containerName,
    '--env-file',
    envPath,
    '-v',
    `${configDir}:/etc/openclaw:ro`,
    '-p',
    '3100',
    image,
  ])
  run.stdout.on('data', () => {})
  run.stderr.on('data', () => {})

  let hostPort = null
  const cleanup = () => spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' })
  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })

  try {
    const inspectStartedAt = Date.now()
    while (!hostPort && Date.now() - inspectStartedAt < 30_000) {
      const inspect = spawnSync('docker', [
        'port',
        containerName,
        '3100/tcp',
      ])
      const output = inspect.stdout.toString().trim()
      const match = output.match(/:(\d+)$/)
      if (match) hostPort = Number(match[1])
      else await new Promise((resolve) => setTimeout(resolve, 500))
    }
    if (!hostPort) throw new Error('Unable to resolve mapped OpenClaw health port')

    const ready = await waitForReady(hostPort)
    const result = { ready, providerId, model, smoke: 'health' }

    if (!process.argv.includes('--health-only')) {
      const marker = `SMOKE_${Date.now().toString(36).toUpperCase()}`
      const reply = await sendRoundTripMessage(session, marker)
      result.smoke = 'message-roundtrip'
      result.reply = { id: reply.id, content: reply.content.slice(0, 200) }
    }

    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    const logs = spawnSync('docker', ['logs', '--tail', '160', containerName])
    const output = `${logs.stdout.toString()}\n${logs.stderr.toString()}`
    console.error(redact(output))
    throw error
  } finally {
    run.kill('SIGTERM')
    cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

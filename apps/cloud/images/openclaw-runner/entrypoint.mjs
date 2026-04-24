/**
 * OpenClaw Runner — container entrypoint.
 *
 * 1. Read agent config from ConfigMap (/etc/openclaw/config.json)
 * 2. Resolve ${env:VAR} references from environment
 * 3. Write OpenClaw config to ~/.openclaw/openclaw.json
 * 4. Verify extensions are loaded
 * 5. Start OpenClaw gateway
 * 6. Forward signals for graceful shutdown
 */

import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

const OPENCLAW_STATE_DIR = '/home/openclaw/.openclaw'
const CONFIG_MOUNT = '/etc/openclaw'
const EXTENSIONS_DIR = '/app/extensions'
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT ?? '3100', 10)
const LOG_DIR = '/var/log/openclaw'
const SHARED_WORKSPACE_PATH = process.env.SHARED_WORKSPACE_PATH ?? ''
const SKILLS_DIR = process.env.SKILLS_DIR ?? ''

// ─── Config Loading ─────────────────────────────────────────────────────────

function loadMountedConfig() {
  const configPath = join(CONFIG_MOUNT, 'config.json')
  if (!existsSync(configPath)) {
    console.log('[entrypoint] No mounted config found, using defaults')
    return {}
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    console.log('[entrypoint] Loaded config from ConfigMap')
    return config
  } catch (err) {
    console.error('[entrypoint] Failed to parse mounted config:', err.message)
    return {}
  }
}

function resolveEnvVars(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{env:([^}]+)\}/g, (_, key) => {
      return process.env[key] ?? ''
    })
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars)
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value)
    }
    return result
  }
  return obj
}

// ─── OpenClaw Config Generation ─────────────────────────────────────────────

function generateOpenClawConfig(mountedConfig) {
  const config = resolveEnvVars(mountedConfig)

  // Ensure plugins are configured to load the shadowob plugin from the extensions directory.
  // OpenClaw discovers plugins via plugins.load.paths (not extensions.searchPaths).
  // Matches the desktop app's plugin config structure.
  if (!config.plugins) {
    config.plugins = {}
  }
  config.plugins.enabled = true
  if (!config.plugins.load) {
    config.plugins.load = {}
  }
  // OpenClaw treats each path in load.paths as a direct plugin directory
  // (matches how the desktop app calls resolveShadowPlugin() → "/path/to/shadowob").
  config.plugins.load.paths = [join(EXTENSIONS_DIR, 'shadowob')]
  if (!config.plugins.entries) {
    config.plugins.entries = {}
  }
  if (!config.plugins.entries['openclaw-shadowob']) {
    config.plugins.entries['openclaw-shadowob'] = { enabled: true }
  }

  // Ensure channels.shadowob exists — OpenClaw's configMayNeedPluginManifestRegistry()
  // only triggers plugin discovery when a non-built-in channel is present in config.
  if (!config.channels) {
    config.channels = {}
  }
  if (!config.channels.shadowob) {
    config.channels.shadowob = { enabled: true }
  }

  // Set gateway port
  if (!config.gateway) {
    config.gateway = {}
  }
  config.gateway.port = GATEWAY_PORT
  // Use "lan" bind (0.0.0.0) so the gateway is reachable from outside the container.
  config.gateway.bind = 'lan'
  // Ensure gateway.mode is set — required by OpenClaw to start without cloud setup
  if (!config.gateway.mode) {
    config.gateway.mode = 'local'
  }
  // LAN binding requires authentication — use token mode with auto-generated token.
  if (!config.gateway.auth) {
    config.gateway.auth = {}
  }
  if (!config.gateway.auth.mode || config.gateway.auth.mode === 'none') {
    config.gateway.auth.mode = 'token'
  }

  // Set up shared workspace path — makes the PVC mount discoverable by OpenClaw
  if (SHARED_WORKSPACE_PATH) {
    if (!config.agents) config.agents = {}
    if (!config.agents.defaults) config.agents.defaults = {}
    if (!config.agents.defaults.workspace) {
      config.agents.defaults.workspace = SHARED_WORKSPACE_PATH
    }
    console.log(`[entrypoint] Shared workspace: ${SHARED_WORKSPACE_PATH}`)
  }

  // Set up skills extra directories — lets OpenClaw discover cloud-installed skills
  if (SKILLS_DIR) {
    if (!config.skills) config.skills = {}
    if (!config.skills.load) config.skills.load = {}
    const extraDirs = new Set(config.skills.load.extraDirs ?? [])
    extraDirs.add(SKILLS_DIR)
    config.skills.load.extraDirs = [...extraDirs]
    console.log(`[entrypoint] Skills directory: ${SKILLS_DIR}`)
  }

  return config
}

// ─── Pack Wiring (agent-pack env vars) ──────────────────────────────────────

/**
 * Read SHADOW_PACK_*_DIRS env vars produced by the cloud agent-pack plugin
 * (apps/cloud/src/plugins/agent-pack/index.ts) and merge their contents into
 * the OpenClaw config so the runtime actually consumes:
 *
 *   - agents/        → subagents (registered as additional agents.list[] entries
 *                       and added to every primary agent's subagents.allowAgents)
 *   - mcp/           → mcp.servers map (each *.json merged in)
 *   - hooks/         → hooks.scripts list (paths only — runtime invocation
 *                       semantics intentionally minimal until we standardize)
 *   - instructions/  → appended to the primary agent's `instructions` field
 *
 * Other kinds (scripts/, files/) stay as env vars for direct use.
 */
function splitDirs(value) {
  if (!value) return []
  return value
    .split(':')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => existsSync(p))
}

function listChildDirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(dir, d.name))
  } catch {
    return []
  }
}

function listFiles(dir, suffix) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(suffix))
      .map((d) => join(dir, d.name))
  } catch {
    return []
  }
}

function readMaybe(path) {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function safeJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    console.warn(`[entrypoint] Failed to parse pack JSON ${path}:`, err.message)
    return null
  }
}

function deriveSubagentId(dir) {
  // Use the immediate parent's name (= pack id) + child folder name
  // → "<pack>-<child>" so collisions across packs are unlikely.
  const parts = dir.split('/').filter(Boolean)
  const child = parts[parts.length - 1] ?? 'subagent'
  const pack = parts[parts.length - 3] ?? 'pack' // .../<pack>/agents/<child>
  return `${pack}-${child}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function loadSubagentDef(dir) {
  // Look for AGENT.md, SKILL.md, or SOUL.md (all valid Claude-style descriptors).
  const candidates = ['AGENT.md', 'SKILL.md', 'SOUL.md']
  for (const f of candidates) {
    const p = join(dir, f)
    if (existsSync(p)) return readMaybe(p)
  }
  return ''
}

function mergeShadowPacks(config) {
  const agentsDirs = splitDirs(process.env.SHADOW_PACK_AGENTS_DIRS)
  const mcpDirs = splitDirs(process.env.SHADOW_PACK_MCP_DIRS)
  const hooksDirs = splitDirs(process.env.SHADOW_PACK_HOOKS_DIRS)
  const instructionsDirs = splitDirs(process.env.SHADOW_PACK_INSTRUCTIONS_DIRS)

  if (
    agentsDirs.length === 0 &&
    mcpDirs.length === 0 &&
    hooksDirs.length === 0 &&
    instructionsDirs.length === 0
  ) {
    return config
  }

  // ── Subagents ──────────────────────────────────────────────────────────────
  const newSubagents = []
  const subagentIds = []
  for (const dir of agentsDirs) {
    for (const childDir of listChildDirs(dir)) {
      const def = loadSubagentDef(childDir)
      if (!def) continue
      const id = deriveSubagentId(childDir)
      newSubagents.push({
        id,
        runtime: { type: 'subagent' },
        identity: { name: id },
        instructions: def,
      })
      subagentIds.push(id)
    }
  }
  if (newSubagents.length > 0) {
    if (!config.agents) config.agents = {}
    if (!Array.isArray(config.agents.list)) config.agents.list = []
    // Avoid double-registration if entrypoint is invoked twice.
    const existingIds = new Set(config.agents.list.map((a) => a.id))
    for (const sa of newSubagents) {
      if (!existingIds.has(sa.id)) config.agents.list.push(sa)
    }
    // Every primary (non-subagent) agent gets these subagents allowed.
    for (const a of config.agents.list) {
      if (a.runtime?.type === 'subagent') continue
      if (!a.subagents) a.subagents = {}
      const allow = new Set(a.subagents.allowAgents ?? [])
      for (const id of subagentIds) allow.add(id)
      a.subagents.allowAgents = [...allow]
    }
    console.log(`[entrypoint] Registered ${subagentIds.length} pack subagent(s)`)
  }

  // ── MCP servers ────────────────────────────────────────────────────────────
  const mcpServers = {}
  for (const dir of mcpDirs) {
    for (const file of listFiles(dir, '.json')) {
      const parsed = safeJson(file)
      if (!parsed || typeof parsed !== 'object') continue
      // Two accepted shapes:
      //   1. Claude Desktop / mcp.json:  { mcpServers: { name: { command, args, env } } }
      //   2. Single-server file:         { command, args, env, transport? } (name = filename)
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        for (const [name, def] of Object.entries(parsed.mcpServers)) {
          if (def && typeof def === 'object') mcpServers[name] = def
        }
      } else if (parsed.command) {
        const name = file
          .split('/')
          .pop()
          .replace(/\.json$/, '')
        mcpServers[name] = parsed
      }
    }
  }
  if (Object.keys(mcpServers).length > 0) {
    if (!config.mcp) config.mcp = {}
    config.mcp.servers = { ...(config.mcp.servers ?? {}), ...mcpServers }
    console.log(`[entrypoint] Merged ${Object.keys(mcpServers).length} MCP server(s) from packs`)
  }

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const hookScripts = []
  for (const dir of hooksDirs) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        const p = join(dir, entry.name)
        try {
          // Only treat executable files as hooks
          const mode = statSync(p).mode
          if (mode & 0o111) hookScripts.push(p)
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }
  if (hookScripts.length > 0) {
    if (!config.hooks) config.hooks = {}
    config.hooks.scripts = [...(config.hooks.scripts ?? []), ...hookScripts]
    console.log(`[entrypoint] Registered ${hookScripts.length} pack hook script(s)`)
  }

  // ── Instructions append ────────────────────────────────────────────────────
  const instructionChunks = []
  for (const dir of instructionsDirs) {
    for (const file of listFiles(dir, '.md')) {
      const text = readMaybe(file).trim()
      if (text) instructionChunks.push(`<!-- ${file} -->\n${text}`)
    }
    // Also look for direct files at the dir root (instructions plugin already
    // copied the curated set into the parent; this catches the dir-level case).
    for (const sub of listChildDirs(dir)) {
      for (const file of listFiles(sub, '.md')) {
        const text = readMaybe(file).trim()
        if (text) instructionChunks.push(`<!-- ${file} -->\n${text}`)
      }
    }
  }
  if (instructionChunks.length > 0) {
    if (!config.agents) config.agents = {}
    if (!Array.isArray(config.agents.list) || config.agents.list.length === 0) {
      config.agents.list = [{ id: process.env.AGENT_ID ?? 'default' }]
    }
    const appended = `\n\n--- agent-pack instructions ---\n${instructionChunks.join('\n\n')}`
    for (const a of config.agents.list) {
      if (a.runtime?.type === 'subagent') continue
      a.instructions = `${a.instructions ?? ''}${appended}`
    }
    console.log(
      `[entrypoint] Appended ${instructionChunks.length} pack instruction file(s) to primary agent(s)`,
    )
  }

  return config
}

function verifyExtensions() {
  if (!existsSync(EXTENSIONS_DIR)) {
    console.log('[entrypoint] No extensions directory')
    return
  }

  const extensions = readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  console.log(`[entrypoint] Found ${extensions.length} extension(s): ${extensions.join(', ')}`)

  // Verify shadowob plugin
  const shadowobDir = join(EXTENSIONS_DIR, 'shadowob')
  if (existsSync(shadowobDir)) {
    const hasEntry =
      existsSync(join(shadowobDir, 'index.mjs')) ||
      existsSync(join(shadowobDir, 'dist', 'index.js'))
    if (hasEntry) {
      console.log('[entrypoint] ✓ shadowob plugin verified')
    } else {
      console.warn('[entrypoint] ⚠ shadowob plugin missing entry point')
    }
  }
}

// ─── Health Check Server ────────────────────────────────────────────────────

let gatewayHealthy = false
let gatewayProcess = null
let gatewayGraceTimer = null
let gatewayRestarts = 0
const MAX_GATEWAY_RESTARTS = 5
const RESTART_DELAY_MS = 5000

// ─── Log Redaction ──────────────────────────────────────────────────────────

const KEY_PATTERNS = [
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bgsk_[A-Za-z0-9]{20,}\b/g,
  /\bxai-[A-Za-z0-9]{20,}\b/g,
  /\bkey-[A-Za-z0-9]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
]

function redact(line) {
  let result = line
  for (const pattern of KEY_PATTERNS) {
    pattern.lastIndex = 0
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function startHealthServer() {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      if (gatewayHealthy) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'healthy', pid: gatewayProcess?.pid }))
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'starting' }))
      }
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(GATEWAY_PORT, '0.0.0.0', () => {
    console.log(`[entrypoint] Health server listening on :${GATEWAY_PORT}`)
  })

  return server
}

// ─── Gateway Process ────────────────────────────────────────────────────────

function findGatewayEntry() {
  const candidates = [
    '/app/node_modules/openclaw/dist/cli/index.js',
    '/app/node_modules/openclaw/openclaw.mjs',
    '/app/node_modules/.bin/openclaw',
  ]

  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return 'openclaw' // Fallback to PATH
}

function startGateway(_healthServer) {
  const entry = findGatewayEntry()
  const configPath = join(OPENCLAW_STATE_DIR, 'openclaw.json')
  const gatewayPort = GATEWAY_PORT + 1 // Health server uses GATEWAY_PORT

  console.log(`[entrypoint] Starting OpenClaw gateway: ${entry}`)
  console.log(`[entrypoint] Config: ${configPath}`)
  console.log(`[entrypoint] Gateway port: ${gatewayPort}`)

  const env = {
    ...process.env,
    // OPENCLAW_CONFIG_PATH is what OpenClaw actually reads (not OPENCLAW_CONFIG).
    // Matches the desktop app's env setup in paths.ts buildGatewayEnv().
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_STATE_DIR: OPENCLAW_STATE_DIR,
    OPENCLAW_GATEWAY_PORT: String(gatewayPort),
    OPENCLAW_LOG_DIR: LOG_DIR,
    NODE_ENV: 'production',
    // Disable OpenClaw's self-respawn mechanism — the original process would exit
    // after spawning a child, causing our entrypoint to think the gateway crashed.
    OPENCLAW_NO_RESPAWN: '1',
    // Avoid overhead from compile-cache setup in containers
    NODE_COMPILE_CACHE: '/tmp/openclaw-compile-cache',
    // npm/npx writes cache to $HOME/.npm by default; HOME is read-only in containers,
    // so redirect to /tmp to allow ACPX backend probes (e.g. npx @zed-industries/codex-acp)
    npm_config_cache: '/tmp/npm-cache',
  }

  const proc = spawn(
    'node',
    [entry, 'gateway', '--port', String(gatewayPort), '--allow-unconfigured'],
    {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: OPENCLAW_STATE_DIR,
    },
  )

  gatewayProcess = proc

  // After 10s of the gateway running without crashing, consider it healthy
  gatewayGraceTimer = setTimeout(() => {
    if (!proc.killed && proc.exitCode === null) {
      gatewayHealthy = true
      console.log('[entrypoint] Gateway grace period elapsed — reporting healthy')
    }
  }, 10000)

  proc.stdout.on('data', (data) => {
    const line = data.toString().trim()
    process.stdout.write(`[openclaw] ${redact(line)}\n`)

    // Detect gateway ready immediately
    if (line.includes('Gateway ready') || line.includes('listening on')) {
      if (!gatewayHealthy) {
        gatewayHealthy = true
        // Keep health server running — it now returns 200 since gatewayHealthy=true
        console.log('[entrypoint] Gateway is ready')
      }
    }
  })

  proc.stderr.on('data', (data) => {
    process.stderr.write(`[openclaw:err] ${redact(data.toString().trim())}\n`)
  })

  proc.on('exit', (code, signal) => {
    console.log(`[entrypoint] Gateway exited: code=${code} signal=${signal}`)
    clearTimeout(gatewayGraceTimer)
    gatewayHealthy = false

    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      return // Normal shutdown, signal handlers will handle process.exit
    }

    // Graceful degradation: restart the gateway instead of crashing the container
    gatewayRestarts++
    if (gatewayRestarts <= MAX_GATEWAY_RESTARTS) {
      console.log(
        `[entrypoint] Gateway crashed (${gatewayRestarts}/${MAX_GATEWAY_RESTARTS}), restarting in ${RESTART_DELAY_MS}ms...`,
      )
      setTimeout(() => {
        startGateway(_healthServer)
      }, RESTART_DELAY_MS)
    } else {
      console.log('[entrypoint] Gateway exceeded max restarts, shutting down container')
      process.exit(code ?? 1)
    }
  })

  return proc
}

// ─── Signal Handling ────────────────────────────────────────────────────────

function setupSignalHandlers(proc) {
  const shutdown = (signal) => {
    console.log(`[entrypoint] Received ${signal}, shutting down...`)
    gatewayHealthy = false

    if (proc && !proc.killed) {
      proc.kill('SIGTERM')

      // Force kill after 10s
      setTimeout(() => {
        if (!proc.killed) {
          console.log('[entrypoint] Force killing gateway...')
          proc.kill('SIGKILL')
        }
        process.exit(0)
      }, 10_000)
    } else {
      process.exit(0)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('[entrypoint] Shadow Cloud OpenClaw Runner starting...')
  console.log(`[entrypoint] Agent: ${process.env.AGENT_ID ?? 'default'}`)
  console.log(`[entrypoint] Node: ${process.version}`)

  // 1. Load config
  const mountedConfig = loadMountedConfig()
  const baseConfig = generateOpenClawConfig(mountedConfig)
  const openclawConfig = mergeShadowPacks(baseConfig)

  // 2. Write config
  mkdirSync(OPENCLAW_STATE_DIR, { recursive: true })
  const configPath = join(OPENCLAW_STATE_DIR, 'openclaw.json')
  writeFileSync(configPath, JSON.stringify(openclawConfig, null, 2), 'utf-8')
  console.log(`[entrypoint] Config written to ${configPath}`)

  // 2b. Ensure shared workspace directory exists
  if (SHARED_WORKSPACE_PATH) {
    mkdirSync(SHARED_WORKSPACE_PATH, { recursive: true })
    console.log(`[entrypoint] Shared workspace ready: ${SHARED_WORKSPACE_PATH}`)
  }

  // 2c. Run `openclaw setup` to initialize workspace with bootstrap files.
  // This seeds AGENTS.md, SOUL.md, IDENTITY.md, etc. from OpenClaw's internal templates.
  const workspaceDir =
    openclawConfig.agents?.defaults?.workspace ||
    SHARED_WORKSPACE_PATH ||
    join(OPENCLAW_STATE_DIR, 'workspace')
  mkdirSync(workspaceDir, { recursive: true })
  console.log(`[entrypoint] Initializing workspace: ${workspaceDir}`)
  const setupResult = spawnSync('openclaw', ['setup', '--workspace', workspaceDir], {
    env: { ...process.env, OPENCLAW_CONFIG_PATH: configPath, HOME: '/home/openclaw' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  })
  if (setupResult.status === 0) {
    console.log('[entrypoint] ✓ openclaw setup completed')
  } else {
    const stderr = setupResult.stderr?.toString().trim()
    console.warn(
      `[entrypoint] ⚠ openclaw setup exited ${setupResult.status}: ${stderr || '(no output)'}`,
    )
  }

  // 2d. Overlay workspace files from ConfigMap (SOUL.md, AGENTS.md, etc.)
  // These are agent-specific files generated by the cloud config builder that
  // override the default bootstrap files created by `openclaw setup`.
  const WORKSPACE_BOOTSTRAP_FILES = [
    'SOUL.md',
    'IDENTITY.md',
    'TOOLS.md',
    'AGENTS.md',
    'USER.md',
    'HEARTBEAT.md',
    'BOOTSTRAP.md',
  ]
  for (const filename of WORKSPACE_BOOTSTRAP_FILES) {
    const srcPath = join(CONFIG_MOUNT, filename)
    if (existsSync(srcPath)) {
      const destPath = join(workspaceDir, filename)
      try {
        writeFileSync(destPath, readFileSync(srcPath, 'utf-8'), 'utf-8')
        console.log(`[entrypoint] Wrote ${filename} to workspace`)
      } catch (err) {
        console.warn(`[entrypoint] Failed to write ${filename}: ${err.message}`)
      }
    }
  }

  // 2e. Ensure skills directory exists
  if (SKILLS_DIR) {
    mkdirSync(SKILLS_DIR, { recursive: true })
    console.log(`[entrypoint] Skills directory ready: ${SKILLS_DIR}`)
  }

  // 3. Verify extensions
  verifyExtensions()

  // 4. Start health server (temporary, until gateway is ready)
  const healthServer = startHealthServer()

  // 5. Start gateway
  const proc = startGateway(healthServer)

  // 6. Setup signal handlers
  setupSignalHandlers(proc)
}

main().catch((err) => {
  console.error('[entrypoint] Fatal error:', err)
  process.exit(1)
})

/**
 * agent-pack K8s adapter — generates init container + optional sync sidecar
 * that clone N agent packs into separate subdirectories under a shared
 * EmptyDir volume.
 *
 * Layout written into `<mountPath>/`:
 *   <pack-id>/
 *     skills/        — wired to OpenClaw skills.load.extraDirs
 *     commands/      — also wired as skills (each with SKILL.md inside)
 *     instructions/  — CLAUDE.md / AGENTS.md / SOUL.md / RULES.md / …
 *     hooks/         — hook scripts
 *     mcp/           — collected mcp.json fragments
 *     scripts/       — bin/ helper executables
 *     agents/        — sub-agent definitions
 *     files/         — generic mount, no special wiring
 *     repo/          — full clone (only when `kinds: ['files']` requested)
 */

import type { PluginK8sInitContainer, PluginK8sSidecar } from '../types.js'

/** Kinds of artifact a pack can contribute to an agent. */
export type PackKind =
  | 'skills' // SKILL.md folders → wired to OpenClaw skills.load.extraDirs
  | 'commands' // Claude-style slash commands (.md w/ frontmatter) → also wired as skills
  | 'instructions' // CLAUDE.md / AGENTS.md / SOUL.md / RULES.md / ETHOS.md / INSTRUCTIONS.md
  | 'hooks' // bootstrap.md / teardown.md / hooks.yaml
  | 'mcp' // .mcp.json / mcp.json — MCP server configs
  | 'scripts' // bin/ or scripts/ helper executables
  | 'agents' // sub-agent definitions (Claude-Code subagents)
  | 'files' // generic mount, no special wiring

/**
 * Default curated set of root-level instruction filenames. A template can
 * override per pack via the `instructionFiles` option.
 */
export const DEFAULT_INSTRUCTION_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'SOUL.md',
  'RULES.md',
  'ETHOS.md',
  'INSTRUCTIONS.md',
  'PERSONALITY.md',
  'README.md',
]

/** A per-pack mount declaration after preset/option resolution. */
export interface ResolvedMount {
  kind: PackKind
  /** Source path inside the cloned repo (relative). May be `.` for repo root. */
  from: string
  /** Optional whitelist of immediate child names to copy. */
  include?: string[]
}

/** A single pack to clone — already resolved (preset expanded). */
export interface ResolvedPack {
  id: string
  url: string
  ref: string
  depth: number
  /** One entry per kind to mount. */
  mounts: ResolvedMount[]
  /** Root-level instruction filenames to also collect into `instructions/`. */
  instructionFiles: string[]
}

/**
 * Parse a duration string like "30s", "5m", "1h" into seconds.
 */
export function parsePollInterval(input: string | number | undefined): number {
  if (input == null) return 0
  if (typeof input === 'number') return Math.max(0, Math.floor(input))
  const m = /^(\d+)\s*(s|m|h)?$/.exec(input.trim())
  if (!m) return 0
  const n = Number(m[1])
  const unit = m[2] ?? 's'
  switch (unit) {
    case 'h':
      return n * 3600
    case 'm':
      return n * 60
    default:
      return n
  }
}

/**
 * Sanitize a string for use as a K8s label or path segment.
 */
export function sanitizeId(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 63)
}

/**
 * Build the shell snippet that copies a single mount of `kind` from the
 * cloned repo into `<destBase>/<kind>/`. The behaviour depends on kind:
 *   - skills/commands/agents → copy each child dir of `from` that has SKILL.md
 *     (or any .md, for commands), or the explicit `include` whitelist.
 *   - instructions → copy a curated set of root-level markdown files plus
 *     anything under the `from` dir.
 *   - hooks/scripts/files → copy the `from` dir as-is (filtered by include).
 *   - mcp → if `from` is a file, copy it as `mcp/mcp.json`; if a dir, copy
 *     `*.json` inside.
 */
function buildMountCopySnippet(
  pack: ResolvedPack,
  mount: ResolvedMount,
  scratch: string,
  destBase: string,
): string {
  const from = mount.from === '.' || mount.from === '' ? scratch : `${scratch}/${mount.from}`
  const dest = `${destBase}/${mount.kind}`
  const cmds: string[] = [`mkdir -p "${dest}"`]

  switch (mount.kind) {
    case 'skills':
    case 'commands':
    case 'agents': {
      // For skills+commands+agents, copy each direct child dir that has a
      // SKILL.md (or a top-level .md for commands). Honor include whitelist.
      const marker = mount.kind === 'commands' ? '*.md' : 'SKILL.md'
      if (mount.include && mount.include.length > 0) {
        for (const name of mount.include) {
          cmds.push(
            `cp -r "${from}/${name}" "${dest}/" 2>/dev/null || echo "[agent-pack] missing ${mount.kind} ${name} in ${pack.id}"`,
          )
        }
      } else {
        cmds.push(
          `find "${from}" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | while read -r d; do if compgen -G "$d/${marker}" >/dev/null 2>&1; then cp -r "$d" "${dest}/"; fi; done`,
        )
      }
      break
    }
    case 'instructions': {
      // Curated root-level files + anything inside the `from` dir.
      for (const f of pack.instructionFiles) {
        cmds.push(`cp "${scratch}/${f}" "${dest}/" 2>/dev/null || true`)
      }
      if (mount.from !== '.' && mount.from !== '') {
        // Copy *.md files at the immediate level of the `from` dir.
        cmds.push(
          `find "${from}" -mindepth 1 -maxdepth 1 -type f -name '*.md' -exec cp {} "${dest}/" \\; 2>/dev/null || true`,
        )
      }
      break
    }
    case 'mcp': {
      // `from` may be a file (e.g. ".mcp.json") or a dir.
      cmds.push(
        `if [ -f "${from}" ]; then cp "${from}" "${dest}/$(basename "${from}")"; elif [ -d "${from}" ]; then find "${from}" -mindepth 1 -maxdepth 1 -name '*.json' -exec cp {} "${dest}/" \\; ; fi`,
      )
      break
    }
    case 'hooks':
    case 'scripts':
    case 'files': {
      if (mount.include && mount.include.length > 0) {
        for (const name of mount.include) {
          cmds.push(`cp -r "${from}/${name}" "${dest}/" 2>/dev/null || true`)
        }
      } else {
        // Copy everything under `from` into dest.
        cmds.push(
          `if [ -d "${from}" ]; then cp -r "${from}/." "${dest}/" 2>/dev/null || true; elif [ -f "${from}" ]; then cp "${from}" "${dest}/" 2>/dev/null || true; fi`,
        )
      }
      // Make sure scripts are executable.
      if (mount.kind === 'scripts') {
        cmds.push(`find "${dest}" -type f -exec chmod +x {} \\; 2>/dev/null || true`)
      }
      break
    }
  }

  return cmds.join(' && ')
}

/**
 * Build the shell snippet that clones one pack and applies all of its
 * configured mounts. Each mount writes into `<mountPath>/<pack-id>/<kind>/`.
 */
function buildPackCloneSnippet(pack: ResolvedPack, mountPath: string): string {
  const safeId = sanitizeId(pack.id)
  const scratch = `/tmp/agent-pack-src-${safeId}`
  const destBase = `${mountPath}/${safeId}`
  const summary = pack.mounts.map((m) => m.kind).join(',') || 'none'
  const lines: string[] = [
    `echo "[agent-pack] cloning ${pack.url}@${pack.ref} (mounts: ${summary}) -> ${destBase}"`,
    `rm -rf "${scratch}"`,
    `git clone --depth ${pack.depth} --branch "${pack.ref}" "${pack.url}" "${scratch}"`,
    `mkdir -p "${destBase}"`,
  ]
  for (const m of pack.mounts) {
    lines.push(buildMountCopySnippet(pack, m, scratch, destBase))
  }
  // Drop a manifest so the runtime can inspect what got mounted.
  const manifest = JSON.stringify({
    id: pack.id,
    url: pack.url,
    ref: pack.ref,
    kinds: pack.mounts.map((m) => m.kind),
  })
  lines.push(`echo '${manifest.replace(/'/g, "'\\''")}' > "${destBase}/.pack.json"`)
  lines.push(`echo "[agent-pack] ${pack.id} ready"`)
  return lines.join(' && ')
}

/**
 * Build the init container that clones every pack at pod startup.
 */
export function buildAgentPackInitContainer(
  packs: ResolvedPack[],
  mountPath: string,
  volumeName: string,
): PluginK8sInitContainer {
  // We use bash (not sh) so `compgen` and `find -exec {}` semantics work.
  const script = packs.map((p) => buildPackCloneSnippet(p, mountPath)).join('\n')
  return {
    name: 'agent-pack-clone',
    // alpine/git ships with /bin/sh (busybox) — switch to bitnami/git for bash.
    // Using `sh -c` and a bash-fallback lets us stay on alpine/git without bash:
    image: 'alpine/git:latest',
    imagePullPolicy: 'IfNotPresent',
    command: [
      '/bin/sh',
      '-c',
      // Install bash on the fly for compgen support — falls back gracefully.
      `set -e\napk add --no-cache bash >/dev/null 2>&1 || true\nif command -v bash >/dev/null 2>&1; then exec bash -c "${script.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"; fi\n${script}`,
    ],
    volumeMounts: [{ name: volumeName, mountPath }],
  }
}

/**
 * Build the periodic sync sidecar (optional).
 */
export function buildAgentPackSyncSidecar(opts: {
  packs: ResolvedPack[]
  mountPath: string
  volumeName: string
  intervalSec: number
}): PluginK8sSidecar | undefined {
  const { packs, mountPath, volumeName, intervalSec } = opts
  if (!intervalSec || intervalSec <= 0) return undefined

  const cloneAll = packs.map((p) => buildPackCloneSnippet(p, mountPath)).join('\n')
  const script = `
set -e
apk add --no-cache bash >/dev/null 2>&1 || true
RUN_SCRIPT() {
${cloneAll}
}
while true; do
  RUN_SCRIPT || echo "[agent-pack-sync] iteration failed, will retry"
  date -u +%FT%TZ > "${mountPath}/.agent-pack-synced-at" || true
  sleep ${intervalSec}
done
`.trim()

  return {
    name: 'agent-pack-sync',
    image: 'alpine/git:latest',
    imagePullPolicy: 'IfNotPresent',
    command: ['/bin/sh', '-c', script],
    volumeMounts: [{ name: volumeName, mountPath }],
    resources: {
      requests: { cpu: '10m', memory: '32Mi' },
      limits: { cpu: '100m', memory: '128Mi' },
    },
  }
}

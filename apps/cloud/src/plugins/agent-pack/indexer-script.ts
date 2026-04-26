/**
 * Node script owned by the agent-pack plugin and injected into its init/sync
 * containers. It turns mounted upstream command/skill markdown into the
 * standard Shadow slash command index artifact.
 */

export const AGENT_PACK_SLASH_INDEXER_SCRIPT = String.raw`
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

function readArg(name, fallback) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
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

function normalizeSlashCommandName(value) {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/^\/+/, '')
  return /^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/.test(name) ? name : null
}

function parseFrontmatterList(value) {
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  const unwrapped =
    trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  return unwrapped
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { data: {}, body: text }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: text }

  const raw = text.slice(3, end).trim()
  const data = {}
  const lines = raw.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^([a-zA-Z0-9_.-]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    const value = match[2].trim().replace(/^['"]|['"]$/g, '')

    if (value === '|') {
      const block = []
      while (i + 1 < lines.length) {
        const next = lines[i + 1]
        if (next && !/^\s/.test(next)) break
        block.push(next.replace(/^\s{2}/, ''))
        i++
      }
      data[key] = block.join('\n').trim()
      continue
    }

    if (value) {
      data[key] = value
      continue
    }

    const items = []
    while (i + 1 < lines.length) {
      const itemMatch = lines[i + 1].match(/^\s*-\s*(.+)$/)
      if (!itemMatch) break
      items.push(itemMatch[1].trim().replace(/^['"]|['"]$/g, ''))
      i++
    }
    data[key] = items.length > 0 ? items.join(',') : value
  }

  return { data, body: text.slice(end + 4).trimStart() }
}

function parseFrontmatterJson(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

function normalizeInteractionItems(value, max) {
  if (!Array.isArray(value)) return undefined
  const items = value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const label =
        typeof item.label === 'string' && item.label.trim()
          ? item.label.trim()
          : typeof item.value === 'string' && item.value.trim()
            ? item.value.trim()
            : 'Option ' + (index + 1)
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : typeof item.value === 'string' && item.value.trim()
            ? item.value.trim()
            : label
      return {
        id,
        label,
        ...(typeof item.value === 'string' && item.value.trim()
          ? { value: item.value.trim() }
          : {}),
        ...(item.style === 'primary' || item.style === 'secondary' || item.style === 'destructive'
          ? { style: item.style }
          : {}),
      }
    })
    .filter((item) => item.id && item.label)
  return items.length > 0 ? items.slice(0, max) : undefined
}

function normalizeSlashInteraction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const kind = typeof value.kind === 'string' ? value.kind.trim().toLowerCase() : ''
  if (!['buttons', 'select', 'form', 'approval'].includes(kind)) return undefined

  const out = { kind }
  for (const key of ['id', 'prompt', 'submitLabel', 'responsePrompt', 'approvalCommentLabel']) {
    if (typeof value[key] === 'string' && value[key].trim()) out[key] = value[key].trim()
  }
  if (typeof value.oneShot === 'boolean') out.oneShot = value.oneShot

  const buttons = normalizeInteractionItems(value.buttons, 8)
  const options = normalizeInteractionItems(value.options, 20)?.map((option) => ({
    id: option.id,
    label: option.label,
    value: option.value ?? option.id,
  }))
  if (buttons) out.buttons = buttons
  if (options) out.options = options

  if (Array.isArray(value.fields)) {
    out.fields = value.fields
      .filter((field) => field && typeof field === 'object' && !Array.isArray(field))
      .map((field, index) => ({
        id:
          typeof field.id === 'string' && field.id.trim() ? field.id.trim() : 'field_' + (index + 1),
        kind:
          typeof field.kind === 'string' &&
          ['text', 'textarea', 'number', 'checkbox', 'select'].includes(field.kind)
            ? field.kind
            : 'text',
        label:
          typeof field.label === 'string' && field.label.trim()
            ? field.label.trim()
            : 'Field ' + (index + 1),
        ...(typeof field.placeholder === 'string' && field.placeholder.trim()
          ? { placeholder: field.placeholder.trim() }
          : {}),
        ...(typeof field.defaultValue === 'string' ? { defaultValue: field.defaultValue } : {}),
        ...(typeof field.required === 'boolean' ? { required: field.required } : {}),
        ...(typeof field.maxLength === 'number' ? { maxLength: field.maxLength } : {}),
        ...(typeof field.min === 'number' ? { min: field.min } : {}),
        ...(typeof field.max === 'number' ? { max: field.max } : {}),
      }))
      .slice(0, 12)
  }

  return out
}

function frontmatterInteraction(data) {
  const direct = normalizeSlashInteraction(
    parseFrontmatterJson(data.interaction) ?? parseFrontmatterJson(data.interactive),
  )
  if (direct) return direct

  const kind = data['interaction.kind'] ?? data['interactive.kind']
  if (!kind) return undefined
  const oneShotRaw = data['interaction.oneShot'] ?? data['interactive.oneShot']
  return normalizeSlashInteraction({
    kind,
    id: data['interaction.id'] ?? data['interactive.id'],
    prompt: data['interaction.prompt'] ?? data['interactive.prompt'],
    submitLabel: data['interaction.submitLabel'] ?? data['interactive.submitLabel'],
    responsePrompt: data['interaction.responsePrompt'] ?? data['interactive.responsePrompt'],
    approvalCommentLabel:
      data['interaction.approvalCommentLabel'] ?? data['interactive.approvalCommentLabel'],
    ...(oneShotRaw !== undefined ? { oneShot: oneShotRaw === 'true' } : {}),
    buttons: parseFrontmatterJson(data['interaction.buttons'] ?? data['interactive.buttons']),
    options: parseFrontmatterJson(data['interaction.options'] ?? data['interactive.options']),
    fields: parseFrontmatterJson(data['interaction.fields'] ?? data['interactive.fields']),
  })
}

function derivePackId(path) {
  const parts = path.split('/').filter(Boolean)
  const idx = parts.lastIndexOf('agent-packs')
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  return undefined
}

function deriveSlashDescription(body, frontmatter) {
  const fmDescription =
    typeof frontmatter.description === 'string' ? frontmatter.description.trim() : ''
  if (fmDescription) return fmDescription.slice(0, 240)

  for (const line of body.split('\n')) {
    const text = line.replace(/^#+\s*/, '').trim()
    if (text) return text.slice(0, 240)
  }
  return undefined
}

function asStringArray(value) {
  if (typeof value === 'string') return [value]
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
}

function matchesSlashCommandRule(rule, command, context) {
  const match = rule.match
  if (!match || typeof match !== 'object') return true
  if (typeof match.packId === 'string' && match.packId !== context.packId) return false

  const names = [...asStringArray(match.name), ...asStringArray(match.names)]
  if (
    names.length > 0 &&
    !names.some((name) => name.toLowerCase() === command.name.toLowerCase())
  ) {
    return false
  }

  if (typeof match.namePattern === 'string' && match.namePattern.trim()) {
    try {
      if (!new RegExp(match.namePattern).test(command.name)) return false
    } catch (err) {
      console.warn('[agent-pack] Ignoring invalid slash command rule pattern: ' + err.message)
      return false
    }
  }

  const pathIncludes = asStringArray(match.sourcePathIncludes)
  return pathIncludes.length === 0 || pathIncludes.some((needle) => context.path.includes(needle))
}

function applySlashCommandRules(command, context, rules) {
  for (const rule of rules) {
    if (!matchesSlashCommandRule(rule, command, context)) continue

    const aliases = asStringArray(rule.aliases)
      .map(normalizeSlashCommandName)
      .filter(Boolean)
      .filter((alias) => alias.toLowerCase() !== command.name.toLowerCase())
    if (aliases.length > 0) {
      command.aliases = [...new Set([...(command.aliases ?? []), ...aliases])]
    }

    const interaction = normalizeSlashInteraction(rule.interaction)
    if (interaction && !command.interaction) command.interaction = interaction
  }

  return command
}

function stripMarkdownInline(value) {
  return value
    .replace(new RegExp('[' + String.fromCharCode(96) + '*_~]', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractAskLine(block) {
  const quoted = block.match(/\*\*Ask:\*\*\s*"([\s\S]*?)"/)
  if (quoted?.[1]) return stripMarkdownInline(quoted[1])

  const line = block.match(/\*\*Ask:\*\*\s*(.+)/)
  if (line?.[1]) return stripMarkdownInline(line[1].replace(/^"|"$/g, ''))

  return ''
}

function slugifyFieldId(value, fallback) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  return slug || fallback
}

function deriveAskFieldsFromMarkdown(markdown) {
  const questionHeadingRegex = /^#{2,6}\s+Q(\d+)\s*:\s*(.+?)\s*$/gm
  const matches = [...markdown.matchAll(questionHeadingRegex)]
  const fields = []

  for (let i = 0; i < matches.length && fields.length < 12; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const qNumber = current[1]
    const title = stripMarkdownInline(current[2] ?? 'Question ' + (fields.length + 1))
    const blockStart = (current.index ?? 0) + current[0].length
    const blockEnd = next?.index ?? markdown.length
    const ask = extractAskLine(markdown.slice(blockStart, blockEnd))
    if (!ask) continue
    fields.push({
      id: slugifyFieldId('q' + qNumber + '_' + title, 'q' + (fields.length + 1)),
      kind: 'textarea',
      label: 'Q' + qNumber + ': ' + title,
      placeholder: ask,
      required: true,
      maxLength: 2000,
    })
  }

  if (fields.length > 0) return fields

  const askLines = [...markdown.matchAll(/\*\*Ask:\*\*\s*"?(.+?)"?\s*$/gm)]
  for (let i = 0; i < askLines.length && fields.length < 12; i++) {
    const ask = stripMarkdownInline(askLines[i][1] ?? '')
    if (!ask) continue
    fields.push({
      id: 'q' + (i + 1),
      kind: 'textarea',
      label: 'Q' + (i + 1),
      placeholder: ask,
      required: true,
      maxLength: 2000,
    })
  }

  return fields
}

function inferInteractionFromMarkdown(command, inferInteractions) {
  if (!inferInteractions || !command.body) return undefined
  const fields = deriveAskFieldsFromMarkdown(command.body)
  if (fields.length < 2) return undefined

  return {
    id: 'slash:' + (command.packId ?? 'pack') + ':' + command.name + ':auto-form',
    kind: 'form',
    prompt:
      command.description ?? '/' + command.name + ' needs a few answers before the Buddy can continue.',
    oneShot: true,
    responsePrompt:
      'Use the submitted values as answers to this slash command, then continue from the source command definition. Produce the requested artifact before asking for approval.',
    fields,
  }
}

function deriveAliasCandidates(name, packId) {
  const candidates = new Set()
  let base = name

  if (packId && base.startsWith(packId + '-')) {
    base = base.slice(packId.length + 1)
    if (normalizeSlashCommandName(base)) candidates.add(base)
  }

  for (const prefix of ['openclaw-', 'claude-', 'claude-code-', 'codex-', 'cursor-']) {
    if (base.startsWith(prefix)) {
      const stripped = base.slice(prefix.length)
      if (normalizeSlashCommandName(stripped)) candidates.add(stripped)
    }
  }

  for (const candidate of [...candidates]) {
    if (candidate.endsWith('-hours')) candidates.add(candidate.replace(/-hours$/, '-hour'))
  }

  return [...candidates].filter((alias) => alias.toLowerCase() !== name.toLowerCase())
}

function addInferredAliases(command, context) {
  const aliases = new Set(command.aliases ?? [])
  for (const alias of deriveAliasCandidates(command.name, context.packId)) aliases.add(alias)
  if (aliases.size > 0) command.aliases = [...aliases]
  return command
}

function readSlashCommand(path, fallbackName, options) {
  const text = readMaybe(path).trim()
  if (!text) return null
  const { data, body } = parseFrontmatter(text)
  const name = normalizeSlashCommandName(data.name ?? fallbackName)
  if (!name) return null
  const packId = derivePackId(path)
  const aliases = parseFrontmatterList(data.aliases)
    .map(normalizeSlashCommandName)
    .filter(Boolean)
    .filter((alias) => alias.toLowerCase() !== name.toLowerCase())
  const description = deriveSlashDescription(body, data)
  const interaction = frontmatterInteraction(data)

  let command = {
    name,
    ...(description ? { description } : {}),
    ...(aliases.length > 0 ? { aliases: [...new Set(aliases)] } : {}),
    ...(packId ? { packId } : {}),
    ...(interaction ? { interaction } : {}),
    sourcePath: path,
    body: text.slice(0, 20000),
  }

  const context = { path, packId, body, frontmatter: data }
  command = addInferredAliases(command, context)
  command = applySlashCommandRules(command, context, options.rules)

  if (!command.interaction) {
    const inferred = inferInteractionFromMarkdown(command, options.inferInteractions)
    if (inferred) command.interaction = inferred
  }

  return command
}

function discoverSlashCommands(commandsDirs, options) {
  const commands = []
  const seen = new Set()
  for (const dir of commandsDirs) {
    for (const file of listFiles(dir, '.md')) {
      const fallbackName = file.split('/').pop().replace(/\.md$/, '')
      const command = readSlashCommand(file, fallbackName, options)
      if (!command) continue
      const key = command.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      commands.push(command)
    }

    for (const childDir of listChildDirs(dir)) {
      const fallbackName = childDir.split('/').pop()
      for (const candidate of ['SKILL.md', 'COMMAND.md', 'README.md']) {
        const path = join(childDir, candidate)
        if (!existsSync(path)) continue
        const command = readSlashCommand(path, fallbackName, options)
        if (!command) break
        const key = command.name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          commands.push(command)
        }
        break
      }
    }
  }
  return commands.slice(0, 200)
}

function commandDirsFromMountRoot(mountPath) {
  const dirs = []
  for (const packDir of listChildDirs(mountPath)) {
    if (packDir.endsWith('/.shadow')) continue
    for (const kind of ['commands', 'skills']) {
      const dir = join(packDir, kind)
      if (existsSync(dir)) dirs.push(dir)
    }
  }
  return [...new Set(dirs)]
}

const mountPath = readArg('--mount-path', '/agent-packs')
const output = readArg('--output', mountPath + '/.shadow/slash-commands.json')
const rulesRaw = readArg('--rules-json', '[]')
const inferInteractions = readArg('--infer-interactions', 'true') !== 'false'
let rules = []
try {
  const parsed = JSON.parse(rulesRaw)
  if (Array.isArray(parsed)) rules = parsed
} catch (err) {
  console.warn('[agent-pack] Ignoring invalid slash command rules JSON: ' + err.message)
}

const commands = discoverSlashCommands(commandDirsFromMountRoot(mountPath), {
  inferInteractions,
  rules,
})
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(commands, null, 2), 'utf-8')
console.log('[agent-pack] Wrote ' + commands.length + ' slash command(s) to ' + output)
`

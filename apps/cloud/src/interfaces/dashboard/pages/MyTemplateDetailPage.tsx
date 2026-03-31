import Editor from '@monaco-editor/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  Check,
  Clock,
  Code,
  Cpu,
  Edit3,
  FileJson,
  GitFork,
  History,
  Layers,
  Loader2,
  Rocket,
  RotateCcw,
  Save,
  Server,
  Settings,
  Shield,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/Badge'
import { Breadcrumb } from '@/components/Breadcrumb'
import { CodeBlock } from '@/components/CodeBlock'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/Tabs'
import { api, type ValidateResult } from '@/lib/api'
import { cn, pluralize } from '@/lib/utils'
import { useToast } from '@/stores/toast'

// ── Agent parsing ─────────────────────────────────────────────────────────────

interface AgentDetail {
  id: string
  name: string
  runtime: string
  description?: string
  identity?: { name?: string; personality?: string; systemPrompt?: string }
  integrations?: Array<{ name: string; credentials?: Record<string, string> }>
  configuration?: Record<string, unknown>
  resources?: { requests?: Record<string, string>; limits?: Record<string, string> }
  env?: Record<string, string>
}

function parseAgentDetails(templateData: unknown): AgentDetail[] {
  if (!templateData || typeof templateData !== 'object') return []
  const data = templateData as Record<string, unknown>
  const agents: AgentDetail[] = []

  const deployments = data.deployments as Record<string, unknown> | undefined
  const deplAgents = deployments?.agents as unknown[] | undefined
  const sourceAgents = Array.isArray(deplAgents)
    ? deplAgents
    : Array.isArray(data.agents)
      ? data.agents
      : []

  for (const a of sourceAgents) {
    if (typeof a !== 'object' || a === null) continue
    const agent = a as Record<string, unknown>
    agents.push({
      id: String(agent.id ?? agent.name ?? 'unknown'),
      name: String(
        agent.name ?? (agent.identity as Record<string, unknown>)?.name ?? agent.id ?? 'Unknown',
      ),
      runtime: String(agent.runtime ?? 'unknown'),
      description: agent.description ? String(agent.description) : undefined,
      identity: agent.identity as AgentDetail['identity'],
      integrations: agent.integrations as AgentDetail['integrations'],
      configuration: agent.configuration as AgentDetail['configuration'],
      resources: agent.resources as AgentDetail['resources'],
      env: agent.env as AgentDetail['env'],
    })
  }
  return agents
}

// ── Agents Tab ────────────────────────────────────────────────────────────────

function AgentDetailCard({ agent, index }: { agent: AgentDetail; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-xs font-bold text-blue-400">
            {index + 1}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              {agent.identity?.name ?? agent.id}
              <Badge variant="default" size="sm">
                {agent.runtime}
              </Badge>
            </h4>
            {agent.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{agent.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.integrations && agent.integrations.length > 0 && (
            <Badge variant="info" size="sm" icon={<Layers size={9} />}>
              {agent.integrations.length} {pluralize(agent.integrations.length, 'integration')}
            </Badge>
          )}
          {agent.resources && (
            <Badge variant="outline" size="sm" icon={<Server size={9} />}>
              resources
            </Badge>
          )}
          <span className={cn('text-gray-500 transition-transform', expanded && 'rotate-90')}>
            ▸
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
          {/* Identity */}
          {agent.identity && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
                <Users size={10} /> Identity
              </h5>
              {agent.identity.personality && (
                <p className="text-xs text-gray-400 bg-gray-950 rounded p-2.5 leading-relaxed line-clamp-4">
                  {agent.identity.personality}
                </p>
              )}
              {agent.identity.systemPrompt && (
                <details className="mt-2">
                  <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">
                    System Prompt
                  </summary>
                  <p className="text-xs text-gray-500 bg-gray-950 rounded p-2.5 mt-1 leading-relaxed max-h-32 overflow-y-auto">
                    {agent.identity.systemPrompt}
                  </p>
                </details>
              )}
            </div>
          )}

          {/* Integrations */}
          {agent.integrations && agent.integrations.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
                <Layers size={10} /> Integrations
              </h5>
              <div className="flex flex-wrap gap-2">
                {agent.integrations.map((intg) => (
                  <div
                    key={intg.name}
                    className="flex items-center gap-1.5 text-xs bg-purple-900/20 text-purple-300 border border-purple-800/40 px-2.5 py-1 rounded-md"
                  >
                    <Zap size={10} />
                    {intg.name}
                    {intg.credentials && (
                      <span className="text-purple-500 text-[10px]">
                        ({Object.keys(intg.credentials).length}{' '}
                        {pluralize(Object.keys(intg.credentials).length, 'credential')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {agent.resources && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
                <Server size={10} /> Resources
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {agent.resources.requests && (
                  <div className="bg-gray-950 rounded p-2">
                    <span className="text-[10px] text-gray-600 block mb-1">Requests</span>
                    {Object.entries(agent.resources.requests).map(([k, v]) => (
                      <div key={k} className="text-xs text-gray-400 flex justify-between">
                        <span className="text-gray-600">{k}</span>
                        <span className="font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {agent.resources.limits && (
                  <div className="bg-gray-950 rounded p-2">
                    <span className="text-[10px] text-gray-600 block mb-1">Limits</span>
                    {Object.entries(agent.resources.limits).map(([k, v]) => (
                      <div key={k} className="text-xs text-gray-400 flex justify-between">
                        <span className="text-gray-600">{k}</span>
                        <span className="font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration */}
          {agent.configuration && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
                <Settings size={10} /> Configuration
              </h5>
              <pre className="text-xs text-gray-500 bg-gray-950 rounded p-2.5 overflow-x-auto max-h-40">
                {JSON.stringify(agent.configuration, null, 2)}
              </pre>
            </div>
          )}

          {/* Environment variables */}
          {agent.env && Object.keys(agent.env).length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5 flex items-center gap-1">
                <Code size={10} /> Environment
              </h5>
              <div className="space-y-1">
                {Object.entries(agent.env).map(([k, v]) => (
                  <div key={k} className="text-xs font-mono flex gap-2">
                    <span className="text-yellow-400/80">{k}</span>
                    <span className="text-gray-600">=</span>
                    <span className="text-gray-500 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AgentsTab({ agents }: { agents: AgentDetail[] }) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="No agents"
        description="This template has no agents defined."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        {agents.length} {pluralize(agents.length, 'agent')} in this template:
      </p>
      {agents.map((agent, i) => (
        <AgentDetailCard key={agent.id} agent={agent} index={i} />
      ))}
    </div>
  )
}

// ── Editor Tab ────────────────────────────────────────────────────────────────

function EditorTab({
  name,
  content: initialContent,
  templateSlug,
}: {
  name: string
  content: unknown
  templateSlug: string | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [content, setContent] = useState(() =>
    initialContent ? JSON.stringify(initialContent, null, 2) : '',
  )
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    if (initialContent) setContent(JSON.stringify(initialContent, null, 2))
  }, [initialContent])

  const saveMutation = useMutation({
    mutationFn: (parsed: unknown) => api.myTemplates.save(name, parsed, templateSlug ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] })
      queryClient.invalidateQueries({ queryKey: ['my-template', name] })
      setSaved(true)
      toast.success('Template saved')
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  })

  const validateMutation = useMutation({
    mutationFn: (config: unknown) => api.validate(config),
    onSuccess: (result) => {
      setValidateResult(result)
      if (result.valid) toast.success(`Valid: ${result.agents} agent(s)`)
      else toast.error(`Invalid: ${result.violations.length} violation(s)`)
    },
  })

  const handleSave = () => {
    try {
      saveMutation.mutate(JSON.parse(content))
    } catch {
      toast.error('Invalid JSON — cannot save')
    }
  }

  const handleValidate = () => {
    try {
      setValidateResult(null)
      validateMutation.mutate(JSON.parse(content))
    } catch {
      toast.error('Invalid JSON syntax')
    }
  }

  const handleFormat = () => {
    try {
      setContent(JSON.stringify(JSON.parse(content), null, 2))
      toast.info('Formatted')
    } catch {
      toast.error('Cannot format: invalid JSON')
    }
  }

  const handleChange = useCallback((val: string | undefined) => {
    setContent(val ?? '')
    setSaved(false)
    setValidateResult(null)
  }, [])

  const isValidJson = useMemo(() => {
    try {
      JSON.parse(content)
      return true
    } catch {
      return false
    }
  }, [content])

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{content.split('\n').length} lines</span>
          <span>·</span>
          <span className={isValidJson ? 'text-green-600' : 'text-red-500'}>
            {content.trim() ? (isValidJson ? 'Valid JSON' : 'Invalid JSON') : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFormat}
            disabled={!isValidJson}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <FileJson size={12} />
            Format
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!isValidJson || validateMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <Shield size={12} />
            Validate
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValidJson || saveMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors',
              saved ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white',
            )}
          >
            {saved ? <Check size={12} /> : <Save size={12} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Validation result */}
      {validateResult && (
        <div
          className={cn(
            'border rounded-lg p-3 mb-3 flex items-center gap-2 text-sm',
            validateResult.valid
              ? 'bg-green-900/20 border-green-800 text-green-400'
              : 'bg-red-900/20 border-red-800 text-red-400',
          )}
        >
          <Shield size={14} />
          {validateResult.valid
            ? `Valid: ${validateResult.agents} agent(s), ${validateResult.configurations} configuration(s)`
            : `Invalid: ${validateResult.violations.length} violation(s)`}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="border border-gray-700 rounded-lg overflow-hidden min-h-[500px]">
        <Editor
          height="500px"
          language="json"
          value={content}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            formatOnPaste: true,
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  )
}

// ── Versions Tab ──────────────────────────────────────────────────────────────

function VersionsTab({ name }: { name: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-template-versions', name],
    queryFn: () => api.myTemplates.versions(name),
  })

  const restoreMutation = useMutation({
    mutationFn: (version: number) => api.myTemplates.restoreVersion(name, version),
    onSuccess: (_, version) => {
      queryClient.invalidateQueries({ queryKey: ['my-template', name] })
      queryClient.invalidateQueries({ queryKey: ['my-template-versions', name] })
      toast.success(`Restored version ${version}`)
    },
    onError: (err) => toast.error(`Restore failed: ${err.message}`),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading versions...
      </div>
    )
  }

  const versions = data?.versions ?? []

  if (versions.length <= 1) {
    return (
      <EmptyState
        icon={<History size={32} />}
        title="No version history"
        description="Edit and save the template to create version history."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Current version: <span className="text-white font-medium">v{data?.current ?? 1}</span>
        {' · '}
        {versions.length} {pluralize(versions.length, 'version')} total
      </p>
      <div className="space-y-2">
        {versions.map((v) => (
          <div
            key={v.version}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-lg border transition-colors',
              v.current
                ? 'bg-blue-900/20 border-blue-800/50'
                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  v.current ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400',
                )}
              >
                v{v.version}
              </div>
              <div>
                <span className="text-sm text-gray-200">
                  Version {v.version}
                  {v.current && (
                    <Badge variant="info" size="sm" className="ml-2">
                      current
                    </Badge>
                  )}
                </span>
                {v.createdAt && (
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            {!v.current && (
              <button
                type="button"
                onClick={() => restoreMutation.mutate(v.version)}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw size={12} />
                Restore
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MyTemplateDetailPage() {
  const { t } = useTranslation()
  const { name } = useParams({ strict: false }) as { name: string }
  const [activeTab, setActiveTab] = useState('overview')
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-template', name],
    queryFn: () => api.myTemplates.get(name),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.myTemplates.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] })
      toast.success('Template deleted')
      navigate({ to: '/my-templates' })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const agents = useMemo(
    () => (data?.content ? parseAgentDetails(data.content) : []),
    [data?.content],
  )

  const tabs = [
    { id: 'overview', label: t('templateDetail.overview'), icon: <FileJson size={13} /> },
    {
      id: 'agents',
      label: t('templateDetail.agents'),
      count: agents.length,
      icon: <Users size={13} />,
    },
    { id: 'editor', label: t('templateDetail.editor'), icon: <Edit3 size={13} /> },
    {
      id: 'versions',
      label: t('templateDetail.versions'),
      count: data?.version,
      icon: <History size={13} />,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        Loading template...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <Breadcrumb
          items={[{ label: t('templates.title'), to: '/my-templates' }, { label: name }]}
          className="mb-4"
        />
        <EmptyState
          title={t('storeDetail.templateNotFound')}
          description={`The template "${name}" does not exist.`}
          action={
            <Link
              to="/my-templates"
              className="text-sm text-blue-400 hover:text-blue-300 border border-blue-800 rounded-lg px-4 py-2"
            >
              Back to My Templates
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumb
        items={[{ label: t('templates.title'), to: '/my-templates' }, { label: name }]}
        className="mb-4"
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileJson size={20} className="text-blue-400" />
            {name}
            <Badge variant="default" size="sm">
              v{data.version ?? 1}
            </Badge>
          </h1>
          {data.templateSlug && (
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
              <GitFork size={12} />
              Forked from{' '}
              <Link
                to="/store/$name"
                params={{ name: data.templateSlug }}
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                {data.templateSlug}
              </Link>
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {agents.length} {pluralize(agents.length, 'agent')}
            {' · '}Version {data.version ?? 1}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/store/$name/deploy"
            params={{ name: data.templateSlug ?? name }}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Rocket size={14} />
            Deploy
          </Link>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete template "${name}"?`)) deleteMutation.mutate()
            }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <Link
            to="/my-templates"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewPanel content={data.content} agents={agents} />}
        {activeTab === 'agents' && <AgentsTab agents={agents} />}
        {activeTab === 'editor' && (
          <EditorTab name={name} content={data.content} templateSlug={data.templateSlug} />
        )}
        {activeTab === 'versions' && <VersionsTab name={name} />}
      </div>
    </div>
  )
}

// ── Overview Panel ────────────────────────────────────────────────────────────

function OverviewPanel({ content, agents }: { content: unknown; agents: AgentDetail[] }) {
  if (!content || typeof content !== 'object') {
    return <EmptyState title="No content" description="Template has no configuration data." />
  }
  const data = content as Record<string, unknown>
  const deployments = data.deployments as Record<string, unknown> | undefined
  const namespace = deployments?.namespace as string | undefined
  const configs = (data.configurations ?? deployments?.configurations) as unknown[] | undefined
  const providers = (data.providers ?? deployments?.providers) as unknown[] | undefined

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Agents"
          value={agents.length}
          icon={<Users size={14} className="text-blue-400" />}
        />
        <StatCard
          label="Namespace"
          value={namespace ?? '—'}
          icon={<Layers size={14} className="text-purple-400" />}
        />
        <StatCard
          label="Configurations"
          value={Array.isArray(configs) ? configs.length : 0}
          icon={<Settings size={14} className="text-green-400" />}
        />
        <StatCard
          label="Providers"
          value={Array.isArray(providers) ? providers.length : 0}
          icon={<Cpu size={14} className="text-orange-400" />}
        />
      </div>

      {/* Agent summary */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Users size={14} className="text-blue-400" />
          Agents
        </h3>
        <div className="space-y-2">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-200">{a.identity?.name ?? a.id}</span>
                <Badge variant="default" size="sm">
                  {a.runtime}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {a.integrations?.map((i) => (
                  <Badge key={i.name} variant="outline" size="sm">
                    {i.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw config preview */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Code size={14} className="text-gray-400" />
          Configuration Preview
        </h3>
        <CodeBlock
          code={JSON.stringify(content, null, 2)}
          language="json"
          title="Template JSON"
          showLineNumbers
          maxHeight="400px"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase mb-1">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold text-gray-200 font-mono">{value}</p>
    </div>
  )
}

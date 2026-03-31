import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Cpu,
  ExternalLink,
  FolderOpen,
  GitFork,
  Heart,
  Key,
  Layers,
  Rocket,
  Settings,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/Badge'
import { Breadcrumb } from '@/components/Breadcrumb'
import { CodeBlock } from '@/components/CodeBlock'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/Tabs'
import { api, type Template } from '@/lib/api'
import { getCategoryColor, getDifficultyColor, getTemplateMeta } from '@/lib/store-data'
import { cn, pluralize } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/stores/toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentInfo {
  name: string
  role?: string
  tools?: string[]
  model?: string
  runtime?: string
  identity?: { name?: string; personality?: string; systemPrompt?: string }
  integrations?: Array<{ name: string; credentials?: Record<string, string> }>
  resources?: { requests?: Record<string, string>; limits?: Record<string, string> }
}

function parseAgents(templateData: unknown): AgentInfo[] {
  if (!templateData || typeof templateData !== 'object') return []
  const data = templateData as Record<string, unknown>

  // Try to extract agent info from template JSON
  const agents: AgentInfo[] = []

  // Check for 'deployments.agents' (primary format)
  const deployments = data.deployments as Record<string, unknown> | undefined
  const deplAgents = deployments?.agents as unknown[] | undefined
  if (Array.isArray(deplAgents)) {
    for (const a of deplAgents) {
      if (typeof a === 'object' && a !== null) {
        const agent = a as Record<string, unknown>
        agents.push({
          name: String(agent.name ?? agent.id ?? 'Unknown'),
          role: agent.role
            ? String(agent.role)
            : agent.description
              ? String(agent.description)
              : undefined,
          tools: Array.isArray(agent.tools) ? agent.tools.map(String) : undefined,
          model: agent.model ? String(agent.model) : undefined,
          runtime: agent.runtime ? String(agent.runtime) : undefined,
          identity: agent.identity as AgentInfo['identity'],
          integrations: agent.integrations as AgentInfo['integrations'],
          resources: agent.resources as AgentInfo['resources'],
        })
      }
    }
  }

  // Fallback: check for top-level 'agents' array
  if (agents.length === 0 && Array.isArray(data.agents)) {
    for (const a of data.agents) {
      if (typeof a === 'object' && a !== null) {
        const agent = a as Record<string, unknown>
        agents.push({
          name: String(agent.name ?? agent.id ?? 'Unknown'),
          role: agent.role
            ? String(agent.role)
            : agent.description
              ? String(agent.description)
              : undefined,
          tools: Array.isArray(agent.tools) ? agent.tools.map(String) : undefined,
          model: agent.model ? String(agent.model) : undefined,
          runtime: agent.runtime ? String(agent.runtime) : undefined,
          identity: agent.identity as AgentInfo['identity'],
          integrations: agent.integrations as AgentInfo['integrations'],
          resources: agent.resources as AgentInfo['resources'],
        })
      }
    }
  }

  // Check for 'team.members' or 'members'
  const team = data.team as Record<string, unknown> | undefined
  const members = (team?.members ?? data.members) as unknown[] | undefined
  if (Array.isArray(members) && agents.length === 0) {
    for (const m of members) {
      if (typeof m === 'object' && m !== null) {
        const member = m as Record<string, unknown>
        agents.push({
          name: String(member.name ?? member.id ?? 'Unknown'),
          role: member.role
            ? String(member.role)
            : member.description
              ? String(member.description)
              : undefined,
          tools: Array.isArray(member.tools) ? member.tools.map(String) : undefined,
          model: member.model ? String(member.model) : undefined,
        })
      }
    }
  }

  return agents
}

// ── Components ────────────────────────────────────────────────────────────────

function OverviewTab({
  template: _template,
  meta,
}: {
  template: Template
  meta: ReturnType<typeof getTemplateMeta>
}) {
  return (
    <div className="space-y-6">
      {/* README */}
      <div className="prose prose-invert prose-sm max-w-none">
        {meta.readme.split('\n\n').map((paragraph, i) => {
          if (paragraph.startsWith('## ')) {
            return (
              <h2 key={i} className="text-lg font-semibold text-white mt-6 mb-3">
                {paragraph.replace('## ', '')}
              </h2>
            )
          }
          if (paragraph.startsWith('### ')) {
            return (
              <h3 key={i} className="text-base font-medium text-gray-200 mt-4 mb-2">
                {paragraph.replace('### ', '')}
              </h3>
            )
          }
          if (paragraph.startsWith('- ')) {
            return (
              <ul key={i} className="space-y-1 text-sm text-gray-400">
                {paragraph.split('\n').map((line, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{line.replace(/^- /, '')}</span>
                  </li>
                ))}
              </ul>
            )
          }
          if (paragraph.startsWith('1. ')) {
            return (
              <ol key={i} className="space-y-1 text-sm text-gray-400 list-decimal list-inside">
                {paragraph.split('\n').map((line, j) => (
                  <li key={j}>{line.replace(/^\d+\. /, '')}</li>
                ))}
              </ol>
            )
          }
          return (
            <p key={i} className="text-sm text-gray-400 leading-relaxed">
              {paragraph}
            </p>
          )
        })}
      </div>

      {/* Features */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Zap size={14} className="text-yellow-500" />
          Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {meta.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle size={13} className="text-green-400 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      {meta.useCases.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Layers size={14} className="text-purple-400" />
            Use Cases
          </h3>
          <div className="flex flex-wrap gap-2">
            {meta.useCases.map((uc) => (
              <span
                key={uc}
                className="text-xs bg-purple-900/30 text-purple-300 px-3 py-1.5 rounded-full border border-purple-800/50"
              >
                {uc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Shield size={14} className="text-orange-400" />
          Requirements
        </h3>
        <ul className="space-y-2">
          {meta.requirements.map((req) => (
            <li key={req} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="text-orange-400 mt-0.5">→</span>
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AgentsTab({ agents }: { agents: AgentInfo[] }) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={<Users size={32} />}
        title="Agent details unavailable"
        description="Deploy this template to see the full agent configuration."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        This template includes {agents.length} {pluralize(agents.length, 'agent')}:
      </p>
      {agents.map((agent, i) => (
        <AgentCard key={agent.name} agent={agent} index={i} />
      ))}
    </div>
  )
}

function AgentCard({ agent, index }: { agent: AgentInfo; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-xs font-bold text-blue-400">
            {index + 1}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              {agent.identity?.name ?? agent.name}
              {agent.runtime && (
                <Badge variant="default" size="sm">
                  {agent.runtime}
                </Badge>
              )}
            </h4>
            {agent.role && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{agent.role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {agent.model && (
            <Badge variant="default" size="sm" icon={<Cpu size={10} />}>
              {agent.model}
            </Badge>
          )}
          {agent.integrations && agent.integrations.length > 0 && (
            <Badge variant="info" size="sm" icon={<Layers size={10} />}>
              {agent.integrations.length}
            </Badge>
          )}
          <span
            className={cn('text-gray-500 transition-transform text-xs', expanded && 'rotate-90')}
          >
            ▸
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
          {/* Identity */}
          {agent.identity?.personality && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5">Identity</h5>
              <p className="text-xs text-gray-400 bg-gray-950 rounded p-2.5 leading-relaxed line-clamp-4">
                {agent.identity.personality}
              </p>
            </div>
          )}

          {/* Integrations */}
          {agent.integrations && agent.integrations.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5">
                Integrations
              </h5>
              <div className="flex flex-wrap gap-2">
                {agent.integrations.map((intg) => (
                  <span
                    key={intg.name}
                    className="flex items-center gap-1.5 text-xs bg-purple-900/20 text-purple-300 border border-purple-800/40 px-2.5 py-1 rounded-md"
                  >
                    <Zap size={10} /> {intg.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {agent.resources && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5">
                Resources
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

          {agent.tools && agent.tools.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase text-gray-600 font-semibold mb-1.5">Tools</h5>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded font-mono"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConfigTab({ templateData }: { templateData: unknown }) {
  const configStr = templateData ? JSON.stringify(templateData, null, 2) : 'Loading...'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Full template configuration. This will be used as the base config for deployment.
      </p>
      <CodeBlock
        code={configStr}
        language="json"
        title="Template Configuration"
        showLineNumbers
        maxHeight="600px"
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StoreDetailPage() {
  const { t } = useTranslation()
  const { name } = useParams({ strict: false }) as { name: string }
  const [activeTab, setActiveTab] = useState('overview')
  const isFavorite = useAppStore((s) => s.favorites.includes(name))
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const forkMutation = useMutation({
    mutationFn: () => api.myTemplates.fork(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-templates'] })
      toast.success(`Forked to My Templates as "${data.name}"`)
      navigate({ to: '/my-templates/$name', params: { name: data.name } })
    },
    onError: () => toast.error('Failed to fork template'),
  })

  // Fetch basic template list (for matching)
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: api.templates.list,
  })

  // Fetch full template config
  const { data: templateData, isLoading: loadingDetail } = useQuery({
    queryKey: ['template', name],
    queryFn: () => api.templates.get(name),
  })

  const template = templates?.find((t) => t.name === name)
  const meta = getTemplateMeta(name)
  const agents = parseAgents(templateData)

  // Fetch required env var refs
  const { data: envRefsData } = useQuery({
    queryKey: ['template-env-refs', name],
    queryFn: () => api.templates.envRefs(name),
  })
  const requiredEnvVars = envRefsData?.requiredEnvVars ?? []

  const tabs = [
    { id: 'overview', label: t('storeDetail.overview'), icon: <BookOpen size={13} /> },
    {
      id: 'agents',
      label: t('storeDetail.agents'),
      count: agents.length,
      icon: <Users size={13} />,
    },
    { id: 'config', label: t('storeDetail.configuration'), icon: <Settings size={13} /> },
  ]

  if (!template && !loadingDetail) {
    return (
      <div className="p-6">
        <Breadcrumb
          items={[{ label: t('store.title'), to: '/store' }, { label: name }]}
          className="mb-4"
        />
        <EmptyState
          title={t('storeDetail.templateNotFound')}
          description={t('storeDetail.templateNotFoundDesc')}
          action={
            <Link
              to="/store"
              className="text-sm text-blue-400 hover:text-blue-300 border border-blue-800 rounded-lg px-4 py-2"
            >
              {t('storeDetail.backToStore')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[{ label: t('store.title'), to: '/store' }, { label: name }]}
        className="mb-4"
      />

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Left: info */}
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-5xl">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{name}</h1>
                <button
                  type="button"
                  onClick={() => toggleFavorite(name)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    isFavorite ? 'text-red-400' : 'text-gray-600 hover:text-gray-400',
                  )}
                >
                  <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                {template?.description ?? 'Loading...'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className={getCategoryColor(meta.category)}>
                  {meta.category}
                </Badge>
                <Badge variant="default" className={getDifficultyColor(meta.difficulty)}>
                  {meta.difficulty}
                </Badge>
                {meta.featured && (
                  <Badge variant="info" icon={<Star size={10} />}>
                    {t('store.featured')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap gap-3 mb-4">
            {meta.highlights.map((h) => (
              <div
                key={h}
                className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full"
              >
                <Zap size={11} className="text-yellow-500" />
                {h}
              </div>
            ))}
          </div>

          {/* Deploy & Fork buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/store/$name/deploy"
              params={{ name }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Rocket size={16} />
              {t('store.deployTemplate')}
            </Link>
            <button
              type="button"
              onClick={() => forkMutation.mutate()}
              disabled={forkMutation.isPending}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <GitFork size={14} />
              {forkMutation.isPending ? 'Forking...' : t('store.forkTemplate')}
            </button>
            <Link
              to="/store"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2.5 rounded-lg transition-colors"
            >
              <ArrowLeft size={14} />
              {t('store.backToStore')}
            </Link>
          </div>
        </div>

        {/* Right: Quick Info sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Info
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Users size={12} />
                  Agents
                </span>
                <span className="text-sm font-medium">{template?.agentCount ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <FolderOpen size={12} />
                  Namespace
                </span>
                <span className="text-sm font-mono text-gray-300">
                  {template?.namespace ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Clock size={12} />
                  Deploy time
                </span>
                <span className="text-sm text-gray-300">{meta.estimatedDeployTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Star size={12} />
                  Popularity
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${meta.popularity}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{meta.popularity}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Cpu size={12} />
                  Team name
                </span>
                <span className="text-sm font-mono text-gray-300">{template?.teamName ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Key size={12} />
                  Env vars
                </span>
                <span className="text-sm text-gray-300">{requiredEnvVars.length || '—'}</span>
              </div>
            </div>

            {/* Required env vars */}
            {requiredEnvVars.length > 0 && (
              <div className="pt-3 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1">
                  <Key size={10} />
                  Required Environment Variables
                </p>
                <div className="space-y-1">
                  {requiredEnvVars.map((v: string) => (
                    <code
                      key={v}
                      className="block text-[11px] font-mono text-yellow-400/80 bg-gray-950 rounded px-2 py-1"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* CLI quick deploy */}
            <div className="pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1">
                <ExternalLink size={10} />
                CLI Quick Deploy
              </p>
              <code className="block text-xs font-mono text-gray-400 bg-gray-950 rounded px-3 py-2 break-all">
                shadowob-cloud deploy --template {name}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Content ─────────────────────────────────────────── */}
      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

      <div className="min-h-[400px]">
        {activeTab === 'overview' && template && <OverviewTab template={template} meta={meta} />}
        {activeTab === 'agents' && <AgentsTab agents={agents} />}
        {activeTab === 'config' && <ConfigTab templateData={templateData} />}
      </div>
    </div>
  )
}

/**
 * Agents Settings Page
 *
 * Unified agent management (native + ACP runtime).
 *
 * Design: User only cares about agent name, not command path.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Bot, Check, Cpu, Edit2, ExternalLink, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type AgentConfig, type AgentTemplate, type ACPAgentId } from '../../types/agent'

function getAgentsAPI() {
  return window.desktopAPI?.agents ?? null
}

function useIsDesktop() {
  return typeof window !== 'undefined' && 'desktopAPI' in window
}

// Agent Card
function AgentCard({
  agent,
  isActive,
  onEdit,
  onDelete,
  onSetActive,
  onToggle,
}: {
  agent: AgentConfig
  isActive: boolean
  onEdit: () => void
  onDelete: () => void
  onSetActive: () => void
  onToggle: () => void
}) {
  const { t } = useTranslation()

  const getRuntimeIcon = () => {
    return agent.runtime === 'acp' ? '🤖' : '⚙️'
  }

  const getRuntimeLabel = () => {
    return agent.runtime === 'acp' ? t('agents.runtimeACP') : t('agents.runtimeNative')
  }

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        isActive ? 'border-primary bg-primary/5' : 'border-border-subtle bg-bg-secondary hover:border-border-dim'
      }`}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
            <Check size={12} />
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-xl">
          {getRuntimeIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-text-primary">{agent.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                agent.enabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {agent.enabled ? t('agents.enabled') : t('agents.disabled')}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-text-muted">
            {getRuntimeLabel()}
            {agent.runtime === 'acp' && agent.acpAgentId && ` • ${agent.acpAgentId}`}
            {agent.bindingMode === 'new-thread' && ` • ${t('agents.newThread')}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div
          role="switch"
          aria-checked={agent.enabled}
          onClick={onToggle}
          className={`relative h-5 w-9 cursor-pointer rounded-full transition ${
            agent.enabled ? 'bg-primary' : 'bg-bg-tertiary'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              agent.enabled ? 'translate-x-4' : ''
            }`}
          />
        </div>

        <button
          onClick={onSetActive}
          disabled={isActive}
          className="flex items-center gap-1.5 rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-primary disabled:opacity-50"
        >
          {isActive ? t('agents.active') : t('agents.setActive')}
        </button>

        <div className="flex-1" />

        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
        >
          <Edit2 size={14} />
        </button>

        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// Create/Edit Dialog
function AgentDialog({
  agent,
  templates,
  onClose,
  onSave,
}: {
  agent?: AgentConfig
  templates: AgentTemplate[]
  onClose: () => void
  onSave: (agent: AgentConfig) => void
}) {
  const { t } = useTranslation()
  const isEditing = !!agent

  const [formData, setFormData] = useState<Partial<AgentConfig>>({
    name: agent?.name ?? '',
    runtime: agent?.runtime ?? 'acp',
    acpAgentId: agent?.acpAgentId ?? 'codex',
    acpCustomCommand: agent?.acpCustomCommand ?? '',
    bindingMode: agent?.bindingMode ?? 'current-chat',
    sessionMode: agent?.sessionMode ?? 'persistent',
    cwd: agent?.cwd ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    onSave({
      ...(agent ?? {
        id: '',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      ...formData,
      updatedAt: new Date().toISOString(),
    } as AgentConfig)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border-subtle bg-bg-secondary p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {isEditing ? t('agents.editAgent') : t('agents.createAgent')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-bg-tertiary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              required
            />
          </div>

          {/* Runtime */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.runtime')}</label>
            <div className="flex gap-2">
              {(['native', 'acp'] as const).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setFormData({ ...formData, runtime: rt })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    formData.runtime === rt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-subtle bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  {rt === 'acp' ? t('agents.runtimeACP') : t('agents.runtimeNative')}
                </button>
              ))}
            </div>
          </div>

          {/* ACP Agent Selection */}
          {formData.runtime === 'acp' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.acpAgent')}</label>
              <select
                value={formData.acpAgentId}
                onChange={(e) => setFormData({ ...formData, acpAgentId: e.target.value as ACPAgentId })}
                className="w-full rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.description}
                  </option>
                ))}
                <option value="custom">{t('agents.custom')}</option>
              </select>

              {formData.acpAgentId === 'custom' && (
                <input
                  type="text"
                  value={formData.acpCustomCommand}
                  onChange={(e) => setFormData({ ...formData, acpCustomCommand: e.target.value })}
                  placeholder={t('agents.customCommandPlaceholder')}
                  className="mt-2 w-full rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                />
              )}
            </div>
          )}

          {/* Binding Mode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.bindingMode')}</label>
            <div className="flex gap-2">
              {(['current-chat', 'new-thread'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({ ...formData, bindingMode: mode })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    formData.bindingMode === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-subtle bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  {mode === 'current-chat' ? t('agents.currentChat') : t('agents.newThread')}
                </button>
              ))}
            </div>
          </div>

          {/* Session Mode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.sessionMode')}</label>
            <div className="flex gap-2">
              {(['persistent', 'oneshot'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({ ...formData, sessionMode: mode })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    formData.sessionMode === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border-subtle bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  {mode === 'persistent' ? t('agents.persistent') : t('agents.oneshot')}
                </button>
              ))}
            </div>
          </div>

          {/* Working Directory */}
          {formData.runtime === 'acp' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">{t('agents.cwd')}</label>
              <input
                type="text"
                value={formData.cwd}
                onChange={(e) => setFormData({ ...formData, cwd: e.target.value })}
                placeholder={t('agents.cwdPlaceholder')}
                className="w-full rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Component
export function AgentsSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const agentsAPI = getAgentsAPI()
  const isDesktop = useIsDesktop()

  const [showCreate, setShowCreate] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsAPI?.getAgents() ?? Promise.resolve([]),
    enabled: !!agentsAPI,
  })

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['agent-templates'],
    queryFn: () => agentsAPI?.getAgentTemplates() ?? Promise.resolve([]),
    enabled: !!agentsAPI,
  })

  const { data: activeAgent } = useQuery({
    queryKey: ['active-agent'],
    queryFn: () => agentsAPI?.getActiveAgent() ?? Promise.resolve(null),
    enabled: !!agentsAPI,
  })

  const createMutation = useMutation({
    mutationFn: (config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) =>
      agentsAPI?.createAgent(config) ?? Promise.reject('Not in desktop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setShowCreate(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AgentConfig> }) =>
      agentsAPI?.updateAgent(id, updates) ?? Promise.reject('Not in desktop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setEditingAgent(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsAPI?.deleteAgent(id) ?? Promise.reject('Not in desktop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setDeleteConfirmId(null)
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: (id: string | null) => agentsAPI?.setActiveAgent(id) ?? Promise.reject('Not in desktop'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-agent'] }),
  })

  if (!isDesktop) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-secondary p-8 text-center">
        <Bot size={48} className="mx-auto mb-4 text-text-muted" />
        <h3 className="mb-2 text-lg font-semibold text-text-primary">{t('agents.desktopOnly')}</h3>
        <p className="text-sm text-text-muted">{t('agents.desktopOnlyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">{t('agents.title')}</h2>
          <p className="mt-1 text-sm text-text-muted">{t('agents.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus size={16} />
          {t('agents.addAgent')}
        </button>
      </div>

      {/* Active Agent */}
      {activeAgent && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-primary">
              {t('agents.activeAgent')}: {activeAgent.name}
            </span>
          </div>
        </div>      )}

      {/* Agent List */}
      {agentsLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-8 text-center">
          <Bot size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="mb-2 text-lg font-semibold text-text-primary">{t('agents.noAgents')}</h3>
          <p className="mb-4 text-sm text-text-muted">{t('agents.noAgentsDesc')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {t('agents.addFirstAgent')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={activeAgent?.id === agent.id}
              onEdit={() => setEditingAgent(agent)}
              onDelete={() => setDeleteConfirmId(agent.id)}
              onSetActive={() => setActiveMutation.mutate(agent.id)}
              onToggle={() => updateMutation.mutate({ id: agent.id, updates: { enabled: !agent.enabled } })}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <AgentDialog
          templates={templates}
          onClose={() => setShowCreate(false)}
          onSave={(agent) => createMutation.mutate(agent)}
        />
      )}

      {/* Edit Dialog */}
      {editingAgent && (
        <AgentDialog
          agent={editingAgent}
          templates={templates}
          onClose={() => setEditingAgent(null)}
          onSave={(agent) => updateMutation.mutate({ id: agent.id, updates: agent })}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteConfirmId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border-subtle bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-text-primary">{t('common.confirmDelete')}</h3>
            <p className="mb-4 text-sm text-text-muted">{t('agents.deleteConfirmDesc')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

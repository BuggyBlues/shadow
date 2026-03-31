import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  EyeOff,
  FolderPlus,
  Key,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Variable,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/stores/toast'

// ── Group Tabs ────────────────────────────────────────────────────────────────

function GroupTabs({
  groups,
  activeGroup,
  onSelect,
  onAddGroup,
}: {
  groups: string[]
  activeGroup: string
  onSelect: (group: string) => void
  onAddGroup: (name: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const handleAdd = () => {
    const name = newGroupName.trim()
    if (!name) return
    onAddGroup(name)
    setNewGroupName('')
    setShowAdd(false)
  }

  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-800 pb-2 flex-wrap">
      {groups.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onSelect(g)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            activeGroup === g
              ? 'bg-blue-600/20 text-blue-400 border border-blue-800'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
          )}
        >
          {g}
        </button>
      ))}
      {showAdd ? (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Group name"
            className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-28"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newGroupName.trim()}
            className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-1 disabled:text-gray-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAdd(false)
              setNewGroupName('')
            }}
            className="text-xs text-gray-500 hover:text-gray-300 px-1"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          title="New group"
        >
          <FolderPlus size={12} />
        </button>
      )}
    </div>
  )
}

// ── Provider Secrets Section ──────────────────────────────────────────────────

function SecretRow({
  providerId,
  secretKey,
  maskedValue,
  onDelete,
}: {
  providerId: string
  secretKey: string
  maskedValue: string
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-gray-950 rounded-lg">
      <Lock size={13} className="text-gray-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{providerId}</span>
          <span className="text-gray-700">/</span>
          <span className="text-xs font-mono text-gray-300">{secretKey}</span>
        </div>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{maskedValue}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="text-gray-600 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddSecretForm({
  onAdd,
  groupName,
}: {
  onAdd: (providerId: string, key: string, value: string, groupName: string) => void
  groupName: string
}) {
  const [providerId, setProviderId] = useState('')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [showValue, setShowValue] = useState(false)

  const handleSubmit = () => {
    if (!providerId.trim() || !key.trim() || !value.trim()) return
    onAdd(providerId.trim(), key.trim(), value.trim(), groupName)
    setProviderId('')
    setKey('')
    setValue('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
        <Plus size={12} />
        Add Secret
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          placeholder="Provider ID (e.g. openai)"
          className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Key (e.g. apiKey)"
          className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 pr-8"
            />
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!providerId.trim() || !key.trim() || !value.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-2 rounded text-xs transition-colors"
          >
            <Save size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Environment Variables Section ─────────────────────────────────────────────

function EnvVarRow({
  scope,
  envKey,
  maskedValue,
  isSecret,
  onDelete,
}: {
  scope: string
  envKey: string
  maskedValue: string
  isSecret: boolean
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-gray-950 rounded-lg">
      <Variable size={13} className="text-gray-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {scope}
          </span>
          <span className="text-xs font-mono text-gray-300">{envKey}</span>
          {isSecret && <Lock size={10} className="text-yellow-600" />}
        </div>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{maskedValue}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="text-gray-600 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddEnvVarForm({
  onAdd,
  groupName,
}: {
  onAdd: (scope: string, key: string, value: string, isSecret: boolean, groupName: string) => void
  groupName: string
}) {
  const [scope, setScope] = useState('global')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [isSecret, setIsSecret] = useState(true)
  const [showValue, setShowValue] = useState(false)

  const handleSubmit = () => {
    if (!key.trim() || value === undefined) return
    onAdd(scope.trim(), key.trim(), value, isSecret, groupName)
    setKey('')
    setValue('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
        <Plus size={12} />
        Add Environment Variable
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Scope (e.g. global, production)"
          className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="KEY_NAME"
          className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 pr-8"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
          >
            {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isSecret}
            onChange={(e) => setIsSecret(e.target.checked)}
            className="accent-blue-500"
          />
          Secret
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!key.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-2 rounded text-xs transition-colors"
        >
          <Save size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SecretsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [activeGroup, setActiveGroup] = useState('default')

  const { data: secretsData, isLoading: secretsLoading } = useQuery({
    queryKey: ['secrets'],
    queryFn: api.secrets.list,
  })

  const { data: envData, isLoading: envLoading } = useQuery({
    queryKey: ['env'],
    queryFn: api.env.list,
  })

  // Derive groups from data
  const allGroups = useMemo(() => {
    const groupSet = new Set<string>(['default'])
    for (const s of secretsData?.secrets ?? []) groupSet.add(s.groupName ?? 'default')
    for (const e of envData?.envVars ?? []) groupSet.add(e.groupName ?? 'default')
    return [...groupSet].sort((a, b) =>
      a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b),
    )
  }, [secretsData, envData])

  const upsertSecret = useMutation({
    mutationFn: ({
      providerId,
      key,
      value,
      groupName,
    }: {
      providerId: string
      key: string
      value: string
      groupName: string
    }) => api.secrets.upsert(providerId, key, value, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] })
      toast.success('Secret saved')
    },
    onError: () => toast.error('Failed to save secret'),
  })

  const deleteSecret = useMutation({
    mutationFn: ({ providerId, key }: { providerId: string; key: string }) =>
      api.secrets.delete(providerId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets'] })
      toast.success('Secret deleted')
    },
    onError: () => toast.error('Failed to delete secret'),
  })

  const upsertEnv = useMutation({
    mutationFn: ({
      scope,
      key,
      value,
      isSecret,
      groupName,
    }: {
      scope: string
      key: string
      value: string
      isSecret: boolean
      groupName: string
    }) => api.env.upsert(scope, key, value, isSecret, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env'] })
      toast.success('Variable saved')
    },
    onError: () => toast.error('Failed to save variable'),
  })

  const deleteEnv = useMutation({
    mutationFn: ({ scope, key }: { scope: string; key: string }) => api.env.delete(scope, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env'] })
      toast.success('Variable deleted')
    },
    onError: () => toast.error('Failed to delete variable'),
  })

  const secrets = (secretsData?.secrets ?? []).filter(
    (s) => (s.groupName ?? 'default') === activeGroup,
  )
  const envVars = (envData?.envVars ?? []).filter((e) => (e.groupName ?? 'default') === activeGroup)

  const handleAddGroup = (name: string) => {
    // Group is implicitly created when first secret/env var is added to it
    setActiveGroup(name)
    toast.info(`Switch to group "${name}" — add secrets to create it`)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck size={20} className="text-blue-400" />
          {t('secrets.title')}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('secrets.description')}</p>
      </div>

      {/* Encryption Status Banner */}
      <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-3 mb-5 flex items-center gap-3">
        <div className="bg-green-900/40 rounded-full p-1.5">
          <ShieldCheck size={14} className="text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-green-300">{t('secrets.encryptionActive')}</p>
          <p className="text-[10px] text-green-600 mt-0.5">
            {t('secrets.allSecretsEncrypted')} {t('secrets.setPassphraseEnv')}{' '}
            <code className="bg-green-900/30 px-1 rounded">SHADOWOB_PASSPHRASE</code>{' '}
            {t('secrets.envVarToUseCustom')}
          </p>
        </div>
        <span className="text-[10px] text-green-700 px-2 py-0.5 bg-green-900/30 rounded-full border border-green-900/50">
          {(secretsData?.secrets?.length ?? 0) + (envData?.envVars?.length ?? 0)} encrypted values
        </span>
      </div>

      {/* Group tabs */}
      <GroupTabs
        groups={allGroups}
        activeGroup={activeGroup}
        onSelect={setActiveGroup}
        onAddGroup={handleAddGroup}
      />

      {/* Provider Secrets */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Key size={14} />
          Provider Secrets
          <span className="text-xs text-gray-600 font-normal">({activeGroup})</span>
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          API keys and credentials for LLM providers. Encrypted at rest with passphrase-derived key.
        </p>

        <AddSecretForm
          groupName={activeGroup}
          onAdd={(providerId, key, value, groupName) =>
            upsertSecret.mutate({ providerId, key, value, groupName })
          }
        />

        <div className="mt-3 space-y-1.5">
          {secretsLoading && (
            <div className="text-center py-4 text-xs text-gray-600">Loading secrets...</div>
          )}
          {!secretsLoading && secrets.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-600 border border-dashed border-gray-800 rounded-lg">
              No secrets in group "{activeGroup}" yet.
            </div>
          )}
          {secrets.map((s) => (
            <SecretRow
              key={`${s.providerId}-${s.key}`}
              providerId={s.providerId}
              secretKey={s.key}
              maskedValue={s.maskedValue}
              onDelete={() => deleteSecret.mutate({ providerId: s.providerId, key: s.key })}
            />
          ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <Variable size={14} />
          Environment Variables
          <span className="text-xs text-gray-600 font-normal">({activeGroup})</span>
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          Global and scoped environment variables injected into deployments.
        </p>

        <AddEnvVarForm
          groupName={activeGroup}
          onAdd={(scope, key, value, isSecret, groupName) =>
            upsertEnv.mutate({ scope, key, value, isSecret, groupName })
          }
        />

        <div className="mt-3 space-y-1.5">
          {envLoading && (
            <div className="text-center py-4 text-xs text-gray-600">Loading variables...</div>
          )}
          {!envLoading && envVars.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-600 border border-dashed border-gray-800 rounded-lg">
              No environment variables in group "{activeGroup}" yet.
            </div>
          )}
          {envVars.map((v) => (
            <EnvVarRow
              key={`${v.scope}-${v.key}`}
              scope={v.scope}
              envKey={v.key}
              maskedValue={v.maskedValue}
              isSecret={v.isSecret}
              onDelete={() => deleteEnv.mutate({ scope: v.scope, key: v.key })}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

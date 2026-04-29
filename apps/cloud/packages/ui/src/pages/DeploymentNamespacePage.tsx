import {
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Box,
  CheckCircle,
  DollarSign,
  Download,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Terminal,
  Trash2,
  Variable,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Breadcrumb } from '@/components/Breadcrumb'
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog'
import { DashboardEmptyState } from '@/components/DashboardEmptyState'
import { DashboardTabsList } from '@/components/DashboardTabsList'
import { EnvVarEditorDialog } from '@/components/EnvVarEditorDialog'
import { LogsPanel } from '@/components/LogsPanel'
import { MetricCardContent, MetricCardWrapper } from '@/components/MetricCard'
import { PageShell } from '@/components/PageShell'
import { StatsGrid } from '@/components/StatsGrid'
import { StatusBadge } from '@/components/StatusBadge'
import { ToolbarActionButton } from '@/components/ToolbarActionButton'
import { useSSEStream } from '@/hooks/useSSEStream'
import {
  type Deployment,
  type EnvVarListEntry,
  type Pod,
  type ProviderUsageSummary,
} from '@/lib/api'
import { useApiClient } from '@/lib/api-context'
import { formatDisplayCost, formatTokenCount, formatUsdCost } from '@/lib/store-data'
import { cn, formatTimestamp, getAge, isDeploymentReady } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/stores/toast'

function getPodStatusType(status: string): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'Running') return 'success'
  if (status === 'Pending') return 'warning'
  if (status === 'Failed') return 'error'
  if (status === 'Succeeded') return 'info'
  return 'warning'
}

function formatTokenLabel(value: number | null, locale: string, tokenLabel: string): string {
  if (value === null) return '—'
  return `${formatTokenCount(value, locale)} ${tokenLabel}`
}

function getProviderMetricDisplay(
  provider: ProviderUsageSummary,
  options: {
    billingUnit: 'usd' | 'shrimp'
    locale: string
    tokenLabel: string
  },
): { primary: string; secondary: string | null } {
  const tokenText =
    provider.totalTokens !== null
      ? formatTokenLabel(provider.totalTokens, options.locale, options.tokenLabel)
      : null
  const usageText = provider.usageLabel ?? provider.raw ?? null

  if (options.billingUnit === 'shrimp') {
    return {
      primary: tokenText ?? usageText ?? '—',
      secondary: usageText && usageText !== tokenText ? usageText : null,
    }
  }

  const usdText = formatUsdCost(provider.amountUsd, options.locale)
  return {
    primary: usdText,
    secondary: tokenText ?? usageText,
  }
}

function PodsPanel({
  namespace,
  agent,
  enabled,
}: {
  namespace: string
  agent: string | null
  enabled: boolean
}) {
  const api = useApiClient()
  const { t } = useTranslation()
  const { data: pods, isLoading } = useQuery({
    queryKey: ['pods', namespace, agent],
    queryFn: () => api.deployments.pods(namespace, agent ?? ''),
    enabled: enabled && Boolean(agent),
    refetchInterval: 10_000,
  })

  if (!agent) {
    return <DashboardEmptyState icon={Box} title={t('deployments.noAgentSelected')} />
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center text-text-muted text-sm">
        <Loader2 size={16} className="animate-spin inline mr-2" />
        {t('common.loading')}
      </div>
    )
  }

  if (!pods || pods.length === 0) {
    return <DashboardEmptyState icon={Box} title={t('deployments.noPodsForAgent', { agent })} />
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {t('deployments.selectedPodsCount', { count: pods.length })}
      </p>

      <Card variant="glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                {t('clusters.status')}
              </TableHead>
              <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                {t('monitoring.name')}
              </TableHead>
              <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                {t('deployments.restarts')}
              </TableHead>
              <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                {t('deployments.age')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pods.map((pod) => (
              <TableRow key={pod.name}>
                <TableCell>
                  <StatusBadge
                    dotStatus={getPodStatusType(pod.status)}
                    dotLabel={pod.status}
                    badgeVariant={pod.status === 'Running' ? 'success' : 'warning'}
                    badgeText={pod.status}
                  />
                </TableCell>
                <TableCell>{pod.name}</TableCell>
                <TableCell>{pod.restarts}</TableCell>
                <TableCell>{getAge(pod.age)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function NamespaceLogsTab({
  namespace,
  agent,
  deployments,
  onSelectAgent,
}: {
  namespace: string
  agent: string | null
  deployments: Deployment[]
  onSelectAgent: (agent: string) => void
}) {
  const api = useApiClient()
  const { t } = useTranslation()
  const logRef = useRef<HTMLDivElement>(null)
  const { lines, status, error, connect, disconnect, clear } = useSSEStream({
    maxLines: 4000,
  })
  const [logMode, setLogMode] = useState<'recent' | 'live'>('recent')
  const isLiveMode = logMode === 'live'

  const {
    data: history,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['deployment-log-history', namespace, logMode],
    queryFn: () => api.deployments.logsHistory(namespace, ''),
    enabled: logMode === 'recent' && deployments.length > 0,
  })

  useEffect(() => {
    disconnect()
    clear()
  }, [agent, namespace, disconnect, clear])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [lines.length])

  const connected = status === 'connecting' || status === 'connected'
  const liveLines = useMemo(
    () => lines.map((line) => (line.startsWith('i18n:') ? t(line.slice(5)) : line)),
    [lines, t],
  )
  const handleConnect = () => {
    if (!agent) return
    connect(api.deployments.logsUrl(namespace, agent))
  }

  const handleDownload = () => {
    const historyLines = history?.lines ?? []
    const content =
      logMode === 'recent'
        ? historyLines.join('\n')
        : [...historyLines, '', '--- LIVE ---', ...liveLines].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${namespace}-${agent ?? 'logs'}-${Date.now()}.log`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (deployments.length === 0) {
    return (
      <DashboardEmptyState
        icon={FileText}
        title={t('deployments.noDeploymentsInNamespace')}
        description={t('deployments.noDeploymentsInNamespaceDescription', { namespace })}
      />
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="shrink-0">
          <Tabs value={logMode} onChange={(value) => setLogMode(value as 'recent' | 'live')}>
            <DashboardTabsList
              className="w-fit"
              tabs={[
                { id: 'recent', label: t('deployments.recentLogs') },
                { id: 'live', label: t('deployments.liveLogs') },
              ]}
            />
          </Tabs>
        </div>

        <div className="ml-auto flex shrink-0 flex-col justify-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isLiveMode ? (
              <Select
                value={agent ?? ''}
                onValueChange={(value) => {
                  onSelectAgent(value)
                }}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder={t('deployments.agentSelector')} />
                </SelectTrigger>
                <SelectContent>
                  {deployments.map((deployment) => (
                    <SelectItem
                      key={`${deployment.namespace}/${deployment.name}`}
                      value={deployment.name}
                    >
                      {deployment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {!isLiveMode ? (
              <ToolbarActionButton
                type="button"
                onClick={() => refetch()}
                variant="ghost"
                icon={<RefreshCw size={12} />}
                label={t('common.refresh')}
              />
            ) : null}

            <ToolbarActionButton
              type="button"
              onClick={handleDownload}
              variant="ghost"
              icon={<Download size={12} />}
              label={t('deploy.download')}
            />
          </div>
        </div>
      </div>

      {logMode === 'recent' ? (
        <LogsPanel
          headerLeft={
            <>
              <span className="font-medium text-text-secondary">{namespace}</span>
              {history?.podName ? <span> · {history.podName}</span> : null}
            </>
          }
          lines={isLoading ? [] : (history?.lines ?? [])}
          emptyText={isLoading ? t('common.loading') : t('deployments.noLogsYet')}
          bodyClassName="h-80 max-h-80 min-h-80 overflow-auto"
        />
      ) : (
        <>
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <LogsPanel
            headerLeft={`${namespace}/${agent}`}
            headerRight={
              <>
                {(liveLines.length > 0 || connected) && (
                  <Button
                    type="button"
                    onClick={() => {
                      disconnect()
                      clear()
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    {t('common.clearAll')}
                  </Button>
                )}
                <ToolbarActionButton
                  type="button"
                  onClick={handleConnect}
                  variant={connected ? 'secondary' : 'primary'}
                  icon={<RefreshCw size={12} className={connected ? 'animate-spin' : ''} />}
                  label={connected ? t('deployments.streaming') : t('deployments.connectLogs')}
                />
              </>
            }
            lines={liveLines}
            emptyText={
              connected ? t('deployments.waitingForLogs') : t('deployments.connectLiveLogs')
            }
            bodyRef={logRef}
            bodyClassName="h-80 max-h-80 min-h-80 overflow-auto"
          />
        </>
      )}
    </div>
  )
}

function NamespaceEnvironmentTab({ namespace }: { namespace: string }) {
  const api = useApiClient()
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [editEntry, setEditEntry] = useState<{
    key: string
    value: string
    isSecret: boolean
  } | null>(null)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)

  const scopedQuery = useQuery({
    queryKey: ['deployment-env', namespace, 'scoped'],
    queryFn: () => api.deployments.env.list(namespace, 'scoped'),
  })

  const effectiveQuery = useQuery({
    queryKey: ['deployment-env', namespace, 'effective'],
    queryFn: () => api.deployments.env.list(namespace, 'effective'),
  })

  const scopedEntries = scopedQuery.data?.envVars ?? []
  const fallbackEntries = useMemo(() => {
    const scopedScope = scopedQuery.data?.scope
    return (effectiveQuery.data?.envVars ?? []).filter((entry) => entry.scope !== scopedScope)
  }, [effectiveQuery.data?.envVars, scopedQuery.data?.scope])

  const saveMutation = useMutation({
    mutationFn: async (form: { key: string; value: string; isSecret: boolean }) => {
      await api.deployments.env.upsert(namespace, form.key, form.value, form.isSecret)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['deployment-env', namespace],
      })
      setDialogMode(null)
      setEditEntry(null)
      toast.success(t('secrets.valueSaved'))
    },
    onError: () => toast.error(t('secrets.valueSaveFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api.deployments.env.delete(namespace, key),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['deployment-env', namespace],
      })
      setDeleteKey(null)
      toast.success(t('secrets.valueDeleted'))
    },
    onError: () => toast.error(t('secrets.valueDeleteFailed')),
  })

  const handleEditStart = async (entry: EnvVarListEntry) => {
    try {
      const { envVar } = await api.deployments.env.getOne(namespace, entry.key)
      setEditEntry({
        key: envVar.key,
        value: envVar.value,
        isSecret: envVar.isSecret,
      })
      setDialogMode('edit')
    } catch {
      toast.error(t('secrets.valueLoadFailed'))
    }
  }

  if (scopedQuery.isLoading || effectiveQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-14 text-text-muted text-sm">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {t('deployments.scopedEnvTitle')}
            </h3>
            <p className="text-xs text-text-muted">{t('deployments.scopedEnvDescription')}</p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditEntry(null)
              setDialogMode('create')
            }}
            variant="primary"
            size="sm"
            className="transition-[background-color,border-color,color,box-shadow,transform] duration-[160ms] ease active:translate-y-[0.5px] focus-visible:outline-none"
          >
            <Plus size={11} />
            {t('common.add')}
          </Button>
        </div>

        {scopedEntries.length === 0 ? (
          <DashboardEmptyState icon={Variable} title={t('deployments.noScopedEnv')} />
        ) : (
          <Card variant="glass">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.keyName')}
                  </TableHead>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.secretValue')}
                  </TableHead>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.secret')}
                  </TableHead>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('common.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell>{entry.key}</TableCell>
                    <TableCell>{entry.maskedValue}</TableCell>
                    <TableCell>
                      {entry.isSecret ? (
                        <Badge variant="warning" size="sm">
                          {t('secrets.secret')}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          {t('deployments.plainText')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          onClick={() => void handleEditStart(entry)}
                          variant="ghost"
                          size="icon"
                          className="transition-[background-color,border-color,color,box-shadow,transform] duration-[160ms] ease active:translate-y-[0.5px] focus-visible:outline-none"
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setDeleteKey(entry.key)}
                          variant="ghost"
                          size="icon"
                          className="transition-[background-color,border-color,color,box-shadow,transform] duration-[160ms] ease active:translate-y-[0.5px] focus-visible:outline-none"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          {t('deployments.fallbackEnvTitle')}
        </h3>
        <p className="text-xs text-text-muted mb-3">{t('deployments.fallbackEnvDescription')}</p>

        {fallbackEntries.length === 0 ? (
          <DashboardEmptyState icon={Variable} title={t('deployments.noFallbackEnv')} />
        ) : (
          <Card variant="glass">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.keyName')}
                  </TableHead>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.secretValue')}
                  </TableHead>
                  <TableHead className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                    {t('secrets.scope')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fallbackEntries.map((entry) => (
                  <TableRow key={`${entry.scope}-${entry.key}`}>
                    <TableCell>{entry.key}</TableCell>
                    <TableCell>{entry.maskedValue}</TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {entry.scope === 'global'
                          ? t('deployments.globalFallback')
                          : t('deployments.namespaceScoped')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {dialogMode && (
        <EnvVarEditorDialog
          mode={dialogMode}
          initial={editEntry ?? undefined}
          isSubmitting={saveMutation.isPending}
          titleCreate={t('deployments.addScopedEnv')}
          titleEdit={t('deployments.editScopedEnv')}
          subtitleCreate={t('deployments.scopedEnvDescription')}
          subtitleEdit={t('deployments.scopedEnvDescription')}
          onSubmit={(form) => saveMutation.mutate(form)}
          onClose={() => {
            setDialogMode(null)
            setEditEntry(null)
          }}
        />
      )}

      <DangerConfirmDialog
        open={Boolean(deleteKey)}
        onOpenChange={(open) => {
          if (!open) setDeleteKey(null)
        }}
        title={t('common.delete')}
        description={deleteKey ? t('deployments.deleteScopedEnvConfirm', { key: deleteKey }) : ''}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteKey) {
            deleteMutation.mutate(deleteKey)
          }
        }}
      />
    </div>
  )
}

function NamespaceCostTab({ namespace }: { namespace: string }) {
  const api = useApiClient()
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['namespace-costs', namespace],
    queryFn: () => api.deployments.namespaceCosts(namespace),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14 text-text-muted text-sm">
        <Loader2 size={16} className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    )
  }

  if (!data) {
    return (
      <DashboardEmptyState
        icon={DollarSign}
        title={t('deployments.costUnavailable')}
        description={t('deployments.costUnavailableDescription')}
      />
    )
  }

  const translateCostMessage = (message: string) =>
    message.startsWith('i18n:') ? t(message.slice(5)) : message

  return (
    <div className="space-y-6">
      <StatsGrid className="mb-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <MetricCardWrapper>
          <MetricCardContent
            label={t('deployments.tokenCost')}
            value={formatUsdCost(data.totalUsd, i18n.language)}
            icon={<DollarSign size={13} />}
            iconClassName="text-success"
            valueClassName="text-success"
          />
        </MetricCardWrapper>
        <MetricCardWrapper>
          <MetricCardContent
            label={t('deployments.totalTokens')}
            value={formatTokenCount(data.totalTokens, i18n.language)}
            icon={<Terminal size={13} />}
            iconClassName="text-accent"
            valueClassName="text-accent"
          />
        </MetricCardWrapper>
        <MetricCardWrapper>
          <MetricCardContent
            label={t('deployments.availableAgents')}
            value={data.availableAgents}
            icon={<CheckCircle size={13} />}
            iconClassName="text-primary"
            valueClassName="text-primary"
          />
        </MetricCardWrapper>
        <MetricCardWrapper>
          <MetricCardContent
            label={t('deployments.unavailableAgents')}
            value={data.unavailableAgents}
            icon={<XCircle size={13} />}
            iconClassName={data.unavailableAgents > 0 ? 'text-warning' : 'text-text-muted'}
            valueClassName={data.unavailableAgents > 0 ? 'text-warning' : 'text-text-muted'}
          />
        </MetricCardWrapper>
      </StatsGrid>

      <div className="text-xs text-text-muted">
        {t('deployments.generatedAt')}: {formatTimestamp(data.generatedAt)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.agents.map((agent) => (
          <Card variant="glass" key={agent.agentName} className="min-w-0 p-5">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-text-primary">{agent.agentName}</p>
                  <Badge variant={agent.totalUsd !== null ? 'success' : 'neutral'} size="sm">
                    {agent.source}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">{agent.podName ?? t('common.none')}</p>
              </div>
              <div className="min-w-0 text-left md:max-w-[14rem] md:text-right">
                <p className="break-words text-lg font-semibold leading-tight text-success">
                  {formatDisplayCost(agent, {
                    locale: i18n.language,
                    shrimpUnitLabel: t('deploy.shrimpCoins'),
                  })}
                </p>
                <p className="text-xs text-text-muted">{t('deployments.totalCost')}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {formatTokenLabel(agent.totalTokens, i18n.language, t('deployments.tokens'))}
                </p>
              </div>
            </div>

            {agent.providers.length > 0 ? (
              <div className="space-y-2">
                {agent.providers.map((provider) => {
                  const providerDisplay = getProviderMetricDisplay(provider, {
                    billingUnit: data.billingUnit,
                    locale: i18n.language,
                    tokenLabel: t('deployments.tokens'),
                  })

                  return (
                    <div
                      key={`${agent.agentName}-${provider.provider}`}
                      className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="text-text-secondary">{provider.provider}</span>
                      <div className="min-w-0 text-left sm:text-right">
                        <p className="break-words text-text-secondary">{providerDisplay.primary}</p>
                        {providerDisplay.secondary ? (
                          <p className="break-words text-text-muted">{providerDisplay.secondary}</p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t('deployments.noProvidersReported')}</p>
            )}

            {agent.message && (
              <p className="text-xs text-warning mt-3">{translateCostMessage(agent.message)}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function NamespaceInfoTab({
  namespace,
  agent,
  deployments,
  pods,
}: {
  namespace: string
  agent: string | null
  deployments: Deployment[]
  pods: Pod[] | undefined
}) {
  const { t } = useTranslation()
  const readyAgents = deployments.filter((deployment) => isDeploymentReady(deployment.ready)).length
  const totalRestarts = pods?.reduce((sum, pod) => sum + Number(pod.restarts), 0) ?? 0

  return (
    <div className="space-y-6">
      <Card variant="glass" className="overflow-hidden p-0">
        <div className="px-5 py-3 flex items-center justify-between border-b border-border-subtle">
          <span className="text-xs text-text-muted">{t('deployments.namespaceLabel')}</span>
          <span className="text-sm font-mono text-text-secondary">{namespace}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-border-subtle">
          <span className="text-xs text-text-muted">{t('deployments.agents')}</span>
          <span className="text-sm text-text-secondary">{deployments.length}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-border-subtle">
          <span className="text-xs text-text-muted">{t('deployments.readyAgents')}</span>
          <span className="text-sm text-success">{readyAgents}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-border-subtle">
          <span className="text-xs text-text-muted">{t('deployments.currentAgent')}</span>
          <span className="text-sm font-mono text-text-secondary">{agent ?? t('common.none')}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between border-b border-border-subtle">
          <span className="text-xs text-text-muted">{t('deployments.selectedPods')}</span>
          <span className="text-sm text-text-secondary">{pods?.length ?? 0}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-text-muted">{t('deployments.totalRestarts')}</span>
          <span
            className={cn('text-sm', totalRestarts > 0 ? 'text-warning' : 'text-text-secondary')}
          >
            {totalRestarts}
          </span>
        </div>
      </Card>
    </div>
  )
}

export function DeploymentNamespacePage() {
  const api = useApiClient()
  const { t, i18n } = useTranslation()
  const { namespace } = useParams({ strict: false }) as { namespace: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const addActivity = useAppStore((state) => state.addActivity)
  const [activeTab, setActiveTab] = useState('agents')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [destroyOpen, setDestroyOpen] = useState(false)

  const {
    data: deployments,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['deployments'],
    queryFn: api.deployments.list,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const namespaceDeployments = useMemo(() => {
    return (deployments ?? [])
      .filter((deployment) => deployment.namespace === namespace)
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [deployments, namespace])

  useEffect(() => {
    if (namespaceDeployments.length === 0) {
      setSelectedAgent(null)
      return
    }
    setSelectedAgent((current) => {
      if (current && namespaceDeployments.some((deployment) => deployment.name === current)) {
        return current
      }
      return namespaceDeployments[0]?.name ?? null
    })
  }, [namespaceDeployments])

  const selectedPodsQuery = useQuery({
    queryKey: ['pods', namespace, selectedAgent],
    queryFn: () => api.deployments.pods(namespace, selectedAgent ?? ''),
    enabled: Boolean(selectedAgent),
    refetchInterval: 10_000,
  })

  const namespaceCostQuery = useQuery({
    queryKey: ['namespace-costs', namespace],
    queryFn: () => api.deployments.namespaceCosts(namespace),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const deployTasksQuery = useQuery({
    queryKey: ['deploy-tasks'],
    queryFn: api.deployTasks.list,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const latestTask = useMemo(() => {
    return (deployTasksQuery.data?.tasks ?? [])
      .filter((item) => item.task.namespace === namespace)
      .sort((left, right) => {
        const leftTime = Date.parse(left.task.createdAt ?? left.task.updatedAt ?? '') || 0
        const rightTime = Date.parse(right.task.createdAt ?? right.task.updatedAt ?? '') || 0
        return rightTime - leftTime
      })[0]
  }, [deployTasksQuery.data?.tasks, namespace])

  const redeployMutation = useMutation({
    mutationFn: async () => {
      if (!latestTask) return null
      return api.deployTasks.redeployToTaskId(latestTask.task.id)
    },
    onSuccess: (nextTaskId) => {
      if (!nextTaskId) {
        toast.error(t('deployments.noTaskToRedeploy'))
        return
      }
      queryClient.invalidateQueries({ queryKey: ['deploy-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      navigate({ to: '/deploy-tasks/$taskId', params: { taskId: String(nextTaskId) } })
    },
    onError: () => toast.error(t('deployments.redeployFailed')),
  })

  const destroyMutation = useMutation({
    mutationFn: () => api.destroy({ namespace }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      queryClient.invalidateQueries({ queryKey: ['deploy-tasks'] })
      toast.success(t('deployments.destroyQueued', { namespace }))
      addActivity({
        type: 'destroy',
        title: t('deploymentDetail.destroyQueuedActivityTitle', { namespace }),
        namespace,
      })
      if (result.taskId) {
        navigate({ to: '/deploy-tasks/$taskId', params: { taskId: String(result.taskId) } })
      } else {
        navigate({ to: '/deployments' })
      }
    },
    onError: () => toast.error(t('deployments.destroyNamespaceFailed')),
  })

  const readyAgents = namespaceDeployments.filter((deployment) =>
    isDeploymentReady(deployment.ready),
  ).length
  const selectedPods = selectedPodsQuery.data ?? []

  const tabs = [
    {
      id: 'agents',
      label: t('deployments.agents'),
      icon: <Box size={13} />,
      count: namespaceDeployments.length,
    },
    {
      id: 'logs',
      label: t('deployments.tabLogs'),
      icon: <FileText size={13} />,
    },
    { id: 'env', label: t('deployments.tabEnv'), icon: <Variable size={13} /> },
    {
      id: 'cost',
      label: t('deployments.costTab'),
      icon: <DollarSign size={13} />,
    },
    { id: 'info', label: t('deployments.tabInfo'), icon: <Info size={13} /> },
  ]

  if (!isLoading && namespaceDeployments.length === 0) {
    return (
      <PageShell
        breadcrumb={[{ label: t('deployments.title'), to: '/deployments' }, { label: namespace }]}
        title={namespace}
        actions={
          <Button asChild variant="primary" size="sm">
            <Link to="/store">
              <Rocket size={14} />
              {t('clusters.browseAgentStore')}
            </Link>
          </Button>
        }
        narrow
      >
        <DashboardEmptyState
          icon={FolderOpen}
          title={t('deployments.noDeploymentsInNamespace')}
          description={t('deployments.noDeploymentsInNamespaceDescription', {
            namespace,
          })}
          action={null}
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      breadcrumb={[]}
      title=""
      description={null}
      headerContent={
        <>
          <div className="mb-3">
            <Breadcrumb
              items={[{ label: t('deployments.title'), to: '/deployments' }, { label: namespace }]}
            />
          </div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-[1.875rem] font-extrabold tracking-[-0.03em] text-text-primary md:text-[2.125rem]">
              {namespace}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  void refetch()
                  void queryClient.invalidateQueries({
                    queryKey: ['namespace-costs', namespace],
                  })
                }}
                variant="ghost"
                size="sm"
              >
                <RefreshCw size={12} />
                {t('common.refresh')}
              </Button>
              <Button
                type="button"
                onClick={() => redeployMutation.mutate()}
                disabled={!latestTask || redeployMutation.isPending}
                variant="primary"
                size="sm"
              >
                {redeployMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Rocket size={12} />
                )}
                {t('deployTask.redeploy')}
              </Button>
              <Button type="button" onClick={() => setDestroyOpen(true)} variant="ghost" size="sm">
                <Trash2 size={12} />
                {t('clusters.destroy')}
              </Button>
            </div>
          </div>
          <StatsGrid className="mb-4 md:mb-5 grid-cols-2 md:grid-cols-4">
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployments.agents')}
                value={namespaceDeployments.length}
                icon={<Box size={13} />}
                iconClassName="text-text-primary"
                valueClassName="text-text-primary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployments.readyAgents')}
                value={readyAgents}
                icon={<CheckCircle size={13} />}
                iconClassName="text-success"
                valueClassName="text-success"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployments.selectedPods')}
                value={selectedPods.length}
                icon={<Server size={13} />}
                iconClassName="text-primary"
                valueClassName="text-primary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployments.tokenCost')}
                value={formatUsdCost(namespaceCostQuery.data?.totalUsd ?? null, i18n.language)}
                icon={<DollarSign size={13} />}
                iconClassName="text-accent"
                valueClassName="text-accent"
              />
            </MetricCardWrapper>
          </StatsGrid>

          <div className="mt-1">
            <Tabs value={activeTab} onChange={setActiveTab}>
              <DashboardTabsList tabs={tabs} />
            </Tabs>
          </div>
        </>
      }
      narrow
    >
      <div className="space-y-6">
        <div className="min-h-[38vh]">
          {activeTab === 'agents' && (
            <PodsPanel namespace={namespace} agent={selectedAgent} enabled={!isLoading} />
          )}
          {activeTab === 'logs' && (
            <NamespaceLogsTab
              namespace={namespace}
              agent={selectedAgent}
              deployments={namespaceDeployments}
              onSelectAgent={setSelectedAgent}
            />
          )}
          {activeTab === 'env' && <NamespaceEnvironmentTab namespace={namespace} />}
          {activeTab === 'cost' && <NamespaceCostTab namespace={namespace} />}
          {activeTab === 'info' && (
            <NamespaceInfoTab
              namespace={namespace}
              agent={selectedAgent}
              deployments={namespaceDeployments}
              pods={selectedPodsQuery.data}
            />
          )}
        </div>
      </div>

      <DangerConfirmDialog
        open={destroyOpen}
        onOpenChange={setDestroyOpen}
        title={t('clusters.destroyNamespace')}
        description={t('clusters.destroyWarning', { namespace })}
        confirmText={destroyMutation.isPending ? t('clusters.destroying') : t('clusters.destroy')}
        cancelText={t('common.cancel')}
        loading={destroyMutation.isPending}
        onConfirm={() => destroyMutation.mutate()}
      />
    </PageShell>
  )
}

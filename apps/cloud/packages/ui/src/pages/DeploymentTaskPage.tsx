import { Badge, Button, Checkbox } from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog'
import { DashboardEmptyState } from '@/components/DashboardEmptyState'
import { DashboardErrorState, DashboardLoadingState } from '@/components/DashboardState'
import { LogsPanel } from '@/components/LogsPanel'
import { MetricCardContent, MetricCardWrapper } from '@/components/MetricCard'
import { PageShell } from '@/components/PageShell'
import { StatsGrid } from '@/components/StatsGrid'
import { ToolbarActionButton } from '@/components/ToolbarActionButton'
import { useSSEStream } from '@/hooks/useSSEStream'
import { useApiClient } from '@/lib/api-context'
import { canRequestTaskCancel, isTaskActive } from '@/lib/deploy-task-state'
import { cn, formatTimestamp } from '@/lib/utils'
import { useToast } from '@/stores/toast'

function getStatusVariant(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'deployed' || status === 'destroyed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running' || status === 'deploying' || status === 'destroying') return 'info'
  if (status === 'pending' || status === 'cancelling') return 'warning'
  return 'neutral'
}

export function DeploymentTaskPage() {
  const api = useApiClient()
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const params = useParams({ strict: false }) as { taskId: string }
  const taskId = params.taskId
  const logRef = useRef<HTMLDivElement>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const shouldAutoScrollLogRef = useRef(true)
  const [showLogTimestamps, setShowLogTimestamps] = useState(false)
  const {
    lines,
    entries: logLines,
    status: streamStatus,
    error,
    connect,
  } = useSSEStream({
    maxLines: 4000,
  })

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['deploy-task', taskId],
    queryFn: () => api.deployTasks.get(taskId),
    enabled: taskId.trim().length > 0,
    refetchInterval: 2_000,
  })

  const task = data?.task
  const taskCanRequestCancel = canRequestTaskCancel(task?.status)
  const taskUrl = useMemo(() => {
    const url = data?.url
    if (!url) return ''
    return new URL(url, window.location.origin).toString()
  }, [data?.url])

  useEffect(() => {
    if (taskId.trim().length === 0) return
    connect(api.deployTasks.streamUrl(taskId))
  }, [taskId, connect])

  useEffect(() => {
    if (!taskCanRequestCancel) setCancelConfirmOpen(false)
  }, [taskCanRequestCancel])

  const handleLogScroll = () => {
    if (!logRef.current) return
    const distanceFromBottom =
      logRef.current.scrollHeight - logRef.current.scrollTop - logRef.current.clientHeight
    shouldAutoScrollLogRef.current = distanceFromBottom < 64
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll reset should match new taskId
  useEffect(() => {
    shouldAutoScrollLogRef.current = true
  }, [taskId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll on stream state changes
  useEffect(() => {
    if (streamStatus === 'done' || streamStatus === 'error') {
      shouldAutoScrollLogRef.current = true
    }
  }, [streamStatus])

  const handleDownloadLog = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deploy-task-${taskId}-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new log lines
  useEffect(() => {
    if (logRef.current && shouldAutoScrollLogRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [lines.length])

  const cancelMutation = useMutation({
    mutationFn: () => api.deployTasks.cancel(taskId),
    onSuccess: async () => {
      setCancelConfirmOpen(false)
      toast.warning(t('deployTask.cancelRequested'))
      await queryClient.invalidateQueries({ queryKey: ['deploy-task', taskId] })
      await queryClient.invalidateQueries({ queryKey: ['deploy-tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['deployments'] })
    },
    onError: () => {
      toast.error(t('deployTask.cancelFailed'))
    },
  })

  if (taskId.trim().length === 0) {
    return (
      <div className="p-6">
        <DashboardEmptyState
          icon={XCircle}
          title={t('deployTask.taskNotFound')}
          description={t('deployTask.invalidTaskId')}
        />
      </div>
    )
  }

  if (isLoading) {
    return <DashboardLoadingState inline />
  }

  if (queryError || !task) {
    return (
      <PageShell
        breadcrumb={[{ label: t('deployTask.title') }]}
        breadcrumbPosition="inside"
        narrow
        title={t('deployTask.title')}
        description={t('deployTask.taskNotFoundDescription')}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/store">
              <FolderOpen size={14} />
              {t('deployTask.backToStore')}
            </Link>
          </Button>
        }
      >
        <DashboardErrorState icon={XCircle} title={t('deployTask.taskNotFound')} />
      </PageShell>
    )
  }

  const running = isTaskActive(task.status)
  const success = task.status === 'deployed' || task.status === 'destroyed'
  const failed = task.status === 'failed'
  const cancellable = taskCanRequestCancel
  const blockedByStatus = task.blockedBy ? t(`deployTask.statuses.${task.blockedBy.status}`) : ''

  return (
    <PageShell
      breadcrumb={[{ label: t('nav.deployments'), to: '/deployments' }, { label: `#${task.id}` }]}
      breadcrumbPosition="inside"
      narrow
      title={
        <div className="flex items-center gap-3">
          {t('deployTask.title')}
          <Badge variant={getStatusVariant(task.status)} size="sm">
            {t(`deployTask.statuses.${task.status}`)}
          </Badge>
        </div>
      }
      description={t('deployTask.description')}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <ToolbarActionButton
            type="button"
            onClick={() => refetch()}
            variant="ghost"
            icon={<RefreshCw size={12} className={running ? 'animate-spin' : ''} />}
            label={t('deployTask.refresh')}
          />
          {cancellable && (
            <ToolbarActionButton
              type="button"
              onClick={() => setCancelConfirmOpen(true)}
              variant="danger"
              disabled={!cancellable || cancelMutation.isPending}
              icon={
                cancelMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <XCircle size={12} />
                )
              }
              label={t('deployTask.cancelTask')}
            />
          )}
        </div>
      }
      headerContent={
        <div className="space-y-4">
          <div className="rounded-lg border border-border-subtle bg-bg-secondary/40 px-4 py-3">
            <div className="flex items-start gap-3">
              {running && <Loader2 size={18} className="text-primary animate-spin mt-1" />}
              {success && <CheckCircle2 size={18} className="text-success mt-1" />}
              {failed && <XCircle size={18} className="text-danger mt-1" />}
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    running && 'text-primary',
                    success && 'text-success',
                    failed && 'text-danger',
                  )}
                >
                  {running &&
                    (task.status === 'destroying'
                      ? t('deployTask.destroyRunningMessage')
                      : t('deployTask.runningMessage'))}
                  {success &&
                    (task.status === 'destroyed'
                      ? t('deployTask.destroySuccessMessage')
                      : t('deployTask.successMessage'))}
                  {failed && t('deployTask.failedMessage')}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {running &&
                    (task.blockedBy
                      ? t('deployTask.blockedByDescription', {
                          id: task.blockedBy.id,
                          status: blockedByStatus,
                        })
                      : t('deployTask.runningDescription'))}
                  {success &&
                    (task.status === 'destroyed'
                      ? t('deployTask.destroySuccessDescription')
                      : t('deployTask.successDescription'))}
                  {failed && t('deployTask.failedDescription')}
                </p>
              </div>
            </div>
          </div>

          {task.blockedBy && (
            <div className="rounded-lg border border-warning/30 bg-warning/8 px-4 py-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-warning">{t('deployTask.blockedBy')}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('deployTask.blockedByDescription', {
                      id: task.blockedBy.id,
                      status: blockedByStatus,
                    })}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/deploy-tasks/$taskId" params={{ taskId: String(task.blockedBy.id) }}>
                    <Terminal size={12} />
                    {t('deployTask.openBlockingTask')}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <StatsGrid className={task.blockedBy ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.taskId')}
                value={`#${task.id}`}
                icon={<Terminal size={13} />}
                iconClassName="text-text-primary"
                valueClassName="text-text-primary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.template')}
                value={task.templateSlug ?? '—'}
                icon={<FolderOpen size={13} />}
                iconClassName="text-primary"
                valueClassName="text-primary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.namespace')}
                value={task.namespace}
                icon={<FolderOpen size={13} />}
                iconClassName="text-text-secondary"
                valueClassName="text-text-secondary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.taskUrl')}
                value={taskUrl || '—'}
                icon={<Terminal size={13} />}
                iconClassName="text-primary"
                valueClassName="text-primary break-all text-[0.85rem] leading-5"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.created')}
                value={formatTimestamp(task.createdAt)}
                icon={<Loader2 size={13} />}
                iconClassName="text-text-secondary"
                valueClassName="text-text-secondary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.updated')}
                value={formatTimestamp(task.updatedAt)}
                icon={<Loader2 size={13} />}
                iconClassName="text-text-secondary"
                valueClassName="text-text-secondary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.streamStatus')}
                value={t(`deployTask.streamStatuses.${streamStatus}`)}
                icon={<Loader2 size={13} />}
                iconClassName="text-text-secondary"
                valueClassName="text-text-secondary"
              />
            </MetricCardWrapper>
            <MetricCardWrapper>
              <MetricCardContent
                label={t('deployTask.logs')}
                value={lines.length}
                icon={<Terminal size={13} />}
                iconClassName="text-success"
                valueClassName="text-success"
              />
            </MetricCardWrapper>
            {task.blockedBy ? (
              <MetricCardWrapper>
                <MetricCardContent
                  label={t('deployTask.blockedBy')}
                  value={`#${task.blockedBy.id}`}
                  icon={<Loader2 size={13} />}
                  iconClassName="text-warning"
                  valueClassName="text-warning"
                />
              </MetricCardWrapper>
            ) : null}
          </StatsGrid>
        </div>
      }
    >
      {task.error && (
        <div className="rounded-lg border border-danger/25 bg-danger/8 p-4">
          <p className="text-xs text-danger font-medium mb-1">{t('deployTask.error')}</p>
          <p className="text-sm text-danger break-words">{task.error}</p>
        </div>
      )}

      {error && (
        <DashboardErrorState className="mb-6" title={t('deployTask.error')} description={error} />
      )}

      <LogsPanel
        headerLeft={
          <div>
            <p className="text-sm font-medium text-text-primary">{t('deployTask.logs')}</p>
            <p className="mt-1 text-xs text-text-muted">{t('deployTask.logDescription')}</p>
          </div>
        }
        headerRight={
          <>
            <Badge
              variant={running ? 'info' : success ? 'success' : failed ? 'danger' : 'neutral'}
              size="sm"
            >
              {running ? t('deployTask.liveStreaming') : t('deployTask.logReplay')}
            </Badge>
          </>
        }
        lines={logLines}
        showTimestamps={showLogTimestamps}
        footerLeft={<span>{t('deploy.logLinesReceived', { count: lines.length })}</span>}
        footerRight={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <Checkbox
                checked={showLogTimestamps}
                onCheckedChange={(checked) => setShowLogTimestamps(checked === true)}
              />
              <span>
                {showLogTimestamps ? t('deploy.hideTimestamps') : t('deploy.showTimestamps')}
              </span>
            </label>
            {lines.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDownloadLog}>
                <Download size={11} />
                {t('deploy.download')}
              </Button>
            )}
          </div>
        }
        emptyText={t('deployTask.waitingForLogs')}
        collapseRepeats
        bodyRef={logRef}
        bodyOnScroll={handleLogScroll}
      />

      <DangerConfirmDialog
        open={cancelConfirmOpen && cancellable}
        onOpenChange={setCancelConfirmOpen}
        title={t('deployTask.cancelTask')}
        description={t('deployTask.cancelTaskDescription')}
        confirmText={t('deployTask.cancelTask')}
        cancelText={t('common.cancel')}
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (cancellable && !cancelMutation.isPending) cancelMutation.mutate()
        }}
      />
    </PageShell>
  )
}

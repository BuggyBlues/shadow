import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Activity,
  BarChart3,
  Box,
  CheckCircle,
  Download,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/Badge'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatCard } from '@/components/StatCard'
import { StatusDot } from '@/components/StatusDot'
import { Tabs } from '@/components/Tabs'
import { useSSEStream } from '@/hooks/useSSEStream'
import { api, type Pod } from '@/lib/api'
import { cn, pluralize } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/stores/toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAge(pod: Pod): string {
  try {
    return formatDistanceToNow(parseISO(pod.age), { addSuffix: true })
  } catch {
    return pod.age
  }
}

function getPodStatusType(status: string): 'success' | 'warning' | 'error' | 'info' {
  if (status === 'Running') return 'success'
  if (status === 'Pending') return 'warning'
  if (status === 'Failed') return 'error'
  if (status === 'Succeeded') return 'info'
  return 'warning'
}

// ── Pods Tab ──────────────────────────────────────────────────────────────────

function PodsTab({ pods, isLoading }: { pods: Pod[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return <div className="py-12 text-center text-gray-500 text-sm">Loading pods...</div>
  }

  if (!pods || pods.length === 0) {
    return (
      <div className="py-12 text-center text-gray-600 text-sm">
        <Box size={24} className="mx-auto mb-2 text-gray-700" />
        No pods found. The deployment may be scaling up.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {pods.length} {pluralize(pods.length, 'pod')} in this deployment.
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-2 text-xs font-medium text-gray-500">STATUS</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500">NAME</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500">READY</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500">RESTARTS</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500">AGE</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr
                key={pod.name}
                className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <StatusDot status={getPodStatusType(pod.status)} label={pod.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{pod.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={pod.ready === '1/1' ? 'success' : 'warning'} size="sm">
                    {pod.ready}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {Number(pod.restarts) > 0 ? (
                    <span className="text-yellow-400">{pod.restarts}</span>
                  ) : (
                    pod.restarts
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{getAge(pod)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────

function LogsTab({ namespace, id }: { namespace: string; id: string }) {
  const logRef = useRef<HTMLDivElement>(null)
  const { lines, status, error, connect: sseConnect, clear, disconnect } = useSSEStream()

  const handleConnect = () => {
    const url = api.deployments.logsUrl(namespace, id)
    sseConnect(url)
  }

  const connected = status === 'connecting' || status === 'connected'

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${namespace}-${id}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new line batch
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [lines.length])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Real-time log stream from all pods in this deployment.
        </p>
        <div className="flex items-center gap-2">
          {lines.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1 transition-colors"
              >
                <Download size={11} />
                Download
              </button>
              <button
                type="button"
                onClick={() => {
                  disconnect()
                  clear()
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1 transition-colors"
              >
                <XCircle size={11} />
                Clear
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleConnect}
            className={cn(
              'flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors',
              connected
                ? 'bg-green-900/30 text-green-400 border border-green-800'
                : 'text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500',
            )}
          >
            <RefreshCw size={12} className={connected ? 'animate-spin' : ''} />
            {connected ? 'Streaming' : 'Connect'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/30">
          <span className="text-[10px] text-gray-600 font-mono">
            {namespace}/{id}
          </span>
          <span className="text-[10px] text-gray-600">{lines.length} lines</span>
        </div>
        <div
          ref={logRef}
          className="h-96 overflow-auto p-4 font-mono text-xs text-gray-300 space-y-0.5"
        >
          {lines.length === 0 && !connected && (
            <span className="text-gray-600">Click "Connect" to stream logs…</span>
          )}
          {lines.length === 0 && connected && (
            <span className="text-gray-600">Waiting for log output…</span>
          )}
          {lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: log lines are append-only
            <div key={i} className="leading-relaxed">
              {line || '\u00a0'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({
  namespace,
  id,
  pods,
}: {
  namespace: string
  id: string
  pods: Pod[] | undefined
}) {
  const running = pods?.filter((p) => p.status === 'Running').length ?? 0
  const totalRestarts = pods?.reduce((sum, p) => sum + Number(p.restarts), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Deployment Name</span>
          <span className="text-sm font-mono">{id}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Namespace</span>
          <span className="text-sm font-mono text-gray-300">{namespace}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Total Pods</span>
          <span className="text-sm">{pods?.length ?? '—'}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Running Pods</span>
          <span className="text-sm text-green-400">{running}</span>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Total Restarts</span>
          <span className={cn('text-sm', totalRestarts > 0 ? 'text-yellow-400' : 'text-gray-400')}>
            {totalRestarts}
          </span>
        </div>
      </div>

      {/* CLI commands */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Terminal size={14} className="text-gray-400" />
          CLI Commands
        </h3>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-gray-600 mb-1">View pods</p>
            <code className="block text-xs font-mono text-gray-400 bg-gray-950 rounded px-3 py-2">
              kubectl get pods -n {namespace}
            </code>
          </div>
          <div>
            <p className="text-[10px] text-gray-600 mb-1">View logs</p>
            <code className="block text-xs font-mono text-gray-400 bg-gray-950 rounded px-3 py-2">
              kubectl logs -n {namespace} -l app={id} --tail=100
            </code>
          </div>
          <div>
            <p className="text-[10px] text-gray-600 mb-1">Scale deployment</p>
            <code className="block text-xs font-mono text-gray-400 bg-gray-950 rounded px-3 py-2">
              kubectl scale deployment {id} -n {namespace} --replicas=N
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DeploymentDetailPage() {
  const { t } = useTranslation()
  const { namespace, id } = useParams({ strict: false }) as { namespace: string; id: string }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const addActivity = useAppStore((s) => s.addActivity)
  const [replicas, setReplicas] = useState<number | null>(null)
  const initialReplicasSet = useRef(false)
  const [showDestroy, setShowDestroy] = useState(false)
  const [activeTab, setActiveTab] = useState('pods')

  const { data: pods, isLoading } = useQuery({
    queryKey: ['pods', namespace, id],
    queryFn: () => api.deployments.pods(namespace, id),
    refetchInterval: 10_000,
  })

  useEffect(() => {
    if (pods && !initialReplicasSet.current) {
      initialReplicasSet.current = true
      setReplicas(pods.length)
    }
  }, [pods])

  const scaleMutation = useMutation({
    mutationFn: (count: number) => api.deployments.scale(namespace, id, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods', namespace, id] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      toast.success(`Scaled to ${replicas} replicas`)
      addActivity({
        type: 'scale',
        title: `Scaled ${id}`,
        detail: `Replicas: ${replicas}`,
        namespace,
      })
    },
    onError: () => toast.error('Failed to scale'),
  })

  const destroyMutation = useMutation({
    mutationFn: () => api.destroy({ namespace }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      toast.success(`Destroyed namespace ${namespace}`)
      addActivity({
        type: 'destroy',
        title: `Destroyed namespace ${namespace}`,
        namespace,
      })
      navigate({ to: '/clusters' })
    },
    onError: () => toast.error('Failed to destroy'),
  })

  const handleScale = (delta: number) => {
    const next = Math.max(0, (replicas ?? 0) + delta)
    setReplicas(next)
    scaleMutation.mutate(next)
  }

  const running = pods?.filter((p) => p.status === 'Running').length ?? 0
  const podCount = pods?.length ?? 0

  const tabs = [
    { id: 'pods', label: 'Pods', count: podCount, icon: <Box size={13} /> },
    { id: 'logs', label: 'Logs', icon: <FileText size={13} /> },
    { id: 'info', label: 'Info', icon: <Activity size={13} /> },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[{ label: t('nav.clusters'), to: '/clusters' }, { label: namespace }, { label: id }]}
        className="mb-4"
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-mono">{id}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Namespace: <span className="font-mono text-gray-400">{namespace}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scale controls */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => handleScale(-1)}
              disabled={scaleMutation.isPending || (replicas ?? 0) <= 0}
              className="px-2.5 py-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-mono px-2 min-w-[2rem] text-center">
              {replicas ?? '—'}
            </span>
            <button
              type="button"
              onClick={() => handleScale(1)}
              disabled={scaleMutation.isPending}
              className="px-2.5 py-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDestroy(true)}
            disabled={destroyMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            Destroy
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Pods" value={podCount} icon={<Box size={13} />} />
        <StatCard label="Running" value={running} icon={<CheckCircle size={13} />} color="green" />
        <StatCard
          label="Not Ready"
          value={podCount - running}
          icon={<XCircle size={13} />}
          color={podCount - running > 0 ? 'yellow' : 'default'}
        />
        <StatCard
          label="Replicas"
          value={replicas ?? '—'}
          icon={<BarChart3 size={13} />}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} className="mb-6" />

      <div className="min-h-[400px]">
        {activeTab === 'pods' && <PodsTab pods={pods} isLoading={isLoading} />}
        {activeTab === 'logs' && <LogsTab namespace={namespace} id={id} />}
        {activeTab === 'info' && <InfoTab namespace={namespace} id={id} pods={pods} />}
      </div>

      {showDestroy && (
        <ConfirmDialog
          title="Destroy Namespace"
          message={`This will destroy all deployments in namespace "${namespace}". This cannot be undone.`}
          confirmLabel="Destroy"
          confirmText={namespace}
          onConfirm={() => destroyMutation.mutate()}
          onCancel={() => setShowDestroy(false)}
        />
      )}
    </div>
  )
}

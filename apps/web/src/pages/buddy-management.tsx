import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  ClipboardCopy,
  Copy,
  Edit2,
  Key,
  Lock,
  MessageSquare,
  Plus,
  Shield,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '../components/common/avatar'
import { AvatarEditor } from '../components/common/avatar-editor'
import { PermissionsPanel } from '../components/buddy/permissions-panel'
import { useAppStatus } from '../hooks/use-app-status'
import { useUnreadCount } from '../hooks/use-unread-count'
import { fetchApi } from '../lib/api'
import { useUIStore } from '../stores/ui.store'

/* ── Types ───────────────────────────────────────────── */

interface Agent {
  id: string
  userId: string
  kernelType: string
  config: Record<string, unknown>
  ownerId: string
  status: 'running' | 'stopped' | 'error'
  containerId: string | null
  lastHeartbeat: string | null
  totalOnlineSeconds: number
  createdAt: string
  updatedAt: string
  isListed?: boolean
  isRented?: boolean
  listingInfo?: {
    listingId: string
    listingStatus: string
    isListed: boolean
  } | null
  botUser?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    email: string
  } | null
  owner?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  } | null
}

interface Server {
  id: string
  name: string
  iconUrl: string | null
}

interface TokenResponse {
  token: string
  agent: { id: string; userId: string; status: string }
  botUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
}

/** Renders a compact status badge for an agent's rental/listing status */
function AgentListingBadge({ agent }: { agent: Agent }) {
  const { t } = useTranslation()
  if (agent.isRented) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold shrink-0">
        🔒 {t('agentMgmt.rented')}
      </span>
    )
  }
  if (agent.isListed) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-bold shrink-0">
        📋 {t('agentMgmt.listed')}
      </span>
    )
  }
  if (agent.listingInfo) {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: {
        label: t('agentMgmt.listingDraft'),
        className: 'bg-gray-500/20 text-gray-400',
      },
      paused: {
        label: t('agentMgmt.listingPaused'),
        className: 'bg-yellow-500/20 text-yellow-500',
      },
      expired: {
        label: t('agentMgmt.listingExpired'),
        className: 'bg-gray-500/20 text-gray-400',
      },
      closed: {
        label: t('agentMgmt.listingClosed'),
        className: 'bg-red-500/20 text-red-400',
      },
    }
    const info = statusMap[agent.listingInfo.listingStatus]
    if (info) {
      return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${info.className}`}>
          {info.label}
        </span>
      )
    }
  }
  return null
}

/** Returns the status dot color class for an agent based on heartbeat-based online detection */
function getAgentOnlineDotClass(agent: Agent): string {
  if (agent.status === 'error') return 'bg-[#da373c]'
  if (agent.status === 'stopped') return 'bg-[#80848e]'
  // running — check heartbeat
  if (agent.lastHeartbeat && Date.now() - new Date(agent.lastHeartbeat).getTime() < 90000) {
    return 'bg-green-500'
  }
  return 'bg-[#80848e]' // running but heartbeat stale → show as offline
}

/** Formats total online seconds into a human-readable duration string */
function formatOnlineDuration(
  totalSeconds: number,
  t: (key: string, defaultValue?: string) => string,
): string {
  if (totalSeconds < 60) return `${totalSeconds}${t('time.seconds', '秒')}`
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}${t('time.minutes', '分钟')}`
  if (hours < 24)
    return `${hours}${t('time.hours', '小时')}${minutes > 0 ? `${minutes}${t('time.minutes', '分钟')}` : ''}`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days}${t('time.days', '天')}${remainHours > 0 ? `${remainHours}${t('time.hours', '小时')}` : ''}`
}

/* ── Agent Management Page ──────────────────────────── */

export function BuddyManagementPage() {
  const { t } = useTranslation()
  const unreadCount = useUnreadCount()
  useAppStatus({
    title: t('agentMgmt.title'),
    unreadCount,
    hasNotification: unreadCount > 0,
    variant: 'workspace',
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview')
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; agent: Agent } | null>(
    null,
  )

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchApi<Agent[]>('/api/agents'),
    refetchInterval: 30000, // Refresh every 30s for heartbeat status
  })

  // Fetch user's servers for permissions panel
  const { data: servers = [] } = useQuery({
    queryKey: ['my-servers'],
    queryFn: () => fetchApi<Server[]>('/api/servers'),
    enabled: !!selectedAgent && activeTab === 'permissions',
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setDeleteConfirmId(null)
      if (selectedAgent?.id === deleteConfirmId) setSelectedAgent(null)
      showMessage(t('agentMgmt.deleteSuccess'), true)
    },
    onError: () => showMessage(t('agentMgmt.deleteFailed'), false),
  })

  // Token mutation
  const tokenMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TokenResponse>(`/api/agents/${id}/token`, { method: 'POST' }),
    onSuccess: (data) => {
      setGeneratedToken(data.token)
      setTokenCopied(false)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  // Toggle (start/stop) mutation
  const toggleMutation = useMutation({
    mutationFn: (agent: Agent) =>
      fetchApi<Agent>(`/api/agents/${agent.id}/${agent.status === 'running' ? 'stop' : 'start'}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      // Refresh selected agent
      if (selectedAgent) {
        fetchApi<Agent>(`/api/agents/${selectedAgent.id}`).then((a) => setSelectedAgent(a))
      }
    },
  })

  const showMessage = (text: string, success: boolean) => {
    setMessage({ text, success })
    setTimeout(() => setMessage(null), 3000)
  }

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    showMessage(t('agentMgmt.tokenCopied'), true)
  }

  const handleAgentContextMenu = (e: React.MouseEvent, agent: Agent) => {
    e.prevent
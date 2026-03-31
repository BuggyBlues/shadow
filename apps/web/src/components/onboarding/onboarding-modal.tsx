import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Cloud,
  Cpu,
  Download,
  Loader2,
  MessageCircle,
  Monitor,
  Plus,
  Search,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'
import { showToast } from '../../lib/toast'
import { CatSvgDefs } from './cat-svg'

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

type Step =
  | 'welcome'
  | 'choice'
  | 'buddy-options'
  | 'create-buddy-form'
  | 'download-desktop'
  | 'desktop-guide'
  | 'marketplace'

interface Listing {
  id: string
  title: string
  deviceTier: 'high_end' | 'mid_range' | 'low_end'
  osType: 'macos' | 'windows' | 'linux'
  hourlyRate: number
  deviceInfo: { model?: string }
}

const TIER_CONFIG = {
  high_end: { icon: Zap, color: 'text-[#FFE66D]', bg: 'bg-[#FFE66D]/10' },
  mid_range: { icon: Cpu, color: 'text-[#4ECDC4]', bg: 'bg-[#4ECDC4]/10' },
  low_end: { icon: Monitor, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('welcome')
  const [buddyName, setBuddyName] = useState('')
  const [createServerAndInvite, setCreateServerAndInvite] = useState(true)
  const [rentingId, setRentingId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [createdServerId, setCreatedServerId] = useState<string | undefined>()

  const isChinese = i18n.language.startsWith('zh')
  const brandName = isChinese ? '虾豆' : 'Shadow'

  // Fetch recommended marketplace listings
  const { data: marketplaceData, isLoading: isLoadingMarket } = useQuery({
    queryKey: ['marketplace', 'listings', 'recommended'],
    queryFn: () =>
      fetchApi<{ listings: Listing[] }>('/api/marketplace/listings?sortBy=popular&limit=3'),
    enabled: step === 'marketplace',
  })

  const marketplaceListings = marketplaceData?.listings || []

  // Final Action: Handle redirect after success
  const finalizeOnboarding = async (serverId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['servers'] })
    await queryClient.invalidateQueries({ queryKey: ['buddies'] })
    onClose()

    if (serverId) {
      void navigate({
        to: '/servers/$serverSlug',
        params: { serverSlug: serverId },
      })
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: complex routing type
      void navigate({ to: '/' } as any)
    }
  }

  // Create Server Mutation
  const createServerMutation = useMutation({
    mutationFn: (name: string) =>
      fetchApi<{ id: string; slug: string | null }>('/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  })

  // Add Buddy to Server Mutation
  const inviteToServerMutation = useMutation({
    mutationFn: ({ serverId, buddyId }: { serverId: string; buddyId: string }) =>
      fetchApi(`/api/servers/${serverId}/members`, {
        method: 'POST',
        body: JSON.stringify({ buddyId }),
      }),
  })

  // Create Agent Mutation
  const createAgentMutation = useMutation({
    mutationFn: (name: string) =>
      fetchApi<{ id: string }>('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name,
          username: `buddy_${Math.random().toString(36).slice(2, 8)}`,
          kernelType: 'openclaw',
          config: {},
        }),
      }),
  })

  // Handle "Create Buddy Form" Submission
  const handleCreateBuddySubmit = async () => {
    if (!buddyName.trim()) return
    setIsProcessing(true)
    try {
      const agent = await createAgentMutation.mutateAsync(buddyName.trim())

      if (createServerAndInvite) {
        const server = await createServerMutation.mutateAsync(
          isChinese ? '我的专属空间' : 'My Space',
        )
        const sId = server.slug || server.id
        await inviteToServerMutation.mutateAsync({ serverId: sId, buddyId: agent.id })
        await finalizeOnboarding(sId)
      } else {
        await finalizeOnboarding()
      }
    } catch (_e) {
      showToast(t('common.saveFailed', 'Failed to create'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Rent Buddy Mutation
  const rentMutation = useMutation({
    mutationFn: (listingId: string) =>
      fetchApi<{ id: string }>('/api/marketplace/contracts', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          durationHours: 24,
          agreedToTerms: true,
        }),
      }),
    onSuccess: async (data) => {
      try {
        const contract = await fetchApi<{ agentUserId: string | null; agentId: string }>(
          `/api/marketplace/contracts/${data.id}`,
        )

        if (createServerAndInvite) {
          const server = await createServerMutation.mutateAsync(
            isChinese ? '我的专属空间' : 'My Space',
          )
          const sId = server.slug || server.id
          await inviteToServerMutation.mutateAsync({ serverId: sId, buddyId: contract.agentId })
          await finalizeOnboarding(sId)
        } else if (contract.agentUserId) {
          const channel = await fetchApi<{ id: string }>('/api/dm/channels', {
            method: 'POST',
            body: JSON.stringify({ userId: contract.agentUserId }),
          })
          void navigate({
            to: '/settings',
            // biome-ignore lint/suspicious/noExplicitAny: complex search params
            search: { tab: 'chat', dm: channel.id } as any,
          })
          onClose()
        } else {
          await finalizeOnboarding()
        }
      } catch (_e) {
        // biome-ignore lint/suspicious/noExplicitAny: complex routing
        void navigate({ to: '/marketplace' } as any)
        onClose()
      }
    },
  })

  const handleRent = (listingId: string) => {
    setRentingId(listingId)
    rentMutation.mutate(listingId)
  }

  const handleDownloadAndCreateServer = async () => {
    if (createServerAndInvite) {
      try {
        const server = await createServerMutation.mutateAsync(
          isChinese ? '我的专属空间' : 'My Space',
        )
        setCreatedServerId(server.slug || server.id)
        setStep('desktop-guide')
      } catch (_e) {
        setStep('desktop-guide')
      }
    } else {
      setStep('desktop-guide')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F1A]/90 backdrop-blur-xl p-4 md:p-6 overflow-hidden text-white font-sans">
      <CatSvgDefs />

      {/* Playful Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#E94560]/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-[#4ECDC4]/10 blur-[80px]" />

      <div className="relative w-full max-w-lg bg-[#1A1A2E] rounded-[48px] shadow-[0_32px_120px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-500">
        {/* Header with Close */}
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-3 text-white/20 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto scrollbar-none min-h-[500px]">
          {/* STEP 1: WELCOME */}
          {step === 'welcome' && (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-32 h-32 md:w-40 md:h-40 p-6 bg-white/5 rounded-[40px] shadow-inner mb-2 flex items-center justify-center group transition-all duration-500 hover:scale-105">
                <img
                  src="/Logo.svg"
                  alt="Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(78,205,196,0.3)]"
                />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                  {t('onboarding.welcome.title', `Meow! Welcome to ${brandName}`)}
                </h1>
                <p className="text-white/60 text-lg leading-relaxed max-w-xs mx-auto font-medium">
                  {t('onboarding.welcome.subtitle', 'The super community for super individuals.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('choice')}
                className="group relative w-full py-5 bg-gradient-to-r from-[#4ECDC4] to-[#4ECDC4]/80 text-[#0F0F1A] font-black text-xl rounded-3xl shadow-[0_10px_30px_rgba(78,205,196,0.2)] hover:shadow-[0_15px_40px_rgba(78,205,196,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
              >
                <span className="relative z-10">
                  {t('onboarding.welcome.start', "Let's Start")}
                </span>
                <ArrowRight
                  size={24}
                  className="relative z-10 group-hover:translate-x-1 transition-transform"
                />
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              </button>
            </div>
          )}

          {/* STEP 2: CHOICE */}
          {step === 'choice' && (
            <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full justify-center py-4">
              <div className="mb-2">
                <h2 className="text-3xl font-black text-white mb-2">
                  {t('onboarding.choice.title', 'Choose Path')}
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                  {t('onboarding.choice.subtitle', `Ready to start your ${brandName} journey?`)}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Create Own Buddy */}
                <button
                  type="button"
                  onClick={() => setStep('buddy-options')}
                  className="group flex items-center p-6 bg-white/5 border-2 border-transparent hover:border-[#FFE66D]/30 hover:bg-[#FFE66D]/5 rounded-3xl transition-all duration-300 text-left"
                >
                  <div className="w-14 h-14 bg-[#FFE66D]/10 rounded-2xl flex items-center justify-center text-[#FFE66D] mr-5 group-hover:scale-110 transition-transform">
                    <MessageCircle size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white group-hover:text-[#FFE66D] transition-colors">
                      {t('onboarding.choice.create.title', 'Create Your Buddy')}
                    </h3>
                    <p className="text-white/40 text-sm font-medium line-clamp-1">
                      {t('onboarding.choice.create.desc', 'Host your own dedicated AI assistant.')}
                    </p>
                  </div>
                </button>

                {/* Explore Market */}
                <button
                  type="button"
                  onClick={() => setStep('marketplace')}
                  className="group flex items-center p-6 bg-white/5 border-2 border-transparent hover:border-[#4ECDC4]/30 hover:bg-[#4ECDC4]/5 rounded-3xl transition-all duration-300 text-left"
                >
                  <div className="w-14 h-14 bg-[#4ECDC4]/10 rounded-2xl flex items-center justify-center text-[#4ECDC4] mr-5 group-hover:scale-110 transition-transform">
                    <Search size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white group-hover:text-[#4ECDC4] transition-colors">
                      {t('onboarding.choice.market.title', 'Explore Market')}
                    </h3>
                    <p className="text-white/40 text-sm font-medium line-clamp-1">
                      {t('onboarding.choice.market.desc', 'Rent high-performance Buddies.')}
                    </p>
                  </div>
                </button>
              </div>

              {/* Auto Create Server Checkbox */}
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all select-none mt-2">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={createServerAndInvite}
                    onChange={(e) => setCreateServerAndInvite(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${createServerAndInvite ? 'bg-[#4ECDC4] border-[#4ECDC4]' : 'border-white/20'}`}
                  >
                    {createServerAndInvite && (
                      <Check size={16} className="text-[#0F0F1A]" strokeWidth={4} />
                    )}
                  </div>
                </div>
                <span className="text-white/60 text-sm font-bold">
                  {t('onboarding.choice.autoServer', 'Auto-create a space and invite my Buddy')}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="self-center text-white/20 hover:text-white/60 transition-colors py-2 px-4 font-bold text-sm"
              >
                {t('common.back', 'Go Back')}
              </button>
            </div>
          )}

          {/* STEP: BUDDY OPTIONS */}
          {step === 'buddy-options' && (
            <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full justify-center py-4">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="mb-4 flex items-center gap-2 text-white/20 hover:text-white transition-colors font-bold text-sm"
                >
                  <ChevronLeft size={16} />
                  {t('common.back', 'Back')}
                </button>
                <h2 className="text-3xl font-black text-white mb-2">
                  {t('onboarding.buddyOptions.title', 'Host Your Buddy')}
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                  {t('onboarding.buddyOptions.subtitle', 'Choose your connection method')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => setStep('download-desktop')}
                  className="group flex items-center p-6 bg-white/5 border-2 border-transparent hover:border-[#FFE66D]/30 hover:bg-[#FFE66D]/5 rounded-3xl transition-all duration-300 text-left"
                >
                  <div className="w-14 h-14 bg-[#FFE66D]/10 rounded-2xl flex items-center justify-center text-[#FFE66D] mr-5 shrink-0 group-hover:scale-110 transition-transform">
                    <Download size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white group-hover:text-[#FFE66D] transition-colors">
                      {t('onboarding.buddyOptions.download.title', 'Download Desktop')}
                    </h3>
                    <p className="text-white/40 text-sm font-medium line-clamp-2">
                      {t(
                        'onboarding.buddyOptions.download.desc',
                        'Simplest way with built-in hosting.',
                      )}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('create-buddy-form')}
                  className="group flex items-center p-6 bg-white/5 border-2 border-transparent hover:border-[#4ECDC4]/30 hover:bg-[#4ECDC4]/5 rounded-3xl transition-all duration-300 text-left"
                >
                  <div className="w-14 h-14 bg-[#4ECDC4]/10 rounded-2xl flex items-center justify-center text-[#4ECDC4] mr-5 shrink-0 group-hover:scale-110 transition-transform">
                    <Cloud size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white group-hover:text-[#4ECDC4] transition-colors">
                      {t('onboarding.buddyOptions.cloudOnly.title', 'Identity Only')}
                    </h3>
                    <p className="text-white/40 text-sm font-medium line-clamp-2">
                      {t(
                        'onboarding.buddyOptions.cloudOnly.desc',
                        'Connect to your existing OpenClaw node.',
                      )}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP: CREATE BUDDY FORM */}
          {step === 'create-buddy-form' && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 h-full justify-center">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('buddy-options')}
                  className="mb-4 flex items-center gap-2 text-white/20 hover:text-white transition-colors font-bold text-sm"
                >
                  <ChevronLeft size={16} />
                  {t('common.back', 'Back')}
                </button>
                <h2 className="text-3xl font-black text-white mb-2">
                  {t('onboarding.createBuddy.title', 'Name Your Buddy')}
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                  {t('onboarding.createBuddy.subtitle', 'Give it a unique identity')}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor="buddyName"
                    className="block text-sm font-black text-white/40 uppercase tracking-widest ml-1"
                  >
                    {t('onboarding.createBuddy.nameLabel', 'Buddy Name')}
                  </label>
                  <input
                    id="buddyName"
                    type="text"
                    value={buddyName}
                    onChange={(e) => setBuddyName(e.target.value)}
                    placeholder={t('onboarding.createBuddy.namePlaceholder', 'e.g., Coding Cat')}
                    className="w-full px-6 py-5 bg-white/5 border-2 border-white/5 rounded-3xl text-white text-xl font-black placeholder:text-white/10 focus:outline-none focus:border-[#4ECDC4]/30 focus:bg-[#4ECDC4]/5 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateBuddySubmit}
                  disabled={!buddyName.trim() || isProcessing}
                  className="w-full py-5 bg-[#4ECDC4] text-[#0F0F1A] font-black rounded-3xl shadow-[0_10px_30px_rgba(78,205,196,0.2)] hover:shadow-[0_15px_40px_rgba(78,205,196,0.4)] transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={24} />
                      {t('onboarding.createBuddy.submit', 'Create & Enter Space')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP: DOWNLOAD DESKTOP */}
          {step === 'download-desktop' && (
            <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 fade-in duration-500 h-full py-4">
              <div className="w-32 h-32 bg-[#FFE66D]/10 rounded-[40px] flex items-center justify-center text-[#FFE66D] shadow-inner mb-2">
                <Download size={64} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white mb-3">
                  {t('onboarding.download.title', `Get ${brandName} Desktop`)}
                </h2>
                <p className="text-white/60 text-lg leading-relaxed max-w-xs mx-auto font-medium">
                  {t(
                    'onboarding.download.desc',
                    'Host and manage your AI Buddy directly from your computer.',
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <a
                  href="/download"
                  target="_blank"
                  onClick={handleDownloadAndCreateServer}
                  className="w-full py-5 bg-[#FFE66D] text-[#1A1A2E] font-black rounded-3xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,230,109,0.2)] hover:shadow-[0_15px_40px_rgba(255,230,109,0.4)] transition-all hover:-translate-y-1 active:scale-95"
                  rel="noopener"
                >
                  <Download size={24} />
                  {t('onboarding.download.btn', 'Download Now')}
                </a>
                <button
                  type="button"
                  onClick={handleDownloadAndCreateServer}
                  className="w-full py-5 bg-white/5 text-white/60 font-black rounded-3xl hover:bg-white/10 hover:text-white transition-all"
                >
                  {t('onboarding.download.skip', "I'll do it later")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('buddy-options')}
                className="text-white/20 hover:text-white/60 transition-colors font-bold text-sm"
              >
                {t('common.back', 'Go Back')}
              </button>
            </div>
          )}

          {/* STEP: DESKTOP GUIDE */}
          {step === 'desktop-guide' && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 h-full justify-center py-4">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {t('onboarding.guide.title', 'Quick Guide')}
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                  {t('onboarding.guide.subtitle', 'Follow these simple steps')}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    id: 'step1',
                    icon: Check,
                    text: t('onboarding.guide.step1', 'Install and launch the desktop agent.'),
                  },
                  {
                    id: 'step2',
                    icon: Check,
                    text: t('onboarding.guide.step2', 'Login with your account.'),
                  },
                  {
                    id: 'step3',
                    icon: Check,
                    text: t('onboarding.guide.step3', 'Click "Create Buddy" and select a model.'),
                  },
                  {
                    id: 'step4',
                    icon: Check,
                    text: t('onboarding.guide.step4', 'Invite your Buddy to a community channel!'),
                  },
                ].map((s) => (
                  <div key={s.id} className="flex items-start p-4 bg-white/5 rounded-2xl gap-4">
                    <div className="w-8 h-8 rounded-xl bg-[#4ECDC4]/10 flex items-center justify-center text-[#4ECDC4] shrink-0">
                      <s.icon size={18} />
                    </div>
                    <p className="text-white/70 font-bold leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => finalizeOnboarding(createdServerId)}
                className="w-full py-5 bg-[#4ECDC4] text-[#0F0F1A] font-black rounded-3xl shadow-[0_10px_30px_rgba(78,205,196,0.2)] hover:shadow-[0_15px_40px_rgba(78,205,196,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
              >
                {t('common.gotIt', 'Got it!')}
                <ArrowRight size={24} />
              </button>
            </div>
          )}

          {/* STEP: MARKETPLACE */}
          {step === 'marketplace' && (
            <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="mb-4 flex items-center gap-2 text-white/20 hover:text-white transition-colors font-bold text-sm"
                >
                  <ChevronLeft size={16} />
                  {t('common.back', 'Back')}
                </button>
                <h2 className="text-3xl font-black text-white mb-2">
                  {t('onboarding.market.title', 'Rent Buddy')}
                </h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                  {t('onboarding.market.subtitle', 'Pick a teammate for your journey')}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-4">
                {isLoadingMarket ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-white/5 animate-pulse rounded-3xl" />
                  ))
                ) : marketplaceListings.length === 0 ? (
                  <div className="text-center py-10 text-white/40 font-bold">
                    {t('common.noData', 'No Buddies found')}
                  </div>
                ) : (
                  marketplaceListings.map((listing) => {
                    const tier = TIER_CONFIG[listing.deviceTier] || TIER_CONFIG.low_end
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => handleRent(listing.id)}
                        disabled={!!rentingId}
                        className="w-full p-5 bg-white/5 border-2 border-transparent hover:border-[#4ECDC4]/30 hover:bg-[#4ECDC4]/5 rounded-3xl transition-all duration-300 text-left flex items-center group disabled:opacity-50"
                      >
                        <div
                          className={`w-14 h-14 ${tier.bg} ${tier.color} rounded-2xl flex items-center justify-center mr-4 shrink-0 group-hover:scale-110 transition-transform`}
                        >
                          <tier.icon size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-black text-white truncate group-hover:text-[#4ECDC4] transition-colors">
                            {listing.title}
                          </h4>
                          <p className="text-white/40 text-xs font-black uppercase tracking-wider">
                            {listing.deviceInfo.model || 'Standard'}
                          </p>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <div className="text-lg font-black text-[#4ECDC4]">
                            ¥{listing.hourlyRate}
                          </div>
                          <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                            / Hour
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function useOnboarding() {
  const shouldShow = () => false
  const markCompleted = () => {}
  return { shouldShow, markCompleted }
}

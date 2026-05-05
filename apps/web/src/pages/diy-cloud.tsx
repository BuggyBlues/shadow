import { Alert, AlertDescription, Badge, Button, Card, Checkbox, cn, Textarea } from '@shadowob/ui'
import { useSearch } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  EyeOff,
  FileCode2,
  KeyRound,
  Layers3,
  Loader2,
  type LucideIcon,
  MessageSquare,
  RefreshCcw,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Wallet,
  WandSparkles,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, fetchApi } from '../lib/api'
import { getApiErrorMessage } from '../lib/api-errors'

type StepId = 'think' | 'search' | 'generate' | 'validate' | 'review'

type DiyCloudDraft = {
  slug: string
  title: string
  description: string
  score: number
  steps: Array<{
    id: StepId
    title: string
    detail: string
  }>
  matchedPlugins: Array<{
    id: string
    name: string
    description: string
    reason: string
    capabilities: string[]
    requiredKeys: string[]
    docsExcerpt: string
    matchedTerms: string[]
  }>
  referenceTemplates: Array<{
    slug: string
    title: string
    description: string
    category: string
    plugins: string[]
    channels: string[]
    buddyNames: string[]
    reason: string
  }>
  suggestedSkills: string[]
  requiredKeys: Array<{
    key: string
    label: string
    description: string
    source: string
    sourcePluginId: string
    sensitive: boolean
    setupSteps: string[]
    skipImpact: string
  }>
  toolTrace: Array<{
    tool: 'search_plugins' | 'search_templates'
    query: string
    resultIds: string[]
  }>
  guidebook: {
    summary: string
    beforeDeploy: string[]
    howToUse: string[]
    reviewNotes: string[]
  }
  template: Record<string, unknown>
  validation: {
    valid: boolean
    agents: number
    configurations: number
    violations: Array<{ path: string; prefix: string }>
    extendsErrors: string[]
    templateRefs: { env: number; secret: number; file: number }
  }
}

type CloudTemplateRecord = {
  slug: string
  name: string
}

type CloudDeploymentStatus = {
  id: string
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'destroying' | 'destroyed' | string
  errorMessage?: string | null
  shadowServerId?: string | null
  shadowChannelId?: string | null
}

type ServerMeta = {
  id: string
  slug?: string | null
}

type DeployPhase = 'idle' | 'saving' | 'deploying' | 'polling' | 'redirecting' | 'error'

const STEP_ORDER: StepId[] = ['think', 'search', 'generate', 'validate', 'review']
const ALWAYS_KEEP_PLUGIN_IDS = new Set(['model-provider', 'shadowob'])

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isInfrastructureError(message: string) {
  return /pulumi|kubernetes|kubectl|duplicate entries|command failed|stdout:|stderr:/i.test(message)
}

function compactSlug(input: string, fallback = 'diy-cloud') {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  return (slug || fallback).slice(0, 48).replace(/-+$/g, '') || fallback
}

function uniqueSlug(base: string, maxLength = 63) {
  const suffix = Date.now().toString(36)
  const prefix = compactSlug(base).slice(0, Math.max(8, maxLength - suffix.length - 1))
  return `${prefix}-${suffix}`.replace(/-+$/g, '')
}

function agentCountFromTemplate(template: Record<string, unknown>) {
  const deployments = template.deployments
  if (!deployments || typeof deployments !== 'object' || Array.isArray(deployments)) return 1
  const agents = (deployments as Record<string, unknown>).agents
  return Array.isArray(agents) ? Math.max(1, agents.length) : 1
}

function getTemplateChannels(template: Record<string, unknown>) {
  const use = Array.isArray(template.use) ? template.use : []
  const channels: string[] = []
  for (const entry of use) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    if (record.plugin !== 'shadowob') continue
    const servers = ((record.options as Record<string, unknown> | undefined)?.servers ??
      []) as unknown
    if (!Array.isArray(servers)) continue
    for (const server of servers) {
      if (!server || typeof server !== 'object' || Array.isArray(server)) continue
      const serverChannels = (server as Record<string, unknown>).channels
      if (!Array.isArray(serverChannels)) continue
      for (const channel of serverChannels) {
        if (!channel || typeof channel !== 'object' || Array.isArray(channel)) continue
        const title = (channel as Record<string, unknown>).title
        const id = (channel as Record<string, unknown>).id
        if (typeof title === 'string') channels.push(title)
        else if (typeof id === 'string') channels.push(id)
      }
    }
  }
  return [...new Set(channels)]
}

function getTemplateBuddyNames(template: Record<string, unknown>) {
  const use = Array.isArray(template.use) ? template.use : []
  const names: string[] = []
  for (const entry of use) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    if (record.plugin !== 'shadowob') continue
    const buddies = ((record.options as Record<string, unknown> | undefined)?.buddies ??
      []) as unknown
    if (!Array.isArray(buddies)) continue
    for (const buddy of buddies) {
      if (!buddy || typeof buddy !== 'object' || Array.isArray(buddy)) continue
      const name = (buddy as Record<string, unknown>).name
      if (typeof name === 'string') names.push(name)
    }
  }
  return [...new Set(names)]
}

function getTemplatePlugins(template: Record<string, unknown>) {
  const plugins = new Set<string>()
  const collect = (items: unknown) => {
    if (!Array.isArray(items)) return
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const plugin = (item as Record<string, unknown>).plugin
      if (typeof plugin === 'string') plugins.add(plugin)
    }
  }
  collect(template.use)
  const agents = (template.deployments as Record<string, unknown> | undefined)?.agents
  if (Array.isArray(agents)) {
    for (const agent of agents) {
      if (!agent || typeof agent !== 'object' || Array.isArray(agent)) continue
      collect((agent as Record<string, unknown>).use)
    }
  }
  return [...plugins]
}

function templateForDeployment(template: Record<string, unknown>, namespace: string) {
  const snapshot = JSON.parse(JSON.stringify(template)) as Record<string, unknown>
  const deployments =
    snapshot.deployments &&
    typeof snapshot.deployments === 'object' &&
    !Array.isArray(snapshot.deployments)
      ? (snapshot.deployments as Record<string, unknown>)
      : {}

  snapshot.deployments = {
    ...deployments,
    namespace,
  }

  return snapshot
}

function templateWithoutSkippedPlugins(
  template: Record<string, unknown>,
  skippedPluginIds: Set<string>,
) {
  if (skippedPluginIds.size === 0) return template
  const snapshot = JSON.parse(JSON.stringify(template)) as Record<string, unknown>
  const keepUse = (items: unknown) =>
    Array.isArray(items)
      ? items.filter((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return true
          const plugin = (item as Record<string, unknown>).plugin
          return typeof plugin !== 'string' || !skippedPluginIds.has(plugin)
        })
      : items

  snapshot.use = keepUse(snapshot.use)
  const deployments = snapshot.deployments
  const agents =
    deployments && typeof deployments === 'object' && !Array.isArray(deployments)
      ? (deployments as Record<string, unknown>).agents
      : null
  if (Array.isArray(agents)) {
    for (const agent of agents) {
      if (!agent || typeof agent !== 'object' || Array.isArray(agent)) continue
      const record = agent as Record<string, unknown>
      record.use = keepUse(record.use)
    }
  }

  return snapshot
}

async function resolveServerRedirectUrl(serverId: string, channelId?: string | null) {
  const server = await fetchApi<ServerMeta>(`/api/servers/${encodeURIComponent(serverId)}`)
  const serverPath = `/servers/${encodeURIComponent(server.slug ?? server.id)}`
  return channelId ? `${serverPath}/channels/${encodeURIComponent(channelId)}` : serverPath
}

function scoreVariant(score: number) {
  if (score >= 85) return 'success' as const
  if (score >= 70) return 'primary' as const
  return 'warning' as const
}

export function DiyCloudPage() {
  const { t, i18n } = useTranslation()
  const search = useSearch({ strict: false }) as { prompt?: string }
  const initialPrompt =
    typeof search.prompt === 'string'
      ? search.prompt
      : new URLSearchParams(window.location.search).get('prompt') || ''
  const autoStartedRef = useRef(false)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<DiyCloudDraft | null>(null)
  const [activeStep, setActiveStep] = useState<StepId | null>(null)
  const [selectedStep, setSelectedStep] = useState<StepId>('think')
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set())
  const [typedStatus, setTypedStatus] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [saveTemplate, setSaveTemplate] = useState(true)
  const [deployPhase, setDeployPhase] = useState<DeployPhase>('idle')
  const [deployError, setDeployError] = useState('')
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(new Set())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [gate, setGate] = useState<{
    kind: 'membership' | 'wallet' | 'generic'
    title: string
    body: string
    primaryHref?: string
    primaryLabel?: string
    secondaryHref?: string
    secondaryLabel?: string
  } | null>(null)

  const stepLabels = useMemo(
    () =>
      Object.fromEntries(
        STEP_ORDER.map((id) => [
          id,
          {
            title: t(`diyCloud.steps.${id}.title`),
            detail: t(`diyCloud.steps.${id}.detail`),
          },
        ]),
      ) as Record<StepId, { title: string; detail: string }>,
    [t],
  )

  useEffect(() => {
    if (!activeStep) {
      setTypedStatus('')
      return
    }
    const text = `${stepLabels[activeStep].title}\n${stepLabels[activeStep].detail}`
    setTypedStatus('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setTypedStatus(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 22)
    return () => window.clearInterval(timer)
  }, [activeStep, stepLabels])

  const completeStep = (id: StepId) => {
    setCompletedSteps((current) => new Set([...current, id]))
  }

  const runGeneration = async (nextPrompt = prompt, nextFeedback = '') => {
    const trimmed = nextPrompt.trim()
    if (!trimmed || generating) return

    setGenerating(true)
    setGenerationError('')
    setDeployError('')
    setGate(null)
    setDraft(null)
    setCompletedSteps(new Set())
    try {
      setActiveStep('think')
      setSelectedStep('think')

      const generated = await fetchApi<DiyCloudDraft>('/api/cloud-saas/diy/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: trimmed,
          feedback: nextFeedback || undefined,
          previousConfig: draft?.template,
          locale: i18n.language,
        }),
      })
      setDraft(generated)
      setKeyValues({})
      setSkippedKeys(new Set())
      setActiveKey(generated.requiredKeys[0]?.key ?? null)
      completeStep('think')
      completeStep('search')
      completeStep('generate')

      setActiveStep('validate')
      setSelectedStep('validate')
      if (generated.validation.valid) {
        completeStep('validate')
      }

      setActiveStep('review')
      setSelectedStep('review')
      setFeedback('')
    } catch (err) {
      setGenerationError(getApiErrorMessage(err, t, 'diyCloud.errors.generateFailed'))
      setActiveStep(null)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (autoStartedRef.current || !initialPrompt.trim()) return
    autoStartedRef.current = true
    void runGeneration(initialPrompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt])

  const saveDraftTemplate = async (
    currentDraft: DiyCloudDraft,
    content: Record<string, unknown> = currentDraft.template,
  ) => {
    const slug = uniqueSlug(currentDraft.slug)
    return fetchApi<CloudTemplateRecord>('/api/cloud-saas/templates', {
      method: 'POST',
      body: JSON.stringify({
        slug,
        name: currentDraft.title,
        description: currentDraft.description,
        content,
        tags: ['diy', 'generated'],
        category: 'business',
        baseCost: 0,
      }),
    })
  }

  const deleteDraftTemplate = async (slug: string) => {
    await fetchApi<{ ok: boolean }>(`/api/cloud-saas/templates/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }).catch(() => null)
  }

  const waitForDeployment = async (deploymentId: string) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < 240_000) {
      const deployment = await fetchApi<CloudDeploymentStatus>(
        `/api/cloud-saas/deployments/${encodeURIComponent(deploymentId)}`,
      )
      if (deployment.status === 'deployed' && deployment.shadowServerId) {
        setDeployPhase('redirecting')
        const path = await resolveServerRedirectUrl(
          deployment.shadowServerId,
          deployment.shadowChannelId,
        )
        window.location.assign(`/app${path}`)
        return
      }
      if (deployment.status === 'failed') {
        throw new Error(deployment.errorMessage || t('diyCloud.errors.deployFailed'))
      }
      await wait(2400)
    }
    throw new Error(t('diyCloud.errors.deployTimeout'))
  }

  const deployDraft = async () => {
    if (!draft || (deployPhase !== 'idle' && deployPhase !== 'error')) return
    setDeployPhase('saving')
    setDeployError('')
    setGate(null)
    try {
      const prunedTemplate = templateWithoutSkippedPlugins(draft.template, skippedPluginIds)
      const savedTemplate = await saveDraftTemplate(draft, prunedTemplate)
      completeStep('review')

      setDeployPhase('deploying')
      const namespace = uniqueSlug(savedTemplate.slug, 58)
      const configSnapshot = templateForDeployment(prunedTemplate, namespace)
      const envVars = Object.fromEntries(
        draft.requiredKeys
          .filter((key) => !skippedKeys.has(key.key))
          .map((key) => [key.key, keyValues[key.key]?.trim() ?? ''])
          .filter(([, value]) => value),
      )
      const deployment = await fetchApi<CloudDeploymentStatus>('/api/cloud-saas/deployments', {
        method: 'POST',
        body: JSON.stringify({
          namespace,
          name: draft.title,
          templateSlug: savedTemplate.slug,
          resourceTier: 'lightweight',
          agentCount: agentCountFromTemplate(configSnapshot),
          configSnapshot,
          envVars,
          runtimeContext: {
            locale: i18n.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      })

      if (!saveTemplate) await deleteDraftTemplate(savedTemplate.slug)
      setDeployPhase('polling')
      await waitForDeployment(deployment.id)
    } catch (err) {
      setDeployPhase('error')
      if (err instanceof ApiError && err.code === 'INVITE_REQUIRED') {
        setGate({
          kind: 'membership',
          title: t('diyCloud.gates.membershipTitle'),
          body: t('diyCloud.gates.membershipBody'),
          primaryHref: '/app/settings/invite',
          primaryLabel: t('diyCloud.gates.goInvite'),
        })
        return
      }
      if (
        err instanceof ApiError &&
        (err.status === 402 || err.code === 'WALLET_INSUFFICIENT_BALANCE')
      ) {
        setGate({
          kind: 'wallet',
          title: t('diyCloud.gates.walletTitle'),
          body: t('diyCloud.gates.walletBody', {
            balance: err.balance ?? 0,
            shortfall: err.shortfall ?? 0,
          }),
          primaryHref: '/app/settings/tasks',
          primaryLabel: t('diyCloud.gates.goTasks'),
          secondaryHref: '/app/settings/wallet',
          secondaryLabel: t('diyCloud.gates.goWallet'),
        })
        return
      }
      const message = getApiErrorMessage(err, t, 'diyCloud.errors.deployFailed')
      setDeployError(
        isInfrastructureError(message) ? t('diyCloud.errors.deployInfrastructureFailed') : message,
      )
    }
  }

  const deployBusy = deployPhase !== 'idle' && deployPhase !== 'error'
  const deployPhaseText = deployPhase === 'idle' ? '' : t(`diyCloud.deployPhases.${deployPhase}`)
  const draftChannels = draft ? getTemplateChannels(draft.template) : []
  const draftBuddies = draft ? getTemplateBuddyNames(draft.template) : []
  const draftPlugins = draft ? getTemplatePlugins(draft.template) : []
  const selectedGeneratedStep = draft?.steps.find((step) => step.id === selectedStep)
  const activeRequiredKey =
    draft?.requiredKeys.find((item) => item.key === activeKey) ?? draft?.requiredKeys[0] ?? null
  const preparedKeyCount = draft
    ? draft.requiredKeys.filter((key) => keyValues[key.key]?.trim() || skippedKeys.has(key.key))
        .length
    : 0
  const requiredKeysReady = draft ? preparedKeyCount === draft.requiredKeys.length : false
  const skippedPluginIds = useMemo(() => {
    const ids = new Set<string>()
    if (!draft) return ids
    for (const key of draft.requiredKeys) {
      if (skippedKeys.has(key.key) && !ALWAYS_KEEP_PLUGIN_IDS.has(key.sourcePluginId)) {
        ids.add(key.sourcePluginId)
      }
    }
    return ids
  }, [draft, skippedKeys])
  const outlineCards: Array<{ title: string; items: string[]; Icon: LucideIcon }> = [
    { title: t('diyCloud.stage.channelsTitle'), items: draftChannels, Icon: Server },
    { title: t('diyCloud.stage.buddiesTitle'), items: draftBuddies, Icon: MessageSquare },
    { title: t('diyCloud.stage.pluginsTitle'), items: draftPlugins, Icon: FileCode2 },
  ]

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-bg-deep/80 backdrop-blur-xl">
      <div className="min-h-0 flex-1 overflow-auto p-4 pb-28 md:p-6 md:pb-28">
        <section className="mx-auto grid w-full max-w-5xl gap-4">
          <div className="flex justify-center">
            <Badge variant="primary" className="w-fit">
              <WandSparkles size={13} />
              {t('diyCloud.eyebrow')}
            </Badge>
          </div>
          <form
            className="rounded-[32px] border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/20"
            onSubmit={(event) => {
              event.preventDefault()
              void runGeneration(prompt)
            }}
          >
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-text-muted">
                {t('diyCloud.promptLabel')}
              </span>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                placeholder={t('diyCloud.promptPlaceholder')}
                readOnly={Boolean(draft) || generating || deployBusy}
                className="min-h-[116px] resize-none border-0 bg-black/20 text-lg font-black leading-relaxed"
                aria-label={t('diyCloud.promptLabel')}
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-bold leading-relaxed text-text-muted">
                {draft ? t('diyCloud.requestLocked') : t('diyCloud.requestHint')}
              </div>
              <Button
                type="submit"
                size="md"
                loading={generating}
                icon={Sparkles}
                disabled={!prompt.trim() || generating || deployBusy || Boolean(draft)}
              >
                {t('diyCloud.generate')}
              </Button>
            </div>
          </form>
        </section>

        <nav className="mx-auto mt-5 flex max-w-6xl gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.03] p-2">
          {STEP_ORDER.map((id, index) => {
            const complete = completedSteps.has(id)
            const running = generating && activeStep === id
            const active = selectedStep === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedStep(id)}
                className={cn(
                  'flex min-w-[210px] flex-1 gap-3 rounded-2xl border p-3 text-left transition',
                  active
                    ? 'border-primary/50 bg-primary/10'
                    : complete
                      ? 'border-success/30 bg-success/5'
                      : 'border-white/10 bg-white/[0.03]',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
                    running
                      ? 'bg-primary text-bg-deep'
                      : complete
                        ? 'bg-success text-bg-deep'
                        : 'bg-white/10 text-text-muted',
                  )}
                >
                  {running ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : complete ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-text-primary">{stepLabels[id].title}</div>
                  <div className="mt-1 text-xs font-bold leading-relaxed text-text-muted">
                    {stepLabels[id].detail}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>

        <section className="mx-auto min-w-0 max-w-6xl pt-5">
          {generating && activeStep && (
            <Card variant="glassPanel" className="mb-5 p-5">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-1 shrink-0 animate-spin text-primary" size={20} />
                <div>
                  <div className="whitespace-pre-line text-base font-black leading-relaxed text-text-primary">
                    {typedStatus}
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {t('diyCloud.realProgress')}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {generationError && (
            <Alert variant="destructive" className="mb-5">
              <XCircle size={18} />
              <AlertDescription>{generationError}</AlertDescription>
            </Alert>
          )}

          {!draft ? (
            <Card variant="glassPanel" className="mx-auto max-w-3xl p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <MessageSquare size={24} />
              </div>
              <h2 className="mt-5 mb-0 text-xl font-black text-text-primary">
                {t('diyCloud.emptyTitle')}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-relaxed text-text-muted">
                {t('diyCloud.emptyBody')}
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              <Card variant="glassPanel" className="overflow-hidden p-0">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={scoreVariant(draft.score)}>
                        <ShieldCheck size={13} />
                        {t('diyCloud.score', { score: draft.score })}
                      </Badge>
                      <Badge variant={draft.validation.valid ? 'success' : 'warning'}>
                        {draft.validation.valid
                          ? t('diyCloud.validationPassed')
                          : t('diyCloud.validationNeedsReview')}
                      </Badge>
                      <Badge variant={requiredKeysReady ? 'success' : 'neutral'}>
                        {t('diyCloud.keyProgress', {
                          done: preparedKeyCount,
                          total: draft.requiredKeys.length,
                        })}
                      </Badge>
                    </div>
                    <h2 className="mt-5 mb-0 text-3xl font-black leading-tight text-text-primary">
                      {draft.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-base font-bold leading-relaxed text-text-muted">
                      {draft.description}
                    </p>
                  </div>
                  <div className="border-t border-white/10 bg-white/[0.03] p-6 xl:border-t-0 xl:border-l">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">
                      {t('diyCloud.stage.spaceShapeTitle')}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="neutral">
                        <Server size={13} />
                        {draftChannels.length}
                      </Badge>
                      <Badge variant="neutral">
                        <Bot size={13} />
                        {draftBuddies.length}
                      </Badge>
                      <Badge variant="neutral">
                        <Layers3 size={13} />
                        {draftPlugins.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-5">
                <Card variant="glassPanel" className="min-h-[560px] p-6">
                  {selectedGeneratedStep && (
                    <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/10 p-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                          {selectedGeneratedStep.title}
                        </div>
                        <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-text-secondary">
                          {selectedGeneratedStep.detail}
                        </p>
                      </div>
                      <Badge variant="primary">{t('diyCloud.stage.focus')}</Badge>
                    </div>
                  )}

                  {selectedStep === 'think' && (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="rounded-3xl bg-white/[0.04] p-6">
                        <div className="flex items-center gap-3 text-lg font-black text-text-primary">
                          <Compass size={20} className="text-primary" />
                          {t('diyCloud.stage.goalTitle')}
                        </div>
                        <p className="mt-4 text-xl font-black leading-relaxed text-text-primary">
                          {draft.description}
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          {draft.suggestedSkills.slice(0, 3).map((skill, index) => (
                            <div key={`${skill}-${index}`} className="rounded-2xl bg-black/10 p-4">
                              <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                                {t('diyCloud.stage.outcome')} {index + 1}
                              </div>
                              <div className="mt-2 text-sm font-black text-text-primary">
                                {skill}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-white/[0.04] p-6">
                        <div className="text-sm font-black text-text-primary">
                          {t('diyCloud.stage.spaceShapeTitle')}
                        </div>
                        <div className="mt-4 space-y-3">
                          {[...draftChannels, ...draftBuddies].map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-text-secondary"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStep === 'search' && (
                    <div className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        {draft.toolTrace.slice(0, 4).map((trace, index) => (
                          <div
                            key={`${trace.tool}-${trace.query}-${index}`}
                            className="rounded-2xl bg-white/[0.04] p-4"
                          >
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                              {trace.tool === 'search_plugins'
                                ? t('diyCloud.stage.toolPluginSearch')
                                : t('diyCloud.stage.toolTemplateSearch')}
                            </div>
                            <div className="mt-2 text-sm font-black text-text-primary">
                              {trace.query}
                            </div>
                            <p className="mt-2 text-xs font-bold text-text-muted">
                              {trace.resultIds.slice(0, 4).join(' / ')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div>
                          <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
                            <Layers3 size={17} className="text-primary" />
                            {t('diyCloud.pluginsTitle')}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {draft.matchedPlugins.map((plugin) => (
                              <div key={plugin.id} className="rounded-2xl bg-white/[0.04] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <strong className="text-sm text-text-primary">
                                    {plugin.name}
                                  </strong>
                                  <Badge variant="neutral">{plugin.id}</Badge>
                                </div>
                                <p className="mt-2 text-xs font-bold leading-relaxed text-text-muted">
                                  {plugin.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/[0.04] p-5">
                          <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
                            <BookOpenCheck size={17} className="text-primary" />
                            {t('diyCloud.referenceTemplatesTitle')}
                          </div>
                          <div className="space-y-3">
                            {draft.referenceTemplates.slice(0, 3).map((template) => (
                              <div key={template.slug} className="rounded-xl bg-black/10 p-3">
                                <strong className="text-sm text-text-primary">
                                  {template.title}
                                </strong>
                                <p className="mt-1 text-xs font-bold leading-relaxed text-text-muted">
                                  {template.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStep === 'generate' && (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        {outlineCards.map(({ title, items, Icon }) => (
                          <div key={title} className="rounded-3xl bg-white/[0.04] p-5">
                            <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                              <Icon size={17} className="text-primary" />
                              {title}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {items.map((item, index) => (
                                <Badge key={`${title}-${item}-${index}`} variant="neutral">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-3xl bg-black/10 p-5">
                        <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                          <FileCode2 size={17} className="text-primary" />
                          {t('diyCloud.stage.runtimeTitle')}
                        </div>
                        <p className="mt-3 text-sm font-bold leading-relaxed text-text-muted">
                          {t('diyCloud.stage.runtimeBody')}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedStep === 'validate' && (
                    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                      <div className="rounded-3xl bg-white/[0.04] p-5">
                        <Badge variant={scoreVariant(draft.score)}>
                          <ShieldCheck size={13} />
                          {t('diyCloud.score', { score: draft.score })}
                        </Badge>
                        <p className="mt-4 text-sm font-bold leading-relaxed text-text-muted">
                          {draft.validation.valid
                            ? t('diyCloud.validationPassed')
                            : t('diyCloud.validationNeedsReview')}
                        </p>
                        <div className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-text-muted">
                          {t('diyCloud.keyProgress', {
                            done: preparedKeyCount,
                            total: draft.requiredKeys.length,
                          })}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-white/[0.04] p-5">
                        <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                          <ClipboardCheck size={17} className="text-primary" />
                          {t('diyCloud.validationChecklistTitle')}
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-black/10 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-text-muted">
                              {t('diyCloud.validationAgents')}
                            </div>
                            <div className="mt-2 text-2xl font-black text-text-primary">
                              {draft.validation.agents}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-black/10 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-text-muted">
                              {t('diyCloud.validationConfigurations')}
                            </div>
                            <div className="mt-2 text-2xl font-black text-text-primary">
                              {draft.validation.configurations}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-black/10 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-text-muted">
                              {t('diyCloud.validationSecrets')}
                            </div>
                            <div className="mt-2 text-2xl font-black text-text-primary">
                              {draft.validation.templateRefs.secret}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-black/10 p-4">
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-text-muted">
                              {t('diyCloud.validationIssues')}
                            </div>
                            <div className="mt-2 text-2xl font-black text-text-primary">
                              {draft.validation.violations.length +
                                draft.validation.extendsErrors.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStep === 'review' && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="space-y-5">
                        <div className="rounded-3xl bg-white/[0.04] p-5">
                          <div className="mb-4 flex items-center gap-2">
                            <ClipboardCheck size={18} className="text-primary" />
                            <h3 className="m-0 text-lg font-black text-text-primary">
                              {t('diyCloud.guidebookTitle')}
                            </h3>
                          </div>
                          <p className="text-base font-bold leading-relaxed text-text-secondary">
                            {draft.guidebook.summary}
                          </p>
                          <div className="mt-5 space-y-3">
                            {draft.guidebook.howToUse.slice(0, 4).map((item, index) => (
                              <div
                                key={`${item}-${index}`}
                                className="rounded-2xl bg-black/10 p-4 text-sm font-bold leading-relaxed text-text-muted"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-3xl bg-white/[0.04] p-5">
                          <h3 className="m-0 text-lg font-black text-text-primary">
                            {t('diyCloud.feedbackTitle')}
                          </h3>
                          <p className="mt-2 text-sm font-bold text-text-muted">
                            {t('diyCloud.feedbackBody')}
                          </p>
                          <Textarea
                            value={feedback}
                            onChange={(event) => setFeedback(event.currentTarget.value)}
                            placeholder={t('diyCloud.feedbackPlaceholder')}
                            className="mt-4 min-h-[96px]"
                            aria-label={t('diyCloud.feedbackTitle')}
                          />
                          <Button
                            type="button"
                            variant="glass"
                            className="mt-4"
                            icon={RefreshCcw}
                            loading={generating}
                            disabled={!feedback.trim() || generating || deployBusy}
                            onClick={() => void runGeneration(prompt, feedback)}
                          >
                            {t('diyCloud.applyFeedback')}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-3xl bg-white/[0.04] p-5">
                        {draft.requiredKeys.length > 0 && (
                          <div className="rounded-2xl bg-black/10 p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
                              <KeyRound size={16} className="text-primary" />
                              {t('diyCloud.keyChecklistTitle')}
                            </div>
                            <div className="space-y-2">
                              {draft.requiredKeys.map((key) => {
                                const skipped = skippedKeys.has(key.key)
                                const filled = Boolean(keyValues[key.key]?.trim())
                                return (
                                  <button
                                    key={key.key}
                                    type="button"
                                    onClick={() => {
                                      setActiveKey(key.key)
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left"
                                  >
                                    <span className="min-w-0 text-xs font-black text-text-primary">
                                      {key.label}
                                    </span>
                                    <Badge variant={filled || skipped ? 'success' : 'neutral'}>
                                      {filled
                                        ? t('diyCloud.keyFilled')
                                        : skipped
                                          ? t('diyCloud.keySkipped')
                                          : t('diyCloud.stage.focus')}
                                    </Badge>
                                  </button>
                                )
                              })}
                            </div>
                            {activeRequiredKey && (
                              <div className="mt-4 rounded-2xl bg-black/10 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h4 className="m-0 text-base font-black text-text-primary">
                                      {activeRequiredKey.label}
                                    </h4>
                                    <p className="mt-1 text-xs font-bold leading-relaxed text-text-muted">
                                      {activeRequiredKey.description}
                                    </p>
                                  </div>
                                  <Badge variant="neutral">{activeRequiredKey.source}</Badge>
                                </div>
                                <ol className="mt-4 space-y-2 p-0">
                                  {activeRequiredKey.setupSteps.map((step, index) => (
                                    <li
                                      key={`${activeRequiredKey.key}-${step}-${index}`}
                                      className="flex gap-2 text-xs font-bold leading-relaxed text-text-secondary"
                                    >
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-black text-bg-deep">
                                        {index + 1}
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                                <Textarea
                                  value={keyValues[activeRequiredKey.key] ?? ''}
                                  onChange={(event) => {
                                    const value = event.currentTarget.value
                                    setKeyValues((current) => ({
                                      ...current,
                                      [activeRequiredKey.key]: value,
                                    }))
                                    if (value.trim()) {
                                      setSkippedKeys((current) => {
                                        const next = new Set(current)
                                        next.delete(activeRequiredKey.key)
                                        return next
                                      })
                                    }
                                  }}
                                  placeholder={t('diyCloud.keyValuePlaceholder')}
                                  className="mt-4 min-h-[86px]"
                                  aria-label={activeRequiredKey.label}
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="glass"
                                    size="sm"
                                    icon={EyeOff}
                                    onClick={() =>
                                      setSkippedKeys((current) => {
                                        const next = new Set(current)
                                        next.add(activeRequiredKey.key)
                                        return next
                                      })
                                    }
                                  >
                                    {t('diyCloud.skipKey')}
                                  </Button>
                                  {skippedKeys.has(activeRequiredKey.key) && (
                                    <span className="text-xs font-bold leading-relaxed text-text-muted">
                                      {activeRequiredKey.skipImpact}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!requiredKeysReady && (
                          <Alert variant="warning" className="mt-5">
                            <KeyRound size={18} />
                            <AlertDescription>
                              {t('diyCloud.keysRequiredBeforeDeploy')}
                            </AlertDescription>
                          </Alert>
                        )}

                        {gate && (
                          <Alert
                            variant={gate.kind === 'wallet' ? 'warning' : 'info'}
                            className="mt-5"
                          >
                            {gate.kind === 'wallet' ? (
                              <Wallet size={18} />
                            ) : (
                              <ShieldCheck size={18} />
                            )}
                            <AlertDescription>
                              <strong className="block text-sm">{gate.title}</strong>
                              <span className="mt-1 block">{gate.body}</span>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {gate.primaryHref && gate.primaryLabel && (
                                  <Button
                                    asChild
                                    variant="primary"
                                    size="sm"
                                    className="normal-case tracking-normal"
                                  >
                                    <a href={gate.primaryHref}>{gate.primaryLabel}</a>
                                  </Button>
                                )}
                                {gate.secondaryHref && gate.secondaryLabel && (
                                  <Button asChild variant="glass" size="sm">
                                    <a href={gate.secondaryHref}>{gate.secondaryLabel}</a>
                                  </Button>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {deployError && (
                          <Alert variant="destructive" className="mt-5">
                            <XCircle size={18} />
                            <AlertDescription>{deployError}</AlertDescription>
                          </Alert>
                        )}

                        {deployPhaseText && (
                          <div className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm font-black text-primary">
                            {deployBusy && (
                              <Loader2 className="mr-2 inline animate-spin" size={16} />
                            )}
                            {deployPhaseText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </section>

        {draft && (
          <div className="sticky bottom-0 z-20 mx-auto mt-6 max-w-6xl rounded-3xl border border-white/10 bg-bg-deep/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={scoreVariant(draft.score)}>
                    <ShieldCheck size={13} />
                    {t('diyCloud.score', { score: draft.score })}
                  </Badge>
                  <Badge variant={requiredKeysReady ? 'success' : 'neutral'}>
                    {t('diyCloud.keyProgress', {
                      done: preparedKeyCount,
                      total: draft.requiredKeys.length,
                    })}
                  </Badge>
                </div>
                <p className="mt-2 text-xs font-bold text-text-muted">
                  {requiredKeysReady
                    ? t('diyCloud.deployReady')
                    : t('diyCloud.keysRequiredBeforeDeploy')}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <Checkbox
                    checked={saveTemplate}
                    onCheckedChange={(value) => setSaveTemplate(value === true)}
                  />
                  <span className="text-xs font-black text-text-primary">
                    {t('diyCloud.saveTemplate')}
                  </span>
                </label>
                <Button
                  type="button"
                  size="lg"
                  icon={Rocket}
                  iconRight={ArrowRight}
                  loading={deployBusy}
                  disabled={
                    !draft.validation.valid || !requiredKeysReady || deployBusy || generating
                  }
                  onClick={() => void deployDraft()}
                >
                  {t('diyCloud.deploy')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

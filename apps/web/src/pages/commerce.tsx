import { Button, GlassPanel, Input } from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Package,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePreviewPanel } from '../components/chat/file-preview-panel'
import { PurchaseConfirmationModal } from '../components/commerce/purchase-confirmation-modal'
import type { Product, Shop } from '../components/shop/shop-page'
import { ShrimpCoinIcon } from '../components/shop/ui/currency'
import { fetchApi } from '../lib/api'
import { getApiErrorMessage } from '../lib/api-errors'
import { showToast } from '../lib/toast'
import { useAuthStore } from '../stores/auth.store'

type BillingMode = 'one_time' | 'fixed_duration' | 'subscription'
type ResourceCapability = 'view' | 'download' | 'use' | 'redeem' | 'manage'

type Entitlement = {
  id: string
  userId: string
  serverId?: string | null
  shopId?: string | null
  orderId?: string | null
  productId?: string | null
  offerId?: string | null
  scopeKind?: 'server' | 'user' | null
  status: string
  isActive: boolean
  resourceType?: string | null
  resourceId?: string | null
  capability?: string | null
  expiresAt?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  shop?: {
    id: string
    scopeKind: 'server' | 'user'
    serverId?: string | null
    ownerUserId?: string | null
    name: string
    logoUrl?: string | null
  } | null
  product?: {
    id: string
    shopId: string
    name: string
    summary?: string | null
    type: 'physical' | 'entitlement'
    basePrice: number
    currency: string
    billingMode: BillingMode
    entitlementConfig?: ProductEntitlementConfig | ProductEntitlementConfig[] | null
  } | null
  offer?: {
    id: string
    shopId: string
    productId: string
    priceOverride?: number | null
    currency: string
    status: string
  } | null
  paidFile?: {
    id: string
    name: string
    mime?: string | null
    sizeBytes?: number | null
    previewUrl?: string | null
  } | null
}

type Provisioning = {
  status: string
  code: string
  resourceType?: string | null
  resourceId?: string | null
  capability?: string | null
}

type ProductEntitlementConfig = {
  resourceType?: string
  resourceId?: string
  capability?: string
  durationSeconds?: number | null
  renewalPeriodSeconds?: number | null
  privilegeDescription?: string
}

const BILLING_MODES: BillingMode[] = ['one_time', 'fixed_duration', 'subscription']
const RESOURCE_CAPABILITIES: ResourceCapability[] = ['use', 'view', 'download', 'redeem', 'manage']

const selectClassName =
  'h-11 rounded-xl border border-border-subtle bg-bg-secondary px-3 text-sm font-bold text-text-primary outline-none transition focus:border-primary/60'

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : null
}

function toProductSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  return `${base}-${Date.now()}`
}

function firstEntitlementConfig(product?: Product | null): ProductEntitlementConfig | null {
  const config = Array.isArray(product?.entitlementConfig)
    ? product?.entitlementConfig[0]
    : product?.entitlementConfig
  if (!config || typeof config !== 'object') return null
  return config as ProductEntitlementConfig
}

function productImage(product?: Product | null) {
  const image = product?.media?.find((item) => item.type === 'image') ?? product?.media?.[0]
  return image?.thumbnailUrl ?? image?.url ?? null
}

function parseProvisioning(metadata?: Record<string, unknown> | null): Provisioning | null {
  const provisioning = metadata?.provisioning
  if (!provisioning || typeof provisioning !== 'object' || Array.isArray(provisioning)) return null
  const value = provisioning as Record<string, unknown>
  if (typeof value.status !== 'string' || typeof value.code !== 'string') return null
  return {
    status: value.status,
    code: value.code,
    resourceType: typeof value.resourceType === 'string' ? value.resourceType : null,
    resourceId: typeof value.resourceId === 'string' ? value.resourceId : null,
    capability: typeof value.capability === 'string' ? value.capability : null,
  }
}

function PriceBadge({ amount }: { amount: number }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 text-danger">
      <ShrimpCoinIcon size={15} />
      <span className="font-black tabular-nums">{amount.toLocaleString()}</span>
      <span className="sr-only">{t('common.shrimpCoin')}</span>
    </span>
  )
}

function activeEntitlement(entitlement: Entitlement) {
  if (!entitlement.isActive || entitlement.status !== 'active') return false
  if (!entitlement.expiresAt) return true
  return new Date(entitlement.expiresAt).getTime() > Date.now()
}

function entitlementPaidFileId(entitlement: Entitlement) {
  if (entitlement.paidFile?.id) return entitlement.paidFile.id
  return entitlement.resourceType === 'workspace_file' ? entitlement.resourceId : null
}

function EntitlementStatus({ entitlement }: { entitlement: Entitlement }) {
  const { t } = useTranslation()
  const isActive = entitlement.isActive && entitlement.status === 'active'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
      }`}
    >
      {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {t(`commerce.status.${entitlement.status}`, { defaultValue: entitlement.status })}
    </span>
  )
}

function ProductMeta({ product }: { product: Product }) {
  const { t } = useTranslation()
  const config = firstEntitlementConfig(product)
  const durationSeconds = config?.durationSeconds ?? config?.renewalPeriodSeconds ?? null
  const durationDays = durationSeconds ? Math.ceil(durationSeconds / 86400) : null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-muted">
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
        <ShieldCheck size={13} />
        {t(`commerce.resourceTypes.${config?.resourceType ?? 'service'}`, {
          defaultValue: config?.resourceType ?? t('commerce.resourceEntitlement'),
        })}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary/70 px-2 py-1">
        <Clock3 size={13} />
        {t(`commerce.billingModes.${product.billingMode ?? 'one_time'}`)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary/70 px-2 py-1">
        <CalendarClock size={13} />
        {durationDays ? t('commerce.validDays', { count: durationDays }) : t('commerce.permanent')}
      </span>
    </div>
  )
}

function ProvisioningPill({ provisioning }: { provisioning?: Provisioning | null }) {
  const { t } = useTranslation()
  if (!provisioning) return null
  const isProvisioned = provisioning.status === 'provisioned'
  const isManual = provisioning.status === 'manual_pending'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        isProvisioned
          ? 'bg-success/10 text-success'
          : isManual
            ? 'bg-warning/10 text-warning'
            : 'bg-danger/10 text-danger'
      }`}
    >
      {isProvisioned ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
      {t(`commerce.provisioning.${provisioning.status}`, {
        defaultValue: provisioning.status,
      })}
    </span>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">{children}</div>
    </div>
  )
}

export function PersonalShopPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const params = useParams({ strict: false }) as { userId?: string }
  const currentUser = useAuthStore((s) => s.user)
  const targetUserId = params.userId ?? currentUser?.id
  const [keyword, setKeyword] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [price, setPrice] = useState('100')
  const [resourceType, setResourceType] = useState('service')
  const [resourceId, setResourceId] = useState('')
  const [capability, setCapability] = useState<ResourceCapability>('use')
  const [durationDays, setDurationDays] = useState('30')
  const [billingMode, setBillingMode] = useState<BillingMode>('fixed_duration')
  const [privilegeDescription, setPrivilegeDescription] = useState('')
  const numericPrice = Number(price)
  const numericDurationDays = Number(durationDays)
  const durationInvalid =
    billingMode !== 'one_time' && (!numericDurationDays || numericDurationDays <= 0)
  const priceInvalid = !Number.isFinite(numericPrice) || numericPrice <= 0

  const { data, isLoading } = useQuery({
    queryKey: ['personal-shop', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('missing user')
      if (!params.userId || params.userId === currentUser?.id) {
        return { shop: await fetchApi<Shop>('/api/me/shop'), canManage: true }
      }
      try {
        return {
          shop: await fetchApi<Shop>(`/api/users/${targetUserId}/shop/manage`),
          canManage: true,
        }
      } catch {
        return {
          shop: await fetchApi<Shop>(`/api/users/${targetUserId}/shop`),
          canManage: false,
        }
      }
    },
    enabled: Boolean(targetUserId),
  })

  const shop = data?.shop
  const canManage = data?.canManage === true

  useEffect(() => {
    if (!shop) return
    setShopName(shop.name)
    setShopDescription(shop.description ?? '')
  }, [shop])

  const { data: productsData, isFetching: isFetchingProducts } = useQuery({
    queryKey: ['personal-shop-products', shop?.id, keyword],
    queryFn: () =>
      fetchApi<{ products: Product[] }>(
        `/api/shops/${shop!.id}/products?keyword=${encodeURIComponent(keyword.trim())}`,
      ),
    enabled: Boolean(shop?.id),
  })
  const products = productsData?.products ?? []

  const saveShop = useMutation({
    mutationFn: () => {
      const path =
        params.userId && params.userId !== currentUser?.id
          ? `/api/users/${targetUserId}/shop/manage`
          : '/api/me/shop'
      return fetchApi<Shop>(path, {
        method: 'POST',
        body: JSON.stringify({
          name: shopName.trim(),
          description: shopDescription.trim() || null,
        }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['personal-shop', targetUserId] })
      showToast(t('commerce.shopSaved'), 'success')
    },
    onError: (err) => showToast(getApiErrorMessage(err, t, 'commerce.shopSaveFailed'), 'error'),
  })

  const createProduct = useMutation({
    mutationFn: () => {
      const durationSeconds = numericDurationDays > 0 ? numericDurationDays * 24 * 60 * 60 : null
      return fetchApi<Product>(`/api/shops/${shop!.id}/products`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: toProductSlug(name),
          type: 'entitlement',
          billingMode,
          status: 'active',
          summary: summary.trim() || undefined,
          basePrice: Math.round(numericPrice),
          entitlementConfig: {
            resourceType: resourceType.trim() || 'service',
            resourceId: resourceId.trim() || undefined,
            capability,
            durationSeconds: billingMode === 'one_time' ? null : durationSeconds,
            renewalPeriodSeconds: billingMode === 'subscription' ? durationSeconds : undefined,
            privilegeDescription: privilegeDescription.trim() || undefined,
          },
        }),
      })
    },
    onSuccess: async () => {
      setName('')
      setSummary('')
      setResourceId('')
      setPrivilegeDescription('')
      await queryClient.invalidateQueries({ queryKey: ['personal-shop-products', shop?.id] })
      showToast(t('commerce.productCreated'), 'success')
    },
    onError: (err) =>
      showToast(getApiErrorMessage(err, t, 'commerce.productCreateFailed'), 'error'),
  })

  const deleteProduct = useMutation({
    mutationFn: (product: Product) =>
      fetchApi(`/api/shops/${product.shopId}/products/${product.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['personal-shop-products', shop?.id] })
      showToast(t('commerce.productDeleted'), 'success')
    },
    onError: (err) =>
      showToast(getApiErrorMessage(err, t, 'commerce.productDeleteFailed'), 'error'),
  })

  const canSubmitProduct =
    canManage &&
    Boolean(name.trim()) &&
    Boolean(resourceType.trim()) &&
    !priceInvalid &&
    !durationInvalid &&
    !createProduct.isPending

  const filtered = useMemo(() => products, [products])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (!shop) {
    return <div className="p-6 text-sm text-text-muted">{t('commerce.shopUnavailable')}</div>
  }

  return (
    <PageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Store size={13} />
            {t('commerce.myShop')}
          </div>
          <h1 className="truncate text-2xl font-black text-text-primary">{shop.name}</h1>
          {shop.description && (
            <p className="mt-1 text-sm text-text-secondary">{shop.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/app/settings?tab=entitlements"
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm font-bold text-text-primary transition hover:border-primary/40"
          >
            <ShieldCheck size={16} />
            {t('commerce.entitlements')}
          </a>
          {canManage && (
            <a
              href="/app/settings?tab=commerce-orders"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
            >
              <ExternalLink size={16} />
              {t('commerce.orders')}
            </a>
          )}
        </div>
      </header>

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <GlassPanel className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
              <Settings2 size={17} />
              {t('commerce.shopSettings')}
            </h2>
            <div className="grid gap-3">
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t('commerce.shopName')}
              />
              <Input
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                placeholder={t('commerce.shopDescription')}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => saveShop.mutate()}
                disabled={!shopName.trim() || saveShop.isPending}
              >
                {saveShop.isPending ? t('commerce.saving') : t('commerce.saveShop')}
              </Button>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-text-primary">
              <Package size={17} />
              {t('commerce.createEntitlementProduct')}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('commerce.productName')}
              />
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t('commerce.productSummary')}
              />
              <Input
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                placeholder={t('commerce.resourceType')}
              />
              <select
                className={selectClassName}
                value={billingMode}
                onChange={(e) => setBillingMode(e.target.value as BillingMode)}
                aria-label={t('commerce.billingMode')}
              >
                {BILLING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`commerce.billingModes.${mode}`)}
                  </option>
                ))}
              </select>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('commerce.productPrice')}
                inputMode="numeric"
              />
              <Input
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder={t('commerce.durationDays')}
                inputMode="numeric"
              />
              <select
                className={selectClassName}
                value={capability}
                onChange={(e) => setCapability(e.target.value as ResourceCapability)}
                aria-label={t('commerce.capability')}
              >
                {RESOURCE_CAPABILITIES.map((item) => (
                  <option key={item} value={item}>
                    {t(`commerce.capabilities.${item}`)}
                  </option>
                ))}
              </select>
              <Input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder={t('commerce.resourceId')}
              />
              <Input
                className="md:col-span-2"
                value={privilegeDescription}
                onChange={(e) => setPrivilegeDescription(e.target.value)}
                placeholder={t('commerce.privilegeDescription')}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => createProduct.mutate()} disabled={!canSubmitProduct}>
                {createProduct.isPending ? t('commerce.saving') : t('commerce.createProduct')}
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      <GlassPanel className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-text-primary">
            <ShoppingBag size={17} />
            {t('commerce.activeProducts')}
          </h2>
          <div className="flex min-w-[220px] items-center gap-2 rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2">
            <Search size={16} className="text-text-muted" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('commerce.searchProducts')}
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isFetchingProducts ? (
            <div className="py-8 text-center text-text-muted md:col-span-2 xl:col-span-3">
              <Loader2 className="inline animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted md:col-span-2 xl:col-span-3">
              {t('commerce.noProducts')}
            </div>
          ) : (
            filtered.map((product) => {
              const image = productImage(product)
              return (
                <a
                  key={product.id}
                  href={`/app/shop/products/${product.id}`}
                  className="group flex min-h-[148px] flex-col gap-3 rounded-xl border border-border-subtle bg-bg-secondary/60 p-3 transition hover:border-primary/40"
                >
                  <div className="flex gap-3">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 text-primary">
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag size={22} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-text-primary group-hover:text-primary">
                        {product.name}
                      </span>
                      {product.summary && (
                        <span className="mt-1 line-clamp-2 block text-xs text-text-muted">
                          {product.summary}
                        </span>
                      )}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        title={t('commerce.deleteProduct')}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
                        onClick={(event) => {
                          event.preventDefault()
                          deleteProduct.mutate(product)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <ProductMeta product={product} />
                    <PriceBadge amount={product.basePrice} />
                  </div>
                </a>
              )
            })
          )}
        </div>
      </GlassPanel>
    </PageShell>
  )
}

export function ProductDetailPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const params = useParams({ strict: false }) as { productId: string }
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const { data: product, isLoading } = useQuery({
    queryKey: ['commerce-product-detail', params.productId],
    queryFn: () => fetchApi<Product>(`/api/products/${params.productId}`),
  })

  const purchase = useMutation({
    mutationFn: () =>
      fetchApi<{ entitlement: Entitlement; provisioning?: Provisioning }>(
        `/api/shops/${product!.shopId}/products/${product!.id}/purchase`,
        {
          method: 'POST',
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
        },
      ),
    onSuccess: async () => {
      setPurchaseError(null)
      await queryClient.invalidateQueries({ queryKey: ['entitlements'] })
      showToast(t('commerce.purchaseCompleted'), 'success')
    },
    onError: (err) => {
      const message = getApiErrorMessage(err, t, 'commerce.purchaseFailed')
      setPurchaseError(message)
      showToast(message, 'error')
    },
  })

  if (isLoading || !product) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const image = productImage(product)
  const config = firstEntitlementConfig(product)
  const provisioning = purchase.data?.provisioning
  const durationSeconds = config?.durationSeconds ?? config?.renewalPeriodSeconds ?? null
  const durationDays = durationSeconds ? Math.ceil(durationSeconds / 86400) : null
  const modalDetails = {
    name: product.name,
    summary: product.summary,
    imageUrl: image,
    priceLabel: `${product.basePrice.toLocaleString()} ${t('common.shrimpCoin')}`,
    billingModeLabel: t(`commerce.billingModes.${product.billingMode ?? 'one_time'}`),
    entitlementLabel: t(`commerce.resourceTypes.${config?.resourceType ?? 'service'}`, {
      defaultValue: config?.resourceType ?? t('commerce.resourceEntitlement'),
    }),
    durationLabel: durationDays
      ? t('commerce.validDays', { count: durationDays })
      : t('commerce.permanent'),
    targetLabel: config?.resourceId ?? product.id,
    deliveryLabel: t('commerce.immediateDelivery'),
  }

  return (
    <PageShell>
      <GlassPanel className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="flex aspect-square items-center justify-center bg-primary/10 text-primary lg:aspect-auto">
            {image ? (
              <img src={image} alt="" className="h-full min-h-[280px] w-full object-cover" />
            ) : (
              <ShoppingBag size={56} />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4 p-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                <ShieldCheck size={13} />
                {t('commerce.productDetail')}
              </div>
              <h1 className="text-2xl font-black text-text-primary">{product.name}</h1>
              {product.summary && (
                <p className="mt-2 text-sm leading-6 text-text-secondary">{product.summary}</p>
              )}
            </div>
            <ProductMeta product={product} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-3">
                <div className="text-xs font-bold text-text-muted">
                  {t('commerce.productPrice')}
                </div>
                <div className="mt-2 text-2xl">
                  <PriceBadge amount={product.basePrice} />
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-3">
                <div className="text-xs font-bold text-text-muted">
                  {t('commerce.entitlementResource')}
                </div>
                <div className="mt-2 truncate text-sm font-bold text-text-primary">
                  {config?.resourceId ?? product.id}
                </div>
              </div>
            </div>
            {product.description && (
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-3 text-sm leading-6 text-text-secondary">
                {product.description}
              </div>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <Button onClick={() => setShowPurchaseModal(true)} disabled={purchase.isPending}>
                {purchase.isPending ? t('commerce.purchasing') : t('commerce.buyNow')}
              </Button>
              {purchase.data && (
                <a
                  href="/app/settings?tab=entitlements"
                  className="inline-flex items-center gap-2 text-sm font-bold text-success"
                >
                  <ShieldCheck size={16} />
                  {t('commerce.viewEntitlement')}
                </a>
              )}
              <ProvisioningPill provisioning={provisioning} />
            </div>
          </div>
        </div>
      </GlassPanel>
      <PurchaseConfirmationModal
        open={showPurchaseModal}
        details={modalDetails}
        isPending={purchase.isPending}
        isCompleted={!!purchase.data}
        error={purchaseError}
        provisioningStatus={provisioning?.status ?? null}
        onClose={() => {
          setShowPurchaseModal(false)
          setPurchaseError(null)
        }}
        onConfirm={() => purchase.mutate()}
      />
    </PageShell>
  )
}

export function EntitlementsPage() {
  const { t } = useTranslation()
  const [previewFile, setPreviewFile] = useState<{
    id: string
    filename: string
    url: string
    contentType: string
    size: number
  } | null>(null)
  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ['entitlements'],
    queryFn: () => fetchApi<Entitlement[]>('/api/entitlements'),
  })

  const openPaidFile = useMutation({
    mutationFn: async (entitlement: Entitlement) => {
      const fileId = entitlementPaidFileId(entitlement)
      if (!fileId) throw new Error('PAID_FILE_NOT_FOUND')
      const result = await fetchApi<{ viewerUrl: string }>(`/api/paid-files/${fileId}/open`, {
        method: 'POST',
      })
      return { entitlement, fileId, viewerUrl: result.viewerUrl }
    },
    onSuccess: ({ entitlement, fileId, viewerUrl }) => {
      setPreviewFile({
        id: `paid-file-${fileId}`,
        filename: entitlement.paidFile?.name ?? entitlement.product?.name ?? t('commerce.paidFile'),
        url: viewerUrl,
        contentType: entitlement.paidFile?.mime ?? 'text/html',
        size: entitlement.paidFile?.sizeBytes ?? 0,
      })
    },
    onError: (err) => showToast(getApiErrorMessage(err, t, 'commerce.openResourceFailed'), 'error'),
  })

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1">
        <PageShell>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                <ShieldCheck size={13} />
                {t('commerce.entitlements')}
              </div>
              <h1 className="text-2xl font-black text-text-primary">
                {t('commerce.entitlements')}
              </h1>
              <p className="mt-1 text-sm text-text-muted">{t('commerce.entitlementsSubtitle')}</p>
            </div>
            <a
              href="/app/settings?tab=shop"
              className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm font-bold text-text-primary transition hover:border-primary/40"
            >
              <Store size={16} />
              {t('commerce.myShop')}
            </a>
          </header>
          <GlassPanel className="p-4">
            {isLoading ? (
              <div className="py-8 text-center text-text-muted">
                <Loader2 className="inline animate-spin" />
              </div>
            ) : entitlements.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                {t('commerce.noEntitlements')}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {entitlements.map((entitlement) => {
                  const provisioning = parseProvisioning(entitlement.metadata)
                  const fileId = entitlementPaidFileId(entitlement)
                  const canOpen = Boolean(fileId && activeEntitlement(entitlement))
                  const title =
                    entitlement.product?.name ??
                    entitlement.paidFile?.name ??
                    t(`commerce.resourceTypes.${entitlement.resourceType ?? 'service'}`, {
                      defaultValue: t('commerce.resourceEntitlement'),
                    })
                  const resourceType = t(
                    `commerce.resourceTypes.${entitlement.resourceType ?? 'service'}`,
                    {
                      defaultValue: entitlement.resourceType ?? t('commerce.resourceEntitlement'),
                    },
                  )
                  const capability = entitlement.capability
                    ? t(`commerce.capabilities.${entitlement.capability}`, {
                        defaultValue: entitlement.capability,
                      })
                    : null
                  const associatedResource =
                    entitlement.paidFile?.name ??
                    entitlement.product?.summary ??
                    entitlement.resourceId ??
                    entitlement.id
                  return (
                    <div
                      key={entitlement.id}
                      className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-text-primary">
                            {title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            <span>{resourceType}</span>
                            {capability && <span>{capability}</span>}
                            {entitlement.shop?.name && <span>{entitlement.shop.name}</span>}
                          </div>
                        </div>
                        <EntitlementStatus entitlement={entitlement} />
                      </div>
                      <div className="mt-3 rounded-lg border border-border-subtle bg-bg-primary/40 px-3 py-2 text-xs text-text-secondary">
                        <div className="font-bold text-text-primary">
                          {t('commerce.associatedResource')}
                        </div>
                        <div className="mt-1 truncate text-text-muted">{associatedResource}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span>
                          {t('commerce.expiresAt')}{' '}
                          {formatDate(entitlement.expiresAt) ?? t('commerce.neverExpires')}
                        </span>
                        <ProvisioningPill provisioning={provisioning} />
                      </div>
                      {canOpen && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openPaidFile.mutate(entitlement)}
                            disabled={openPaidFile.isPending}
                          >
                            <ExternalLink size={14} />
                            {openPaidFile.isPending
                              ? t('commerce.openingResource')
                              : t('commerce.openResource')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassPanel>
        </PageShell>
      </div>
      {previewFile && (
        <FilePreviewPanel attachment={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}

export function ShopOrdersPage() {
  const { t } = useTranslation()
  const { data: shop } = useQuery({
    queryKey: ['personal-shop', 'me'],
    queryFn: () => fetchApi<Shop>('/api/me/shop'),
  })
  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ['shop-entitlements', shop?.id],
    queryFn: () => fetchApi<Entitlement[]>(`/api/shops/${shop!.id}/entitlements`),
    enabled: Boolean(shop?.id),
  })

  return (
    <PageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Package size={13} />
            {t('commerce.orders')}
          </div>
          <h1 className="text-2xl font-black text-text-primary">{t('commerce.orders')}</h1>
        </div>
        <a
          href="/app/settings?tab=shop"
          className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm font-bold text-text-primary transition hover:border-primary/40"
        >
          <Store size={16} />
          {t('commerce.myShop')}
        </a>
      </header>
      <GlassPanel className="p-4">
        {isLoading ? (
          <div className="py-8 text-center text-text-muted">
            <Loader2 className="inline animate-spin" />
          </div>
        ) : entitlements.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">{t('commerce.noOrders')}</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {entitlements.map((entitlement) => {
              const provisioning = parseProvisioning(entitlement.metadata)
              return (
                <div
                  key={entitlement.id}
                  className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-text-primary">
                        {entitlement.resourceId ?? entitlement.productId ?? entitlement.id}
                      </div>
                      <div className="mt-1 truncate text-xs text-text-muted">
                        {t('commerce.buyer')} {entitlement.userId}
                      </div>
                    </div>
                    <EntitlementStatus entitlement={entitlement} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>
                      {t('commerce.expiresAt')}{' '}
                      {formatDate(entitlement.expiresAt) ?? t('commerce.neverExpires')}
                    </span>
                    <ProvisioningPill provisioning={provisioning} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassPanel>
    </PageShell>
  )
}
